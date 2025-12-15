# 環境セットアップガイド（CLI版）

本ドキュメントは、全ての操作をCLIで実行するためのセットアップ手順書です。

---

## 前提条件

### 必要なCLIツール

```bash
# バージョン確認コマンド
gcloud --version      # Google Cloud SDK
firebase --version    # Firebase CLI
node --version        # Node.js (v18以上推奨)
npm --version         # npm
```

### インストール（未導入の場合）

```bash
# Google Cloud SDK (macOS)
brew install --cask google-cloud-sdk

# Firebase CLI
npm install -g firebase-tools

# Node.js (nvm経由推奨)
nvm install 18
nvm use 18
```

### 認証

```bash
# GCP認証
gcloud auth login
gcloud auth application-default login

# Firebase認証
firebase login
```

---

## Phase 1-1: GCPプロジェクト作成

### プロジェクト作成

```bash
# プロジェクトIDは全世界でユニークである必要があります
# 以下は例です。実際のIDは適宜変更してください
PROJECT_ID="facility-care-demo-$(date +%Y%m%d)"

# プロジェクト作成
gcloud projects create $PROJECT_ID --name="Facility Care Demo"

# 作成確認
gcloud projects describe $PROJECT_ID
```

### プロジェクト選択

```bash
# デフォルトプロジェクトに設定
gcloud config set project $PROJECT_ID

# 確認
gcloud config get-value project
```

### 請求先アカウントのリンク

```bash
# 利用可能な請求先アカウント一覧
gcloud billing accounts list

# 請求先アカウントをリンク（BILLING_ACCOUNT_IDを置き換え）
gcloud billing projects link $PROJECT_ID \
  --billing-account=BILLING_ACCOUNT_ID
```

> **Note**: 請求先アカウントがない場合は、GCPコンソールで作成が必要です。

### 完了確認

```bash
# プロジェクト情報表示
gcloud projects describe $PROJECT_ID

# 期待される出力:
# createTime: '2024-XX-XXTXX:XX:XX.XXXZ'
# lifecycleState: ACTIVE
# name: Facility Care Demo
# projectId: facility-care-demo-XXXXXXXX
# projectNumber: 'XXXXXXXXXXXX'
```

---

## Phase 1-2: Firebase初期化

### FirebaseをGCPプロジェクトに追加

```bash
# FirebaseをGCPプロジェクトに追加
firebase projects:addfirebase $PROJECT_ID

# 確認
firebase projects:list
```

### ローカルプロジェクトでFirebase初期化

```bash
# プロジェクトルートで実行
cd /Users/yyyhhh/facility-care-input-form

# Firebase初期化（対話式）
firebase init
```

**選択項目**:
1. **Features**:
   - `Firestore`
   - `Functions`
   - `Emulators`
2. **Project**: `Use an existing project` → `facility-care-demo-XXXXXXXX`
3. **Firestore Rules**: `firestore.rules`
4. **Firestore Indexes**: `firestore.indexes.json`
5. **Functions Language**: `TypeScript`
6. **ESLint**: `Yes`
7. **Install dependencies**: `Yes`
8. **Emulators**:
   - `Functions`
   - `Firestore`

### 非対話式での初期化（代替）

```bash
# 既存プロジェクトを選択
firebase use $PROJECT_ID

# 各機能を個別に初期化
firebase init firestore --project $PROJECT_ID
firebase init functions --project $PROJECT_ID
firebase init emulators --project $PROJECT_ID
```

### 完了確認

```bash
# 生成されたファイルを確認
ls -la firebase.json .firebaserc firestore.rules functions/

# .firebaserc の内容確認
cat .firebaserc
```

**期待される構造**:
```
facility-care-input-form/
├── .firebaserc
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── functions/
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts
```

---

## Phase 1-3: API有効化

### 必要なAPIを一括有効化

```bash
# 必要なAPI一覧を有効化
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  eventarc.googleapis.com

# 有効化完了を待機（数分かかる場合あり）
```

### 有効化確認

```bash
# 有効なAPI一覧を表示
gcloud services list --enabled --filter="NAME:(cloudfunctions OR run OR firestore OR sheets OR drive)"

# 期待される出力:
# NAME                              STATE
# cloudfunctions.googleapis.com     ENABLED
# drive.googleapis.com              ENABLED
# firestore.googleapis.com          ENABLED
# run.googleapis.com                ENABLED
# sheets.googleapis.com             ENABLED
```

### Firestoreデータベース作成

```bash
# Firestoreをネイティブモードで作成（asia-northeast1 = 東京）
gcloud firestore databases create --location=asia-northeast1

# 確認
gcloud firestore databases describe
```

---

## Phase 1-4: サービスアカウント設定

### サービスアカウント作成

```bash
SA_NAME="facility-care-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# サービスアカウント作成
gcloud iam service-accounts create $SA_NAME \
  --display-name="Facility Care Service Account" \
  --description="Service account for Facility Care application"

# 確認
gcloud iam service-accounts list
```

### 権限付与

```bash
# Firestore アクセス権限
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"

# Cloud Functions 起動権限（内部呼び出し用）
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudfunctions.invoker"
```

### サービスアカウントキー生成（ローカル開発用）

```bash
# キー保存用ディレクトリ作成
mkdir -p keys

# キー生成
gcloud iam service-accounts keys create ./keys/sa-key.json \
  --iam-account=$SA_EMAIL

# キーをgitignoreに追加
echo "keys/" >> .gitignore
```

> **重要**: `keys/` ディレクトリは絶対にGitにコミットしないでください。

### Cloud Functions サービスアカウント指定

**重要**: Cloud Functions（第1世代）をデプロイする際、サービスアカウントの指定方法に注意が必要です。

#### 第1世代関数の制約

`firebase.json` の `serviceAccount` フィールドは**第2世代関数のみ**対応しています。
第1世代関数のサービスアカウントを変更するには、gcloudコマンドで直接指定する必要があります。

```bash
# 第1世代関数のSA変更
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

#### firebase.json（第2世代のみ有効）

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

**注意**: この設定は第2世代関数のみに適用されます。第1世代関数には効果がありません。

### スプレッドシートへのアクセス権限

サービスアカウントのメールアドレスを、対象スプレッドシートに**編集者**として追加する必要があります。

```bash
# サービスアカウントのメールアドレスを表示
echo $SA_EMAIL
# 出力例: facility-care-sa@facility-care-demo-XXXXXXXX.iam.gserviceaccount.com
```

**手動操作**:
1. Sheet A (https://docs.google.com/spreadsheets/d/1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w) を開く
2. 「共有」→ 上記メールアドレスを「閲覧者」として追加
3. Sheet B (https://docs.google.com/spreadsheets/d/1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0) を開く
4. 「共有」→ 上記メールアドレスを「編集者」として追加

---

## Phase 1-5: ローカル開発環境構築

### Functions依存関係インストール

```bash
cd functions

# 依存関係インストール
npm install

# 追加パッケージ
npm install googleapis
npm install cors

# 開発用依存関係
npm install -D @types/cors
```

### 環境変数設定

```bash
# functions/.env を作成
cat > .env << 'EOF'
GOOGLE_APPLICATION_CREDENTIALS=../keys/sa-key.json
SHEET_A_ID=1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w
SHEET_B_ID=1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0
EOF

# .envをgitignoreに追加
echo "functions/.env" >> ../.gitignore
```

### TypeScript設定確認

```bash
# tsconfig.json の確認
cat tsconfig.json

# ビルドテスト
npm run build
```

### Emulator起動テスト

```bash
# プロジェクトルートに戻る
cd ..

# Emulator起動
firebase emulators:start

# 期待される出力:
# ✔  All emulators ready! View status and logs at http://127.0.0.1:4000/
# ┌─────────────────────────────────────────────────────────────┐
# │ ✔  Firestore Emulator at 127.0.0.1:8080                    │
# │ ✔  Functions Emulator at 127.0.0.1:5001                    │
# └─────────────────────────────────────────────────────────────┘
```

---

## 完了チェックリスト

### Phase 1 完了条件

```bash
# 1. GCPプロジェクト確認
gcloud projects describe $PROJECT_ID
# → lifecycleState: ACTIVE

# 2. Firebaseプロジェクト確認
firebase projects:list | grep $PROJECT_ID
# → プロジェクトが表示される

# 3. API有効化確認
gcloud services list --enabled | grep -E "(firestore|sheets|drive|run|cloudfunctions)"
# → 5つのAPIが表示される

# 4. サービスアカウント確認
gcloud iam service-accounts list | grep facility-care-sa
# → サービスアカウントが表示される

# 5. Emulator起動確認
firebase emulators:start
# → エラーなく起動する
```

### ディレクトリ構造確認

```bash
tree -L 2 -a -I 'node_modules|.git'
```

**期待される構造**:
```
facility-care-input-form/
├── .firebaserc
├── .gitignore
├── README.md
├── docs/
│   ├── API_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── BUSINESS_RULES.md
│   ├── ROADMAP.md
│   └── SETUP.md
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── functions/
│   ├── .env
│   ├── package.json
│   ├── src/
│   └── tsconfig.json
└── keys/
    └── sa-key.json
```

---

## トラブルシューティング

### gcloud: プロジェクト作成エラー

```
ERROR: (gcloud.projects.create) PERMISSION_DENIED
```

**原因**: 組織ポリシーでプロジェクト作成が制限されている
**対策**: 組織管理者に依頼、または既存プロジェクトを使用

### firebase: プロジェクト追加エラー

```
Error: Failed to add Firebase to Google Cloud Platform project
```

**原因**: GCPプロジェクトの権限不足
**対策**: `roles/firebase.admin` 権限を確認

### Sheets API: 権限エラー

```
Error: The caller does not have permission
```

**原因**: サービスアカウントがスプレッドシートに共有されていない
**対策**: サービスアカウントのメールアドレスをシートに追加

---

## 次のステップ

Phase 1 完了後、[ROADMAP.md](./ROADMAP.md) の **Phase 2: バックエンド実装** に進みます。

```bash
# Phase 2 開始コマンド
cd functions/src
mkdir -p config functions services types
```
