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

### 主要ドキュメント

#### 必読（再開時）
| ファイル | 用途 |
|----------|------|
| `docs/CURRENT_STATUS.md` | **現在の進捗・次のタスク**（再開時に最初に読む） |
| `docs/HANDOVER.md` | **引き継ぎドキュメント**（環境・設定・トラブルシューティング） |
| `docs/ROADMAP.md` | 開発ロードマップ・Phase別手順 |

#### 設計・仕様
| ファイル | 用途 |
|----------|------|
| `docs/ARCHITECTURE.md` | システム全体設計・データフロー |
| `docs/API_SPEC.md` | API仕様書（全エンドポイント） |
| `docs/BUSINESS_RULES.md` | 業務ルール・Bot連携ハック |

#### 機能別仕様
| ファイル | 用途 |
|----------|------|
| `docs/FAMILY_UX_DESIGN.md` | 家族向けUX設計（Phase 7.0） |
| `docs/PLAN_RESULT_MANAGEMENT.md` | 予実管理設計（Phase 7.1） |
| `docs/ADMIN_TEST_FEATURE_SPEC.md` | 管理設定テスト機能（Phase 5.8） |
| `docs/MEAL_INPUT_FORM_SPEC.md` | 食事入力フォーム設計 |
| `docs/GOOGLE_CHAT_WEBHOOK_SPEC.md` | Google Chat Webhook連携 |
| `docs/PHOTO_UPLOAD_SPEC.md` | 写真アップロード・フォルダ設定 |
| `docs/SETTINGS_MODAL_UI_SPEC.md` | 設定モーダルUI仕様 |
| `docs/FOOTER_NAVIGATION_SPEC.md` | フッターナビゲーション仕様 |

#### データ構造
| ファイル | 用途 |
|----------|------|
| `docs/SHEET_A_STRUCTURE.md` | Sheet A（記録の結果/読み取り）構造 |
| `docs/SHEET_B_STRUCTURE.md` | Sheet B（実績入力/書き込み）構造 |
| `docs/TABLE_VIEW_COLUMNS.md` | テーブルビュー表示カラム設計 |

#### その他
| ファイル | 用途 |
|----------|------|
| `docs/DEMO_PWA_SPEC.md` | デモ版PWA仕様 |
| `docs/DESIGN_GUIDELINES.md` | デザインガイドライン |
| `docs/SYNC_STRATEGY.md` | 同期戦略設計 |
| `docs/SYNC_CONCURRENCY.md` | 同期競合防止設計 |
| `docs/SETUP.md` | 環境セットアップガイド |

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
- **プロジェクト**: `facility-care-input-form`
- **認証切替**: `firebase use facility-care-input-form`

---

## サービスアカウント

### プロジェクト統一サービスアカウント

**重要**: 本プロジェクトでは以下の単一サービスアカウントに統一。不要なSAは作成しないこと。

| 項目 | 値 |
|------|-----|
| 名前 | `facility-care-sa` |
| メール | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |
| キーファイル | `keys/sa-key.json` (Git管理外) |
| 用途 | Cloud Functions実行、CI/CD、スプレッドシート連携、Google Drive連携 |
| 権限 | `roles/datastore.user`, `roles/cloudfunctions.invoker`, `roles/firebase.admin`, `roles/cloudfunctions.developer`, `roles/run.admin`, `roles/iam.serviceAccountUser` |

### 外部サービス共有設定

スプレッドシートやGoogle Driveフォルダを共有する際は、必ず上記の統一SAを使用：

| 対象 | 共有先SA | 権限 |
|------|----------|------|
| Sheet A（記録の結果） | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | 閲覧者 |
| Sheet B（実績入力先） | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | 編集者 |
| Google Drive写真フォルダ | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | 編集者 |

### GCP自動作成サービスアカウント（参考）

以下はGCP/Firebaseが自動作成するSA。**削除不可・変更不要**。プロジェクトでは使用しない。

| メール | 用途 | 備考 |
|--------|------|------|
| `facility-care-input-form@appspot.gserviceaccount.com` | App Engine default | GCP自動作成 |
| `672520607884-compute@developer.gserviceaccount.com` | Compute Engine default | GCP自動作成 |
| `firebase-adminsdk-fbsvc@facility-care-input-form.iam.gserviceaccount.com` | Firebase Admin SDK | Firebase自動作成 |

### firebase.json サービスアカウント指定

**重要**: `firebase.json` に `serviceAccount` を明示的に指定しないと、Cloud FunctionsはApp Engine default SA (`facility-care-input-form@appspot.gserviceaccount.com`) を使用してしまう。

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

この設定により、全Cloud Functionsが統一SAで実行される。

---

## スプレッドシート

| 用途 | Sheet ID | 共有状態 |
|------|----------|----------|
| Sheet A（記録の結果） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | ✅ 閲覧者で共有済み |
| Sheet B（実績入力先） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | ✅ 編集者で共有済み |

※ 共有先SAは「サービスアカウント」セクション参照

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
```bash
# Functions デプロイ
firebase deploy --only functions

# Hosting デプロイ（フロントエンド）
firebase deploy --only hosting

# Firestore Rules デプロイ
firebase deploy --only firestore:rules

# 全てデプロイ
firebase deploy
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
