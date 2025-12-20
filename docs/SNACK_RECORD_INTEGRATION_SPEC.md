---
status: working
scope: feature
owner: core-team
last_reviewed: 2025-12-20
---

# 間食記録連携設計書

> **最終更新**: 2025年12月18日
> **ステータス**: ✅ **全Phase実装完了**
>
> このドキュメントは、スタッフの食事記録入力と家族向け品物管理の連携機能を設計します。

---

## 1. 概要

### 1.1 背景・課題

| 現状 | 課題 |
|------|------|
| スタッフの食事記録（Sheet B）と家族の品物管理（Firestore）が独立 | 家族が「送った品物がどう提供されたか」を詳細に確認できない |
| 間食フィールドは自由テキストのみ | 品物単位の摂食状況・在庫が追跡できない |
| 家族指示（プリセット・禁止ルール）の対応状況が記録されない | スタッフが指示通り対応したか確認できない |

### 1.2 目的

1. **スタッフ**: 家族の品物情報・指示を見ながら安心して入力できる
2. **家族**: 送った品物の提供・摂食状況を詳細に確認できる
3. **システム**: 既存機能を維持しつつ、新機能を追加連携する

### 1.3 スコープ

| 対象 | 内容 |
|------|------|
| **対象機能** | 食事記録入力フォームの「間食」セクション |
| **連携先** | 品物管理（care_items）、消費ログ（consumption_logs） |
| **対象ユーザー** | スタッフ（入力）、家族（閲覧） |

### 1.4 関連ドキュメント

| ドキュメント | 関連箇所 |
|-------------|----------|
| [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md) | 食事入力フォーム全体設計 |
| [SHEET_B_STRUCTURE.md](./SHEET_B_STRUCTURE.md) | Sheet Bのカラム構造 |
| [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) | 品物管理機能 |
| [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) | 消費ログ・在庫追跡 |
| [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) | プリセット（いつもの指示） |
| [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) | Webhook通知 |

---

## 2. システム設計

### 2.1 データフロー全体像

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        スタッフ: 食事記録入力フォーム                         │
│                              /input/meal                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ 入力データ
         │ ┌─────────────────────────────────────────┐
         │ │ 既存フィールド + 間食詳細（snackRecords）  │
         │ └─────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Cloud Functions                                       │
│                    submitMealRecord (拡張版)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ 1. Sheet B書込み │   │ 2. Firestore    │   │ 3. Webhook通知  │           │
│  │   (既存維持)     │   │   消費ログ記録   │   │   (既存維持)    │           │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│           │                     │                     │                     │
│           ▼                     ▼                     ▼                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│  │ 間食: "羊羹を   │   │consumption_logs │   │ Google Chat     │           │
│  │ 1切れ、半分..."  │   │ + 在庫更新      │   │ 通知メッセージ   │           │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
┌─────────────────────┐   ┌─────────────────────────────────────────────────┐
│ スタッフ・家族共通   │   │              家族専用ページ                      │
│    記録閲覧         │   │  ┌───────────────────────────────────────────┐  │
│  (既存のまま維持)    │   │  │ 品物タイムライン: 提供・摂食履歴が見える    │  │
│                     │   │  │ 在庫バー: 残量がリアルタイム反映           │  │
│                     │   │  │ 統計: 摂食傾向が分かる                     │  │
│                     │   │  │ 指示対応: 「指示通り対応」が確認できる      │  │
│                     │   │  └───────────────────────────────────────────┘  │
└─────────────────────┘   └─────────────────────────────────────────────────┘
```

### 2.2 既存機能との整合性

| 既存機能 | 維持方法 | 変更点 |
|----------|----------|--------|
| Sheet B書き込み | `snack` フィールドに書き込み | 連結ロジック追加（下記参照） |
| Google Chat通知 | 従来通りのメッセージ形式 | なし |
| 記録閲覧（スタッフ・家族共通） | syncPlanData → Firestore → 表示 | なし |
| 品物管理（家族） | care_items コレクション | 消費ログとの連携追加 |
| 消費ログ | consumption_logs サブコレクション | 食事記録から自動作成 |

#### Sheet B「間食は何を食べましたか？」書き込みルール

| 入力パターン | Sheet Bへの書き込み内容 |
|-------------|----------------------|
| 【今回の提供記録】のみ | `黒豆 1g（完食）、らっきょう 0.7瓶（ほぼ完食）` |
| 「間食について補足」のみ | `施設のおやつも少々` |
| **両方入力** | `黒豆 1g（完食）、らっきょう 0.7瓶（ほぼ完食）。施設のおやつも少々` |
| 「家族へのメモ（任意）」 | **反映しない**（Firestoreの消費ログにのみ保存） |

**連結形式**: `{提供記録}。{自由記入補足}`

---

## 3. API設計

### 3.1 submitMealRecord API 拡張

#### リクエスト型（拡張）

```typescript
// 既存の SubmitMealRecordRequest を後方互換で拡張
interface SubmitMealRecordRequest {
  // === 既存フィールド（変更なし）===
  staffName: string;
  facility: string;
  residentName: string;
  dayServiceUsage: '利用中' | '利用中ではない';
  dayServiceName?: string;
  mealTime: '朝' | '昼' | '夜';
  mainDishRatio?: string;
  sideDishRatio?: string;
  injectionType?: string;
  injectionAmount?: string;
  snack?: string;                    // 従来の自由テキスト（Sheet B用）
  note?: string;
  isImportant: '重要' | '重要ではない';

  // === 追加フィールド（オプショナル）===
  snackRecords?: SnackRecord[];      // 間食詳細記録
  residentId?: string;               // 入居者ID（品物連携用）
}

// 間食詳細記録
interface SnackRecord {
  // 品物識別
  itemId?: string;                   // care_items のID（紐づけ用）
  itemName: string;                  // 品物名（表示・Sheet B用）

  // 提供情報
  servedQuantity: number;            // 提供数
  unit?: string;                     // 単位（個、切れ等）

  // 摂食情報
  consumptionStatus: ConsumptionStatus; // full/most/half/little/none
  consumptionRate?: number;          // 0-100（オプション、statusから自動計算可）

  // 家族指示対応
  followedInstruction?: boolean;     // 家族指示に従ったか
  instructionNote?: string;          // 指示対応メモ

  // その他
  note?: string;                     // スタッフメモ
  noteToFamily?: string;             // 家族への申し送り
}
```

#### 処理フロー

```
submitMealRecord 受信
    │
    ├─► 1. バリデーション
    │       - 既存バリデーション（変更なし）
    │       - snackRecords がある場合は追加バリデーション
    │
    ├─► 2. Sheet B 書き込み（既存ロジック維持）
    │       - snack フィールド: snackRecords から自動生成 or 従来の snack を使用
    │       - 例: "羊羹 1切れ（半分）、チーズ 1個（完食）"
    │
    ├─► 3. Webhook 通知（既存ロジック維持）
    │       - 従来通りのメッセージ形式
    │
    └─► 4. Firestore 消費ログ記録（新規追加）
            - snackRecords の各アイテムについて:
              - itemId がある場合: consumption_logs に記録
              - care_items.currentQuantity を更新
              - care_items.consumptionSummary を更新
```

### 3.2 品物情報取得 API（既存）

スタッフがフォーム表示時に品物リストを取得：

```typescript
// 既存API: GET /getCareItems
interface GetCareItemsRequest {
  residentId: string;
  status?: ItemStatus[];  // ['pending', 'in_progress'] で在庫ありのみ
}
```

### 3.3 プリセット・禁止ルール取得 API（既存）

```typescript
// 既存API: GET /getPresets
interface GetPresetsRequest {
  residentId: string;
  activeOnly?: boolean;
}

// 既存API: GET /getProhibitions
interface GetProhibitionsRequest {
  residentId: string;
  activeOnly?: boolean;
}
```

---

## 4. データモデル

### 4.1 既存モデルとの関係

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Firestore データ構造                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  care_items/{itemId}                    ← 品物（家族が登録）             │
│    ├─ itemName: "羊羹"                                                  │
│    ├─ currentQuantity: 5                ← 在庫（自動更新）               │
│    ├─ noteToStaff: "1日1切れまで"       ← 家族指示                      │
│    ├─ consumptionSummary: {...}         ← 集計キャッシュ                 │
│    │                                                                    │
│    └─ consumption_logs/{logId}          ← 消費ログ（スタッフが記録）     │
│         ├─ servedQuantity: 1                                            │
│         ├─ consumptionStatus: "half"                                    │
│         ├─ consumptionRate: 50                                          │
│         ├─ noteToFamily: "おいしそうに召し上がりました"                  │
│         ├─ followedInstruction: true    ← 【新規】指示対応フラグ         │
│         ├─ linkedMealRecordId: "MEL..." ← 【新規】食事記録との紐づけ     │
│         └─ recordedAt: "2025-12-18T..."                                 │
│                                                                         │
│  care_presets/{presetId}                ← プリセット（いつもの指示）     │
│    ├─ instruction: { content: "1日1切れまで" }                          │
│    └─ matchConfig: { keywords: ["羊羹"] }                               │
│                                                                         │
│  residents/{residentId}/prohibitions/{id} ← 禁止ルール                  │
│    ├─ itemName: "七福のお菓子"                                          │
│    └─ reason: "糖分過多のため"                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 ConsumptionLog 拡張

```typescript
// 既存の ConsumptionLog に追加するフィールド
interface ConsumptionLog {
  // === 既存フィールド（変更なし）===
  id: string;
  itemId: string;
  servedDate: string;
  servedTime?: string;
  mealTime?: MealTime;
  servedQuantity: number;
  servedBy: string;
  consumedQuantity: number;
  consumptionRate: number;
  consumptionStatus: ConsumptionStatus;
  quantityBefore: number;
  quantityAfter: number;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
  recordedAt: string;

  // === 追加フィールド ===
  followedInstruction?: boolean;     // 家族指示に従ったか
  instructionNote?: string;          // 指示対応メモ
  linkedMealRecordId?: string;       // 食事記録の投稿ID（Sheet Bとの紐づけ）
  sourceType?: 'meal_form' | 'item_detail' | 'task'; // 記録元
}
```

---

## 5. フロントエンド設計

### 5.1 UI設計（食事入力フォーム - 間食セクション）

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🍪 間食について                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                          │
│  【家族からの品物】在庫があるもの                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ 🟢 羊羹（とらや）                                            │  │  │
│  │  │    残り 5切れ ┃ 期限 12/25                                   │  │  │
│  │  │    💬 「1日1切れまで、おやつ時に」                           │  │  │
│  │  │                                             [📝 提供記録]    │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ 🟡 チーズ                                                    │  │  │
│  │  │    残り 3個 ┃ 期限 12/20 ⚠️ あと2日                          │  │  │
│  │  │    💬 「おやつ時に1個」                                      │  │  │
│  │  │                                             [📝 提供記録]    │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ 🚫 七福のお菓子 【提供禁止】                                  │  │  │
│  │  │    💬 「糖分過多のため絶対に出さないで」                      │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  【今回の提供記録】                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  📦 羊羹（とらや）                                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ 提供数: [1 ▼] 切れ    ← AIサジェスト「1日1切れ」より         │  │  │
│  │  │ 摂食:   [半分程度 ▼]                                        │  │  │
│  │  │ メモ:   [おいしそうに召し上がりました              ]         │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │  ✅ 家族指示「1日1切れまで」に従いました                          │  │
│  │                                                    [× 取消]      │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 💡 注意: チーズの賞味期限が近づいています（12/20）                  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  間食について補足（自由記入）                                              │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 午後のおやつタイムに提供しました                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 コンポーネント構成

```
MealInputPage.tsx (既存)
├── MealInputForm.tsx (既存)
│   ├── ... 既存フィールド ...
│   │
│   └── SnackSection.tsx (新規)
│       ├── FamilyItemList.tsx (新規)
│       │   ├── FamilyItemCard.tsx (新規)
│       │   │   └── 品物情報・指示・禁止表示
│       │   └── ProhibitionAlert.tsx (既存流用)
│       │
│       ├── SnackRecordList.tsx (新規)
│       │   └── SnackRecordCard.tsx (新規)
│       │       ├── 提供数入力
│       │       ├── 摂食状況選択
│       │       ├── 指示対応チェック
│       │       └── メモ入力
│       │
│       ├── ExpirationAlert.tsx (新規)
│       │   └── 期限警告表示
│       │
│       └── FreeTextInput.tsx (新規)
│           └── 従来の自由テキスト入力
│
└── MealSettingsModal.tsx (既存)
```

### 5.3 状態管理

```typescript
// 間食セクションの状態
interface SnackSectionState {
  // 品物リスト（API取得）
  careItems: CareItem[];
  prohibitions: ProhibitionRule[];
  presets: CarePreset[];

  // 提供記録（ユーザー入力）
  snackRecords: SnackRecord[];

  // 自由テキスト（従来互換）
  freeText: string;

  // UI状態
  isLoading: boolean;
  selectedItemId: string | null;
}
```

---

## 6. 家族側ページとの連携

### 6.1 家族が確認できる情報

| 情報 | 表示場所 | データソース |
|------|----------|-------------|
| 提供履歴 | 品物タイムライン | consumption_logs |
| 摂食状況 | 品物詳細・タイムライン | consumption_logs.consumptionStatus |
| 在庫残量 | 品物一覧・詳細 | care_items.currentQuantity |
| 指示対応 | 品物詳細 | consumption_logs.followedInstruction |
| 摂食傾向 | 統計ダッシュボード | getStats API |

### 6.2 家族ページの表示例

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📦 羊羹（とらや）                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  在庫: ████████░░ 4/5切れ                                                │
│  賞味期限: 12/25（あと7日）                                               │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  📋 提供履歴                                                              │
│                                                                          │
│  12/18 15:00  提供: 1切れ  摂食: 半分（50%）                              │
│               💬 「おいしそうに召し上がりました」                          │
│               ✅ 指示通り対応                                            │
│                                                                          │
│  12/17 15:00  提供: 1切れ  摂食: 完食（100%）                             │
│               ✅ 指示通り対応                                            │
│                                                                          │
│  ─────────────────────────────────────────────────────────────────────   │
│                                                                          │
│  📊 摂食傾向: 平均 75%                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 実装計画

### 7.1 Phase分割

| Phase | 内容 | 依存関係 | 状態 |
|-------|------|----------|------|
| Phase 1 | API拡張（submitMealRecord + 消費ログ連携） | なし | ✅ 完了 |
| Phase 2 | フロントエンド - 品物リスト表示 | Phase 1 | ✅ 完了 |
| Phase 3 | フロントエンド - 提供記録入力UI | Phase 2 | ✅ 完了 |
| Phase 4 | 家族ページ - 提供履歴・指示対応表示 | Phase 1 | ✅ 完了 |
| Phase 5 | AIサジェスト統合 | Phase 3 | ✅ 完了 |
| Phase 6 | E2Eテスト | Phase 1-4 | ✅ 完了 |

### 7.2 ファイル変更一覧

#### バックエンド

| ファイル | 変更内容 |
|----------|----------|
| `functions/src/types/index.ts` | SnackRecord型追加、ConsumptionLog拡張 |
| `functions/src/functions/submitMealRecord.ts` | snackRecords処理追加 |
| `functions/src/services/consumptionLogService.ts` | 食事記録からの消費ログ作成 |

#### フロントエンド

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/types/mealRecord.ts` | SnackRecord型追加 |
| `frontend/src/pages/MealInputPage.tsx` | SnackSection組み込み |
| `frontend/src/components/meal/SnackSection.tsx` | 新規作成 |
| `frontend/src/components/meal/FamilyItemList.tsx` | 新規作成 |
| `frontend/src/components/meal/SnackRecordCard.tsx` | 新規作成 |
| `frontend/src/hooks/useSnackSection.ts` | 新規作成 |

---

## 8. テスト計画

### 8.1 単体テスト

| テスト対象 | テスト内容 |
|------------|-----------|
| submitMealRecord | snackRecords付きリクエストの処理 |
| consumptionLogService | 消費ログ作成・在庫更新 |
| SnackRecord型 | バリデーション |

### 8.2 E2Eテスト

| シナリオ | 検証内容 |
|----------|----------|
| 品物リスト表示 | 在庫あり品物が表示される |
| 禁止ルール表示 | 禁止品目が警告表示される |
| 提供記録入力 | 品物選択→数量→摂食→保存 |
| 消費ログ連携 | 保存後にconsumption_logsに記録される |
| 在庫更新 | 保存後にcurrentQuantityが減る |
| 家族ページ確認 | 品物詳細で提供履歴が見える |

---

## 9. 後方互換性

### 9.1 既存機能への影響

| 既存機能 | 影響 | 対応 |
|----------|------|------|
| Sheet B書き込み | なし | snackフィールドに従来形式で書き込み継続 |
| Google Chat通知 | なし | 従来通りのメッセージ形式 |
| 記録閲覧 | なし | Sheet B経由の表示は変更なし |
| 品物管理 | 軽微 | consumptionSummary更新ロジック追加 |

### 9.2 API後方互換性

```typescript
// snackRecords がない場合は従来通りの処理
if (!request.snackRecords || request.snackRecords.length === 0) {
  // 既存ロジック: snack フィールドをそのまま使用
} else {
  // 新ロジック: snackRecords から処理
}
```

---

## 10. セキュリティ・権限

### 10.1 アクセス制御

| 操作 | 権限 |
|------|------|
| 品物リスト取得 | スタッフ・家族 |
| 消費ログ作成 | スタッフのみ |
| 消費ログ閲覧 | スタッフ・家族 |

### 10.2 データ検証

- itemId が指定された場合、該当する care_items が存在することを検証
- servedQuantity が currentQuantity を超えないことを検証（警告のみ、保存は許可）

---

## 11. 将来の拡張

| 機能 | 説明 | 優先度 |
|------|------|--------|
| 音声入力 | 「羊羹を1切れ出して半分食べた」→ 自動解析 | 低 |
| 写真添付 | 提供時の写真を消費ログに紐づけ | 中 |
| AIサジェスト強化 | 過去の摂食傾向から提供量を提案 | 中 |
| 家族通知 | 特記事項がある場合に家族へプッシュ通知 | 低 |

---

## 12. 用語定義

| 用語 | 定義 |
|------|------|
| 間食 | 朝食・昼食・夕食以外に提供される食品 |
| 品物 | 家族が送付し、care_itemsに登録された食品 |
| 消費ログ | 品物の提供・摂食を記録したデータ |
| 提供 | スタッフが入居者に品物を出すこと |
| 摂食 | 入居者が品物を食べること |
| 摂食率 | 提供量に対する摂食量の割合（0-100%） |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-18 | Phase 6 E2Eテスト完了、全Phase実装完了 |
| 2025-12-18 | Phase 5 AIサジェスト統合完了（ユニットテスト16件） |
| 2025-12-18 | Phase 1-4 実装完了 |
| 2025-12-18 | 初版作成 |
