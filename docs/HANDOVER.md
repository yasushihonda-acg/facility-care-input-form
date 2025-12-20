---
status: canonical
scope: ops
owner: core-team
last_reviewed: 2025-12-20
---

# 引き継ぎドキュメント

> **最終更新**: 2025年12月20日（Phase 15.7仕上げ・ドキュメント整備完了）
>
> 本ドキュメントは、開発を引き継ぐ際に必要な情報をまとめたものです。

---

## クイックスタート（5分で把握）

### 今すぐ確認すべきこと

| 優先度 | 確認項目 | URL/コマンド |
|--------|----------|--------------|
| ⭐⭐⭐ | デモサイト動作確認 | https://facility-care-input-form.web.app |
| ⭐⭐⭐ | 現在の進捗確認 | `docs/CURRENT_STATUS.md` を読む |
| ⭐⭐ | APIヘルスチェック | `curl https://asia-northeast1-facility-care-input-form.cloudfunctions.net/healthCheck` |

### ドキュメント優先順位

```
1. docs/CURRENT_STATUS.md  ← 最初に読む（進捗・次のタスク）
2. docs/HANDOVER.md        ← 今読んでいるこのファイル（全体像）
3. CLAUDE.md               ← アカウント設定・開発方針
4. docs/API_SPEC.md        ← API仕様（必要に応じて）
```

### 開発再開の3ステップ

```bash
# 1. リポジトリクローン（初回のみ）
git clone https://github.com/yasushihonda-acg/facility-care-input-form.git

# 2. アカウント切り替え
gh auth switch --user yasushihonda-acg
gcloud config set account yasushi.honda@aozora-cg.com
firebase login:use yasushi.honda@aozora-cg.com

# 3. 開発サーバー起動
cd frontend && npm install && npm run dev
```

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
| 写真アップロード | Firebase Storageへの画像保存 | ✅ 完了 |
| 家族ビュー | 家族向けタイムライン・エビデンス表示 | ✅ 完了 |
| 予実管理 | Plan（指示）とResult（実績）の対比 | ✅ 完了 |
| 管理設定テスト | Webhook/Driveの事前テスト | ✅ 完了 |
| 品物管理 | 家族からの差し入れ品物の登録・追跡 | ✅ 完了 |
| タスク管理 | 賞味期限警告・リマインダー等のタスク管理 | ✅ 完了 |
| 統計ダッシュボード | 品物状況・アラートの可視化 | ✅ 完了 |
| AI品物提案 | Gemini APIによる賞味期限・提供方法の自動提案 | ✅ 完了 |
| AI摂食傾向分析 | Gemini APIによる摂食傾向分析・改善提案 | ✅ 完了 |
| プリセット管理 | 「いつもの指示」のCRUD管理・AI自動ストック | ✅ 完了 |
| 消費記録連携 | 提供・摂食記録API、タイムライン表示 | ✅ 完了 |
| 禁止ルール機能 | 提供禁止品目の設定・警告表示 | ✅ 完了 |
| 統計拡張 | 在庫サマリー・摂食傾向分析 | ✅ 完了 |
| デモショーケース | デモ専用ページ・シードデータ・フック対応 | ✅ 完了 |
| ツアーナビゲーション | ヘッダーに「← ツアーTOPに戻る」ボタン常時表示 | ✅ 完了 |
| デモモード書き込み安全対策 | デモモードでの書き込み操作は本番に影響しない | ✅ 完了 |
| 家族向けデモ特化リデザイン | スタッフ機能分離、家族視点6ステップツアー | ✅ 完了 |
| 間食記録連携 | スタッフ食事入力と家族品物管理の連携 | ✅ 完了 |
| E2Eパリティテスト | デモ↔本番同一性検証（196テスト） | ✅ 完了 |
| FoodMaster食品マスタ | AI提案キャッシュ・正規化情報管理 | ✅ 完了 |
| FoodMaster自動蓄積 | 本番モードでAI結果を自動保存（学習するシステム） | ✅ 完了 |
| FIFO対応 | 品物を期限順表示、同一品物アラート、先消費推奨ガイド | ✅ 完了 |
| 手動登録時プリセット保存提案 | AI提案以外の手動登録時にもプリセット保存を提案 | ✅ 完了 |
| 品物起点の間食記録 | 「品物から記録」タブで直感的な間食記録（Phase 13.0） | ✅ 完了 |
| スケジュール拡張 | 毎日・曜日指定・複数日のスケジュール設定（Phase 13.1） | ✅ 完了 |
| スタッフ向けスケジュール表示 | 曜日バッジ・次回予定日・タイムスロット表示（Phase 13.2） | ✅ 完了 |
| スタッフ用デモページ | スタッフ向けデモ体験（/demo/staff）、ガイドツアー（Phase 14） | ✅ 完了 |
| スタッフ記録入力フォーム統一 | タブ削除、統一ダイアログ、家族連絡詳細対応（Phase 15） | ✅ 完了 |
| 摂食割合の数値入力 | 絵文字→0-10数値入力、残り対応フィールド追加（Phase 15.6） | ✅ 完了 |
| **残り対応による在庫計算分離** | 破棄/保存で在庫控除を分離、廃棄量記録（Phase 15.7） | ✅ 完了 |
| 写真エビデンス表示 | スタッフ写真を家族向けエビデンス画面で表示（Phase 16） | ✅ 完了 |
| Firebase Storage 写真連携 | Google Drive → Firebase Storage 移行（Phase 17） | ✅ 完了 |
| **チャット連携機能** | 品物起点のスタッフ⇔家族チャット、フッター通知バッジ（Phase 18） | ✅ 完了 |
| **記録のチャット連携** | 提供記録のスレッド自動反映、RecordMessageCard、ホーム通知（Phase 19） | ✅ 完了 |

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

# Firebase（アカウント認証 + プロジェクト切替）
firebase login:list                              # 現在のアカウント確認
firebase login:use yasushi.honda@aozora-cg.com   # アカウント切替（未登録なら firebase login:add を先に実行）
firebase use facility-care-input-form            # プロジェクト切替
```

**注意**: Firebase CLIはGCPとは別の認証システムです。`gcloud config set account`してもFirebase CLIには反映されません。詳細は「8.3 Firebase CLI 認証エラー」を参照。

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
│   │   │   │   ├── StatsDashboard.tsx # 統計ダッシュボード
│   │   │   │   ├── ChatListPage.tsx   # チャット一覧 ✅ Phase 18
│   │   │   │   └── ItemChatPage.tsx   # 品物チャット ✅ Phase 18/19
│   │   │   ├── demo/                 # デモ専用ページ
│   │   │   │   ├── DemoHome.tsx           # 家族デモホーム
│   │   │   │   ├── DemoShowcase.tsx       # 家族ガイド付きツアー
│   │   │   │   ├── DemoStaffHome.tsx      # スタッフデモホーム ✅ Phase 14
│   │   │   │   └── DemoStaffShowcase.tsx  # スタッフガイド付きツアー ✅ Phase 14
│   │   │   └── family/               # 家族向けページ
│   │   │       ├── FamilyDashboard.tsx
│   │   │       ├── EvidenceMonitor.tsx
│   │   │       ├── RequestBuilder.tsx
│   │   │       ├── ItemManagement.tsx  # 品物管理
│   │   │       ├── ItemForm.tsx        # 品物登録（AI提案統合）
│   │   │       ├── TaskList.tsx        # タスク一覧
│   │   │       └── PresetManagement.tsx # プリセット管理
│   │   ├── components/    # UIコンポーネント
│   │   │   ├── demo/
│   │   │   │   └── DemoHeaderButton.tsx   # ツアーTOPに戻るボタン
│   │   │   ├── shared/
│   │   │   │   └── NotificationSection.tsx  # ホーム通知セクション ✅ Phase 19
│   │   │   ├── staff/
│   │   │   │   └── StaffRecordDialog.tsx  # 統一記録入力ダイアログ ✅ Phase 15
│   │   │   ├── meal/
│   │   │   │   ├── ScheduleDisplay.tsx       # スケジュール表示 ✅ Phase 13.2
│   │   │   │   └── WeekdayBadges.tsx         # 曜日バッジ ✅ Phase 13.2
│   │   │   └── family/
│   │   │       ├── AISuggestion.tsx         # AI品物提案カード
│   │   │       ├── AIAnalysis.tsx           # AI摂食傾向分析 ✅ Phase 8.4.1
│   │   │       ├── PresetSuggestion.tsx     # プリセット候補
│   │   │       ├── SaveAISuggestionDialog.tsx   # AI保存ダイアログ
│   │   │       ├── SaveManualPresetDialog.tsx  # 手動登録保存ダイアログ
│   │   │       ├── ServingScheduleInput.tsx    # スケジュール入力 ✅ Phase 13.1
│   │   │       ├── WeekdaySelector.tsx         # 曜日選択 ✅ Phase 13.1
│   │   │       └── MultipleDatePicker.tsx      # 複数日選択 ✅ Phase 13.1
│   │   ├── hooks/         # カスタムフック
│   │   │   ├── usePresets.ts   # プリセットCRUD
│   │   │   ├── useStats.ts     # 統計データ
│   │   │   ├── useAISuggest.ts # AI提案
│   │   │   └── useDemoMode.ts  # デモモード判定
│   │   ├── data/
│   │   │   └── demo/           # デモ用シードデータ
│   │   ├── types/         # 型定義
│   │   ├── utils/         # ユーティリティ
│   │   │   └── scheduleUtils.ts  # スケジュール判定・表示 ✅ Phase 13.1/13.2
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
│   │   │   ├── aiSuggest.ts  # AI品物提案
│   │   │   └── aiAnalyze.ts  # AI摂食傾向分析 ✅ Phase 8.4.1
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
| ⭐ | `docs/DEMO_SHOWCASE_SPEC.md` | デモショーケース設計（家族向け） |
| ⭐ | `docs/DEMO_STAFF_SPEC.md` | スタッフ用デモ設計（Phase 14） |
| ⭐ | `docs/STAFF_RECORD_FORM_SPEC.md` | スタッフ記録入力フォーム設計（Phase 15） |
| ⭐ | `docs/DEMO_FAMILY_REDESIGN.md` | 家族向けデモ特化リデザイン設計 |
| ⭐ | `docs/API_TEST_PLAN.md` | APIテスト計画・Firestore修正記録 |
| ⭐ | `docs/E2E_TEST_SPEC.md` | E2Eテスト仕様（Playwright） |
| ⭐ | `docs/SNACK_RECORD_INTEGRATION_SPEC.md` | 間食記録連携設計（スタッフ食事入力×品物管理） |
| ⭐ | `docs/QUALITY_CHECK_DEMO_WRITE_OPS.md` | デモモード書き込み安全対策の品質チェック |

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
| Phase 8.4 | AI品物提案UI統合 | 2025-12-16 |
| Phase 8.4.1 | AI摂食傾向分析 | 2025-12-18 |
| Phase 8.5 | プリセット提案統合 | 2025-12-16 |
| Phase 8.6 | プリセット管理CRUD | 2025-12-16 |
| Phase 8.7 | AI自動ストック | 2025-12-16 |
| Phase 9.0 | 在庫・消費追跡システム設計 | 2025-12-16 |
| Phase 9.1 | ルーティング・ページ実装 + バグ修正 | 2025-12-16 |
| Phase 9.2 | ConsumptionLog API・UI実装 | 2025-12-17 |
| Phase 9.x | 禁止ルール機能 | 2025-12-17 |
| Phase 9.3 | 統計ダッシュボード拡張 | 2025-12-17 |
| Demo | デモショーケース（全Phase完了） | 2025-12-17 |
| Demo | デモモード書き込み安全対策 | 2025-12-17 |
| Demo | 家族向けデモ特化リデザイン | 2025-12-17 |
| 間食記録連携 | スタッフ食事入力×家族品物管理連携（全6Phase） | 2025-12-18 |
| Phase 13.0 | 品物起点の間食記録（タブUI・リスト・モーダル・API連携） | 2025-12-19 |
| Phase 13.1 | スケジュール拡張（曜日指定・複数日・E2E 7件） | 2025-12-19 |
| Phase 13.2 | スタッフ向けスケジュール表示強化（曜日バッジ・次回予定日） | 2025-12-19 |
| Phase 14 | スタッフ用デモページ（DemoStaffHome・DemoStaffShowcase・E2Eテスト17件追加） | 2025-12-19 |
| Phase 15 | スタッフ記録入力フォーム統一（タブ削除、StaffRecordDialog統一、E2Eテスト22件） | 2025-12-19 |
| Phase 15.6 | 摂食割合の数値入力（0-10）・残り対応フィールド（破棄/保存/その他） | 2025-12-19 |
| Phase 16 | 写真エビデンス表示（EvidenceMonitor実画像表示、デモ対応、E2E 5件） | 2025-12-19 |
| Phase 17 | Firebase Storage写真連携（Drive→Storage移行、care_photos、Webhook連携、E2E検証） | 2025-12-19 |
| Phase 18 | チャット連携機能（品物チャット、フッター通知バッジ、E2Eテスト16件） | 2025-12-20 |
| Phase 19 | 記録のチャット連携（記録自動反映、RecordMessageCard、ホーム通知、E2Eテスト8件） | 2025-12-20 |

### 4.2 将来のタスク

| 機能 | 内容 | 優先度 |
|------|------|--------|
| ケア指示のFirestore保存 | モックデータ → Firestore永続化 | 中 |
| 週次レポート生成 | Gemini APIによる週次サマリー自動生成 | 中 |
| CSVエクスポート | 表示中のデータをCSVでダウンロード | 低 |

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

### 4.4 Phase 16-17 写真連携機能（完了）

**設計書**:
- `docs/PHOTO_EVIDENCE_DISPLAY_SPEC.md` - 写真エビデンス表示設計
- `docs/FIREBASE_STORAGE_MIGRATION_SPEC.md` - Firebase Storage移行仕様

#### Phase 16: 写真エビデンス表示（2025-12-19）

スタッフがアップロードした写真を家族向けエビデンス画面で表示する機能。

| 項目 | 内容 |
|------|------|
| 対象 | EvidenceMonitor.tsx - プレースホルダーから実画像表示に変更 |
| デモ対応 | demoFamilyData.ts に実画像URL（picsum.photos）追加 |
| ルーティング | App.tsx に `/demo/family/evidence/:date` 追加 |
| E2Eテスト | photo-evidence.spec.ts（5件） |

#### Phase 17: Firebase Storage 写真連携（2025-12-19）

写真保存先をGoogle DriveからFirebase Storageに移行。Firestoreで写真メタデータを管理。

| サブフェーズ | 内容 | 状態 |
|-------------|------|------|
| 17.1 | Firebase Storage基盤準備（storage.rules） | ✅ 完了 |
| 17.2 | バックエンド - Storage移行（storageService.ts） | ✅ 完了 |
| 17.3 | バックエンド - 写真取得API（getCarePhotos） | ✅ 完了 |
| 17.4 | バックエンド - Webhook連携・型拡張 | ✅ 完了 |
| 17.5 | バックエンド - クリーンアップ（Drive関連削除） | ✅ 完了 |
| 17.6 | フロントエンド実装（useCarePhotos等） | ✅ 完了 |
| 17.7 | ドキュメント更新 | ✅ 完了 |
| 17.8 | テスト・デプロイ・本番確認 | ✅ 完了 |

**主な実装ファイル**:

| 領域 | ファイル | 内容 |
|------|----------|------|
| Storage Rules | `storage.rules` | 読み取り公開設定 |
| バックエンド | `functions/src/services/storageService.ts` | Storage操作サービス（新規） |
| バックエンド | `functions/src/functions/getCarePhotos.ts` | 写真取得API（新規） |
| バックエンド | `functions/src/functions/uploadCareImage.ts` | Drive→Storage移行 |
| フロントエンド | `frontend/src/hooks/useCarePhotos.ts` | 写真取得フック（新規） |
| フロントエンド | `frontend/src/components/MealSettingsModal.tsx` | Drive設定削除・簡素化 |

**削除ファイル**:
- `functions/src/services/driveService.ts`（Google Drive連携）
- `functions/src/functions/testDriveAccess.ts`（Drive接続テスト）

**Firestoreコレクション**: `care_photos`
- 入居者・日付・食事時間で写真メタデータを管理
- 複合インデックス: `residentId` + `date` + `uploadedAt(desc)`

**データフロー**:
```
1. スタッフが写真を選択して送信
2. uploadCareImage → Firebase Storage に保存
3. Firestore care_photos コレクションにメタデータ保存
4. submitMealRecord に photoUrl を渡す
5. Google Chat Webhook に写真URLを含めて送信
6. 家族画面で getCarePhotos から写真を取得して表示
```

### 4.5 Phase 18-19 チャット連携機能（完了）

**設計書**:
- `docs/CHAT_INTEGRATION_SPEC.md` - チャット連携設計書

#### Phase 18: チャット連携基本（2025-12-20）

品物を起点としたスタッフ⇔家族のチャット機能。

| サブフェーズ | 内容 | 状態 |
|-------------|------|------|
| 18.1 | データモデル・API基盤（sendMessage, getMessages, markAsRead等） | ✅ 完了 |
| 18.2 | チャットUI基盤（ChatListPage, ItemChatPage） | ✅ 完了 |
| 18.3 | 通知システム（フッター未読バッジ） | ✅ 完了 |
| 18.4 | 家族側チャット連携（品物詳細からのチャット開始） | ✅ 完了 |
| 18.5 | デモモード対応・テスト（E2Eテスト16件） | ✅ 完了 |

**主な実装ファイル**:

| 領域 | ファイル | 内容 |
|------|----------|------|
| バックエンド | `functions/src/functions/chat.ts` | チャットAPI（新規） |
| フロントエンド | `frontend/src/pages/shared/ChatListPage.tsx` | チャット一覧（新規） |
| フロントエンド | `frontend/src/pages/shared/ItemChatPage.tsx` | 品物チャット（新規） |
| フロントエンド | `frontend/src/components/FooterNav.tsx` | チャットタブ・未読バッジ追加 |
| フロントエンド | `frontend/src/types/chat.ts` | チャット型定義（新規） |

**Firestoreコレクション**: `care_items/{itemId}/messages`
- 品物ごとのメッセージスレッドを管理
- type: 'text' | 'record' | 'system'

#### Phase 19: 記録のチャット連携（2025-12-20）

提供記録がチャットスレッドに自動反映される機能。

| サブフェーズ | 内容 | 状態 |
|-------------|------|------|
| 19.1 | バックエンド - submitMealRecord拡張（記録→メッセージ自動作成） | ✅ 完了 |
| 19.2 | フロントエンド - RecordMessageCard（type='record'のカード表示） | ✅ 完了 |
| 19.3 | フロントエンド - ホーム通知セクション（NotificationSection） | ✅ 完了 |
| 19.4 | E2Eテスト・デプロイ（8件） | ✅ 完了 |

**主な実装ファイル**:

| 領域 | ファイル | 内容 |
|------|----------|------|
| バックエンド | `functions/src/functions/submitMealRecord.ts` | 記録保存時にメッセージ自動作成 |
| フロントエンド | `frontend/src/pages/shared/ItemChatPage.tsx` | RecordMessageCard追加 |
| フロントエンド | `frontend/src/components/shared/NotificationSection.tsx` | ホーム通知セクション（新規） |
| フロントエンド | `frontend/src/pages/staff/StaffHome.tsx` | 通知セクション追加 |
| フロントエンド | `frontend/src/pages/family/FamilyDashboard.tsx` | 通知セクション追加 |

**データフロー（記録→チャット）**:
```
1. スタッフがMealInputPageで記録を入力
2. submitMealRecord API 呼び出し
3. Sheet B への書き込み（既存処理）
4. snackRecords内のitemIdごとにtype='record'メッセージ自動作成
5. 通知を生成（家族向け）
6. 家族・スタッフがチャットスレッド/ホーム通知で記録を確認
```

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
| 用途 | Cloud Functions実行、CI/CD、スプレッドシート連携、Firebase Storage連携 |

**外部サービス共有設定**:

| 対象 | 権限 |
|------|------|
| Sheet A（記録の結果） | 閲覧者 |
| Sheet B（実績入力先） | 編集者 |
| Firebase Storage | 自動（同一プロジェクト内） |

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
| `care_photos` | residentId + date + uploadedAt(desc) | 写真取得クエリ（Phase 17） |

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

### 7.3 E2Eテスト

```bash
# ローカルでテスト（preview server使用）
cd frontend && npm run build
npm run preview -- --port 4173 &
npx playwright test

# 特定のテストを実行
npx playwright test e2e/demo-page.spec.ts

# 本番環境でテスト（環境変数で指定）
BASE_URL=https://facility-care-input-form.web.app npx playwright test
```

**テスト構成**:
- `frontend/e2e/` - E2Eテストファイル
- `frontend/playwright.config.ts` - Playwright設定
- デフォルトbaseURL: `http://localhost:4173`（環境変数で上書き可能）

**現在のテスト**: 全216件（3件スキップ）
| ファイル | 件数 | 内容 |
|----------|------|------|
| `demo-page.spec.ts` | 43件 | デモページ基本動作・ナビゲーション |
| `family-user-scenario.spec.ts` | 34件 | 家族シナリオ・パリティ・本番準備 |
| `staff-record-form.spec.ts` | 22件 | スタッフ記録入力フォーム統一（Phase 15） |
| `family-page.spec.ts` | 21件 | 家族ページ（品物詳細・消費ログ等） |
| `demo-staff.spec.ts` | 17件 | スタッフ用デモ（Phase 14） |
| `chat-integration.spec.ts` | 16件 | チャット連携基本動作（Phase 18） |
| `item-based-snack-record.spec.ts` | 13件 | 品物起点の間食記録（Phase 13.0） |
| `snack-record.spec.ts` | 11件 | 間食記録連携（品物リスト・サジェスト） |
| `record-chat-integration.spec.ts` | 8件 | 記録のチャット連携（Phase 19） |
| `fifo.spec.ts` | 8件 | FIFO機能（期限順ソート・推奨表示） |
| `schedule-extension.spec.ts` | 7件 | スケジュール拡張（Phase 13.1） |
| `schedule-display.spec.ts` | 7件 | スケジュール表示強化（Phase 13.2） |
| `photo-evidence.spec.ts` | 5件 | 写真エビデンス表示（Phase 16） |

**パリティテスト**: デモと本番で同じUIが表示されることを検証
- デモツアー完了 = 本番利用スキル習得

---

## 8. トラブルシューティング

### 8.1 よくある問題

| 問題 | 解決策 |
|------|--------|
| APIがCORSエラー | Cloud Functionsの `setCors` 関数を確認 |
| Firestoreアクセス拒否 | `firestore.rules` のルールを確認（Dev Mode: `allow read, write: if true;`） |
| Firestore 500エラー（インデックス不足） | 下記「Firestoreインデックス」セクション参照 |
| スプレッドシート権限エラー | サービスアカウントに共有設定を確認 |
| GitHub Actions失敗 | `GCP_SA_KEY` シークレットの設定を確認 |
| Storage写真表示されない | `storage.rules` の読み取り許可を確認 |

### 8.1.1 Firestoreインデックスエラー

**症状**: APIが500エラーを返し、ログに `FAILED_PRECONDITION: The query requires an index` が表示される

**原因**: 複合クエリに必要なインデックスが不足

**解決方法**:

```bash
# 1. Cloud Functionsのログでエラーを確認
gcloud functions logs read <関数名> --region=asia-northeast1 --limit=10

# 2. エラーメッセージ内のURLをクリックしてインデックスを自動作成
#    または、gcloudでインデックスを手動作成
gcloud firestore indexes composite create \
  --collection-group=<コレクション名> \
  --field-config=field-path=<フィールド1>,order=ascending \
  --field-config=field-path=<フィールド2>,order=descending \
  --project=facility-care-input-form

# 3. インデックス状態を確認（READYになるまで数分待つ）
gcloud firestore indexes composite list --project=facility-care-input-form
```

**既存インデックス**: `firestore.indexes.json` を参照

### 8.2 Cloud Functions サービスアカウント（重要）

**問題**: Cloud Functionsが間違ったサービスアカウントを使用している

**原因と解決**:

`firebase.json` の `serviceAccount` フィールドは**Cloud Functions第2世代のみ**対応しています。
このプロジェクトは第1世代関数のため、gcloudコマンドで直接指定する必要があります。

```bash
# 現在のSAを確認
gcloud functions describe uploadCareImage --region=asia-northeast1 | grep serviceAccountEmail

# 第1世代関数のSA変更コマンド
gcloud functions deploy <関数名> \
  --region=asia-northeast1 \
  --project=facility-care-input-form \
  --service-account=facility-care-sa@facility-care-input-form.iam.gserviceaccount.com \
  --trigger-http \
  --allow-unauthenticated \
  --runtime=nodejs20
```

**対象関数**: `uploadCareImage`, `getCarePhotos`, `submitMealRecord` など外部サービス連携する関数

### 8.3 Firebase CLI 認証エラー

**問題**: `firebase deploy` で「Failed to get Firebase project」エラーが発生

```
Error: Failed to get Firebase project facility-care-input-form.
Please make sure the project exists and your account has permission to access it.
```

**原因**: Firebase CLIが別のGoogleアカウントでログインしている

**解決手順**:

```bash
# 1. 現在のログインアカウントを確認
firebase login:list

# 2. 正しいアカウント（yasushi.honda@aozora-cg.com）でログイン
#    ブラウザが開くのでログインしてください
firebase login:add

# 3. アカウントを切り替え
firebase login:use yasushi.honda@aozora-cg.com

# 4. プロジェクト確認
firebase use facility-care-input-form

# 5. 動作確認
firebase projects:list
```

**注意**:
- Firebase CLIとGCP CLIは別の認証システム
- GCPで`gcloud config set account`しても、Firebase CLIには反映されない
- 複数アカウントを`login:add`で追加し、`login:use`で切り替え可能

### 8.4 Firestore undefined エラー（修正済み）

**問題**: 品物登録などでオプショナルフィールドが未入力の場合、Firestoreエラーが発生

```
Value for argument 'data' is not a valid Firestore document.
Cannot use 'undefined' as a Firestore value (found in field 'noteToStaff')
```

**原因**: オプショナルフィールド（`noteToStaff`, `expirationDate`等）が `undefined` のままFirestoreに渡される

**解決**: `functions/src/index.ts` で Firebase Admin SDK 初期化時に設定追加

```typescript
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});
```

**影響範囲**: 全ての Firestore 書き込み API に適用

**検証**: 全APIでテスト済み（詳細は `docs/API_TEST_PLAN.md` 参照）

### 8.5 ログ確認

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

## 11. 保守運用向け改善提案

### 11.1 ドキュメント分類

現在41個のドキュメントがあります。保守性向上のため、以下の分類を推奨：

| カテゴリ | ファイル数 | 説明 |
|----------|-----------|------|
| **必読（引き継ぎ）** | 4 | CURRENT_STATUS, HANDOVER, ROADMAP, CLAUDE.md |
| **仕様書（永続）** | 25 | API_SPEC, *_SPEC.md 等 |
| **作業記録（アーカイブ候補）** | 4 | FIX_*, API_TEST_PLAN, QUALITY_CHECK_* |
| **データ構造** | 3 | SHEET_*_STRUCTURE, TABLE_VIEW_COLUMNS |
| **その他** | 5 | SETUP, DESIGN_GUIDELINES 等 |

### 11.2 今後のアーカイブ候補

以下は作業記録であり、`docs/archive/` への移動を検討：

- `FIX_DEMO_NAVIGATION.md` - デモナビ修正記録
- `API_TEST_PLAN.md` - Firestoreエラー検証記録
- `QUALITY_CHECK_DEMO_WRITE_OPS.md` - 品質チェック記録
- `MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md` - MoE分析記録

### 11.3 定期メンテナンス推奨

| 頻度 | タスク |
|------|--------|
| 機能追加時 | CURRENT_STATUS.md更新、ROADMAP.md Phase追加 |
| 月次 | HANDOVER.md機能リスト確認、E2Eテスト件数確認 |
| 四半期 | 不要ドキュメントアーカイブ、リンク切れ確認 |

---

## 12. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-20 | **Phase 15.7: 残り対応による在庫・統計分離**（破棄=全量控除、保存=食べた分控除、wastedQuantity追加、E2Eテスト4件追加）、全216件 |
| 2025-12-20 | チャットページフッター修正（ItemChatPage・ChatListPageにFooterNav追加）、getCareItems itemId対応、デモチャットシードデータ追加 |
| 2025-12-20 | Phase 19: 記録のチャット連携完了（記録自動反映・RecordMessageCard・ホーム通知・E2Eテスト8件追加）、全212件 |
| 2025-12-20 | Phase 18: チャット連携機能完了（品物チャット・フッター通知バッジ・E2Eテスト16件追加） |
| 2025-12-19 | Phase 15.6: 摂食割合の数値入力（0-10）・残り対応フィールド（破棄/保存/その他、持ち帰り除外）、E2Eテスト183件 |
| 2025-12-19 | Phase 15: スタッフ記録入力フォーム統一（タブ削除・StaffRecordDialog・家族連絡詳細対応・E2Eテスト22件追加） |
| 2025-12-19 | Phase 14: スタッフ用デモページ（DemoStaffHome・DemoStaffShowcase・E2Eテスト17件追加）、E2Eテスト161件 |
| 2025-12-19 | Phase 13.2: スタッフ向けスケジュール表示強化（ScheduleDisplay・WeekdayBadges・E2Eテスト7件追加）、E2Eテスト144件 |
| 2025-12-19 | Phase 13.1: スケジュール拡張（曜日指定・複数日・ServingSchedule型・E2Eテスト7件追加）、E2Eテスト137件 |
| 2025-12-19 | Phase 13.0: 品物起点の間食記録（タブUI・品物リスト・記録モーダル・API連携・E2Eテスト13件追加）、E2Eテスト130件 |
| 2025-12-18 | Phase 12.1: 手動登録時プリセット保存提案、E2Eテスト117件 |
| 2025-12-18 | Phase 12.0: FIFO対応完了、ドキュメント整合性チェック実施 |
| 2025-12-18 | Phase 8.4.1: AI摂食傾向分析（aiAnalyze API + StatsDashboard統合） |
| 2025-12-18 | 間食記録連携機能 全6Phase完了、E2Eテスト109件に拡張 |
| 2025-12-18 | E2Eパリティテスト追加、全77件に拡張、「デモ=本番」検証完了 |
| 2025-12-17 | 家族向けデモ特化リデザイン完了、E2Eテスト43件 |
| 2025-12-17 | ツアーナビゲーション改善（TourReturnBanner）|
| 2025-12-17 | デモモードナビゲーション修正（E2Eテスト追加） |
| 2025-12-17 | デモショーケース全Phase完了、ドキュメント整合性更新 |
| 2025-12-17 | Phase 9.2/9.3/禁止ルール完了追加、デモショーケース進行中追加 |
| 2025-12-16 | Phase 9.0/9.1完了追加、計画中をPhase 9.2/9.3に更新 |
| 2025-12-16 | Firebase CLI認証トラブルシューティング追加（8.3節）、認証手順整理 |
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
