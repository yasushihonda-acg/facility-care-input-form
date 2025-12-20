---
status: working
scope: feature
owner: core-team
last_reviewed: 2025-12-21
---

# 品物管理機能 詳細設計書

> **最終更新**: 2025年12月21日（Phase 22 品物編集・タイムスタンプ管理追加）
>
> 本ドキュメントは、家族から入居者への品物（食品等）送付を管理する機能の詳細設計を定義します。
>
> **関連ドキュメント**:
> - [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) - 在庫・消費追跡システム詳細
> - [VIEW_ARCHITECTURE_SPEC.md](./VIEW_ARCHITECTURE_SPEC.md) - ビュー構成設計

---

## 1. 概要

### 1.1 目的

介護施設において、家族が入居者に送った食品等の品物を以下の目的で管理します：

1. **詳細な在庫追跡**: 小数点単位での残量管理（例: 4房中2.5房）
2. **消費履歴の蓄積**: 全ての提供・摂食を時系列で記録
3. **双方向の情報共有**: 家族⇄スタッフ間でリアルタイムに状況を共有
4. **食品傾向分析**: 食品別・カテゴリ別の摂食傾向を可視化

### 1.2 設計変更（Phase 9.0）

従来の単一 CareItem モデルから、3層モデルに拡張しました：

| 層 | モデル | 説明 |
|---|--------|------|
| 1 | FoodMaster | 食品マスタ（正規化情報 + 統計） |
| 2 | CareItem | 品物/在庫（家族が登録する単位） |
| 3 | ConsumptionLog | 消費ログ（提供・摂食の履歴） |

詳細は [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) を参照してください。

### 1.3 ユースケース

```
【家族の操作】
1. 「バナナ4房を送りました」を登録
2. 賞味期限、提供方法の希望、スケジュールを入力
3. リアルタイムで残量・摂食結果を確認
4. スタッフからの申し送りを受け取る

【スタッフの操作】
1. 家族連絡一覧で新着品物・指示を確認
2. 提供時に「提供数量・消費数量」を記録（複数回可）
3. 消費ログがタイムラインとして蓄積
4. 家族への申し送りを追加

【データ交差の例】
家族: バナナ4房送付 → 残量4房
         ↓
スタッフ: 1房提供、0.5房消費 → 残量3.5房
         ↓
家族: 「残り3.5房、半分食べました」を確認
         ↓
スタッフ: 1房提供、1房消費（完食）→ 残量2.5房
         ↓
家族: 「残り2.5房、今日は完食！」を確認
```

### 1.4 データフロー

```
家族                    スタッフ                   システム
  │                       │                        │
  │ 品物登録              │                        │
  ├──────────────────────────────────────────────>│
  │                       │                        │ Firestore保存
  │                       │                        │ タスク自動生成
  │                       │                        │
  │                       │ 品物確認               │
  │                       │<───────────────────────│
  │                       │                        │
  │                       │ 提供記録入力           │
  │                       ├───────────────────────>│
  │                       │                        │ ステータス更新
  │                       │                        │
  │                       │ 摂食結果入力           │
  │                       ├───────────────────────>│
  │                       │                        │ 統計データ更新
  │                       │                        │
  │ 結果確認              │                        │
  │<──────────────────────────────────────────────│
  │                       │                        │
```

---

## 2. データモデル

### 2.1 CareItem（品物）

```typescript
// Firestore: care_items/{itemId}
interface CareItem {
  // === 識別情報 ===
  id: string;                    // ドキュメントID（自動生成 UUID）
  residentId: string;            // 入居者ID
  userId: string;                // 登録した家族のID

  // === 品物基本情報（家族が入力） ===
  itemName: string;              // 品物名（必須）
  category: ItemCategory;        // カテゴリ（必須）
  sentDate: string;              // 送付日 (YYYY-MM-DD)（必須）
  quantity: number;              // 個数（必須、デフォルト: 1）
  unit: string;                  // 単位（個、パック、本、袋、等）
  expirationDate?: string;       // 賞味期限 (YYYY-MM-DD)
  storageMethod?: StorageMethod; // 保存方法

  // === 提供希望（家族が入力） ===
  servingMethod: ServingMethod;  // 提供方法（必須）
  servingMethodDetail?: string;  // 提供方法詳細（自由記述）
  plannedServeDate?: string;     // 提供予定日 (YYYY-MM-DD)
  noteToStaff?: string;          // スタッフへの申し送り

  // === 提供記録（スタッフが入力） ===
  actualServeDate?: string;      // 実際の提供日 (YYYY-MM-DD)
  servedQuantity?: number;       // 提供個数
  servedBy?: string;             // 提供したスタッフ名

  // === 摂食記録（スタッフが入力） ===
  consumptionRate?: number;      // 摂食割合 (0-100%)
  consumptionStatus?: ConsumptionStatus; // 摂食状況
  consumptionNote?: string;      // 摂食時の特記事項
  recordedBy?: string;           // 記録したスタッフ名

  // === 申し送り（スタッフ→家族） ===
  noteToFamily?: string;         // 家族への申し送り

  // === ステータス・メタ情報 ===
  status: ItemStatus;            // ステータス（必須）
  remainingQuantity: number;     // 残数
  createdAt: Timestamp;          // 登録日時
  updatedAt: Timestamp;          // 更新日時
}
```

### 2.2 列挙型定義

```typescript
// カテゴリ
type ItemCategory =
  | 'fruit'       // 果物
  | 'snack'       // お菓子・間食
  | 'drink'       // 飲み物
  | 'dairy'       // 乳製品
  | 'prepared'    // 調理済み食品
  | 'supplement'  // 栄養補助食品
  | 'other';      // その他

const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'fruit', label: '果物' },
  { value: 'snack', label: 'お菓子・間食' },
  { value: 'drink', label: '飲み物' },
  { value: 'dairy', label: '乳製品' },
  { value: 'prepared', label: '調理済み食品' },
  { value: 'supplement', label: '栄養補助食品' },
  { value: 'other', label: 'その他' },
];

// 保存方法
type StorageMethod =
  | 'room_temp'    // 常温
  | 'refrigerated' // 冷蔵
  | 'frozen';      // 冷凍

const STORAGE_METHODS: { value: StorageMethod; label: string }[] = [
  { value: 'room_temp', label: '常温' },
  { value: 'refrigerated', label: '冷蔵' },
  { value: 'frozen', label: '冷凍' },
];

// 提供方法
type ServingMethod =
  | 'as_is'      // そのまま
  | 'cut'        // カット
  | 'peeled'     // 皮むき
  | 'heated'     // 温める
  | 'cooled'     // 冷やす
  | 'blended'    // ミキサー
  | 'other';     // その他

const SERVING_METHODS: { value: ServingMethod; label: string }[] = [
  { value: 'as_is', label: 'そのまま' },
  { value: 'cut', label: 'カット' },
  { value: 'peeled', label: '皮むき' },
  { value: 'heated', label: '温める' },
  { value: 'cooled', label: '冷やす' },
  { value: 'blended', label: 'ミキサー' },
  { value: 'other', label: 'その他' },
];

// 摂食状況
type ConsumptionStatus =
  | 'full'     // 完食
  | 'most'     // ほぼ完食 (80%以上)
  | 'half'     // 半分程度 (50%程度)
  | 'little'   // 少量 (30%以下)
  | 'none';    // 食べなかった

const CONSUMPTION_STATUSES: { value: ConsumptionStatus; label: string; rate: number }[] = [
  { value: 'full', label: '完食', rate: 100 },
  { value: 'most', label: 'ほぼ完食', rate: 80 },
  { value: 'half', label: '半分程度', rate: 50 },
  { value: 'little', label: '少量', rate: 30 },
  { value: 'none', label: '食べなかった', rate: 0 },
];

// ステータス
type ItemStatus =
  | 'pending'    // 未提供（登録済み、まだ提供していない）
  | 'served'     // 提供済み（提供したが摂食記録なし）
  | 'consumed'   // 消費済み（摂食記録完了）
  | 'expired'    // 期限切れ
  | 'discarded'; // 廃棄

const ITEM_STATUSES: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'pending', label: '未提供', color: 'yellow' },
  { value: 'served', label: '提供済み', color: 'blue' },
  { value: 'consumed', label: '消費済み', color: 'green' },
  { value: 'expired', label: '期限切れ', color: 'red' },
  { value: 'discarded', label: '廃棄', color: 'gray' },
];
```

### 2.3 入力フォーム型

```typescript
// 家族が入力する登録フォーム
interface CareItemInput {
  itemName: string;              // 必須
  category: ItemCategory;        // 必須
  sentDate: string;              // 必須（デフォルト: 今日）
  quantity: number;              // 必須（デフォルト: 1）
  unit: string;                  // 必須（デフォルト: '個'）
  expirationDate?: string;       // 任意
  storageMethod?: StorageMethod; // 任意
  servingMethod: ServingMethod;  // 必須（デフォルト: 'as_is'）
  servingMethodDetail?: string;  // 任意
  plannedServeDate?: string;     // 任意
  noteToStaff?: string;          // 任意
}

// スタッフが入力する提供記録
interface ServingRecordInput {
  itemId: string;                // 対象品物ID
  actualServeDate: string;       // 提供日
  servedQuantity: number;        // 提供個数
  servedBy: string;              // スタッフ名
}

// スタッフが入力する摂食記録
interface ConsumptionRecordInput {
  itemId: string;                // 対象品物ID
  consumptionStatus: ConsumptionStatus; // 摂食状況
  consumptionRate?: number;      // 摂食割合（カスタム入力時）
  consumptionNote?: string;      // 特記事項
  noteToFamily?: string;         // 家族への申し送り
  recordedBy: string;            // スタッフ名
}
```

---

## 3. API仕様

### 3.1 品物登録 API

```
POST /submitCareItem
```

**リクエスト**:
```typescript
interface SubmitCareItemRequest {
  residentId: string;
  userId: string;
  item: CareItemInput;
}
```

**レスポンス**:
```typescript
interface SubmitCareItemResponse {
  success: boolean;
  data?: {
    itemId: string;
    createdAt: string;
  };
  error?: string;
}
```

**権限**: 家族のみ

**処理フロー**:
1. バリデーション（必須フィールドチェック）
2. `care_items` コレクションにドキュメント作成
3. 賞味期限が設定されている場合、`tasks` にタスク自動生成
4. レスポンス返却

### 3.2 品物一覧取得 API

```
GET /getCareItems
```

**リクエスト（クエリパラメータ）**:
```typescript
interface GetCareItemsRequest {
  residentId?: string;           // 入居者でフィルタ
  userId?: string;               // 登録者でフィルタ
  status?: ItemStatus | ItemStatus[]; // ステータスでフィルタ
  category?: ItemCategory;       // カテゴリでフィルタ
  startDate?: string;            // 送付日の開始日
  endDate?: string;              // 送付日の終了日
  limit?: number;                // 取得件数（デフォルト: 50）
  offset?: number;               // オフセット
}
```

**レスポンス**:
```typescript
interface GetCareItemsResponse {
  success: boolean;
  data?: {
    items: CareItem[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}
```

**権限**: 全ロール（閲覧のみ）

### 3.3 品物更新 API

```
PUT /updateCareItem
```

**リクエスト**:
```typescript
interface UpdateCareItemRequest {
  itemId: string;
  updates: Partial<CareItem>;
}
```

**レスポンス**:
```typescript
interface UpdateCareItemResponse {
  success: boolean;
  data?: {
    itemId: string;
    updatedAt: string;
  };
  error?: string;
}
```

**権限**: 管理者 or 作成者（家族）

### 3.4 提供記録入力 API

```
POST /recordServing
```

**リクエスト**:
```typescript
interface RecordServingRequest {
  itemId: string;
  actualServeDate: string;
  servedQuantity: number;
  servedBy: string;
}
```

**レスポンス**:
```typescript
interface RecordServingResponse {
  success: boolean;
  data?: {
    itemId: string;
    remainingQuantity: number;
    status: ItemStatus;
  };
  error?: string;
}
```

**権限**: スタッフのみ

**処理フロー**:
1. バリデーション
2. `actualServeDate`, `servedQuantity`, `servedBy` を更新
3. `remainingQuantity` を計算（quantity - servedQuantity）
4. `status` を `served` に更新
5. レスポンス返却

### 3.5 摂食記録入力 API

```
POST /recordConsumption
```

**リクエスト**:
```typescript
interface RecordConsumptionRequest {
  itemId: string;
  consumptionStatus: ConsumptionStatus;
  consumptionRate?: number;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
}
```

**レスポンス**:
```typescript
interface RecordConsumptionResponse {
  success: boolean;
  data?: {
    itemId: string;
    status: ItemStatus;
  };
  error?: string;
}
```

**権限**: スタッフのみ

**処理フロー**:
1. バリデーション
2. 摂食情報を更新
3. `status` を `consumed` に更新
4. 統計データを更新（将来）
5. レスポンス返却

### 3.6 品物削除 API

```
DELETE /deleteCareItem
```

**リクエスト**:
```typescript
interface DeleteCareItemRequest {
  itemId: string;
}
```

**レスポンス**:
```typescript
interface DeleteCareItemResponse {
  success: boolean;
  error?: string;
}
```

**権限**: 管理者 or 作成者（家族）

---

## 4. UI設計

### 4.1 品物一覧ページ（家族用）

**パス**: `/family/items`

```
┌─────────────────────────────────────────────┐
│ 📦 品物管理                    [+ 新規登録] │
├─────────────────────────────────────────────┤
│ [全て] [未提供] [提供済み] [消費済み]        │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 🥝 キウイ                    未提供    │ │
│ │ 送付: 12/15  期限: 12/20  残: 3個      │ │
│ │ [そのまま提供]                          │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🍮 プリン                    消費済み  │ │
│ │ 送付: 12/14  摂食: 80%                 │ │
│ │ [よく食べました]                        │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ [ホーム] [品物管理] [ケア指示] [統計]       │
└─────────────────────────────────────────────┘
```

### 4.2 品物登録フォーム（家族用）

**パス**: `/family/items/new`

> **重要な設計原則**:
> - 品物登録は**恒久的な提供指示**を設定する場所
> - 「いつもの指示（プリセット）」はここで適用し、提供方法の詳細を自動入力
> - 一時的な変更・追記は別途「ケア指示作成」（/family/request）で行う

#### 入力効率化: プリセットとAI提案の使い分け

| 入力方法 | 発動条件 | 効果 | 主な用途 |
|----------|----------|------|----------|
| **プリセット選択** | 品物名入力前にボタンをタップ | 品物名 + 提供方法詳細を**ワンクリック**で自動入力 | よく送る品物（キウイ、黒豆など） |
| **AI提案** | 品物名入力後「🤖 AI提案」**ボタンをタップ** | 賞味期限・保存方法・提供方法を提案 | プリセットにない新しい品物 |

> **設計方針**:
> - AI提案は**自動発動しない**（ボタン押下で明示的に発動）
> - プリセットには**品物のみ**を登録（禁止ルール等は別管理）
> - 各プリセットは**単品ごと**に登録（複数品物をまとめない）

#### プリセットの登録対象

| 登録可 | 登録不可 |
|--------|----------|
| キウイ、柿、黒豆、らっきょう、みかん、黒砂糖、チーズ | 「〇〇は出さない」等の禁止ルール |

#### プリセット適用フロー（推奨パス）

```
1. プリセットボタンをタップ（例: 🥝キウイ）
     ↓
2. 以下が自動入力される:
   - 品物名: 「キウイ」（カッコ前の部分）
   - 提供方法の詳細: プリセットの詳細指示
     ↓
3. 必要に応じて他のフィールドを編集
     ↓
4. 登録
```

#### 手入力 + AI提案フロー

```
1. 品物名を直接入力（例: 「ぶどう」）
     ↓
2. 「🤖 AI提案」ボタンをタップ
     ↓
3. AI提案カードが表示される
     ↓
4. 「この提案を適用」ボタンをタップ
     ↓
5. 以下が自動入力される:
   - 賞味期限（AI計算）
   - 保存方法
   - 提供方法
     ↓
6. 必要に応じて編集・追記
     ↓
7. 登録
```

#### 画面構成

> **フォーム順序の設計原則**:
> - プリセット選択 → 品物名自動入力 → 詳細編集の流れ
> - プリセットは品物名より**上**に配置

```
┌─────────────────────────────────────────────┐
│ ← 品物を登録                                │
├─────────────────────────────────────────────┤
│                                             │
│ ⚡ いつもの指示（プリセット）               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │🥝キウイ  │ │🍑熟した柿│ │⚫黒豆    │     │
│ │(8等分)   │ │          │ │(煮汁切り)│     │
│ └──────────┘ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │🧅らっきょう│ │🍊みかん  │ │🈲七福禁止│     │
│ └──────────┘ └──────────┘ └──────────┘     │
│ ※ 選択すると品物名と提供方法詳細が自動入力 │
│                                             │
│ 品物名 *                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ キウイ        ← プリセットで自動入力    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ 💡 AI提案 ────────────────────────────┐  │
│ │ 賞味期限: 5日  保存: 冷蔵              │  │
│ │ 提供方法: カット、皮むき               │  │
│ │ 注意: 皮をむいて食べやすい大きさに...  │  │
│ │                         [この提案を適用]│  │
│ └─────────────────────────────────────────┘  │
│                                             │
│ カテゴリ *                                  │
│ ○ 果物  ○ お菓子  ○ 飲み物  ○ その他     │
│                                             │
│ 送付日 *              個数 *                │
│ ┌───────────────┐    ┌───────┐ ┌─────┐    │
│ │ 2025/12/16   │    │   3   │ │ 個  │    │
│ └───────────────┘    └───────┘ └─────┘    │
│                                             │
│ 賞味期限                                    │
│ ┌───────────────┐                          │
│ │ 2025/12/20   │  ← AI提案で自動入力      │
│ └───────────────┘                          │
│                                             │
│ 保存方法                                    │
│ ○ 常温  ● 冷蔵  ○ 冷凍  ← AI提案で自動選択│
│                                             │
│ 提供方法 *                                  │
│ ○ そのまま  ● カット  ○ 皮むき            │
│ ○ 温める    ○ 冷やす  ○ その他            │
│                                             │
│ 提供方法の詳細（いつもの指示）              │
│ ┌─────────────────────────────────────────┐ │
│ │ 輪切り4等分にしたものを、さらに半分    │ │
│ │ （半月）に切って、8等分にカット。      │ │
│ │ 皮は必ず剥いてください。               │ │
│ │ ← プリセット適用で自動入力              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 提供予定日                                  │
│ ┌───────────────┐                          │
│ │ 2025/12/17   │                          │
│ └───────────────┘                          │
│                                             │
│ スタッフへの申し送り                        │
│ ┌─────────────────────────────────────────┐ │
│ │ 好物なのでぜひ食べさせてあげてください  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│           [登録する]                        │
│                                             │
└─────────────────────────────────────────────┘
```

#### 関連ドキュメント

- [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) - プリセット管理詳細
- [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) - AI提案連携詳細

### 4.3 品物詳細ページ（共通）

**パス**: `/family/items/:id` または `/staff/family-messages/:id`

```
┌─────────────────────────────────────────────┐
│ ← キウイ                         [編集]    │
├─────────────────────────────────────────────┤
│                                             │
│ ステータス: 🟡 未提供                       │
│                                             │
│ ┌─ 品物情報 ─────────────────────────────┐  │
│ │ カテゴリ:     果物                     │  │
│ │ 送付日:       2025/12/16               │  │
│ │ 個数:         3個                      │  │
│ │ 賞味期限:     2025/12/20 (あと4日)     │  │
│ │ 保存方法:     冷蔵                     │  │
│ └─────────────────────────────────────────┘  │
│                                             │
│ ┌─ 提供希望 ─────────────────────────────┐  │
│ │ 提供方法:     カット                   │  │
│ │ 詳細:         食べやすい大きさに       │  │
│ │ 提供予定:     2025/12/17               │  │
│ └─────────────────────────────────────────┘  │
│                                             │
│ ┌─ 家族からの申し送り ───────────────────┐  │
│ │ 好物なのでぜひ食べさせてあげてください │  │
│ └─────────────────────────────────────────┘  │
│                                             │
│ ── 提供・摂食記録 ─────────────────────────  │
│ （まだ記録がありません）                    │
│                                             │
│ 【スタッフ用: 提供記録ボタン】              │
│           [提供を記録する]                  │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.4 提供記録入力モーダル（スタッフ用）

```
┌─────────────────────────────────────────────┐
│ 提供を記録                         [×]     │
├─────────────────────────────────────────────┤
│                                             │
│ 品物: キウイ（残: 3個）                     │
│                                             │
│ 提供日 *                                    │
│ ┌───────────────┐                          │
│ │ 2025/12/17   │                          │
│ └───────────────┘                          │
│                                             │
│ 提供個数 *                                  │
│ ┌───────┐                                  │
│ │   1   │ / 3個                           │
│ └───────┘                                  │
│                                             │
│ 担当スタッフ *                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 山田太郎                                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│      [キャンセル]    [記録する]             │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.5 摂食記録入力モーダル（スタッフ用）

```
┌─────────────────────────────────────────────┐
│ 摂食結果を記録                     [×]     │
├─────────────────────────────────────────────┤
│                                             │
│ 品物: キウイ（提供: 1個）                   │
│                                             │
│ 摂食状況 *                                  │
│ ● 完食 (100%)                              │
│ ○ ほぼ完食 (80%)                           │
│ ○ 半分程度 (50%)                           │
│ ○ 少量 (30%)                               │
│ ○ 食べなかった (0%)                        │
│                                             │
│ 特記事項                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ おいしそうに召し上がっていました        │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ご家族への申し送り                          │
│ ┌─────────────────────────────────────────┐ │
│ │ よく食べられました。また送ってください  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│      [キャンセル]    [記録する]             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 5. 実装ファイル構成

### 5.1 バックエンド

```
functions/src/
├── functions/
│   └── careItems.ts           # 品物CRUD API
├── types/
│   └── careItem.ts            # 型定義
└── services/
    └── careItemService.ts     # ビジネスロジック
```

### 5.2 フロントエンド

```
frontend/src/
├── types/
│   └── careItem.ts            # 型定義・定数
├── pages/family/
│   ├── ItemManagement.tsx     # 品物一覧ページ
│   ├── ItemDetail.tsx         # 品物詳細ページ
│   └── ItemForm.tsx           # 品物登録ページ
├── components/family/
│   ├── ItemCard.tsx           # 品物カード
│   ├── ItemList.tsx           # 品物リスト
│   ├── ItemStatusBadge.tsx    # ステータスバッジ
│   ├── ServingRecordModal.tsx # 提供記録モーダル
│   └── ConsumptionRecordModal.tsx # 摂食記録モーダル
├── hooks/
│   ├── useCareItems.ts        # 品物一覧取得
│   ├── useCareItem.ts         # 品物詳細取得
│   └── useCareItemMutations.ts # 登録・更新・削除
└── api/
    └── careItems.ts           # API呼び出し関数
```

---

## 6. タスク自動生成

品物登録時に以下のタスクを自動生成します（詳細は TASK_MANAGEMENT_SPEC.md）:

### 6.1 賞味期限警告タスク

- **トリガー**: 賞味期限が設定されている品物
- **生成タイミング**: 期限3日前
- **タスクタイプ**: `expiration_warning`
- **優先度**: `high`

### 6.2 提供リマインダータスク

- **トリガー**: 提供予定日が設定されている品物
- **生成タイミング**: 提供予定日当日の朝
- **タスクタイプ**: `serve_reminder`
- **優先度**: `medium`

---

## 7. 統計・分析

品物データから以下の統計を算出します（詳細は STATS_DASHBOARD_SPEC.md）:

1. **品物残量推移**: 日別の在庫数グラフ
2. **賞味期限分布**: 今週/来週の期限切れ予定数
3. **摂食率分析**: 品目別・カテゴリ別の平均摂食率
4. **よく残される品目**: 摂食率が低い品目ランキング
5. **人気品目**: 摂食率が高い品目ランキング

---

## 8. 禁止ルール（提供禁止品目）

### 8.1 概要

「七福のお菓子は出さない」のような禁止ルールは、品物（CareItem）やプリセット（CarePreset）とは別の概念です。

| 比較 | プリセット | 禁止ルール |
|------|-----------|-----------|
| 対象 | 品物（食品） | ルール/制約 |
| 目的 | 提供方法の指定 | 提供を**禁止** |
| 紐付け | 入居者 or 共通 | 入居者 |
| 参照者 | 家族（登録時） | スタッフ（提供時） |

### 8.2 データモデル

```typescript
// Firestore: residents/{residentId}/prohibitions/{prohibitionId}
interface ProhibitionRule {
  id: string;                    // ドキュメントID
  residentId: string;            // 入居者ID

  // ルール内容
  itemName: string;              // 禁止品目名（例: 「七福のお菓子」）
  category?: ItemCategory;       // カテゴリ（任意、絞り込み用）
  reason?: string;               // 禁止理由（例: 「糖分過多のため」）

  // メタ情報
  createdBy: string;             // 設定した家族ID
  createdAt: Timestamp;          // 設定日時
  updatedAt: Timestamp;          // 更新日時
  isActive: boolean;             // 有効フラグ（無効化可能）
}
```

### 8.3 UI配置

禁止ルールは以下の場所に表示されます：

| 画面 | 表示内容 | 対象ユーザー |
|------|----------|-------------|
| **入居者設定**（`/family/settings/resident`） | 禁止ルールの追加・編集・削除 | 家族 |
| **スタッフ家族連絡一覧**（`/staff/family-messages`） | ⚠️ 禁止品目バッジ | スタッフ |
| **品物詳細**（`/family/items/:id`） | 禁止品目に該当する場合は警告表示 | 両方 |

### 8.4 スタッフ向け表示

スタッフが品物を確認する画面では、禁止ルールを目立つ形で表示します：

```
┌─────────────────────────────────────────────┐
│ 蒲地 キヌヱ 様                              │
├─────────────────────────────────────────────┤
│ ⚠️ 提供禁止品目                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🚫 七福のお菓子                         │ │
│ │    理由: ご家族の希望                   │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ 📦 本日の品物タスク                         │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### 8.5 家族向け設定画面

```
┌─────────────────────────────────────────────┐
│ ← 入居者設定                                │
├─────────────────────────────────────────────┤
│                                             │
│ 🚫 提供禁止品目                             │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 七福のお菓子                    [削除]  │ │
│ │ 理由: ご家族の希望                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│           [+ 禁止品目を追加]                │
│                                             │
├─────────────────────────────────────────────┤
│ ⚡ いつもの指示（プリセット）               │
│ 品物ごとの提供方法は「プリセット管理」で    │
│ 設定してください                            │
│                         [プリセット管理へ →]│
│                                             │
└─────────────────────────────────────────────┘
```

### 8.6 プリセットとの違い（重要）

| 設定項目 | 例 | 登録場所 |
|----------|-----|----------|
| **品物の提供方法** | 「キウイは8等分に」 | プリセット |
| **提供禁止** | 「七福のお菓子は出さない」 | 禁止ルール |
| **条件付き提供** | 「黒砂糖は指定日のみ」 | プリセット + 注記 |

> **設計方針**:
> - プリセットは「何を・どう提供するか」の指示
> - 禁止ルールは「何を提供しないか」の制約
> - 両者は別コレクションで管理し、UIも分離する

### 8.7 実装優先度

| 項目 | 優先度 | 備考 |
|------|--------|------|
| データモデル定義 | 高 | Phase 9.x |
| 家族向け設定UI | 高 | Phase 9.x |
| スタッフ向け警告表示 | 高 | Phase 9.x |
| API実装 | 高 | Phase 9.x |

---

## 9. 品物編集・タイムスタンプ管理（Phase 22）

### 9.1 概要

Phase 22では、品物管理機能に以下の機能を追加します：

1. **品物編集機能** (Phase 22.1): 登録済み品物の編集UI
2. **タイムスタンプ表示** (Phase 22.2): 登録日時・更新日時の表示
3. **編集履歴タイムライン** (Phase 22.3): 登録・編集イベントのタイムライン表示

### 9.2 Phase 22.1: 品物編集機能

#### 9.2.1 目的

現在、品物（CareItem）は登録のみ可能で、登録後の編集ができません。
家族が間違った情報を登録した場合や、提供方法を変更したい場合に対応するため、編集機能を追加します。

#### 9.2.2 編集可能フィールド

| フィールド | 編集可 | 備考 |
|-----------|--------|------|
| itemName | ✅ | 品物名 |
| category | ✅ | カテゴリ |
| quantity | ✅ | 個数 |
| unit | ✅ | 単位 |
| expirationDate | ✅ | 賞味期限 |
| storageMethod | ✅ | 保存方法 |
| servingMethod | ✅ | 提供方法 |
| servingMethodDetail | ✅ | 提供方法詳細 |
| plannedServeDate | ✅ | 提供予定日 |
| noteToStaff | ✅ | スタッフへの申し送り |
| sentDate | ❌ | 送付日（変更不可） |
| remainingQuantity | ❌ | 残量（自動計算） |
| status | ❌ | ステータス（自動更新） |

#### 9.2.3 権限

| ユーザー | 編集権限 |
|----------|----------|
| 作成者（家族） | ✅ 可能 |
| 他の家族 | ❌ 不可 |
| スタッフ | ❌ 不可（提供記録は別API） |
| 管理者 | ✅ 可能 |

#### 9.2.4 UI設計

**編集ボタン配置**: ItemDetail.tsx の右上ヘッダー

```
┌─────────────────────────────────────────────┐
│ ← キウイ                    [編集] [削除]   │
├─────────────────────────────────────────────┤
```

**編集ページ**: `/family/items/:id/edit`

```
┌─────────────────────────────────────────────┐
│ ← 品物を編集                                │
├─────────────────────────────────────────────┤
│                                             │
│ 品物名 *                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ キウイ                                  │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ カテゴリ *                                  │
│ ● 果物  ○ お菓子  ○ 飲み物  ○ その他     │
│                                             │
│ 送付日（変更不可）                          │
│ ┌─────────────────────────────────────────┐ │
│ │ 2025/12/16                 [🔒]         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 個数 *                単位                  │
│ ┌───────┐            ┌─────┐               │
│ │   3   │            │ 個  │               │
│ └───────┘            └─────┘               │
│                                             │
│ 賞味期限                                    │
│ ┌───────────────┐                          │
│ │ 2025/12/20   │                          │
│ └───────────────┘                          │
│                                             │
│ ... (他フィールド) ...                      │
│                                             │
│      [キャンセル]    [更新する]             │
│                                             │
└─────────────────────────────────────────────┘
```

#### 9.2.5 デモモード対応

デモモード（`/demo/family/items/:id/edit`）では：
- APIコールをスキップ
- ローカルstateで編集をシミュレート
- 編集完了後、詳細ページに戻る

#### 9.2.6 E2Eテスト項目

| テストID | 説明 |
|----------|------|
| ITEM-EDIT-001 | 編集ボタンが表示される |
| ITEM-EDIT-002 | 編集ページに遷移できる |
| ITEM-EDIT-003 | 既存の値がフォームに入力されている |
| ITEM-EDIT-004 | 品物名を変更して保存できる |
| ITEM-EDIT-005 | 送付日は編集不可 |
| ITEM-EDIT-006 | キャンセルで元の詳細ページに戻る |
| ITEM-EDIT-007 | デモモードで編集が動作する |

### 9.3 Phase 22.2: タイムスタンプ表示

#### 9.3.1 目的

品物の登録日時・更新日時を表示し、いつ登録されたか、いつ変更されたかを明確にします。

#### 9.3.2 表示フォーマット

```typescript
// 日付フォーマット関数
function formatTimestamp(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // 今日: 時刻のみ
    return `今日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  } else if (diffDays === 1) {
    return '昨日';
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else {
    // 7日以上: 日付表示
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
```

#### 9.3.3 UI配置

ItemDetail.tsx の品物情報セクション下部に表示：

```
┌─ 品物情報 ─────────────────────────────┐
│ カテゴリ:     果物                     │
│ 送付日:       2025/12/16               │
│ 個数:         3個                      │
│ 賞味期限:     2025/12/20 (あと4日)     │
│ 保存方法:     冷蔵                     │
├────────────────────────────────────────┤
│ 📝 登録: 12/16 14:30                   │
│ ✏️ 更新: 12/17 09:15                   │
└────────────────────────────────────────┘
```

#### 9.3.4 E2Eテスト項目

| テストID | 説明 |
|----------|------|
| ITEM-TS-001 | 登録日時が表示される |
| ITEM-TS-002 | 更新日時が表示される（更新がある場合） |
| ITEM-TS-003 | 更新がない場合は更新日時を表示しない |

### 9.4 Phase 22.3: 編集履歴タイムライン

#### 9.4.1 目的

品物の変更履歴をタイムラインで表示し、いつ・どのような変更が行われたかを追跡できるようにします。

#### 9.4.2 実装方針

**方針A: item_events コレクション（推奨）**

```typescript
// Firestore: care_items/{itemId}/events/{eventId}
interface CareItemEvent {
  id: string;
  itemId: string;
  eventType: 'created' | 'updated' | 'served' | 'consumed';
  timestamp: Timestamp;
  userId: string;          // 操作したユーザー
  changes?: {              // 変更内容（updateの場合）
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: {
    consumptionRate?: number;
    servedQuantity?: number;
  };
}
```

**メリット**:
- 詳細な変更履歴を保持
- 変更内容（どのフィールドがどう変わったか）を記録可能

**デメリット**:
- サブコレクションの追加が必要
- 書き込みコスト増加

#### 9.4.3 イベントタイプ

| eventType | 説明 | アイコン |
|-----------|------|----------|
| created | 品物登録 | 📦 |
| updated | 品物編集 | ✏️ |
| served | 提供記録 | 🍽️ |
| consumed | 消費記録 | ✅ |

#### 9.4.4 タイムライン表示

**実装場所**: ItemDetail.tsx（品物詳細ページ内にインライン表示）

> **注**: 当初は別ページ（ItemTimeline.tsx）へのリンク「タイムラインを見る」がありましたが、
> Phase 22.3拡張で品物詳細ページ内に統合表示されるようになったため、
> 冗長なリンクは削除されました（`e4eede4`）。

表示形式：

```
┌─ タイムライン（履歴） ───────────────────┐
│                                        │
│ 🍽️ 12/18 15:00  提供                   │  ← 新しい順
│    田中さんが提供: 0.5房                │
│    摂食: 0.4房 (80%) 😊ほぼ完食         │
│    → 残り 2房                           │
│                                        │
│ ✏️ 12/17 09:15  品物編集               │
│    【変更内容】                         │
│    ├ 提供方法詳細: そのまま → カット    │
│    └ 家族 太郎                          │
│                                        │
│ 📦 12/16 14:30  品物登録               │
│    新規品物として登録                   │
│                                        │
└────────────────────────────────────────┘
```

#### 9.4.5 デモデータ

| ファイル | 内容 |
|----------|------|
| `demoItemEvents.ts` | 品物イベント（編集履歴）デモデータ |
| `itemEvent.ts` | ItemEvent型定義、ヘルパー関数 |
| `useItemEvents.ts` | 品物イベント取得フック |

デモデータには14品物中10品物の編集イベントを用意:
- 提供方法変更、保存方法変更、数量修正、スケジュール追加など

#### 9.4.6 E2Eテスト項目

| テストID | 説明 |
|----------|------|
| ITEM-TL-001 | タイムラインセクションが品物詳細に表示される |
| ITEM-TL-002 | 登録イベント（📦）がタイムラインに表示される |
| ITEM-TL-003 | 編集イベント（✏️）がタイムラインに表示される |
| ITEM-TL-003a | 編集イベントに変更内容が表示される |
| ITEM-TL-003b | 編集イベントに実行者が表示される |
| ITEM-TL-004 | 提供・消費イベントがタイムラインに表示される |
| ITEM-TL-005 | タイムラインが時系列順（新しい順）に表示される |
| ITEM-TL-006 | イベントにタイムスタンプが表示される |
| ITEM-TL-007 | デモモードでイベントタイムラインが正常に動作する |

### 9.5 実装順序

| Phase | 内容 | 依存 |
|-------|------|------|
| 22.1 | 品物編集機能 | なし |
| 22.2 | タイムスタンプ表示 | なし |
| 22.3 | 編集履歴タイムライン | 22.1（編集時にイベント生成） |

### 9.6 API拡張

#### getItemEvents API（新規）

```
GET /getItemEvents?itemId={itemId}
```

**リクエスト**:
```typescript
interface GetItemEventsRequest {
  itemId: string;
  limit?: number;      // デフォルト: 50
}
```

**レスポンス**:
```typescript
interface GetItemEventsResponse {
  success: boolean;
  data?: {
    events: CareItemEvent[];
  };
  error?: ApiError;
  timestamp: string;
}
```

**権限**: 家族・スタッフ共通

#### updateCareItem API の拡張

```typescript
// 現在の実装を維持しつつ、events サブコレクションにイベントを追加
async function updateCareItemHandler(req: UpdateCareItemRequest): Promise<UpdateCareItemResponse> {
  const { itemId, updates } = req;

  // 1. 現在の値を取得（変更差分の記録用）
  const currentDoc = await firestore.collection('care_items').doc(itemId).get();
  const currentData = currentDoc.data();

  // 2. 更新実行
  await firestore.collection('care_items').doc(itemId).update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 3. 変更イベントを記録
  const changes = Object.keys(updates)
    .filter(key => updates[key] !== currentData[key])
    .map(key => ({
      field: key,
      oldValue: currentData[key],
      newValue: updates[key],
    }));

  await firestore.collection('care_items').doc(itemId)
    .collection('events').add({
      eventType: 'updated',
      timestamp: FieldValue.serverTimestamp(),
      userId: req.userId, // 追加パラメータ
      changes,
    });

  return { success: true, data: { itemId, updatedAt: new Date().toISOString() } };
}
```

---

## 10. 参照資料

- [USER_ROLE_SPEC.md](./USER_ROLE_SPEC.md) - ユーザーロール・権限設計
- [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md) - タスク管理詳細設計
- [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) - 統計ダッシュボード設計
- [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) - AI連携設計
- [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) - プリセット管理設計
- [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) - 在庫・消費追跡詳細設計
- [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md) - 間食記録連携設計
