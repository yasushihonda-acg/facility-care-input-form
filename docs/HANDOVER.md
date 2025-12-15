# 引き継ぎドキュメント

> **最終更新**: 2025年12月15日
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
│   │   │   └── family/               # 家族向けページ
│   │   │       ├── FamilyDashboard.tsx
│   │   │       ├── EvidenceMonitor.tsx
│   │   │       └── RequestBuilder.tsx
│   │   ├── components/    # UIコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── types/         # 型定義
│   │   └── services/      # APIサービス
│   └── package.json
├── functions/             # Cloud Functions
│   ├── src/
│   │   ├── index.ts       # エントリポイント
│   │   ├── functions/     # 各API関数
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

### 4.2 計画中（次のタスク）

| Phase | 内容 | 優先度 |
|-------|------|--------|
| - | ケア指示のFirestore保存 | 中 |
| - | 写真エビデンス表示 | 中 |
| - | 複数入居者対応 | 中 |

### 4.3 Phase 5.8 管理設定テスト機能（完了）

**設計書**: `docs/ADMIN_TEST_FEATURE_SPEC.md`

| 項目 | 状態 |
|------|------|
| 詳細設計 | ✅ 完了 |
| API仕様（API_SPEC.md） | ✅ 完了 |
| UI仕様（SETTINGS_MODAL_UI_SPEC.md） | ✅ 完了 |
| 実装 | ✅ 完了 |
| v1.1改善（本番形式テスト、親切なエラーメッセージ） | ✅ 完了 |
| v1.2 firebase.json設定（第2世代のみ対応） | ✅ 完了 |
| v1.3 第1世代関数SA修正（gcloudコマンド） | ✅ 動作確認完了 |

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
[家族指示(Plan)] → [モックデータ] (将来: Firestore care_instructions/)
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
| 2025-12-15 | 業務ルール・データ仕様セクション追加（投稿IDルール等） |
| 2025-12-15 | Cloud Functions SA問題のトラブルシューティング追加 |
| 2025-12-15 | Phase 5.8 v1.3完了、第1世代関数SA修正 |
| 2025-12-15 | Phase 5.8完了、サービスアカウント情報整理 |
| 2025-12-15 | 初版作成（Phase 7.1完了時点） |
