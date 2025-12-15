# API仕様書 (Dev Mode)

## 1. 概要

本ドキュメントは、蒲池様プロジェクトのCloud Run functions APIエンドポイント仕様を定義します。

### 開発モード (Dev Mode) について

| 項目 | 設定 |
|------|------|
| 認証 | なし (`--allow-unauthenticated`) |
| ユーザー識別 | リクエストボディで `userId` / `staffId` を送信 |
| CORS | 全オリジン許可 |

> **注意**: 本仕様はプロトタイプ検証用です。本番環境では Firebase Authentication を実装してください。

---

## 2. 共通仕様

### 2.1 ベースURL

```
https://asia-northeast1-facility-care-input-form.cloudfunctions.net
```

### 2.2 共通ヘッダー

| ヘッダー | 値 | 必須 |
|----------|-----|------|
| `Content-Type` | `application/json` | Yes |

### 2.3 共通レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

#### エラー時
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

### 2.4 共通エラーコード

| コード | HTTPステータス | 説明 |
|--------|----------------|------|
| `INVALID_REQUEST` | 400 | リクエスト形式が不正 |
| `MISSING_REQUIRED_FIELD` | 400 | 必須フィールドが欠落 |
| `RESOURCE_NOT_FOUND` | 404 | リソースが見つからない |
| `SHEETS_API_ERROR` | 500 | Google Sheets API エラー |
| `FIRESTORE_ERROR` | 500 | Firestore エラー |
| `INTERNAL_ERROR` | 500 | その他の内部エラー |

---

## 3. エンドポイント一覧

| メソッド | パス | 説明 | データフロー | デモ版 |
|----------|------|------|--------------|--------|
| GET | `/healthCheck` | ヘルスチェック | - | ✅ |
| POST | `/syncPlanData` | 記録データを同期 | Flow A | ✅ |
| GET | `/getPlanData` | 同期済み記録を取得 | - | ✅ |
| POST | `/submitMealRecord` | 食事記録を入力 | Flow B | ✅ |
| GET | `/getMealFormSettings` | 食事フォーム設定を取得 | - | ✅ |
| POST | `/updateMealFormSettings` | 食事フォーム設定を更新 | - | ✅ |
| POST | `/uploadCareImage` | 画像をアップロード | 画像連携 | ✅ |
| POST | `/testWebhook` | Webhook URLの動作確認 | 管理テスト | 📋 計画中 |
| POST | `/testDriveAccess` | DriveフォルダIDの権限確認 | 管理テスト | 📋 計画中 |
| POST | `/submitCareRecord` | ケア実績を入力 (deprecated) | Flow B | ❌ |
| POST | `/submitFamilyRequest` | 家族要望を送信 | Flow C | ❌ |
| GET | `/getFamilyRequests` | 家族要望一覧を取得 | - | ❌ |

> **デモ版**: PWAで使用するエンドポイント

---

## 4. API詳細

### 4.0 GET /healthCheck

システムの正常動作を確認します。

#### リクエスト

```http
GET /healthCheck
```

#### レスポンス

```json
{
  "status": "ok",
  "timestamp": "2025-12-13T07:30:00.000Z",
  "project": "facility-care-input-form",
  "version": "1.0.0"
}
```

---

### 4.1 POST /syncPlanData

記録スプレッドシート（Sheet A）からデータを取得し、Firestoreへ同期（洗い替え）します。

#### リクエスト

```http
POST /syncPlanData
Content-Type: application/json
```

```json
{
  "triggeredBy": "manual"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `triggeredBy` | string | No | トリガー元（`manual` / `scheduled`） |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "syncedSheets": ["Sheet1", "Sheet2", "Sheet3"],
    "totalRecords": 45,
    "syncDuration": 1234
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `syncedSheets` | string[] | 同期したシート名のリスト |
| `totalRecords` | number | 同期したレコード総数 |
| `syncDuration` | number | 処理時間（ミリ秒） |

---

### 4.2 POST /submitMealRecord

スタッフが食事記録をスプレッドシート（Sheet B）に記録します。

#### リクエスト

```http
POST /submitMealRecord
Content-Type: application/json
```

```json
{
  "staffName": "田中花子",
  "facility": "あおぞら荘",
  "residentName": "山田 太郎",
  "dayServiceUsage": "利用中ではない",
  "mealTime": "昼",
  "isImportant": "重要ではない",
  "mainDishRatio": "8割",
  "sideDishRatio": "7割",
  "note": "食欲旺盛でした"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `staffName` | string | Yes | 入力者名 |
| `facility` | string | Yes | 施設名 |
| `residentName` | string | Yes | 利用者名 |
| `dayServiceUsage` | enum | Yes | `利用中` / `利用中ではない` |
| `mealTime` | enum | Yes | `朝` / `昼` / `夜` |
| `isImportant` | enum | Yes | `重要` / `重要ではない` |
| `dayServiceName` | string | Conditional | デイサービス名（dayServiceUsage='利用中'の場合必須） |
| `mainDishRatio` | string | No | 主食摂取量（0〜10割） |
| `sideDishRatio` | string | No | 副食摂取量（0〜10割） |
| `injectionType` | string | No | 注入の種類 |
| `injectionAmount` | string | No | 注入量（cc） |
| `snack` | string | No | 間食内容 |
| `note` | string | No | 特記事項 |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "postId": "MEL20251214132211230123456",
    "sheetRow": 26274
  },
  "timestamp": "2025-12-14T13:22:13.230Z"
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `postId` | string | 生成された投稿ID（MEL{YYYYMMDDHHmmssSSS}{6桁乱数}形式、約26文字） |
| `sheetRow` | number | Sheet Bに追記された行番号 |

> **参照**: フォーム仕様の詳細は [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md) を参照

#### Webhook連携

食事記録の送信成功時、設定されたGoogle Chat Webhookへ自動通知を送信します。

- **通常Webhook**: 全ての記録を通知
- **重要Webhook**: `isImportant="重要"` の場合のみ追加通知

> **詳細**: [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) を参照

---

### 4.3 GET /getMealFormSettings

食事入力フォームの管理者設定を取得します。

#### リクエスト

```http
GET /getMealFormSettings
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "defaultFacility": "七福の里",
    "defaultResidentName": "",
    "defaultDayServiceName": "",
    "webhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
    "importantWebhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
    "updatedAt": "2025-12-15T10:00:00.000Z"
  },
  "timestamp": "2025-12-15T10:00:00.000Z"
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `defaultFacility` | string | デフォルト施設名 |
| `defaultResidentName` | string | デフォルト利用者名 |
| `defaultDayServiceName` | string | デフォルトデイサービス名 |
| `webhookUrl` | string | 通常Webhook URL (Google Chat) |
| `importantWebhookUrl` | string | 重要記録用Webhook URL (Google Chat) |
| `updatedAt` | string | 最終更新日時 |

---

### 4.4 POST /updateMealFormSettings

食事入力フォームの管理者設定を更新します。

#### リクエスト

```http
POST /updateMealFormSettings?admin=true
Content-Type: application/json
```

> **注意**: `admin=true` クエリパラメータが必須です。

```json
{
  "defaultFacility": "七福の里",
  "webhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
  "importantWebhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=..."
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `defaultFacility` | string | No | デフォルト施設名 |
| `defaultResidentName` | string | No | デフォルト利用者名 |
| `defaultDayServiceName` | string | No | デフォルトデイサービス名 |
| `webhookUrl` | string | No | 通常Webhook URL |
| `importantWebhookUrl` | string | No | 重要記録用Webhook URL |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "defaultFacility": "七福の里",
    "defaultResidentName": "",
    "defaultDayServiceName": "",
    "webhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
    "importantWebhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
    "updatedAt": "2025-12-15T10:00:00.000Z"
  },
  "timestamp": "2025-12-15T10:00:00.000Z"
}
```

---

### 4.5 POST /submitCareRecord (deprecated)

> **⚠️ 非推奨**: このAPIは後方互換性のために残されています。新規実装では `/submitMealRecord` を使用してください。

スタッフがケア実績をスプレッドシート（Sheet B）に記録します。

#### リクエスト

```http
POST /submitCareRecord
Content-Type: application/json
```

```json
{
  "staffId": "S001",
  "residentId": "R001",
  "recordType": "snack",
  "content": "おやつにプリンを提供",
  "quantity": "1個",
  "timestamp": "2024-01-15T15:00:00.000Z",
  "imageUrl": "https://drive.google.com/...",
  "notes": "ご本人の希望により提供"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `staffId` | string | Yes | スタッフID |
| `residentId` | string | Yes | 入居者ID |
| `recordType` | enum | Yes | `meal` / `snack` / `hydration` |
| `content` | string | Yes | 記録内容 |
| `quantity` | string | No | 数量・分量 |
| `timestamp` | string | Yes | 記録日時（ISO 8601） |
| `imageUrl` | string | No | 添付画像URL |
| `notes` | string | No | 備考 |

#### recordType による処理分岐

| recordType | 処理 |
|------------|------|
| `meal` | 通常記録（食事内容列に記載） |
| `snack` | **Bot連携ハック適用**（特記事項列 + 重要度="重要"） |
| `hydration` | 通常記録（水分摂取列に記載） |

> **参照**: Bot連携ハックの詳細は [BUSINESS_RULES.md](./BUSINESS_RULES.md#2-bot連携ハック間食入力時の特殊処理) を参照

#### レスポンス

```json
{
  "success": true,
  "data": {
    "recordId": "REC_20240115_150000_S001",
    "sheetRow": 156,
    "botNotificationTriggered": true
  },
  "timestamp": "2024-01-15T15:00:01.000Z"
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| `recordId` | string | 生成されたレコードID |
| `sheetRow` | number | 追記された行番号 |
| `botNotificationTriggered` | boolean | Bot通知がトリガーされたか |

---

### 4.3 POST /submitFamilyRequest

ご家族からのケア要望をFirestoreに保存します。

#### リクエスト

```http
POST /submitFamilyRequest
Content-Type: application/json
```

```json
{
  "userId": "F001",
  "residentId": "R001",
  "category": "meal",
  "content": "父は最近、柔らかい食事を好むようになりました。可能であれば、おかずを少し細かく刻んでいただけると助かります。",
  "priority": "medium",
  "attachments": []
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `userId` | string | Yes | ご家族ユーザーID |
| `residentId` | string | Yes | 対象入居者ID |
| `category` | enum | Yes | カテゴリ（下記参照） |
| `content` | string | Yes | 要望内容（自由記述） |
| `priority` | enum | Yes | `low` / `medium` / `high` |
| `attachments` | string[] | No | 添付ファイルURL |

#### category 一覧

| 値 | 説明 |
|-----|------|
| `meal` | 食事に関する要望 |
| `daily_life` | 日常生活に関する要望 |
| `medical` | 医療・健康に関する要望 |
| `recreation` | レクリエーションに関する要望 |
| `communication` | コミュニケーションに関する要望 |
| `other` | その他 |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "requestId": "REQ_F001_20240115_160000",
    "status": "pending",
    "estimatedReviewDate": "2024-01-17"
  },
  "timestamp": "2024-01-15T16:00:00.000Z"
}
```

---

### 4.4 POST /uploadCareImage

ケア記録に添付する画像をGoogle Driveにアップロードします。

#### リクエスト

```http
POST /uploadCareImage
Content-Type: multipart/form-data
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `image` | file | Yes | 画像ファイル（JPEG/PNG） |
| `staffId` | string | Yes | スタッフID |
| `residentId` | string | Yes | 入居者ID |
| `recordType` | string | No | 関連するレコード種別 |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "fileId": "1abc123def456",
    "fileName": "R001_20240115_160000.jpg",
    "publicUrl": "https://drive.google.com/uc?id=1abc123def456",
    "thumbnailUrl": "https://drive.google.com/thumbnail?id=1abc123def456"
  },
  "timestamp": "2024-01-15T16:00:05.000Z"
}
```

---

### 4.5 GET /getPlanData

Firestoreに同期済みの記録データを取得します。シート名でフィルタ可能。

#### リクエスト

```http
GET /getPlanData
GET /getPlanData?sheetName=バイタル
GET /getPlanData?sheetName=バイタル&limit=50
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `sheetName` | string | No | シート名で絞り込み（未指定時は全シートのサマリーを返す） |
| `limit` | number | No | 取得件数上限（デフォルト: 1000） |

#### レスポンス（シート名未指定 = サマリーモード）

```json
{
  "success": true,
  "data": {
    "sheets": [
      {
        "sheetName": "バイタル",
        "recordCount": 523,
        "headers": ["日時", "スタッフ名", "入居者名", "体温", "血圧", "脈拍"]
      },
      {
        "sheetName": "体重",
        "recordCount": 145,
        "headers": ["日時", "スタッフ名", "入居者名", "体重", "備考"]
      }
    ],
    "records": [],
    "totalCount": 2488,
    "lastSyncedAt": "2025-12-13T12:00:00.000Z"
  },
  "timestamp": "2025-12-13T16:30:00.000Z"
}
```

#### レスポンス（シート名指定 = レコード取得モード）

```json
{
  "success": true,
  "data": {
    "sheets": [],
    "records": [
      {
        "id": "バイタル_0",
        "sheetName": "バイタル",
        "timestamp": "2025-01-15 09:00",
        "staffName": "田中花子",
        "residentName": "山田太郎",
        "data": {
          "日時": "2025-01-15 09:00",
          "スタッフ名": "田中花子",
          "入居者名": "山田太郎",
          "体温": "36.5",
          "血圧": "120/80",
          "脈拍": "72"
        },
        "rawRow": ["2025-01-15 09:00", "田中花子", "山田太郎", "36.5", "120/80", "72"],
        "syncedAt": "2025-12-13T12:00:00.000Z"
      }
    ],
    "totalCount": 523,
    "lastSyncedAt": "2025-12-13T12:00:00.000Z"
  },
  "timestamp": "2025-12-13T16:30:00.000Z"
}
```

---

### 4.6 GET /getFamilyRequests

家族要望一覧を取得します。

#### リクエスト

```http
GET /getFamilyRequests?userId=F001&status=pending
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `userId` | string | No | ご家族ユーザーIDで絞り込み |
| `residentId` | string | No | 入居者IDで絞り込み |
| `status` | enum | No | `pending` / `reviewed` / `implemented` |
| `limit` | number | No | 取得件数上限（デフォルト: 50） |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "requestId": "REQ_F001_20240115_160000",
        "userId": "F001",
        "residentId": "R001",
        "category": "meal",
        "content": "父は最近、柔らかい食事を好むようになりました...",
        "priority": "medium",
        "status": "pending",
        "createdAt": "2024-01-15T16:00:00.000Z",
        "updatedAt": "2024-01-15T16:00:00.000Z"
      }
    ],
    "totalCount": 1
  },
  "timestamp": "2024-01-15T17:00:00.000Z"
}
```

---

### 4.10 testWebhook 📋 計画中

Webhook URLの動作確認テスト。管理者が設定保存前にURLの有効性を確認するために使用。

> **詳細設計**: [ADMIN_TEST_FEATURE_SPEC.md](./ADMIN_TEST_FEATURE_SPEC.md) を参照

**エンドポイント**: `POST /testWebhook`

**リクエスト**:
```json
{
  "webhookUrl": "https://chat.googleapis.com/v1/spaces/xxx/messages?key=yyy"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `webhookUrl` | string | Yes | テスト対象のWebhook URL（`https://chat.googleapis.com/`プレフィックス必須） |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "message": "テスト送信成功",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**失敗レスポンス (400)**:
```json
{
  "success": false,
  "message": "テスト送信失敗",
  "error": "Webhook URLが無効か、送信に失敗しました",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**テストメッセージ内容**:
```
[テスト] 施設ケア入力フォームからの接続テストです。
このメッセージが表示されれば設定は正常です。

送信時刻: 2024/1/15 12:00:00
```

---

### 4.11 testDriveAccess 📋 計画中

Google DriveフォルダIDのアクセス権限確認テスト。管理者が設定保存前にフォルダへのアクセス可否を確認するために使用。

> **詳細設計**: [ADMIN_TEST_FEATURE_SPEC.md](./ADMIN_TEST_FEATURE_SPEC.md) を参照

**エンドポイント**: `POST /testDriveAccess`

**リクエスト**:
```json
{
  "folderId": "1ABC123xyz..."
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `folderId` | string | Yes | テスト対象のGoogle DriveフォルダID |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "message": "フォルダにアクセス可能",
  "folderName": "ケア写真フォルダ",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**失敗レスポンス (400)**:
```json
{
  "success": false,
  "message": "フォルダにアクセスできません",
  "error": "The user does not have permission to access the file.",
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

**検証内容**:
1. 指定IDのファイル/フォルダが存在するか
2. サービスアカウントにアクセス権限があるか
3. 対象がフォルダであるか（ファイルでないか）

---

## 5. TypeScript 型定義

```typescript
// types/api.ts

// === Request Types ===

export interface SyncPlanDataRequest {
  triggeredBy?: 'manual' | 'scheduled';
}

export interface SubmitMealRecordRequest {
  staffName: string;
  facility: string;
  residentName: string;
  dayServiceUsage: '利用中' | '利用中ではない';
  mealTime: '朝' | '昼' | '夜';
  isImportant: '重要' | '重要ではない';
  dayServiceName?: string;
  mainDishRatio?: string;
  sideDishRatio?: string;
  injectionType?: string;
  injectionAmount?: string;
  snack?: string;
  note?: string;
}

export interface SubmitMealRecordResponse {
  postId: string;
  sheetRow: number;
}

/** @deprecated Use SubmitMealRecordRequest instead */
export interface SubmitCareRecordRequest {
  staffId: string;
  residentId: string;
  recordType: 'meal' | 'snack' | 'hydration';
  content: string;
  quantity?: string;
  timestamp: string;
  imageUrl?: string;
  notes?: string;
}

export interface SubmitFamilyRequestRequest {
  userId: string;
  residentId: string;
  category: 'meal' | 'daily_life' | 'medical' | 'recreation' | 'communication' | 'other';
  content: string;
  priority: 'low' | 'medium' | 'high';
  attachments?: string[];
}

/** Phase 5.8: Webhookテストリクエスト */
export interface TestWebhookRequest {
  webhookUrl: string;
}

/** Phase 5.8: Driveアクセステストリクエスト */
export interface TestDriveAccessRequest {
  folderId: string;
}

// === Response Types ===

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface SyncPlanDataResponse {
  syncedSheets: string[];
  totalRecords: number;
  syncDuration: number;
}

export interface SubmitCareRecordResponse {
  recordId: string;
  sheetRow: number;
  botNotificationTriggered: boolean;
}

export interface SubmitFamilyRequestResponse {
  requestId: string;
  status: 'pending';
  estimatedReviewDate: string;
}

export interface UploadCareImageResponse {
  fileId: string;
  fileName: string;
  publicUrl: string;
  thumbnailUrl: string;
}

/** Phase 5.8: Webhookテストレスポンス */
export interface TestWebhookResponse {
  success: boolean;
  message: string;
  error?: string;
}

/** Phase 5.8: Driveアクセステストレスポンス */
export interface TestDriveAccessResponse {
  success: boolean;
  message: string;
  folderName?: string;  // 成功時のみ
  error?: string;
}

// === 汎用データモデル (Phase 4.1+) ===

export interface PlanDataRecord {
  id: string;                    // ドキュメントID
  sheetName: string;             // シート名
  timestamp: string;             // 日時
  staffName: string;             // スタッフ名
  residentName: string;          // 入居者名
  data: Record<string, string>;  // 列名→値のマップ（汎用データ）
  rawRow: string[];              // 元データ行
  syncedAt: string;              // 同期日時
}

export interface SheetSummary {
  sheetName: string;             // シート名
  recordCount: number;           // レコード数
  headers: string[];             // ヘッダー（列名配列）
}

export interface GetPlanDataResponse {
  sheets: SheetSummary[];        // シートサマリー一覧（サマリーモード時）
  records: PlanDataRecord[];     // レコード一覧（レコード取得モード時）
  totalCount: number;            // 総レコード数
  lastSyncedAt: string;          // 最終同期日時
}

export interface FamilyRequestRecord {
  requestId: string;
  userId: string;
  residentId: string;
  category: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'reviewed' | 'implemented';
  createdAt: string;
  updatedAt: string;
}

export interface GetFamilyRequestsResponse {
  requests: FamilyRequestRecord[];
  totalCount: number;
}
```

---

## 6. cURLサンプル

### 6.1 ヘルスチェック

```bash
curl https://asia-northeast1-facility-care-input-form.cloudfunctions.net/healthCheck
```

### 6.2 記録データを同期（デモ版で使用）

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/syncPlanData \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "manual"}'
```

### 6.3 同期済みデータを取得（デモ版で使用）

```bash
curl https://asia-northeast1-facility-care-input-form.cloudfunctions.net/getPlanData
```

### 6.4 食事記録を入力

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/submitMealRecord \
  -H "Content-Type: application/json" \
  -d '{
    "staffName": "田中花子",
    "facility": "あおぞら荘",
    "residentName": "山田 太郎",
    "dayServiceUsage": "利用中ではない",
    "mealTime": "昼",
    "isImportant": "重要ではない",
    "mainDishRatio": "8割",
    "sideDishRatio": "7割"
  }'
```

### 6.5 家族要望を送信（将来版）

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/submitFamilyRequest \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "F001",
    "residentId": "R001",
    "category": "meal",
    "content": "柔らかい食事を希望します",
    "priority": "medium"
  }'
```

---

## 7. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-12-14 | 1.3.0 | submitMealRecord追加、submitCareRecordをdeprecated化 |
| 2025-12-13 | 1.2.0 | getPlanData汎用データモデル対応、シート別フィルタ機能追加 |
| 2025-12-13 | 1.1.0 | デモ版対応（healthCheck追加、URL更新） |
| 2025-12-XX | 1.0.0 | 初版作成 |
