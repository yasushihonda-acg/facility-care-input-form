# 引き継ぎドキュメント

> **最終更新**: 2025年12月16日
>
> 本ドキュメントは、開発を引き継ぐ際に必要な情報をまとめたものです。

---

## 1. プロジェクト概要

### 1.1 基本情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | 施設ケア入力フォーム |
| リポジトリ | https://github.com/yasushihonda-acg/facility-care-input-form |
| デモURL | https://facility-care-input-form.web.app |
| 技術スタック | React + Vite + TypeScript + TailwindCSS + Firebase |

### 1.2 目的

介護施設向けコミュニケーションアプリのプロトタイプ開発。スタッフの食事記録入力と、家族への情報共有を実現する。

### 1.3 主要機能

| 機能 | 説明 | 実装状況 |
|------|------|----------|
| 記録閲覧 | スプレッドシートからのデータ同期・表示 | ✅ 完了 |
| 食事入力フォーム | スタッフによる食事記録入力 | ✅ 完了 |
| Google Chat通知 | 入力時にWebhookで自動通知 | ✅ 完了 |
| 写真アップロード | Google Driveへの画像保存 | ✅ 完了 |
| 家族ビュー | 家族向けタイムライン・エビデンス表示 | ✅ 完了 |
| 予実管理 | Plan（指示）とResult（実績）の対比 | ✅ 完了 |
| 管理設定テスト | Webhook/Driveの事前テスト | ✅ 完了 |
| 品物管理 | 家族からの差し入れ品物の登録・追跡 | ✅ 完了 |
| タスク管理 | 賞味期限警告・リマインダー等のタスク管理 | ✅ 完了 |
| 統計ダッシュボード | 品物状況・アラートの可視化 | ✅ 完了 |
| AI提案 | Gemini APIによる賞味期限・提供方法の自動提案 | ✅ 完了 |
| プリセット管理 | 「いつもの指示」のCRUD管理・AI自動ストック | ✅ 完了 |

---

## 2. 環境構築

### 2.1 必要なアカウント

| サービス | アカウント | 用途 |
|----------|----------|------|
| GitHub | `yasushihonda-acg` | ソースコード管理 |
| GCP | `yasushi.honda@aozora-cg.com` | Cloud Functions, Firestore |
| Firebase | 同上 | Hosting, Firestore |

### 2.2 認証切り替えコマンド

```bash
# GitHub
gh auth switch --user yasushihonda-acg

# GCP
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form

# Firebase
firebase use facility-care-input-form
```

### 2.3 ローカル開発セットアップ

```bash
# リポジトリクローン
git clone https://github.com/yasushihonda-acg/facility-care-input-form.git
cd facility-care-input-form

# フロントエンド依存関係インストール
cd frontend && npm install

# バックエンド依存関係インストール
cd ../functions && npm install

# フロントエンド開発サーバー起動
cd ../frontend && npm run dev

# Emulator起動（別ターミナル）
firebase emulators:start --only functions,firestore
```

---

## 3. プロジェクト構成

### 3.1 ディレクトリ構造

```
facility-care-input-form/
├── CLAUDE.md              # Claude Code設定・記憶
├── frontend/              # React PWAアプリ
│   ├── src/
│   │   ├── pages/         # ページコンポーネント
│   │   │   ├── HomePage.tsx          # 記録閲覧
│   │   │   ├── MealInputPage.tsx     # 食事入力
│   │   │   ├── shared/               # 共有ページ
│   │   │   │   └── StatsDashboard.tsx # 統計ダッシュボード
│   │   │   └── family/               # 家族向けページ
│   │   │       ├── FamilyDashboard.tsx
│   │   │       ├── EvidenceMonitor.tsx
│   │   │       ├── RequestBuilder.tsx
│   │   │       ├── ItemManagement.tsx  # 品物管理
│   │   │       ├── ItemForm.tsx        # 品物登録（AI提案統合）
│   │   │       ├── TaskList.tsx        # タスク一覧
│   │   │       └── PresetManagement.tsx # プリセット管理
│   │   ├── components/    # UIコンポーネント
│   │   │   └── family/
│   │   │       ├── AISuggestion.tsx         # AI提案カード
│   │   │       ├── PresetSuggestion.tsx     # プリセット候補
│   │   │       └── SaveAISuggestionDialog.tsx # AI保存ダイアログ
│   │   ├── hooks/         # カスタムフック
│   │   │   ├── usePresets.ts   # プリセットCRUD
│   │   │   ├── useStats.ts     # 統計データ
│   │   │   └── useAISuggest.ts # AI提案
│   │   ├── types/         # 型定義
│   │   └── services/      # APIサービス
│   └── package.json
├── functions/             # Cloud Functions
│   ├── src/
│   │   ├── index.ts       # エントリポイント
│   │   ├── functions/     # 各API関数
│   │   │   ├── careItems.ts  # 品物CRUD
│   │   │   ├── tasks.ts      # タスクCRUD
│   │   │   ├── presets.ts    # プリセットCRUD + AI保存
│   │   │   ├── getStats.ts   # 統計データ
│   │   │   └── aiSuggest.ts  # AI提案
│   │   └── services/      # サービス層
│   └── package.json
├── docs/                  # ドキュメント
│   ├── CURRENT_STATUS.md  # 進捗管理（再開時に最初に読む）
│   ├── ROADMAP.md         # ロードマップ
│   ├── ARCHITECTURE.md    # システム設計
│   ├── API_SPEC.md        # API仕様
│   └── ...
└── keys/                  # サービスアカウントキー（Git管理外）
```

### 3.2 主要ドキュメント

| 優先度 | ドキュメント | 用途 |
|--------|-------------|------|
| ⭐⭐⭐ | `docs/CURRENT_STATUS.md` | **再開時に最初に読む** - 現在の進捗・次のタスク |
| ⭐⭐⭐ | `CLAUDE.md` | Claude Code設定・アカウント情報 |
| ⭐⭐ | `docs/ROADMAP.md` | Phase別ロードマップ |
| ⭐⭐ | `docs/ARCHITECTURE.md` | システム全体設計 |
| ⭐ | `docs/API_SPEC.md` | API仕様書 |
| ⭐ | `docs/PRESET_MANAGEMENT_SPEC.md` | プリセット管理機能設計（Phase 8.6/8.7） |
| ⭐ | `docs/AI_INTEGRATION_SPEC.md` | AI連携設計（Phase 8.4/8.5/8.7） |

---

## 4. 現在の状態

### 4.1 完了済みPhase

| Phase | 内容 | 完了日 |
|-------|------|--------|
| Phase 1-4 | 基盤構築〜デモ版PWA | 完了 |
| Phase 5.0-5.7 | 食事入力フォーム〜設定モーダル改善 | 完了 |
| Phase 6.0 | フッターナビゲーション | 完了 |
| Phase 7.0 | 家族向け機能 | 2025-12-15 |
| Phase 7.1 | 予実管理 | 2025-12-15 |
| Phase 8.1 | 品物管理基盤 | 2025-12-16 |
| Phase 8.2 | タスク管理 | 2025-12-16 |
| Phase 8.2.1 | タスク自動生成（Cloud Scheduler） | 2025-12-16 |
| Phase 8.3 | 統計ダッシュボード | 2025-12-16 |
| Phase 8.4 | AI提案UI統合 | 2025-12-16 |
| Phase 8.5 | プリセット提案統合 | 2025-12-16 |
| Phase 8.6 | プリセット管理CRUD | 2025-12-16 |
| Phase 8.7 | AI自動ストック | 2025-12-16 |

### 4.2 計画中（次のタスク）

| Phase | 内容 | 優先度 |
|-------|------|--------|
| Phase 8.3 | 統計ダッシュボード | 高 |
| Phase 8.4 | Gemini AI連携 | 中 |
| - | ケア指示のFirestore保存 | 中 |
| - | 写真エビデンス表示 | 中 |

### 4.3 Phase 5.8-5.10 管理設定関連機能（完了）

**設計書**:
- `docs/ADMIN_TEST_FEATURE_SPEC.md` - テスト機能詳細
- `docs/SETTINGS_MODAL_UI_SPEC.md` - UIモーダル仕様
- `docs/DAY_SERVICE_OPTIONS_SPEC.md` - デイサービス選択肢

| Phase | 項目 | 状態 |
|-------|------|------|
| 5.8 | テスト機能実装 | ✅ 完了 |
| 5.8 v1.1 | 本番形式テスト、親切なエラーメッセージ | ✅ 完了 |
| 5.8 v1.3 | 第1世代関数SA修正（gcloudコマンド） | ✅ 完了 |
| 5.9 | デイサービス選択肢固定リスト化 | ✅ 完了 |
| 5.10 | 設定モーダルキャンセル時リセット修正 | ✅ 完了 |

**Phase 5.10の重要ポイント**:
- **問題**: モーダルでテストだけ実行→キャンセル→再度開くと前回の入力値が残る
- **原因**: Reactコンポーネントは`isOpen=false`でも破棄されない
- **解決**: `useEffect`で`isOpen`監視、開いた時に`resetAllStates()`実行

---

## 5. データフロー

### 5.1 全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│                      スプレッドシート                         │
│  Sheet A（記録の結果）           Sheet B（実績入力）          │
│  読み取り専用                    書き込み専用                 │
└──────────────┬────────────────────────────┬─────────────────┘
               │ 15分毎同期                  │ 入力時書き込み
               ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Firestore                             │
│  plan_data/（同期データ）        settings/（設定）            │
└──────────────┬────────────────────────────┬─────────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Functions                           │
│  syncPlanData / getPlanData / submitMealRecord / etc.       │
└──────────────┬────────────────────────────┬─────────────────┘
               │                            │
               ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (PWA)                          │
│  記録閲覧 / 食事入力 / 家族ビュー                            │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 家族ビュー予実管理フロー

```
[食事入力(スタッフ)] → [Sheet B] → [15分同期] → [Firestore plan_data/]
                                                      ↓
[家族ビュー] → [useFamilyMealRecords] → [日付+食事時間フィルタ] → [表示]
                                                      ↑
[家族連絡(Plan)] → [モックデータ] (将来: Firestore care_instructions/)
```

---

## 6. 重要な設定・認証情報

### 6.1 サービスアカウント

**重要**: 本プロジェクトでは単一のサービスアカウントに統一しています。

| 項目 | 値 |
|------|-----|
| 名前 | `facility-care-sa` |
| メール | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |
| キーファイル | `keys/sa-key.json` (Git管理外) |
| 用途 | Cloud Functions実行、CI/CD、スプレッドシート連携、Google Drive連携 |

**外部サービス共有設定**:

| 対象 | 権限 |
|------|------|
| Sheet A（記録の結果） | 閲覧者 |
| Sheet B（実績入力先） | 編集者 |
| Google Drive写真フォルダ | 編集者 |

**注意**: GCPには他にも自動作成されるサービスアカウント（App Engine default, Compute Engine default, firebase-adminsdk）がありますが、これらは使用しません。詳細は `CLAUDE.md` を参照。

### 6.2 スプレッドシート

| 用途 | Sheet ID |
|------|----------|
| Sheet A（読み取り） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` |
| Sheet B（書き込み） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` |

### 6.3 GitHub Secrets

| シークレット名 | 用途 |
|---------------|------|
| `GCP_SA_KEY` | CI/CD用サービスアカウントキー |

### 6.4 Cloud Schedulerジョブ

| ジョブ名 | スケジュール | 用途 |
|---------|-------------|------|
| `sync-plan-data-incremental` | 毎15分 (Asia/Tokyo) | 差分同期 |
| `sync-plan-data-full` | 毎日3:00 AM (Asia/Tokyo) | 完全同期 |
| `firebase-schedule-generateDailyTasks-asia-northeast1` | 毎日6:00 AM (Asia/Tokyo) | タスク自動生成 |

### 6.5 Firestoreインデックス

| コレクション | フィールド | 用途 |
|-------------|-----------|------|
| `plan_data` | sheetName + timestamp | シート別データ取得 |
| `care_items` | status + expirationDate | 賞味期限警告クエリ |
| `care_items` | status + plannedServeDate | 提供リマインダークエリ |
| `tasks` | relatedItemId + taskType + dueDate + status | 重複タスクチェック |

---

## 7. デプロイ手順

### 7.1 手動デプロイ

```bash
# フロントエンドビルド
cd frontend && npm run build

# Firebase全体デプロイ
firebase deploy

# または個別デプロイ
firebase deploy --only hosting    # フロントエンド
firebase deploy --only functions  # バックエンド
```

### 7.2 自動デプロイ（CI/CD）

- mainブランチへのマージで自動デプロイ
- `.github/workflows/deploy.yml` で設定済み

---

## 8. トラブルシューティング

### 8.1 よくある問題

| 問題 | 解決策 |
|------|--------|
| APIがCORSエラー | Cloud Functionsの `setCors` 関数を確認 |
| Firestoreアクセス拒否 | `firestore.rules` のルールを確認（Dev Mode: `allow read, write: if true;`） |
| スプレッドシート権限エラー | サービスアカウントに共有設定を確認 |
| GitHub Actions失敗 | `GCP_SA_KEY` シークレットの設定を確認 |
| Driveフォルダ404エラー | 下記「Cloud Functions サービスアカウント」を参照 |

### 8.2 Cloud Functions サービスアカウント（重要）

**問題**: Cloud Functionsが間違ったサービスアカウントを使用している

**原因と解決**:

`firebase.json` の `serviceAccount` フィールドは**Cloud Functions第2世代のみ**対応しています。
このプロジェクトは第1世代関数のため、gcloudコマンドで直接指定する必要があります。

```bash
# 現在のSAを確認
gcloud functions describe testDriveAccess --region=asia-northeast1 | grep serviceAccountEmail

# 第1世代関数のSA変更コマンド
gcloud functions deploy <関数名> \
  --region=asia-northeast1 \
  --project=facility-care-input-form \
  --service-account=facility-care-sa@facility-care-input-form.iam.gserviceaccount.com \
  --trigger-http \
  --allow-unauthenticated \
  --runtime=nodejs20
```

**対象関数**: `testDriveAccess`, `uploadCareImage`, `submitMealRecord` など外部サービス連携する関数

### 8.3 ログ確認

```bash
# Cloud Functionsログ
firebase functions:log

# GCPコンソールでも確認可能
# https://console.cloud.google.com/functions
```

---

## 9. 業務ルール・データ仕様

### 9.1 投稿IDルール

食事記録を送信すると、自動で投稿IDが生成されます。

**本番用（食事記録）**:
```
MEL{YYYYMMDDHHmmssSSS}{6桁乱数}
```
例: `MEL20251214182056917838123`

**テスト用（Webhookテスト）**:
```
TEST-{YYYYMMDDHHmmss}
```
例: `TEST-20251215071725`

> **詳細**: [BUSINESS_RULES.md#6-投稿id生成ルール](./BUSINESS_RULES.md#6-投稿id生成ルール) を参照

### 9.2 Bot連携ハック（間食入力）

間食入力時は特殊処理が適用されます。既存GAS Botとの互換性のための意図的な仕様です。

> **詳細**: [BUSINESS_RULES.md#2-bot連携ハック間食入力時の特殊処理](./BUSINESS_RULES.md#2-bot連携ハック間食入力時の特殊処理) を参照

### 9.3 シート別アクセス制御

| シート | 許可操作 | 禁止操作 |
|--------|----------|----------|
| Sheet A (記録の結果) | Read | Write, Update, Delete |
| Sheet B (実績入力先) | Append | Read, Update, Delete |

---

## 10. 連絡先・リソース

### 10.1 リポジトリ・ドキュメント

| リソース | URL |
|----------|-----|
| GitHub | https://github.com/yasushihonda-acg/facility-care-input-form |
| デモサイト | https://facility-care-input-form.web.app |
| プロジェクト紹介 | https://yasushihonda-acg.github.io/facility-care-input-form/ |
| GCPコンソール | https://console.cloud.google.com/home/dashboard?project=facility-care-input-form |

### 10.2 開発再開手順

```
1. docs/CURRENT_STATUS.md を読む（現在の進捗確認）
2. 必要に応じてアカウント切り替えを実行
3. 「次のタスク」セクションから作業を再開
4. 作業完了後は docs/CURRENT_STATUS.md を更新
5. git commit & push（必須）
```

### 10.3 AIエージェントへの指示

会話をクリアした後、このプロジェクトの開発を継続する場合は、以下のように指示してください：

```
facility-care-input-form プロジェクトの開発を継続してください。
docs/CURRENT_STATUS.md を読んで、次のタスクから再開してください。
```

---

## 11. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-16 | フッター用語統一: 「家族指示」→「家族連絡」、パス変更、Mermaid修正 |
| 2025-12-16 | Phase 8.2完了: タスク管理機能（一覧・フィルタ・完了処理） |
| 2025-12-16 | Phase 8.1完了: 品物管理基盤（登録・一覧・更新・削除） |
| 2025-12-15 | Phase 5.10完了: 設定モーダルキャンセル時リセット修正 |
| 2025-12-15 | Phase 5.9完了: デイサービス選択肢固定リスト化 |
| 2025-12-15 | 業務ルール・データ仕様セクション追加（投稿IDルール等） |
| 2025-12-15 | Cloud Functions SA問題のトラブルシューティング追加 |
| 2025-12-15 | Phase 5.8 v1.3完了、第1世代関数SA修正 |
| 2025-12-15 | Phase 5.8完了、サービスアカウント情報整理 |
| 2025-12-15 | 初版作成（Phase 7.1完了時点） |
