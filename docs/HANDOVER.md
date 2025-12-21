# 引き継ぎドキュメント

> 最終更新: 2025-12-22

## クイックスタート（5分で開発開始）

### 1. 認証設定
```bash
# GitHub
gh auth switch --user yasushihonda-acg

# GCP
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form

# Firebase
firebase login:use yasushi.honda@aozora-cg.com
firebase use facility-care-input-form
```

### 2. 開発サーバー起動
```bash
cd frontend && npm run dev
# → http://localhost:5173
```

### 3. 変更をデプロイ
```bash
git add -A && git commit -m "変更内容" && git push origin main
# → GitHub Actionsで自動デプロイ
```

---

## 主要URL

| 用途 | URL |
|------|-----|
| **本番サイト** | https://facility-care-input-form.web.app |
| **デモ（家族）** | https://facility-care-input-form.web.app/demo |
| **デモ（スタッフ）** | https://facility-care-input-form.web.app/demo/staff |
| **GitHub Pages** | https://yasushihonda-acg.github.io/facility-care-input-form/ |
| **リポジトリ** | https://github.com/yasushihonda-acg/facility-care-input-form |

---

## プロジェクト構成

```
facility-care-input-form/
├── CLAUDE.md          # 開発設定・アカウント情報
├── frontend/          # React PWA (Vite + TailwindCSS)
│   ├── src/           # ソースコード
│   └── e2e/           # E2Eテスト (Playwright)
├── functions/         # Cloud Functions (Firebase)
├── docs/              # ドキュメント
│   ├── ARCHITECTURE.md   # システム設計
│   ├── API_SPEC.md       # API仕様
│   ├── BUSINESS_RULES.md # 業務ルール
│   └── archive/          # 過去の仕様書
└── gh-pages/          # GitHub Pages
```

---

## 主要コマンド

### 開発
```bash
# フロントエンド開発
cd frontend && npm run dev

# ビルド
cd frontend && npm run build

# Lint
cd frontend && npm run lint
npm run lint --prefix functions
```

### テスト
```bash
# E2Eテスト（ローカル）
cd frontend && npm run build
npm run preview -- --port 4173 &
npx playwright test

# 本番環境でテスト
BASE_URL=https://facility-care-input-form.web.app npx playwright test
```

### デプロイ
```bash
# 自動デプロイ（推奨）
git push origin main

# 手動デプロイ（緊急時のみ）
firebase deploy --only hosting
firebase deploy --only functions
```

---

## 認証情報

### サービスアカウント
- **メール**: `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com`
- **キー**: `keys/sa-key.json`（Git管理外）

### スプレッドシート
| 用途 | Sheet ID |
|------|----------|
| Sheet A（読取） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` |
| Sheet B（書込） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` |
| 水分摂取量 | `1su5K9TjmzMfKc8OIK2aZYXCfuDrNeIRM0a3LUCFcct4` |

---

## トラブルシューティング

### Firebase CLI認証エラー
```bash
firebase login:list
firebase login:add  # ブラウザでログイン
firebase login:use yasushi.honda@aozora-cg.com
```

### Firestoreインデックスエラー
エラーメッセージ内のURLからFirestoreコンソールでインデックスを作成。

### Cloud Functions デプロイ失敗
```bash
npm run build --prefix functions  # まずビルド確認
firebase deploy --only functions --debug
```

---

## 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| `CLAUDE.md` | 開発設定・アカウント・コマンド |
| `docs/ARCHITECTURE.md` | システム設計・データフロー |
| `docs/API_SPEC.md` | API仕様（全エンドポイント） |
| `docs/BUSINESS_RULES.md` | 業務ルール・投稿ID規則 |
| `docs/archive/` | 過去のPhase仕様書 |

---

## 開発履歴

Phase 1〜37まで完了。詳細は `git log` を参照。

主要機能:
- 家族向け品物管理・プリセット管理
- スタッフ向け記録入力フォーム
- Google Chat Webhook連携
- Firebase Storage写真連携
- 統計ダッシュボード・AI分析
- デモショーケース（家族・スタッフ）

E2Eテスト: 328件定義・275件パス・39件スキップ
