---
status: working
scope: integration
owner: core-team
last_reviewed: 2025-12-20
---

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

---

### フォーム入力値 → 投稿本文 マッピング詳細

#### 完全マッピング表

| # | フォームフィールド | 変数名 | 投稿本文での表示 | 表示例 | 備考 |
|---|------------------|--------|-----------------|--------|------|
| 1 | 入力者（あなた）は？ | `staffName` | `記録者：{値}` | `記録者：クエン` | 必須 |
| 2 | 利用者様のお住まいの施設は？ | `facility` | ヘッダー `【{値}_...】` | `【七福の里220_...】` | 必須 |
| 3 | 利用者名は？ | `residentName` | ヘッダー `【.._{値}様(...)】` | `【..._大橋　建夫様(...)】` | 必須 |
| 4 | デイサービスの利用中ですか？ | `dayServiceUsage` | **表示しない** | - | Webhook通知には含めない |
| 5 | どこのデイサービスですか？ | `dayServiceName` | **表示しない** | - | Webhook通知には含めない |
| 6 | 食事はいつのことですか？ | `mealTime` | `摂取時間：{値}` | `摂取時間：夜` | 必須 |
| 7 | 主食の摂取量は何割ですか？ | `mainDishRatio` | `主食摂取量：{値}` | `主食摂取量：10割` | 空なら `--` |
| 8 | 副食の摂取量は何割ですか？ | `sideDishRatio` | `副食摂取量：{値}` | `副食摂取量：10割` | 空なら `--` |
| 9 | 注入の種類は？ | `injectionType` | `食事摂取方法：{値}...` | `食事摂取方法：経管栄養（200cc）` | 下記条件参照 |
| 10 | 注入量は？ | `injectionAmount` | `食事摂取方法：...（{値}）` | 同上 | 注入種類と併せて表示 |
| 11 | 間食は何を食べましたか？ | `snack` | **表示しない** | - | Webhook通知には含めない |
| 12 | 特記事項 | `note` | `特記事項：{値}` | `特記事項：【ケアに関すること】...` | 複数行そのまま |
| 13 | 重要特記事項集計表に反映させますか？ | `isImportant` | **表示しない**（送信先判定に使用） | - | 「重要」なら追加Webhook送信 |
| 14 | 写真アップロード | `photo` | **表示しない** | - | 将来対応予定 |
| - | (自動生成) 投稿ID | `postId` | `【投稿ID】：{値}` | `【投稿ID】：MEL20251211194443344007` | システム自動生成 |

#### ヘッダー行の構成

```
【{facility}_{residentName}様】
```

**例**: `【七福の里220_大橋　建夫様】`

> **注意**: 投稿例に `(ID7948)` とあるが、現在のフォームには利用者IDフィールドがないため省略。
> 将来、利用者マスタ連携時に追加可能。

#### 食事摂取方法の条件分岐

| 条件 | 表示内容 |
|------|----------|
| `injectionType` が空 | `食事摂取方法：経口` |
| `injectionType` のみ設定 | `食事摂取方法：{injectionType}` |
| `injectionType` と `injectionAmount` 両方設定 | `食事摂取方法：{injectionType}（{injectionAmount}）` |

**例**:
- 経口摂取の場合: `食事摂取方法：経口`
- 経管栄養200ccの場合: `食事摂取方法：経管栄養（200cc）`

#### 値が空の場合の表示

| フィールド | 空の場合の表示 |
|------------|---------------|
| `mainDishRatio` | `主食摂取量：--` |
| `sideDishRatio` | `副食摂取量：--` |
| `note` | `特記事項：` (空文字のまま) |

---

### メッセージテンプレート（疑似コード）

```
【{facility}_{residentName}様】
#食事🍚

記録者：{staffName}

摂取時間：{mealTime}

食事摂取方法：{intakeMethod}

主食摂取量：{mainDishRatio || '--'}

副食摂取量：{sideDishRatio || '--'}

特記事項：{note}


【投稿ID】：{postId}
```

**intakeMethod の決定ロジック**:
```typescript
const intakeMethod = injectionType
  ? (injectionAmount ? `${injectionType}（${injectionAmount}）` : injectionType)
  : '経口';
```

---

### 表示しないフィールドの理由

| フィールド | 理由 |
|------------|------|
| `dayServiceUsage` | チャット通知では不要（業務上の区分情報） |
| `dayServiceName` | チャット通知では不要（業務上の区分情報） |
| `snack` | 食事記録のメイン情報ではない |
| `isImportant` | 送信先判定にのみ使用、本文には不要 |
| `photo` | テキストメッセージでは表示不可（将来Google Drive URL追加可能） |

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

  return lines.join('
');
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

## Phase 29: 水分記録のWebhook通知

### 概要

水分記録（`recordType: 'hydration'`）時にもGoogle Chat Webhookへ通知を送信する。

### タグ仕様

チャット投稿には以下のタグを含める:

| タグ | 表示条件 | 形式 | 例 |
|------|----------|------|-----|
| `#デイ利用中[X]` | デイサービス利用中の場合 | `#デイ利用中[{dayServiceName}]` | `#デイ利用中[武]` |
| `#水分摂取💧` | 水分記録の場合（必須） | 固定 | `#水分摂取💧` |
| `#食事🍚` | 食事記録の場合（必須） | 固定 | `#食事🍚` |
| `#重要⚠️` | `isImportant === '重要'` の場合 | 固定 | `#重要⚠️` |

**デイサービス選択肢**: 武, 田上, 笹貫, 下荒田, 東千石, 南栄, 永吉, 七福の里
（参照: [DAY_SERVICE_OPTIONS_SPEC.md](./DAY_SERVICE_OPTIONS_SPEC.md)）

### 水分記録メッセージテンプレート

```
【{facility}_{residentName}様(ID{residentId})】
{#デイ利用中[dayServiceName] // 条件付き}
#水分摂取💧
{#重要⚠️ // 条件付き}

記録者：{staffName}

摂取量：{hydrationAmount}cc

特記事項：{note}

【ACPiece】


【投稿ID】：{postId}
```

### 投稿例

#### 例1: デイサービス利用中 + 重要

```
【七福の里101_田口　エヴェリン様(ID7533)】
#デイ利用中[武]
#水分摂取💧
#重要⚠️

記録者：木之瀬

摂取量：200cc

特記事項：【ケアに関すること】
脱水傾向あり、こまめな水分補給を継続

【ACPiece】


【投稿ID】：HYD20251221095450678429
```

#### 例2: デイサービス利用なし + 重要ではない

```
【七福の里215_蒲地　キヌヱ様(ID7282)】
#水分摂取💧

記録者：田中

摂取量：150cc

特記事項：【ケアに関すること】

【ACPiece】


【投稿ID】：HYD20251221103000123456
```

### 投稿ID形式

| recordType | プレフィックス | 例 |
|------------|---------------|-----|
| meal | `MEL` | `MEL20251221094500123456` |
| snack | `SNK` | `SNK20251221103000123456` |
| hydration | `HYD` | `HYD20251221095450678429` |

### 食事記録メッセージテンプレート（更新）

既存の食事記録メッセージにもタグを追加:

```
【{facility}_{residentName}様(ID{residentId})】
{#デイ利用中[dayServiceName] // 条件付き}
#食事🍚
{#重要⚠️ // 条件付き}

記録者：{staffName}

摂取時間：{mealTime}

食事摂取方法：{intakeMethod}

主食摂取量：{mainDishRatio || '--'}

副食摂取量：{sideDishRatio || '--'}

特記事項：{note}


【投稿ID】：{postId}
```

### 実装変更点

#### 1. googleChatService.ts

```typescript
// 新規追加: 水分記録メッセージフォーマット
export function formatHydrationRecordMessage(record: HydrationRecordForChat): string {
  const header = `【${record.facility}_${record.residentName}様(ID${record.residentId})】`;

  const tags: string[] = [];
  if (record.dayServiceUsage === '利用中' && record.dayServiceName) {
    tags.push(`#デイ利用中[${record.dayServiceName}]`);
  }
  tags.push('#水分摂取💧');
  if (record.isImportant === '重要') {
    tags.push('#重要⚠️');
  }

  const lines = [
    header,
    ...tags,
    '',
    `記録者：${record.staffName}`,
    '',
    `摂取量：${record.hydrationAmount}cc`,
    '',
    `特記事項：${record.note || '【ケアに関すること】'}`,
    '',
    '【ACPiece】',
    '',
    '',
    `【投稿ID】：${record.postId}`,
  ];

  return lines.join('\n');
}

// 型定義
export interface HydrationRecordForChat {
  facility: string;
  residentName: string;
  residentId: string;
  staffName: string;
  hydrationAmount: number;
  note?: string;
  dayServiceUsage: '利用中' | '利用中ではない';
  dayServiceName?: string;
  isImportant: '重要' | '重要ではない';
  postId: string;
}
```

#### 2. submitMealRecord.ts / StaffRecordDialog.tsx

水分記録送信時にWebhook通知を追加:

```typescript
// 水分記録がある場合、Webhook送信
if (hydrationAmount && settings.webhookUrl) {
  const hydrationMessage = formatHydrationRecordMessage({
    facility,
    residentName,
    residentId,
    staffName,
    hydrationAmount,
    note,
    dayServiceUsage,
    dayServiceName,
    isImportant,
    postId: `HYD${timestamp}`,
  });

  await sendToGoogleChat(settings.webhookUrl, hydrationMessage);

  if (isImportant === '重要' && settings.importantWebhookUrl) {
    await sendToGoogleChat(settings.importantWebhookUrl, hydrationMessage);
  }
}
```

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-21 | Phase 29: 水分記録Webhook通知仕様を追加、タグ仕様を定義 |
| 2025-12-15 | 初版作成（Google Chat Webhook連携設計書） |
