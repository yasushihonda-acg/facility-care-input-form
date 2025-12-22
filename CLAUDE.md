# CLAUDE.md - プロジェクト設定・記憶ファイル

このファイルはClaude Codeがプロジェクトを効率的に扱うための設定・記憶を保存します。

---

## 開発方針

### ドキュメント更新ルール

**重要**: ドキュメントは引き継ぎ品質を維持すること。

#### 基本原則
- **新規ファイル作成禁止**: 既存ドキュメントにセクション追加
- **「どう使うか」を記載**: 実装詳細はコミットメッセージに残す
- **Phase仕様書は作らない**: 完了した機能は既存ドキュメントに統合

#### アクティブドキュメント（6ファイルのみ）
| ファイル | 更新タイミング |
|----------|---------------|
| `docs/HANDOVER.md` | クイックスタートに影響する変更時 |
| `docs/API_SPEC.md` | 新規/変更エンドポイント追加時 |
| `docs/ARCHITECTURE.md` | データフロー変更時 |
| `docs/BUSINESS_RULES.md` | 業務ルール変更時 |
| `docs/DATA_MODEL.md` | Firestore構造変更時 |
| `docs/SETUP.md` | 環境構築手順変更時 |

#### 過去仕様書
- `docs/archive/` に保存（参照用）
- 新規追加しない

#### 作業フロー
1. **作業前**: `docs/HANDOVER.md` でクイックスタート確認
2. **作業中**: 必要に応じて上記6ファイルを参照
3. **作業後**: 影響があるドキュメントのみ更新（全て更新は不要）

### Gitコミット・Push（必須）

**重要**: 作業完了時は必ずコミット＆リモートへpushすること。

1. **タイミング**: 機能実装完了時、ドキュメント更新時、区切りのいいタイミング
2. **コミット**: 変更内容を適切なメッセージでコミット
3. **Push**: `git push origin main` でリモートリポジトリに反映
4. **確認**: 会話クリア前に必ず未pushの変更がないか確認

### 本番デプロイ（自動）

**重要**: 本番デプロイは `git push origin main` で自動実行される。手動デプロイは不要。

- mainブランチへのpush時に `deploy.yml` ワークフローが自動実行
- Functions、Hosting、Firestore Rulesが自動デプロイされる
- **`firebase deploy` コマンドを手動で実行する必要はない**
- デプロイ状況は `gh run list` で確認可能

```bash
# デプロイ状況確認
gh run list --repo yasushihonda-acg/facility-care-input-form --limit 3
```

### GitHub Pages（プロジェクト紹介ページ）

**公開URL**: https://yasushihonda-acg.github.io/facility-care-input-form/

**ディレクトリ**: `gh-pages/`
- `index.html` - プロジェクト概要ページ（Mermaid図付き）
- `architecture.html` - アーキテクチャ詳細ページ（シーケンス図含む）

**自動デプロイ**: `gh-pages/` の変更がmainにpushされると自動デプロイ
- ワークフロー: `.github/workflows/gh-pages.yml`

**更新方法**:
1. `gh-pages/` 内のHTMLファイルを編集
2. `git add gh-pages/ && git commit -m "docs: GitHub Pages更新" && git push origin main`
3. 自動でGitHub Actionsがデプロイ（約30秒）

**手動デプロイ（必要時）**:
```bash
gh workflow run gh-pages.yml --repo yasushihonda-acg/facility-care-input-form
```

**デプロイ状況確認**:
```bash
gh run list --repo yasushihonda-acg/facility-care-input-form --workflow=gh-pages.yml --limit 1
```

### アプリケーションURL

**本番サイト**: https://facility-care-input-form.web.app

| ページ | URL | 説明 |
|--------|-----|------|
| デモホーム | `/demo` | デモショーケース入り口 |
| 家族デモ | `/demo/family` | 家族向けデモガイドツアー |
| **スタッフデモ** | `/demo/staff` | スタッフ向けデモホーム（NEW） |
| スタッフ用 | `/staff/input/meal` | 食事記録入力 |
| 家族用 | `/family` | 家族ダッシュボード |
| **設定** | `/settings` | グローバル初期値設定（独立ページ） |
| 統計 | `/stats` | 統計ダッシュボード |

### 主要ドキュメント

| ファイル | 用途 |
|----------|------|
| `docs/HANDOVER.md` | **引き継ぎドキュメント**（クイックスタート・環境設定） |
| `docs/ARCHITECTURE.md` | システム全体設計・データフロー |
| `docs/API_SPEC.md` | API仕様書（全エンドポイント） |
| `docs/BUSINESS_RULES.md` | 業務ルール・投稿IDルール |
| `docs/DATA_MODEL.md` | データモデル定義 |
| `docs/SETUP.md` | 環境セットアップガイド |
| `docs/archive/` | 参照用ファイル（シート構造・同期仕様） |

---

## アカウント設定

### GitHub
- **アカウント**: `yasushihonda-acg`
- **リポジトリ**: `yasushihonda-acg/facility-care-input-form`
- **認証切替**: `gh auth switch --user yasushihonda-acg`
- **リポジトリ種別**: Public
- **GitHub Pages**: https://yasushihonda-acg.github.io/facility-care-input-form/

### GCP
- **アカウント**: `yasushi.honda@aozora-cg.com`
- **プロジェクトID**: `facility-care-input-form`
- **プロジェクト番号**: `672520607884`
- **リージョン**: `asia-northeast1` (東京)
- **認証切替**: `gcloud config set account yasushi.honda@aozora-cg.com`

### Firebase
- **アカウント**: `yasushi.honda@aozora-cg.com`（GCPと同一）
- **プロジェクト**: `facility-care-input-form`
- **認証確認**: `firebase login:list`
- **プロジェクト切替**: `firebase use facility-care-input-form`

**注意**: Firebase CLIはGCPとは別の認証システムです。初回または別アカウントでログイン中の場合は、以下の手順でアカウントを設定してください：

```bash
# 1. 現在のログイン状態を確認
firebase login:list

# 2. 正しいアカウントでログイン（ブラウザが開きます）
firebase login:add

# 3. プロジェクト用アカウントに切替
firebase login:use yasushi.honda@aozora-cg.com

# 4. プロジェクト確認
firebase use facility-care-input-form
```

---

## サービスアカウント

### プロジェクト統一サービスアカウント

**重要**: 本プロジェクトでは以下の単一サービスアカウントに統一。不要なSAは作成しないこと。

| 項目 | 値 |
|------|-----|
| 名前 | `facility-care-sa` |
| メール | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |
| キーファイル | `keys/sa-key.json` (Git管理外) |
| 用途 | Cloud Functions実行、CI/CD、スプレッドシート連携、Firebase Storage連携 |
| 権限 | `roles/datastore.user`, `roles/cloudfunctions.invoker`, `roles/firebase.admin`, `roles/cloudfunctions.developer`, `roles/run.admin`, `roles/iam.serviceAccountUser` |

### 外部サービス共有設定

スプレッドシートを共有する際は、必ず上記の統一SAを使用：

| 対象 | 共有先SA | 権限 |
|------|----------|------|
| Sheet A（記録の結果） | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | 閲覧者 |
| Sheet B（実績入力先） | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | 編集者 |
| 水分摂取量シート | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | 編集者 |
| Firebase Storage | 同一プロジェクト内のため共有設定不要 | 自動 |

### GCP自動作成サービスアカウント（参考）

以下はGCP/Firebaseが自動作成するSA。**削除不可・変更不要**。プロジェクトでは使用しない。

| メール | 用途 | 備考 |
|--------|------|------|
| `facility-care-input-form@appspot.gserviceaccount.com` | App Engine default | GCP自動作成 |
| `672520607884-compute@developer.gserviceaccount.com` | Compute Engine default | GCP自動作成 |
| `firebase-adminsdk-fbsvc@facility-care-input-form.iam.gserviceaccount.com` | Firebase Admin SDK | Firebase自動作成 |

### Cloud Functions サービスアカウント指定

**重要**: Cloud Functions **第1世代**では、`firebase.json` の `serviceAccount` フィールドは機能しません。
第1世代関数のサービスアカウントを変更するには、gcloudコマンドで直接指定する必要があります。

#### 第1世代関数のSA変更コマンド

```bash
# 関数のSAを変更
gcloud functions deploy <関数名> \
  --region=asia-northeast1 \
  --project=facility-care-input-form \
  --service-account=facility-care-sa@facility-care-input-form.iam.gserviceaccount.com \
  --trigger-http \
  --allow-unauthenticated \
  --runtime=nodejs20

# 確認
gcloud functions describe <関数名> --region=asia-northeast1 | grep serviceAccountEmail
```

#### firebase.json の serviceAccount フィールド（第2世代のみ）

```json
{
  "functions": [
    {
      "source": "functions",
      "serviceAccount": "facility-care-sa@facility-care-input-form.iam.gserviceaccount.com"
    }
  ]
}
```

**注意**: この設定は**第2世代関数のみ**に適用されます。第1世代関数には効果がありません。

---

## スプレッドシート

| 用途 | Sheet ID | 共有状態 |
|------|----------|----------|
| Sheet A（記録の結果） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | ✅ 閲覧者で共有済み |
| Sheet B（実績入力先） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | ✅ 編集者で共有済み |
| 水分摂取量シート | `1su5K9TjmzMfKc8OIK2aZYXCfuDrNeIRM0a3LUCFcct4` | ✅ 編集者で共有済み |

※ 共有先SAは「サービスアカウント」セクション参照
※ 水分摂取量シートのシート名: `フォームの回答 1`

---

## 開発モード設定 (Dev Mode)

- **認証**: なし (`--allow-unauthenticated`)
- **Firestore**: 全開放 (`allow read, write: if true;`)
- **注意**: 本番移行時に必ず認証を実装すること

---

## CLI コマンドクイックリファレンス

### 環境セットアップ
```bash
# GitHub
gh auth switch --user yasushihonda-acg

# GCP
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form

# Firebase（アカウント確認・切替）
firebase login:list                              # 現在のアカウント確認
firebase login:use yasushi.honda@aozora-cg.com   # アカウント切替（未登録なら firebase login:add を先に実行）
firebase use facility-care-input-form            # プロジェクト切替
```

### 開発
```bash
# Emulator起動
firebase emulators:start --only functions,firestore

# Functions ビルド
npm run build --prefix functions

# Functions Lint
npm run lint --prefix functions

# Frontend ビルド
cd frontend && npm run build

# Frontend 開発サーバー
cd frontend && npm run dev
```

### デプロイ

> **重要**: 本番デプロイはGitHub Actionsで自動実行されます。
> mainブランチにpushすると `deploy.yml` が自動的にFirebaseへデプロイします。
> **手動での `firebase deploy` は不要です。**

```bash
# ※ 以下は緊急時・手動デプロイが必要な場合のみ使用
# 通常はgit push origin mainで自動デプロイされる

# Functions デプロイ
firebase deploy --only functions

# Hosting デプロイ（フロントエンド）
firebase deploy --only hosting

# Firestore Rules デプロイ
firebase deploy --only firestore:rules

# 全てデプロイ
firebase deploy
```

デプロイ状況確認:
```bash
gh run list --repo yasushihonda-acg/facility-care-input-form --limit 3
```

---

## ディレクトリ構造

```
facility-care-input-form/
├── CLAUDE.md              # このファイル
├── README.md
├── firebase.json
├── firestore.rules
├── frontend/              # デモ版PWA (React + Vite + TailwindCSS)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ViewPage.tsx       # 記録閲覧
│   │   │   ├── MealInputPage.tsx  # 食事入力フォーム
│   │   │   └── family/            # 家族向けページ
│   │   │       ├── FamilyDashboard.tsx  # View C: 家族ホーム
│   │   │       ├── EvidenceMonitor.tsx  # View A: エビデンス・モニター
│   │   │       └── RequestBuilder.tsx   # View B: ケア仕様ビルダー
│   │   ├── components/            # UIコンポーネント
│   │   │   └── family/            # 家族向けコンポーネント
│   │   ├── hooks/                 # カスタムフック
│   │   ├── types/                 # 型定義
│   │   ├── data/                  # デモ用データ
│   │   ├── utils/                 # ユーティリティ
│   │   └── config/                # 設定ファイル
│   └── package.json
├── functions/             # Cloud Functions
│   ├── src/
│   │   ├── index.ts               # エントリポイント
│   │   ├── functions/             # 各エンドポイント
│   │   └── services/              # サービス層
│   └── package.json
├── docs/
│   ├── CURRENT_STATUS.md  # 進捗管理（**再開時に最初に読む**）
│   ├── FAMILY_UX_DESIGN.md        # 家族向けUX設計（Phase 7.0）
│   ├── PLAN_RESULT_MANAGEMENT.md  # 予実管理設計（Phase 7.1）
│   └── ...                        # その他設計ドキュメント
├── keys/                  # サービスアカウントキー（Git管理外）
└── .github/workflows/     # CI/CD設定
```

---

## CI/CD (GitHub Actions)

### ワークフロー
- **ci.yml**: push/PR時にLint・ビルドチェック
- **deploy.yml**: mainブランチへのマージ時に自動デプロイ (functions/, firestore変更時のみ)

### シークレット設定 (設定済み)
- `GCP_SA_KEY`: サービスアカウントキー (JSON)

### サービスアカウント権限 (CI/CD用に追加済み)
- `roles/firebase.admin`
- `roles/cloudfunctions.developer`
- `roles/run.admin`
- `roles/iam.serviceAccountUser`

---

## 再開時の手順

1. `docs/CURRENT_STATUS.md` を読んで現在の進捗を確認
2. 必要に応じてアカウント切替を実行
3. 「次のタスク」セクションから作業を再開

---

## 注意事項

- `keys/` ディレクトリは絶対にGitにコミットしない
- `functions/.env` も Git管理外
- Privateリポジトリのため、GitHub Actionsではトークン認証を使用
