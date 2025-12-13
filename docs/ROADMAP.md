# 開発ロードマップ

## 目標

**デモ版公開**: 介護施設向けコミュニケーションアプリのプロトタイプを動作可能な状態でデプロイし、関係者にデモンストレーションできる状態にする。

---

## 全体フロー図

```mermaid
flowchart TD
    subgraph "Phase 1: 基盤構築"
        P1A[1-1 GCPプロジェクト作成]
        P1B[1-2 Firebase初期化]
        P1C[1-3 API有効化]
        P1D[1-4 サービスアカウント設定]
        P1E[1-5 ローカル開発環境構築]
        P1A --> P1B --> P1C --> P1D --> P1E
    end

    subgraph "Phase 2: バックエンド実装"
        P2A[2-1 プロジェクト構造作成]
        P2B[2-2 共通サービス実装]
        P2C[2-3 Flow A: syncPlanData]
        P2D[2-4 Flow B: submitCareRecord]
        P2E[2-5 Flow C: submitFamilyRequest]
        P2F[2-6 画像連携機能]
        P2A --> P2B --> P2C --> P2D --> P2E --> P2F
    end

    subgraph "Phase 3: デプロイ・検証"
        P3A[3-1 Firestoreルール設定]
        P3B[3-2 Cloud Runデプロイ]
        P3C[3-3 エンドポイント疎通確認]
        P3D[3-4 スプレッドシート連携テスト]
        P3A --> P3B --> P3C --> P3D
    end

    subgraph "Phase 4: デモ準備"
        P4A[4-1 動作確認用スクリプト]
        P4B[4-2 デモシナリオ作成]
        P4C[4-3 ドキュメント整備]
        P4D[4-4 デモ実施]
        P4A --> P4B --> P4C --> P4D
    end

    P1E --> P2A
    P2F --> P3A
    P3D --> P4A

    style P1A fill:#e3f2fd
    style P1E fill:#e3f2fd
    style P2A fill:#fff3e0
    style P2F fill:#fff3e0
    style P3A fill:#e8f5e9
    style P3D fill:#e8f5e9
    style P4D fill:#f3e5f5
```

---

## Phase 1: 基盤構築

GCP/Firebaseの環境をCLIで構築する。

### 1-1. GCPプロジェクト作成

```bash
# 新規プロジェクト作成
gcloud projects create facility-care-demo --name="Facility Care Demo"

# プロジェクトを選択
gcloud config set project facility-care-demo

# 請求先アカウントのリンク（必要に応じて）
gcloud billing accounts list
gcloud billing projects link facility-care-demo --billing-account=BILLING_ACCOUNT_ID
```

**成果物**: GCPプロジェクト `facility-care-demo`

### 1-2. Firebase初期化

```bash
# Firebase CLIでプロジェクトに追加
firebase projects:addfirebase facility-care-demo

# ローカルでFirebase初期化
firebase init
# 選択: Firestore, Functions, Emulators
```

**成果物**: `firebase.json`, `.firebaserc`

### 1-3. API有効化

```bash
# 必要なAPIを有効化
gcloud services enable \
  cloudfunctions.googleapis.com \
  run.googleapis.com \
  firestore.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com \
  cloudbuild.googleapis.com
```

**成果物**: 5つのAPIが有効化された状態

### 1-4. サービスアカウント設定

```bash
# サービスアカウント作成
gcloud iam service-accounts create facility-care-sa \
  --display-name="Facility Care Service Account"

# 権限付与
gcloud projects add-iam-policy-binding facility-care-demo \
  --member="serviceAccount:facility-care-sa@facility-care-demo.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Sheets/Drive用のキー生成（必要に応じて）
gcloud iam service-accounts keys create ./keys/sa-key.json \
  --iam-account=facility-care-sa@facility-care-demo.iam.gserviceaccount.com
```

**成果物**: サービスアカウント、認証キー

### 1-5. ローカル開発環境構築

```bash
# Functions用ディレクトリで依存関係インストール
cd functions
npm init -y
npm install firebase-functions firebase-admin googleapis

# TypeScript設定
npm install -D typescript @types/node
npx tsc --init
```

**成果物**: `functions/package.json`, `functions/tsconfig.json`

### Phase 1 完了条件

- [ ] `gcloud projects describe facility-care-demo` が成功
- [ ] `firebase projects:list` にプロジェクトが表示
- [ ] `gcloud services list --enabled` で5つのAPIが確認可能
- [ ] `firebase emulators:start` が起動可能

---

## Phase 2: バックエンド実装

Cloud Run functionsのコードを実装する。

### 2-1. プロジェクト構造作成

```
functions/
├── src/
│   ├── index.ts              # エントリポイント
│   ├── config/
│   │   └── sheets.ts         # スプレッドシートID定数
│   ├── functions/
│   │   ├── syncPlanData.ts
│   │   ├── submitCareRecord.ts
│   │   ├── submitFamilyRequest.ts
│   │   └── uploadCareImage.ts
│   ├── services/
│   │   ├── sheetsService.ts
│   │   ├── firestoreService.ts
│   │   └── driveService.ts
│   └── types/
│       └── index.ts
├── package.json
└── tsconfig.json
```

**成果物**: ディレクトリ構造、設定ファイル

### 2-2. 共通サービス実装

| ファイル | 内容 |
|----------|------|
| `sheetsService.ts` | Sheets API読み取り・追記 |
| `firestoreService.ts` | Firestore CRUD操作 |
| `driveService.ts` | Drive アップロード・URL生成 |

**成果物**: 3つのサービスモジュール

### 2-3. Flow A: syncPlanData

- Sheet A（記録の結果）からデータ取得
- Firestoreへ洗い替え同期
- 全シート動的スキャン対応

**成果物**: `syncPlanData.ts`、ローカルテスト完了

### 2-4. Flow B: submitCareRecord

- ケア実績をSheet Bに追記
- **Bot連携ハック実装**（間食→特記事項+重要度）
- 画像URL対応

**成果物**: `submitCareRecord.ts`、Bot連携動作確認

### 2-5. Flow C: submitFamilyRequest

- 家族要望をFirestoreに保存
- カテゴリ・優先度対応

**成果物**: `submitFamilyRequest.ts`

### 2-6. 画像連携機能

- 画像をDriveにアップロード
- 公開URL生成
- Sheet Bへの記録

**成果物**: `uploadCareImage.ts`

### Phase 2 完了条件

- [ ] `npm run build` がエラーなく完了
- [ ] Emulatorで全エンドポイントが応答
- [ ] ローカルでSheet A読み取りテスト成功
- [ ] ローカルでSheet B書き込みテスト成功

---

## Phase 3: デプロイ・検証

本番環境（Cloud Run）へデプロイし、動作確認を行う。

### 3-1. Firestoreルール設定

```bash
# Dev Mode用ルールをデプロイ
firebase deploy --only firestore:rules
```

```javascript
// firestore.rules (Dev Mode)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**成果物**: Firestoreルールがデプロイ済み

### 3-2. Cloud Runデプロイ

```bash
# 全Functionsをデプロイ
firebase deploy --only functions

# または個別デプロイ
firebase deploy --only functions:syncPlanData
firebase deploy --only functions:submitCareRecord
firebase deploy --only functions:submitFamilyRequest
firebase deploy --only functions:uploadCareImage
```

**成果物**: 4つのCloud Run functionsがデプロイ済み

### 3-3. エンドポイント疎通確認

```bash
# 各エンドポイントの疎通確認
curl -X POST https://[REGION]-[PROJECT].cloudfunctions.net/syncPlanData \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "manual"}'

curl -X POST https://[REGION]-[PROJECT].cloudfunctions.net/submitFamilyRequest \
  -H "Content-Type: application/json" \
  -d '{"userId":"F001","residentId":"R001","category":"meal","content":"テスト","priority":"low"}'
```

**成果物**: 全エンドポイントが200レスポンスを返す

### 3-4. スプレッドシート連携テスト

| テスト項目 | 確認内容 |
|------------|----------|
| Sheet A 読み取り | Firestoreにデータが同期される |
| Sheet B 書き込み | 行が追加される |
| Bot連携ハック | 間食入力時に「重要」フラグがセットされる |
| 画像連携 | DriveにファイルがアップロードされURLが記録される |

**成果物**: 全テスト項目がパス

### Phase 3 完了条件

- [ ] `firebase deploy` が成功
- [ ] 本番URLで全APIが応答
- [ ] Sheet A → Firestore同期が動作
- [ ] Sheet B への追記が動作
- [ ] Bot連携（重要フラグ）が動作確認済み

---

## Phase 4: デモ準備

関係者へのデモンストレーションを準備する。

### 4-1. 動作確認用スクリプト

```bash
# scripts/demo-test.sh
#!/bin/bash
BASE_URL="https://[REGION]-facility-care-demo.cloudfunctions.net"

echo "=== 1. 記録同期テスト ==="
curl -s -X POST $BASE_URL/syncPlanData -H "Content-Type: application/json" -d '{}' | jq

echo "=== 2. ケア実績入力テスト（間食） ==="
curl -s -X POST $BASE_URL/submitCareRecord -H "Content-Type: application/json" \
  -d '{"staffId":"S001","residentId":"R001","recordType":"snack","content":"プリン","timestamp":"2024-01-15T15:00:00Z"}' | jq

echo "=== 3. 家族要望送信テスト ==="
curl -s -X POST $BASE_URL/submitFamilyRequest -H "Content-Type: application/json" \
  -d '{"userId":"F001","residentId":"R001","category":"meal","content":"柔らかい食事希望","priority":"medium"}' | jq
```

**成果物**: `scripts/demo-test.sh`

### 4-2. デモシナリオ作成

| # | シナリオ | 操作 | 期待結果 |
|---|----------|------|----------|
| 1 | 記録同期 | syncPlanData実行 | Firestoreにデータ反映 |
| 2 | 通常の食事記録 | submitCareRecord (meal) | Sheet Bに行追加 |
| 3 | 間食記録（Bot連携） | submitCareRecord (snack) | Sheet Bに行追加 + 重要フラグ |
| 4 | 家族要望送信 | submitFamilyRequest | Firestoreに保存 |
| 5 | 画像付き記録 | uploadCareImage + submitCareRecord | Drive + Sheet B |

**成果物**: `docs/DEMO_SCENARIO.md`

### 4-3. ドキュメント整備

- README.md 更新（デプロイ済みURLを記載）
- SETUP.md 完成版
- トラブルシューティングガイド

**成果物**: 更新されたドキュメント群

### 4-4. デモ実施

- 関係者へURLとシナリオを共有
- デモ実施
- フィードバック収集

**成果物**: デモ完了、フィードバックリスト

### Phase 4 完了条件

- [ ] デモスクリプトが全て成功
- [ ] デモシナリオが文書化済み
- [ ] 関係者にURL共有済み
- [ ] デモ実施完了

---

## マイルストーンサマリー

```
Phase 1: 基盤構築        ████████░░░░░░░░░░░░  (5 tasks)
Phase 2: バックエンド実装  ████████████░░░░░░░░  (6 tasks)
Phase 3: デプロイ・検証    ████████████████░░░░  (4 tasks)
Phase 4: デモ準備         ████████████████████  (4 tasks)
                         ─────────────────────
                         合計: 19 tasks → デモ公開
```

| Phase | タスク数 | 主な成果物 |
|-------|----------|------------|
| Phase 1 | 5 | GCP/Firebase環境、ローカル開発環境 |
| Phase 2 | 6 | Cloud Run functions（4エンドポイント） |
| Phase 3 | 4 | 本番デプロイ、連携テスト完了 |
| Phase 4 | 4 | デモスクリプト、シナリオ、実施完了 |

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| Sheets API権限不足 | Sheet読み書き失敗 | サービスアカウントをシートに編集者として追加 |
| Bot連携ハックの誤動作 | 通知が飛ばない/誤通知 | 専用テスト行で事前検証 |
| 画像サイズ超過 | アップロード失敗 | Cloud Functions のメモリ/タイムアウト調整 |
| Dev Mode のセキュリティ | データ漏洩リスク | デモ終了後にルール変更、URLは関係者限定共有 |

---

## 次のアクション

**Phase 1-1 から開始**: `docs/SETUP.md` に詳細なCLIコマンドを記載し、順次実行していく。

```bash
# 最初のコマンド
gcloud projects create facility-care-demo --name="Facility Care Demo"
```
