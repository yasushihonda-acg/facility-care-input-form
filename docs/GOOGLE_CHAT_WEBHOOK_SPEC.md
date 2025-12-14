# Google Chat Webhook連携設計書

> **最終更新**: 2025年12月15日
>
> このドキュメントは食事入力フォーム送信時のGoogle Chat Webhook連携機能の設計仕様を定義します。

---

## 概要

| 項目 | 値 |
|------|-----|
| **機能名** | Google Chat Webhook連携 |
| **用途** | 食事記録入力時にGoogle Chatスペースへ自動通知 |
| **トリガー** | `submitMealRecord` API実行成功時 |
| **通知先** | 2つのGoogle Chatスペース（Webhook URL） |

---

## 通知フロー

```
[PWAフォーム: /input/meal]
    ↓ 入力・送信
[Cloud Functions: submitMealRecord]
    ↓ Sheet B書き込み成功後
    ├─→ [通常Webhook] 全ての記録を通知
    └─→ [重要Webhook] isImportant="重要" の場合のみ追加通知
```

---

## Webhook設定

### 管理者設定項目

| 設定項目 | 説明 | Firestoreフィールド |
|----------|------|---------------------|
| 通常Webhook URL | 全記録通知先 | `webhookUrl` |
| 重要Webhook URL | 重要記録のみ通知先 | `importantWebhookUrl` |

> **設定画面**: `/input/meal?admin=true` から設定可能

### Firestore保存先

```
settings/mealFormDefaults
├── defaultFacility: string
├── defaultResidentName: string
├── defaultDayServiceName: string
├── webhookUrl: string           // ← 追加
├── importantWebhookUrl: string  // ← 追加
└── updatedAt: string
```

---

## 通知メッセージ形式

### 投稿例

```
【七福の里220_大橋　建夫様(ID7948)】
#食事🍚

記録者：クエン

摂取時間：夜

食事摂取方法：経口

主食摂取量：10割

副食摂取量：10割

特記事項：【ケアに関すること】

【ACPiece】


【投稿ID】：MEL20251211194443344007
```

### メッセージ構成

| 行 | 内容 | データソース |
|----|------|-------------|
| 1 | ヘッダー | `【{facility}_{residentName}様({residentId})】` |
| 2 | タグ | `#食事🍚` (固定) |
| 3 | 空行 | - |
| 4 | 記録者 | `記録者：{staffName}` |
| 5 | 空行 | - |
| 6 | 摂取時間 | `摂取時間：{mealTime}` |
| 7 | 空行 | - |
| 8 | 食事摂取方法 | `食事摂取方法：経口` または注入情報 |
| 9 | 空行 | - |
| 10 | 主食摂取量 | `主食摂取量：{mainDishRatio}` |
| 11 | 空行 | - |
| 12 | 副食摂取量 | `副食摂取量：{sideDishRatio}` |
| 13 | 空行 | - |
| 14 | 特記事項 | `特記事項：{note}` |
| 15 | 空行 | - |
| 16 | 空行 | - |
| 17 | 投稿ID | `【投稿ID】：{postId}` |

### 条件分岐

1. **食事摂取方法**:
   - `injectionType` が設定されている場合: `食事摂取方法：{injectionType}（{injectionAmount}）`
   - 設定されていない場合: `食事摂取方法：経口`

2. **主食・副食摂取量**:
   - 値がない場合は `--` を表示

3. **特記事項**:
   - 値がない場合は空欄（行自体は表示）

---

## API仕様

### 設定取得 (既存API拡張)

**エンドポイント**: `GET /getMealFormSettings`

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "defaultFacility": "七福の里",
    "defaultResidentName": "",
    "defaultDayServiceName": "",
    "webhookUrl": "https://chat.googleapis.com/v1/spaces/...",
    "importantWebhookUrl": "https://chat.googleapis.com/v1/spaces/...",
    "updatedAt": "2025-12-15T10:00:00.000Z"
  },
  "timestamp": "2025-12-15T10:00:00.000Z"
}
```

### 設定更新 (既存API拡張)

**エンドポイント**: `POST /updateMealFormSettings?admin=true`

**リクエスト例**:
```json
{
  "webhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=...",
  "importantWebhookUrl": "https://chat.googleapis.com/v1/spaces/.../messages?key=..."
}
```

---

## 実装詳細

### 1. バックエンド (Cloud Functions)

#### ファイル構成

```
functions/src/
├── services/
│   └── googleChatService.ts  // ← 新規作成
├── functions/
│   ├── submitMealRecord.ts   // ← 修正（Webhook送信追加）
│   └── mealFormSettings.ts   // ← 修正（Webhook URL設定追加）
└── types/
    └── index.ts              // ← 修正（型定義追加）
```

#### googleChatService.ts

```typescript
/**
 * Google Chat Webhook送信サービス
 */

interface MealRecordForChat {
  facility: string;
  residentName: string;
  residentId?: string;
  staffName: string;
  mealTime: string;
  mainDishRatio?: string;
  sideDishRatio?: string;
  injectionType?: string;
  injectionAmount?: string;
  note?: string;
  postId: string;
}

/**
 * 食事記録をGoogle Chat形式のメッセージに変換
 */
function formatMealRecordMessage(record: MealRecordForChat): string {
  const residentIdPart = record.residentId ? `(ID${record.residentId})` : '';
  const header = `【${record.facility}_${record.residentName}様${residentIdPart}】`;

  // 食事摂取方法
  let intakeMethod = '経口';
  if (record.injectionType) {
    intakeMethod = record.injectionAmount
      ? `${record.injectionType}（${record.injectionAmount}）`
      : record.injectionType;
  }

  const lines = [
    header,
    '#食事🍚',
    '',
    `記録者：${record.staffName}`,
    '',
    `摂取時間：${record.mealTime}`,
    '',
    `食事摂取方法：${intakeMethod}`,
    '',
    `主食摂取量：${record.mainDishRatio || '--'}`,
    '',
    `副食摂取量：${record.sideDishRatio || '--'}`,
    '',
    `特記事項：${record.note || ''}`,
    '',
    '',
    `【投稿ID】：${record.postId}`,
  ];

  return lines.join('\n');
}

/**
 * Google Chat WebhookにPOSTリクエストを送信
 */
async function sendToGoogleChat(
  webhookUrl: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
    return response.ok;
  } catch (error) {
    console.error('[GoogleChat] Send failed:', error);
    return false;
  }
}

export { formatMealRecordMessage, sendToGoogleChat, MealRecordForChat };
```

#### submitMealRecord.ts 修正箇所

```typescript
// Sheet B書き込み成功後に追加
const { sheetRow, postId } = await appendMealRecordToSheetB(mealRecord);

// Webhook送信（非同期・エラーでも処理続行）
try {
  const settings = await getSettingsFromFirestore();

  if (settings.webhookUrl) {
    const chatMessage = formatMealRecordMessage({
      facility: mealRecord.facility,
      residentName: mealRecord.residentName,
      staffName: mealRecord.staffName,
      mealTime: mealRecord.mealTime,
      mainDishRatio: mealRecord.mainDishRatio,
      sideDishRatio: mealRecord.sideDishRatio,
      injectionType: mealRecord.injectionType,
      injectionAmount: mealRecord.injectionAmount,
      note: mealRecord.note,
      postId: postId,
    });

    // 通常Webhook（全記録）
    await sendToGoogleChat(settings.webhookUrl, chatMessage);

    // 重要Webhook（isImportant="重要"の場合のみ）
    if (mealRecord.isImportant === '重要' && settings.importantWebhookUrl) {
      await sendToGoogleChat(settings.importantWebhookUrl, chatMessage);
    }
  }
} catch (webhookError) {
  // Webhookエラーは記録成功には影響させない
  functions.logger.warn('[submitMealRecord] Webhook send failed:', webhookError);
}
```

### 2. フロントエンド

#### 管理者設定画面の拡張

`MealSettingsModal.tsx` に追加:

```typescript
// Webhook URL入力フィールド
<div>
  <label>通常Webhook URL</label>
  <input
    type="url"
    value={webhookUrl}
    onChange={(e) => setWebhookUrl(e.target.value)}
    placeholder="https://chat.googleapis.com/v1/spaces/..."
  />
</div>

<div>
  <label>重要Webhook URL</label>
  <input
    type="url"
    value={importantWebhookUrl}
    onChange={(e) => setImportantWebhookUrl(e.target.value)}
    placeholder="https://chat.googleapis.com/v1/spaces/..."
  />
</div>
```

---

## 型定義

### MealFormSettings (拡張)

```typescript
export interface MealFormSettings {
  defaultFacility: string;
  defaultResidentName: string;
  defaultDayServiceName: string;
  webhookUrl?: string;           // 通常Webhook URL
  importantWebhookUrl?: string;  // 重要Webhook URL
  updatedAt: string;
}
```

### UpdateMealFormSettingsRequest (拡張)

```typescript
export interface UpdateMealFormSettingsRequest {
  defaultFacility?: string;
  defaultResidentName?: string;
  defaultDayServiceName?: string;
  webhookUrl?: string;
  importantWebhookUrl?: string;
}
```

---

## エラーハンドリング

| シナリオ | 対応 |
|----------|------|
| Webhook URL未設定 | 通知をスキップ（エラーにしない） |
| Webhook送信失敗 | ログ出力のみ、レコード保存は成功扱い |
| 不正なWebhook URL | 送信をスキップ（URL検証追加可能） |

> **重要**: Webhook送信の成否は食事記録の保存成功/失敗に影響しない

---

## 実装優先度

| 優先度 | 項目 | 理由 |
|--------|------|------|
| 高 | バックエンドWebhook送信機能 | コア機能 |
| 高 | 型定義・設定保存拡張 | バックエンド依存 |
| 中 | フロントエンド設定UI | 管理者のみ使用 |
| 低 | メッセージフォーマット調整 | 後から変更可能 |

---

## 実装ステップ

### Phase 1: バックエンド基盤

1. 型定義拡張 (`functions/src/types/index.ts`)
2. Webhook送信サービス作成 (`functions/src/services/googleChatService.ts`)
3. 設定API拡張 (`functions/src/functions/mealFormSettings.ts`)
4. 送信処理追加 (`functions/src/functions/submitMealRecord.ts`)

### Phase 2: フロントエンド

1. 型定義拡張 (`frontend/src/types/index.ts`)
2. 設定モーダル拡張 (`frontend/src/components/MealSettingsModal.tsx`)

### Phase 3: デプロイ・テスト

1. ビルド・Lint
2. GitHub Actions デプロイ
3. 動作確認（テストWebhook使用）

---

## 未決定事項

1. **利用者ID**: 投稿例に `ID7948` とあるが、現在のフォームにはない
   - Sheet Aの利用者マスタから取得？
   - 省略可能？

2. **メッセージの絵文字**: `#食事🍚` の絵文字は固定？

3. **通知失敗時のリトライ**: 必要か？

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-15 | 初版作成（Google Chat Webhook連携設計書） |
