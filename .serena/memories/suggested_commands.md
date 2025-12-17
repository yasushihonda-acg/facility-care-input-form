# 開発コマンド

## 環境セットアップ

```bash
# アカウント切替
gh auth switch --user yasushihonda-acg
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form
firebase use facility-care-input-form
```

## ローカル開発

### フロントエンド
```bash
# 依存関係インストール
cd frontend && npm install

# 開発サーバー起動
cd frontend && npm run dev

# ビルド
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

### バックエンド (Cloud Functions)
```bash
# 依存関係インストール
cd functions && npm install

# ビルド
npm run build --prefix functions

# Lint
npm run lint --prefix functions

# 型チェック付きウォッチ
npm run build:watch --prefix functions
```

### Firebase Emulator
```bash
# 全エミュレータ起動 (Functions, Firestore, Hosting)
firebase emulators:start

# Functions のみ
firebase emulators:start --only functions,firestore

# UI: http://localhost:4000
# Hosting: http://localhost:5000
# Functions: http://localhost:5001
# Firestore: http://localhost:8080
```

## デプロイ

```bash
# Cloud Functions のみ
firebase deploy --only functions

# フロントエンド (Hosting) のみ
firebase deploy --only hosting

# Firestore Rules のみ
firebase deploy --only firestore:rules

# 全てデプロイ
firebase deploy
```

## Git

```bash
# コミット
git add -A
git commit -m "feat: 機能説明"
git push origin main

# ステータス確認
git status
```

## 便利コマンド

```bash
# Functions ログ確認
firebase functions:log

# curl でAPI確認
curl https://asia-northeast1-facility-care-input-form.cloudfunctions.net/healthCheck
```

## E2Eテスト

```bash
# ローカルでテスト
cd frontend && npm run build
npm run preview -- --port 4173 &
npx playwright test

# 本番環境でテスト
BASE_URL=https://facility-care-input-form.web.app npx playwright test

# 特定テスト実行
npx playwright test e2e/demo-page.spec.ts
```

## APIテスト

```bash
# 詳細は docs/API_TEST_PLAN.md 参照

# Emulator使用（推奨）
firebase emulators:start --only functions,firestore
# localhost:5001 でテスト

# 本番テスト（注意: テストデータは必ず削除）
curl -X POST "https://asia-northeast1-facility-care-input-form.cloudfunctions.net/submitCareItem" \
  -H "Content-Type: application/json" \
  -d '{"residentId":"test-xxx","userId":"test-xxx","item":{...}}'
```
