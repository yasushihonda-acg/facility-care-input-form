# CLAUDE.md - プロジェクト設定・記憶ファイル

このファイルはClaude Codeがプロジェクトを効率的に扱うための設定・記憶を保存します。

---

## 開発方針

### ドキュメントドリブン開発

**重要**: 本プロジェクトはドキュメントドリブンで進めること。

1. **作業前**: 必ず `docs/CURRENT_STATUS.md` と関連ドキュメントを確認
2. **作業中**: ドキュメントに記載された手順・仕様に従う
3. **作業後**: `docs/CURRENT_STATUS.md` を更新して進捗を反映
4. **判断基準**: 不明点はドキュメントを参照し、記載がなければユーザーに確認

### Gitコミット・Push（必須）

**重要**: 作業完了時は必ずコミット＆リモートへpushすること。

1. **タイミング**: 機能実装完了時、ドキュメント更新時、区切りのいいタイミング
2. **コミット**: 変更内容を適切なメッセージでコミット
3. **Push**: `git push origin main` でリモートリポジトリに反映
4. **確認**: 会話クリア前に必ず未pushの変更がないか確認

### 主要ドキュメント

| ファイル | 用途 |
|----------|------|
| `docs/CURRENT_STATUS.md` | 現在の進捗・次のタスク（**再開時に最初に読む**） |
| `docs/DEMO_PWA_SPEC.md` | デモ版PWA仕様（読み取り専用） |
| `docs/ROADMAP.md` | 開発ロードマップ・Phase別手順 |
| `docs/ARCHITECTURE.md` | システム設計・データフロー |
| `docs/BUSINESS_RULES.md` | 業務ルール・Bot連携ハック |
| `docs/API_SPEC.md` | API仕様書 |
| `docs/SHEET_B_STRUCTURE.md` | Sheet B（実績入力先）構造 |

---

## アカウント設定

### GitHub
- **アカウント**: `yasushihonda-acg`
- **リポジトリ**: `yasushihonda-acg/facility-care-input-form`
- **認証切替**: `gh auth switch --user yasushihonda-acg`
- **リポジトリ種別**: Private

### GCP
- **アカウント**: `yasushi.honda@aozora-cg.com`
- **プロジェクトID**: `facility-care-input-form`
- **プロジェクト番号**: `672520607884`
- **リージョン**: `asia-northeast1` (東京)
- **認証切替**: `gcloud config set account yasushi.honda@aozora-cg.com`

### Firebase
- **プロジェクト**: `facility-care-input-form`
- **認証切替**: `firebase use facility-care-input-form`

---

## サービスアカウント

**注意**: 本プロジェクトでは単一のサービスアカウントを使用。不要なSAは作成しないこと。

| 項目 | 値 |
|------|-----|
| 名前 | `facility-care-sa` |
| メール | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |
| キーファイル | `keys/sa-key.json` (Git管理外) |
| 用途 | Cloud Functions実行、CI/CD、スプレッドシート連携 |
| 権限 | `roles/datastore.user`, `roles/cloudfunctions.invoker`, `roles/firebase.admin`, `roles/cloudfunctions.developer`, `roles/run.admin`, `roles/iam.serviceAccountUser` |

---

## スプレッドシート

| 用途 | Sheet ID | 権限 | 共有状態 |
|------|----------|------|----------|
| Sheet A（記録の結果） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | 閲覧者 | 完了 |
| Sheet B（実績入力先） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | 編集者 | ブロック中（共有ドライブのセキュリティ制限） |

---

## 開発モード設定 (Dev Mode)

- **認証**: なし (`--allow-unauthenticated`)
- **Firestore**: 全開放 (`allow read, write: if true;`)
- **注意**: 本番移行時に必ず認証を実装すること

---

## CLI コマンドクイックリファレンス

### 環境セットアップ
```bash
# 全アカウント切替
gh auth switch --user yasushihonda-acg
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form
firebase use facility-care-input-form
```

### 開発
```bash
# Emulator起動
firebase emulators:start --only functions,firestore

# ビルド
npm run build --prefix functions

# Lint
npm run lint --prefix functions
```

### デプロイ
```bash
# Functions デプロイ
firebase deploy --only functions

# Firestore Rules デプロイ
firebase deploy --only firestore:rules
```

---

## ディレクトリ構造

```
facility-care-input-form/
├── CLAUDE.md              # このファイル
├── README.md
├── .firebaserc
├── .gitignore
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── docs/
│   ├── CURRENT_STATUS.md  # 進捗管理（再開時に最初に読む）
│   ├── ROADMAP.md         # 開発ロードマップ
│   ├── SETUP.md           # 環境構築手順
│   ├── ARCHITECTURE.md    # システム設計
│   ├── BUSINESS_RULES.md  # 業務ルール
│   └── API_SPEC.md        # API仕様
├── functions/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.js
│   └── .env               # 環境変数（Git管理外）
├── keys/                  # サービスアカウントキー（Git管理外）
│   └── sa-key.json
└── .github/
    └── workflows/         # CI/CD設定
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
