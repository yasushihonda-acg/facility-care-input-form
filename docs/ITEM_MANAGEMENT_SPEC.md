# 品物管理機能 詳細設計書

> **最終更新**: 2025年12月16日
>
> 本ドキュメントは、家族から入居者への品物（食品等）送付を管理する機能の詳細設計を定義します。

---

## 1. 概要

### 1.1 目的

介護施設において、家族が入居者に送った食品等の品物を以下の目的で管理します：

1. **在庫把握**: 何がどれだけあるか家族・スタッフが把握
2. **賞味期限管理**: 期限切れを防止し、適切なタイミングで提供
3. **提供・摂食記録**: いつ、どれだけ提供し、どれだけ食べたか記録
4. **認識共有**: 家族とスタッフ間で品物状況を共有

### 1.2 ユースケース

```
【家族の操作】
1. 「キウイ3個を送りました」を登録
2. 賞味期限、提供方法の希望を入力
3. 提供状況・摂食結果を確認
4. スタッフへの申し送りを追加

【スタッフの操作】
1. 家族からの品物一覧を確認
2. 提供時に「提供日・提供個数」を記録
3. 摂食後に「摂食割合・状況」を記録
4. 家族への申し送りを追加
```

### 1.3 データフロー

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

```
┌─────────────────────────────────────────────┐
│ ← 品物を登録                                │
├─────────────────────────────────────────────┤
│                                             │
│ 品物名 *                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ キウイ                                  │ │
│ └─────────────────────────────────────────┘ │
│ [AI提案を見る]                              │
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
│ │ 2025/12/20   │                          │
│ └───────────────┘                          │
│                                             │
│ 保存方法                                    │
│ ○ 常温  ● 冷蔵  ○ 冷凍                    │
│                                             │
│ 提供方法 *                                  │
│ ○ そのまま  ● カット  ○ 皮むき            │
│ ○ 温める    ○ 冷やす  ○ その他            │
│                                             │
│ 提供方法の詳細                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 食べやすい大きさにカットしてください    │ │
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

### 4.3 品物詳細ページ（共通）

**パス**: `/family/items/:id` または `/staff/family-instructions/:id`

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

## 8. 参照資料

- [USER_ROLE_SPEC.md](./USER_ROLE_SPEC.md) - ユーザーロール・権限設計
- [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md) - タスク管理詳細設計
- [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) - 統計ダッシュボード設計
- [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) - AI連携設計
