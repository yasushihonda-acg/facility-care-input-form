---
status: canonical
scope: core
owner: core-team
last_reviewed: 2025-12-20
---

# API仕様書 (Dev Mode)

## 1. 概要

本ドキュメントは、蒲地様プロジェクトのCloud Run functions APIエンドポイント仕様を定義します。

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
| POST | `/uploadCareImage` | 画像をFirebase Storageにアップロード | Phase 17 | ✅ |
| GET | `/getCarePhotos` | 写真メタデータを取得 | Phase 17 | ✅ |
| POST | `/testWebhook` | Webhook URLの動作確認 | 管理テスト | ✅ |
| POST | `/submitCareItem` | 品物を登録 | Phase 8.1 | ✅ |
| GET | `/getCareItems` | 品物一覧を取得 | Phase 8.1 | ✅ |
| PUT | `/updateCareItem` | 品物を更新 | Phase 8.1 | ✅ |
| DELETE | `/deleteCareItem` | 品物を削除 | Phase 8.1 | ✅ |
| POST | `/createTask` | タスクを作成 | Phase 8.2 | ✅ |
| GET | `/getTasks` | タスク一覧を取得 | Phase 8.2 | ✅ |
| PUT | `/updateTask` | タスクを更新 | Phase 8.2 | ✅ |
| DELETE | `/deleteTask` | タスクを削除 | Phase 8.2 | ✅ |
| POST | `/getPresetSuggestions` | プリセット候補を取得 | Phase 8.5 | ⚠️ 未使用 |
| GET | `/getPresets` | プリセット一覧を取得 | Phase 8.6 | ✅ |
| POST | `/createPreset` | プリセットを作成 | Phase 8.6 | ✅ |
| PUT | `/updatePreset` | プリセットを更新 | Phase 8.6 | ✅ |
| DELETE | `/deletePreset` | プリセットを削除 | Phase 8.6 | ✅ |
| POST | `/saveAISuggestionAsPreset` | AI提案をプリセット保存 | Phase 8.7 | ⚠️ 未使用 |
| POST | `/aiSuggest` | AI品物入力補助 | Phase 8.4 | ⚠️ 未使用 |
| POST | `/aiAnalyze` | AI摂食傾向分析 | Phase 8.4.1 | ✅ |
| GET | `/getStats` | 統計データを取得 | Phase 8.3 | ✅ |
| GET | `/getInventorySummary` | 在庫サマリーを取得 | Phase 9.3 | ✅ |
| GET | `/getFoodStats` | 食品傾向統計を取得 | Phase 9.3 | ✅ |
| POST | `/recordConsumptionLog` | 消費ログを記録 | Phase 9.2 | ✅ |
| GET | `/getConsumptionLogs` | 消費ログ一覧を取得 | Phase 9.2 | ✅ |
| GET | `/getProhibitions` | 禁止ルール一覧を取得 | Phase 9.x | ✅ |
| POST | `/createProhibition` | 禁止ルールを作成 | Phase 9.x | ✅ |
| PUT | `/updateProhibition` | 禁止ルールを更新 | Phase 9.x | ✅ |
| DELETE | `/deleteProhibition` | 禁止ルールを削除（論理削除） | Phase 9.x | ✅ |
| POST | `/submitHydrationRecord` | 水分摂取記録を入力 | Phase 29 | ✅ |
| GET | `/getFoodMasters` | 食品マスタ一覧を取得 | Phase 11 | ✅ |
| GET | `/searchFoodMaster` | 食品マスタを検索 | Phase 11 | ✅ |
| POST | `/createFoodMaster` | 食品マスタを作成 | Phase 11 | ✅ |
| PUT | `/updateFoodMaster` | 食品マスタを更新 | Phase 11 | ✅ |
| DELETE | `/deleteFoodMaster` | 食品マスタを削除 | Phase 11 | ✅ |
| POST | `/sendMessage` | チャットメッセージを送信 | Phase 18 | ⏸️ |
| GET | `/getMessages` | チャットメッセージを取得 | Phase 18 | ⏸️ |
| POST | `/markAsRead` | メッセージを既読にする | Phase 18 | ⏸️ |
| GET | `/getNotifications` | 通知一覧を取得 | Phase 18 | ⏸️ |
| GET | `/getActiveChatItems` | アクティブチャット品物を取得 | Phase 18 | ⏸️ |
| POST | `/generateDailyTasks` | 日次タスクを自動生成 | Phase 8.2.1 | ✅ |
| POST | `/triggerTaskGeneration` | タスク生成をトリガー | Phase 8.2.1 | ✅ |
| GET | `/checkDailyRecords` | 日次記録チェック（通知用） | Phase 30 | ✅ |
| GET | `/getStaffNotes` | スタッフ注意事項を取得 | Phase 40 | ✅ |
| POST | `/createStaffNote` | スタッフ注意事項を作成 | Phase 40 | ✅ |
| PUT | `/updateStaffNote` | スタッフ注意事項を更新 | Phase 40 | ✅ |
| DELETE | `/deleteStaffNote` | スタッフ注意事項を削除 | Phase 40 | ✅ |
| POST | `/submitCareRecord` | ケア実績を入力 (deprecated) | Flow B | ❌ |

> **デモ版**: PWAで使用するエンドポイント
> **⏸️**: Phase 21で一時非表示（チャット機能）

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
| `recordMode` | enum | No | `full`（デフォルト）/ `snack_only`（下記参照） |
| `staffName` | string | Yes | 入力者名 |
| `facility` | string | Conditional | 施設名（recordMode='full'の場合必須） |
| `residentName` | string | Conditional | 利用者名（recordMode='full'の場合必須） |
| `dayServiceUsage` | enum | Conditional | `利用中` / `利用中ではない`（recordMode='full'の場合必須） |
| `mealTime` | enum | Conditional | `朝` / `昼` / `夜`（recordMode='full'の場合必須） |
| `isImportant` | enum | Conditional | `重要` / `重要ではない`（recordMode='full'の場合必須） |
| `dayServiceName` | string | Conditional | デイサービス名（dayServiceUsage='利用中'の場合必須） |
| `mainDishRatio` | string | No | 主食摂取量（0〜10割） |
| `sideDishRatio` | string | No | 副食摂取量（0〜10割） |
| `injectionType` | string | No | 注入の種類 |
| `injectionAmount` | string | No | 注入量（cc） |
| `snack` | string | No | 間食内容（自由記入） |
| `snackRecords` | SnackRecord[] | No | 間食詳細記録（下記参照） |
| `residentId` | string | No | 入居者ID（品物連携用） |
| `note` | string | No | 特記事項 |

#### recordMode パラメータ（Phase 13.0）

| モード | 用途 | 必須フィールド | 説明 |
|--------|------|---------------|------|
| `full` | 通常の食事記録（デフォルト） | staffName, facility, residentName, dayServiceUsage, mealTime, isImportant | 全フィールドのバリデーションを実行 |
| `snack_only` | 品物から記録タブ用 | staffName | 間食のみ記録。主食・副食等のバリデーションをスキップ |

**snack_only モード使用例**:
```json
{
  "recordMode": "snack_only",
  "staffName": "田中花子",
  "snackRecords": [{
    "itemId": "item123",
    "itemName": "羊羹（とらや）",
    "servedQuantity": 1,
    "unit": "切れ",
    "consumptionStatus": "full"
  }],
  "residentId": "resident456"
}
```


#### SnackRecord 型（間食記録連携）

```typescript
interface SnackRecord {
  itemId?: string;           // care_items のID
  itemName: string;          // 品物名
  servedQuantity: number;    // 提供数
  unit?: string;             // 単位（個、切れ等）
  consumptionStatus: 'full' | 'most' | 'half' | 'little' | 'none';
  followedInstruction?: boolean;  // 家族指示対応
  noteToFamily?: string;     // 家族へのメモ（※Sheet Bには反映されない）
}
```

#### snack フィールド連結ロジック

`snackRecords[]` がある場合、自動的に `snack` フィールドに連結されます。

| 入力パターン | Sheet B「間食は何を食べましたか？」に書き込まれる内容 |
|-------------|------------------------------------------------|
| `snackRecords[]` のみ | `黒豆 1g（完食）、らっきょう 0.7瓶（ほぼ完食）` |
| `snack`（自由記入）のみ | `施設のおやつも少々` |
| **両方入力** | `黒豆 1g（完食）、らっきょう 0.7瓶（ほぼ完食）。施設のおやつも少々` |


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

> **参照**:
> - 投稿IDルールの詳細は [BUSINESS_RULES.md#6-投稿id生成ルール](./BUSINESS_RULES.md#6-投稿id生成ルール) を参照

#### Webhook連携

食事記録の送信成功時、設定されたGoogle Chat Webhookへ自動通知を送信します。

- **通常Webhook**: 全ての記録を通知
- **重要Webhook**: `isImportant="重要"` の場合のみ追加通知


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

### 4.3 POST /uploadCareImage

ケア記録に添付する画像をFirebase Storageにアップロードします。（Phase 17で移行）

> **変更履歴**: Phase 17でGoogle DriveからFirebase Storageに移行。写真メタデータはFirestore `care_photos` コレクションに保存されます。

#### リクエスト

```http
POST /uploadCareImage
Content-Type: multipart/form-data
```

| フィールド | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `image` | file | Yes | 画像ファイル（JPEG/PNG/GIF/WebP） |
| `staffId` | string | Yes | スタッフID |
| `residentId` | string | Yes | 入居者ID |
| `mealTime` | string | No | 食事時間（breakfast/lunch/dinner/snack）デフォルト: snack |
| `staffName` | string | No | スタッフ名 |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "photoId": "abc123def456",
    "fileName": "resident-001_20251219160000_x7k9m2.jpg",
    "photoUrl": "https://firebasestorage.googleapis.com/v0/b/facility-care-input-form.appspot.com/o/care-photos%2F2025%2F12%2Fresident-001_20251219160000_x7k9m2.jpg?alt=media",
    "storagePath": "care-photos/2025/12/resident-001_20251219160000_x7k9m2.jpg"
  },
  "timestamp": "2025-12-19T16:00:05.000Z"
}
```

---

### 4.4.1 GET /getCarePhotos

入居者の写真メタデータをFirestore `care_photos` コレクションから取得します。（Phase 17で追加）

#### リクエスト

```http
GET /getCarePhotos?residentId=resident-001&date=2025-12-19
GET /getCarePhotos?residentId=resident-001&date=2025-12-19&mealTime=snack
```

| パラメータ | 型 | 必須 | 説明 |
|------------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `date` | string | Yes | 日付（YYYY-MM-DD形式） |
| `mealTime` | string | No | 食事時間でフィルタ（breakfast/lunch/dinner/snack） |

#### レスポンス

```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "photoId": "abc123def456",
        "residentId": "resident-001",
        "date": "2025-12-19",
        "mealTime": "snack",
        "photoUrl": "https://firebasestorage.googleapis.com/v0/b/...",
        "storagePath": "care-photos/2025/12/...",
        "fileName": "resident-001_20251219160000_x7k9m2.jpg",
        "mimeType": "image/jpeg",
        "fileSize": 245678,
        "staffId": "staff-001",
        "staffName": "田中花子",
        "uploadedAt": "2025-12-19T16:00:05.000Z"
      }
    ]
  },
  "timestamp": "2025-12-19T16:30:00.000Z"
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

### 4.10 POST /testWebhook

Webhook URLの動作確認テスト。管理者が設定保存前にURLの有効性を確認するために使用。


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

**テストメッセージ内容（v1.1: 本番形式）**:
```
【テスト施設_テスト利用者様】
#食事🍚

記録者：テスト太郎

摂取時間：昼

食事摂取方法：経口

主食摂取量：10割

副食摂取量：10割

特記事項：【テスト送信】
このメッセージが表示されれば設定は正常です。
送信時刻: 2024/1/15 12:00:00


【投稿ID】：TEST-20241215120000
```

> **v1.1改善**: テストメッセージを本番形式（食事記録形式）に変更。管理者が通知内容を事前確認可能に。

---

### 4.11 ~~POST /testDriveAccess~~ (削除済み)

> ⚠️ **Phase 17で削除**: 写真保存先がGoogle DriveからFirebase Storageに移行されたため、このAPIは削除されました。
>
> 写真アップロードは `/uploadCareImage` を使用してください。Firebase Storageは同一プロジェクト内のため、権限テストは不要です。

---

### 4.12 POST /createCareItem (Phase 8.1)

家族が送付した品物（差し入れ）を登録します。


**エンドポイント**: `POST /createCareItem`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "userId": "family-001",
  "itemName": "キウイ",
  "sentDate": "2025-12-16",
  "expirationDate": "2025-12-20",
  "quantity": 3,
  "servingMethod": "cut",
  "plannedServeDate": "2025-12-17",
  "noteToStaff": "8等分にカットしてください"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `userId` | string | Yes | 登録した家族ID |
| `itemName` | string | Yes | 品物名 |
| `sentDate` | string | Yes | 送付日（YYYY-MM-DD） |
| `expirationDate` | string | No | 賞味期限（YYYY-MM-DD） |
| `quantity` | number | Yes | 個数 |
| `servingMethod` | enum | Yes | 提供方法（`as_is`, `cut`, `heated`, `cooled`, `processed`, `other`） |
| `plannedServeDate` | string | No | 提供予定日（YYYY-MM-DD） |
| `noteToStaff` | string | No | スタッフへの申し送り |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "id": "item-abc123",
    "itemName": "キウイ",
    "status": "pending",
    "createdAt": "2025-12-16T10:00:00.000Z"
  },
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 4.13 GET /getCareItems (Phase 8.1)

品物一覧を取得します。フィルタ・ソート対応。

**エンドポイント**: `GET /getCareItems`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `itemId` | string | No | 品物IDで単一取得（指定時は他のフィルタは無視） |
| `residentId` | string | No | 入居者IDで絞り込み |
| `status` | string | No | ステータスで絞り込み（`pending`, `served`, `consumed`, `expired`, `discarded`） |
| `sortBy` | string | No | ソート項目（`sentDate`, `expirationDate`, `createdAt`） |
| `sortOrder` | string | No | ソート順（`asc`, `desc`） |
| `limit` | number | No | 取得件数上限（デフォルト: 50） |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-abc123",
        "residentId": "resident-001",
        "userId": "family-001",
        "itemName": "キウイ",
        "sentDate": "2025-12-16",
        "expirationDate": "2025-12-20",
        "quantity": 3,
        "servingMethod": "cut",
        "status": "pending",
        "createdAt": "2025-12-16T10:00:00.000Z",
        "updatedAt": "2025-12-16T10:00:00.000Z"
      }
    ],
    "total": 1,
    "counts": {
      "pending": 1,
      "served": 0,
      "consumed": 0,
      "expired": 0,
      "discarded": 0
    }
  },
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 4.14 PUT /updateCareItem (Phase 8.1)

品物情報を更新します（スタッフが提供・摂食記録を入力など）。

**エンドポイント**: `PUT /updateCareItem`

**リクエスト**:
```json
{
  "itemId": "item-abc123",
  "updates": {
    "status": "served",
    "actualServeDate": "2025-12-17",
    "servedQuantity": 2,
    "noteToFamily": "喜んで召し上がっていました"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `itemId` | string | Yes | 更新対象の品物ID |
| `updates` | object | Yes | 更新内容（部分更新） |

**更新可能フィールド**:
- `status`: ステータス変更
- `actualServeDate`: 実際の提供日
- `servedQuantity`: 提供個数
- `consumptionRate`: 摂食割合（0-100）
- `consumptionStatus`: 摂食状況
- `noteToFamily`: 家族への申し送り
- `noteToStaff`: スタッフへの申し送り

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "id": "item-abc123",
    "status": "served",
    "updatedAt": "2025-12-17T12:00:00.000Z"
  },
  "timestamp": "2025-12-17T12:00:00.000Z"
}
```

---

### 4.15 DELETE /deleteCareItem (Phase 8.1)

品物を削除します。

**エンドポイント**: `DELETE /deleteCareItem`

**リクエスト**:
```json
{
  "itemId": "item-abc123"
}
```

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "deletedId": "item-abc123"
  },
  "timestamp": "2025-12-17T12:00:00.000Z"
}
```

---

### 4.16 POST /createTask (Phase 8.2)

タスクを作成します。


**エンドポイント**: `POST /createTask`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "title": "キウイの賞味期限が近づいています",
  "description": "12/20に期限切れ予定",
  "taskType": "expiration_warning",
  "relatedItemId": "item-abc123",
  "dueDate": "2025-12-19",
  "dueTime": "09:00",
  "priority": "high",
  "createdBy": "system"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `title` | string | Yes | タスクタイトル |
| `description` | string | No | 詳細説明 |
| `taskType` | enum | Yes | タイプ（`expiration_warning`, `serve_reminder`, `restock_alert`, `care_instruction`, `custom`） |
| `relatedItemId` | string | No | 関連する品物ID |
| `dueDate` | string | Yes | 期日（YYYY-MM-DD） |
| `dueTime` | string | No | 時刻（HH:mm） |
| `priority` | enum | No | 優先度（`low`, `medium`, `high`, `urgent`） |
| `assignee` | string | No | 担当者名 |
| `createdBy` | string | No | 作成者 |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "id": "task-xyz789",
    "title": "キウイの賞味期限が近づいています",
    "status": "pending",
    "createdAt": "2025-12-16T10:00:00.000Z"
  },
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 4.17 GET /getTasks (Phase 8.2)

タスク一覧を取得します。フィルタ・ソート対応。

**エンドポイント**: `GET /getTasks`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | No | 入居者IDで絞り込み |
| `status` | string/array | No | ステータスで絞り込み（`pending`, `in_progress`, `completed`, `cancelled`）。配列で複数指定可 |
| `taskType` | string | No | タイプで絞り込み |
| `dueDate` | string | No | 期日で絞り込み（YYYY-MM-DD） |
| `sortBy` | string | No | ソート項目（`dueDate`, `priority`, `createdAt`） |
| `sortOrder` | string | No | ソート順（`asc`, `desc`） |
| `limit` | number | No | 取得件数上限（デフォルト: 50） |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task-xyz789",
        "residentId": "resident-001",
        "title": "キウイの賞味期限が近づいています",
        "description": "12/20に期限切れ予定",
        "taskType": "expiration_warning",
        "relatedItemId": "item-abc123",
        "dueDate": "2025-12-19",
        "dueTime": "09:00",
        "status": "pending",
        "priority": "high",
        "notificationSent": false,
        "createdAt": "2025-12-16T10:00:00.000Z",
        "updatedAt": "2025-12-16T10:00:00.000Z"
      }
    ],
    "total": 1,
    "counts": {
      "pending": 1,
      "inProgress": 0,
      "completed": 0,
      "overdue": 0
    }
  },
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

---

### 4.18 PUT /updateTask (Phase 8.2)

タスクを更新します（ステータス変更・完了処理など）。

**エンドポイント**: `PUT /updateTask`

**リクエスト**:
```json
{
  "taskId": "task-xyz789",
  "updates": {
    "status": "completed",
    "completionNote": "提供済み"
  },
  "completedBy": "田中花子"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `taskId` | string | Yes | 更新対象のタスクID |
| `updates` | object | Yes | 更新内容（部分更新） |
| `completedBy` | string | No | 完了者名（完了時に使用） |

**更新可能フィールド**:
- `status`: ステータス変更（`pending`, `in_progress`, `completed`, `cancelled`）
- `priority`: 優先度変更
- `assignee`: 担当者変更
- `dueDate`: 期日変更
- `dueTime`: 時刻変更
- `completionNote`: 完了メモ

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "id": "task-xyz789",
    "status": "completed",
    "completedBy": "田中花子",
    "completedAt": "2025-12-19T09:30:00.000Z",
    "updatedAt": "2025-12-19T09:30:00.000Z"
  },
  "timestamp": "2025-12-19T09:30:00.000Z"
}
```

---

### 4.19 DELETE /deleteTask (Phase 8.2)

タスクを削除します。

**エンドポイント**: `DELETE /deleteTask`

**リクエスト**:
```json
{
  "taskId": "task-xyz789"
}
```

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "deletedId": "task-xyz789"
  },
  "timestamp": "2025-12-19T10:00:00.000Z"
}
```

---

### 4.20 GET /getPresets (Phase 8.6)

プリセット一覧を取得します。


**エンドポイント**: `GET /getPresets`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `source` | string | No | 出所で絞り込み（`manual`, `ai`） |
| `activeOnly` | boolean | No | アクティブのみ取得（デフォルト: true） |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "presets": [
      {
        "id": "preset-abc123",
        "residentId": "resident-001",
        "name": "キウイ（8等分・半月切り）",
        "icon": "🥝",
        "instruction": {
          "content": "半月切りで8等分に",
          "servingMethod": "cut",
          "servingDetail": "8等分"
        },
        "matchConfig": {
          "keywords": ["キウイ", "キーウィ"],
          "categories": ["fruit"],
          "exactMatch": false
        },
        "source": "manual",
        "isActive": true,
        "usageCount": 15,
        "createdAt": "2025-12-16T10:00:00.000Z",
        "updatedAt": "2025-12-16T10:00:00.000Z",
        "createdBy": "family-001"
      }
    ],
    "total": 1
  }
}
```

---

### 4.21 POST /createPreset (Phase 8.6)

新しいプリセットを作成します。

**エンドポイント**: `POST /createPreset`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "userId": "family-001",
  "preset": {
    "name": "キウイ（8等分・半月切り）",
    "icon": "🥝",
    "itemCategory": "food",
    "storageMethod": "refrigerated",
    "servingMethod": "cut",
    "servingMethodDetail": "輪切り4等分をさらに半分に切ってください",
    "noteToStaff": "皮は必ず剥いてください",
    "remainingHandlingInstruction": "discarded",
    "matchConfig": {
      "keywords": ["キウイ", "kiwi"],
      "exactMatch": false
    }
  },
  "source": "manual"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `userId` | string | Yes | 作成した家族ID |
| `preset` | object | Yes | プリセット定義 |
| `preset.name` | string | Yes | プリセット名 |
| `preset.icon` | string | No | アイコン絵文字 |
| `preset.itemCategory` | string | No | カテゴリ（`food`/`drink`） |
| `preset.storageMethod` | string | No | 保存方法 |
| `preset.servingMethod` | string | No | 提供方法 |
| `preset.servingMethodDetail` | string | No | 提供方法の詳細 |
| `preset.noteToStaff` | string | No | スタッフへの申し送り |
| `preset.remainingHandlingInstruction` | string | No | 残り処置（`none`/`discarded`/`stored`） |
| `preset.matchConfig` | object | No | マッチング設定 |
| `source` | string | No | 出所（デフォルト: `manual`） |

**成功レスポンス (201)**:
```json
{
  "success": true,
  "data": {
    "presetId": "preset-abc123",
    "createdAt": "2025-12-16T10:00:00.000Z"
  }
}
```

---

### 4.22 PUT /updatePreset (Phase 8.6)

プリセットを更新します。

**エンドポイント**: `PUT /updatePreset`

**リクエスト**:
```json
{
  "presetId": "preset-abc123",
  "updates": {
    "name": "キウイ（8等分・半月切り・皮むき）",
    "servingMethodDetail": "皮をむいて半月切りで8等分に",
    "noteToStaff": "種が多い部分は避けてください"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `presetId` | string | Yes | 更新対象のプリセットID |
| `updates` | object | Yes | 更新内容（部分更新） |

**更新可能フィールド**:
- `name`: プリセット名
- `icon`: アイコン
- `itemCategory`: カテゴリ（`food`/`drink`）
- `storageMethod`: 保存方法
- `servingMethod`: 提供方法
- `servingMethodDetail`: 提供方法の詳細
- `noteToStaff`: スタッフへの申し送り
- `remainingHandlingInstruction`: 残り処置
- `matchConfig`: マッチング設定
- `isActive`: 有効フラグ

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "presetId": "preset-abc123",
    "updatedAt": "2025-12-16T12:00:00.000Z"
  }
}
```

---

### 4.23 DELETE /deletePreset (Phase 8.6)

プリセットを論理削除します。

**エンドポイント**: `DELETE /deletePreset`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `presetId` | string | Yes | 削除対象のプリセットID |

**成功レスポンス (200)**:
```json
{
  "success": true
}
```

---

### 4.24 POST /getPresetSuggestions (Phase 8.5)

> **⚠️ 注意**: このAPIはフロントエンドから未使用です（Phase 41でAI機能を一時非表示化）。バックエンド実装は存在しますが、将来の再有効化まで使用されません。

品物名からマッチするプリセット候補を取得します。

**エンドポイント**: `POST /getPresetSuggestions`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "itemName": "キウイ",
  "category": "fruit"
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `itemName` | string | Yes | 品物名（2文字以上） |
| `category` | string | No | 品物カテゴリ |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "presetId": "preset-abc123",
        "presetName": "キウイ（8等分・半月切り）",
        "matchReason": "品物名「キウイ」",
        "matchType": "itemName",
        "confidence": 0.9,
        "instruction": {
          "title": "キウイ（8等分・半月切り）",
          "content": "半月切りで8等分に",
          "servingMethod": "cut",
          "servingDetail": "8等分"
        },
        "source": "manual"
      }
    ]
  }
}
```

---

### 4.25 POST /saveAISuggestionAsPreset (Phase 8.7)

AI提案をプリセットとして保存します。

**エンドポイント**: `POST /saveAISuggestionAsPreset`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "userId": "family-001",
  "itemName": "マンゴー",
  "presetName": "マンゴー（角切り）",
  "category": "cut",
  "icon": "🥭",
  "aiSuggestion": {
    "expirationDays": 5,
    "storageMethod": "refrigerated",
    "servingMethods": ["cut"],
    "notes": "熟してから提供"
  },
  "keywords": ["マンゴー"],
  "itemCategories": ["fruit"]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `userId` | string | Yes | 保存した家族ID |
| `itemName` | string | No | 元の品物名 |
| `presetName` | string | Yes | プリセット名 |
| `category` | string | No | カテゴリ |
| `icon` | string | No | アイコン（デフォルト: 🤖） |
| `aiSuggestion` | object | Yes | AI提案内容 |
| `keywords` | string[] | No | マッチングキーワード |
| `itemCategories` | string[] | No | マッチング対象カテゴリ |

**成功レスポンス (201)**:
```json
{
  "success": true,
  "data": {
    "presetId": "preset-xyz789",
    "createdAt": "2025-12-16T10:00:00.000Z"
  }
}
```

---

### 4.26 GET /getProhibitions (Phase 9.x)

禁止ルール（提供禁止品目）一覧を取得します。


**エンドポイント**: `GET /getProhibitions`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `activeOnly` | boolean | No | アクティブのみ取得（デフォルト: true） |

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "prohibitions": [
      {
        "id": "prohibition-001",
        "residentId": "resident-001",
        "itemName": "七福のお菓子",
        "category": "snack",
        "reason": "ご家族の希望（FAX指示）",
        "createdBy": "family-001",
        "createdAt": "2024-12-01T00:00:00.000Z",
        "updatedAt": "2024-12-01T00:00:00.000Z",
        "isActive": true
      }
    ],
    "total": 1
  }
}
```

---

### 4.27 POST /createProhibition (Phase 9.x)

禁止ルールを作成します。

**エンドポイント**: `POST /createProhibition`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "userId": "family-001",
  "prohibition": {
    "itemName": "七福のお菓子",
    "category": "snack",
    "reason": "ご家族の希望（FAX指示）"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `userId` | string | Yes | 作成した家族ID |
| `prohibition` | object | Yes | 禁止ルール定義 |
| `prohibition.itemName` | string | Yes | 禁止品目名（部分一致でマッチング） |
| `prohibition.category` | string | No | カテゴリ（`snack`, `fruit`, `dairy`, `other`など） |
| `prohibition.reason` | string | No | 禁止理由 |

**成功レスポンス (201)**:
```json
{
  "success": true,
  "data": {
    "prohibitionId": "prohibition-abc123",
    "createdAt": "2025-12-17T10:00:00.000Z"
  }
}
```

---

### 4.28 PUT /updateProhibition (Phase 9.x)

禁止ルールを更新します。

**エンドポイント**: `PUT /updateProhibition`

**リクエスト**:
```json
{
  "residentId": "resident-001",
  "prohibitionId": "prohibition-abc123",
  "updates": {
    "itemName": "七福のお菓子（全種類）",
    "reason": "ご家族の希望（FAX指示）- 全種類禁止に変更"
  }
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `prohibitionId` | string | Yes | 更新対象の禁止ルールID |
| `updates` | object | Yes | 更新内容（部分更新） |

**更新可能フィールド**:
- `itemName`: 禁止品目名
- `category`: カテゴリ
- `reason`: 禁止理由
- `isActive`: 有効フラグ

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "prohibitionId": "prohibition-abc123",
    "updatedAt": "2025-12-17T12:00:00.000Z"
  }
}
```

---

### 4.29 DELETE /deleteProhibition (Phase 9.x)

禁止ルールを論理削除します（isActive: false に変更）。

**エンドポイント**: `DELETE /deleteProhibition`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `residentId` | string | Yes | 入居者ID |
| `prohibitionId` | string | Yes | 削除対象の禁止ルールID |

**成功レスポンス (200)**:
```json
{
  "success": true
}
```

---

## 5. 型定義・サンプルコード

### 5.1 TypeScript型定義

TypeScript型定義は以下のソースコードを参照してください:

```
frontend/src/types/          # フロントエンド型定義
functions/src/types/         # バックエンド型定義
```

### 5.2 cURLサンプル

APIのテストにはcURLを使用できます。基本形式:

```bash
# GET
curl https://asia-northeast1-facility-care-input-form.cloudfunctions.net/{endpoint}

# POST
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/{endpoint} \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

## 6. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2025-12-23 | 1.16.0 | Phase 40: スタッフ注意事項API追加（getStaffNotes/create/update/delete） |
| 2025-12-22 | 1.15.0 | ドキュメント最適化（TypeScript型定義・cURLサンプルをコード参照に変更） |
| 2025-12-20 | 1.14.0 | Phase 15.7: recordConsumptionLog/getConsumptionLogs詳細追加 |
| 2025-12-19 | 1.13.0 | Phase 17: Firebase Storage移行 |
| 2025-12-19 | 1.12.0 | Phase 13.0: submitMealRecord recordModeパラメータ追加 |
| 2025-12-18 | 1.11.0 | Phase 8.4.1: AI API詳細ドキュメント追加 |
| 2025-12-17 | 1.10.0 | Phase 9.3: 在庫・食品統計API追加 |
| 2025-12-16 | 1.8.0 | Phase 8.6-8.7: プリセット管理API追加 |
| 2025-12-16 | 1.6.0 | Phase 8.1-8.2: 品物・タスク管理API追加 |
| 2025-12-15 | 1.4.0 | Phase 5.8: testWebhook追加 |
| 2025-12-14 | 1.3.0 | submitMealRecord追加 |
| 2025-12-13 | 1.1.0 | デモ版対応 |
| 2025-12-XX | 1.0.0 | 初版作成 |

