---
status: working
scope: feature
owner: core-team
last_reviewed: 2025-12-21
---

# 品物起点の間食記録・スケジュール拡張設計書

> **最終更新**: 2025年12月21日
> **ステータス**: ✅ Phase 13.0/13.1/13.2/36 全サブフェーズ実装完了
>
> このドキュメントは、スタッフ用「品物から記録」タブとスケジュール拡張機能を設計します。

---

## 1. 概要

### 1.1 背景・課題

| 現状 | 課題 |
|------|------|
| スタッフは食事記録フォーム内の間食セクションから品物を選択 | 品物の詳細情報（期限・指示・条件）が限定的にしか見えない |
| 家族ページには整理された品物情報があるが、スタッフは記録できない | 直感的に「この品物を出した」という流れで記録できない |
| 提供予定日は単一日付のみ | 「毎週月・水・金」などの繰り返しスケジュールが設定できない |

### 1.2 目的

1. **スタッフ**: 品物情報を見ながら直感的に間食記録ができる
2. **家族**: より柔軟な提供スケジュールを指定できる
3. **システム**: 提供予定日を考慮したソート・ハイライトで業務効率化

### 1.3 スコープ

| Phase | 内容 | 対象ページ |
|-------|------|-----------|
| **Phase 13.0** | 品物から記録タブ | スタッフ用 `/staff/input/meal` |
| **Phase 13.1** | スケジュール拡張 | 家族用 `/family/items/new`, `/family/items/:id/edit` |

### 1.4 関連ドキュメント

| ドキュメント | 関連箇所 |
|-------------|----------|
| [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md) | 間食記録連携（既存） |
| [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) | 品物管理機能 |
| [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md) | 食事入力フォーム |

---

## 2. Phase 13.0: 品物から記録タブ

### 2.1 機能概要

スタッフ用食事記録ページ（`/staff/input/meal`）に「品物から記録」タブを追加し、品物情報を見ながら直感的に間食記録を入力できるようにする。

### 2.2 UI設計

#### タブ構成

```
┌──────────────────────────────────────────────────────────────┐
│  食事記録入力                                                │
│  ┌─────────┐  ┌──────────────┐                              │
│  │  食事   │  │ 品物から記録 │  ← タブ切替                  │
│  └─────────┘  └──────────────┘                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                              │
│  【食事タブ】              【品物から記録タブ】              │
│  現状の食事記録フォーム    品物一覧（整理された情報）        │
│  └─ 間食セクション含む     └─ 品物選択 → 記録フォーム       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 品物から記録タブのUI

```
┌──────────────────────────────────────────────────────────────┐
│  📦 品物から間食記録                                         │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  【今日提供予定】                                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ⭐ 羊羹（とらや）                      [🍪 提供記録]   │  │
│  │    残り 5切れ ┃ 期限 12/25                             │  │
│  │    📅 月・水・金 おやつ時 ← 今日は水曜日               │  │
│  │    💬 「1日1切れまで、おやつ時に」                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  【期限が近い】                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ ⚠️ チーズ                              [🍪 提供記録]   │  │
│  │    残り 3個 ┃ 期限 12/20（あと2日）                    │  │
│  │    📅 毎日 おやつ時                                    │  │
│  │    💬 「おやつ時に1個」                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  【その他の品物】                                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🟢 バナナ                              [🍪 提供記録]   │  │
│  │    残り 2本 ┃ 期限なし                                 │  │
│  │    📅 12/22（土）朝食時                                │  │
│  │    💬 「朝食時に半分ずつ」                             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 提供記録フォーム（モーダル）

```
┌──────────────────────────────────────────────────────────────┐
│  🍪 間食記録: 羊羹（とらや）                                 │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  【品物情報】                                                │
│  残り: 5切れ ┃ 期限: 12/25 ┃ 保存: 常温                     │
│  💬 「1日1切れまで、おやつ時に」                            │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  提供数: [1 ▼] 切れ    ← 家族指示「1切れ」から自動サジェスト│
│                                                              │
│  摂食状況:                                                   │
│  ○ 😋 完食  ○ 😊 ほぼ完食  ● 😐 半分  ○ 😕 少し  ○ 😞 なし │
│                                                              │
│  メモ（任意）:                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ おいしそうに召し上がりました                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  家族へのメモ（任意）:                                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ☑ 家族指示「1日1切れまで」に従いました                      │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│  ※ この記録は食事記録（Sheet B）にも反映されます             │
│                                                              │
│        [キャンセル]        [記録を保存]                      │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 ソート優先度

品物一覧の表示順序:

| 優先度 | 条件 | 表示グループ |
|--------|------|-------------|
| 1 | 🔴 今日が提供予定日 | 【今日提供予定】 |
| 2 | 🟠 賞味期限が近い（3日以内） | 【期限が近い】 |
| 3 | 🟡 明日が提供予定日 | 【その他の品物】 |
| 4 | 🟢 その他（期限順 → 送付日順） | 【その他の品物】 |

### 2.4 データフロー

```
品物から記録タブ
    │
    ▼
getCareItems API（既存）
    │ status: ['pending', 'in_progress']  ← 在庫ありのみ取得
    │ residentId: 選択中の入居者
    ▼
品物一覧表示
    │ ソート: 提供予定日 → 期限 → 送付日
    │ ※ 在庫なし（consumed）は表示されない
    ▼
[提供記録] ボタン
    │
    ▼
提供記録フォーム（モーダル）
    │
    ▼
submitMealRecord API（既存・拡張）
    │ snackRecords: [{ itemId, itemName, ... }]
    │ recordMode: 'snack_only' ← 新規モード
    │
    ├─► Sheet B 書き込み（間食フィールド）
    ├─► consumption_logs 作成
    └─► care_items.currentQuantity 更新
            │
            └─► currentQuantity = 0 の場合
                └─► status を 'consumed' に自動更新
                    └─► 次回から品物リストに表示されない
```

### 2.4.1 在庫なし品物の自動除外

「毎日」や「曜日指定」などの繰り返しスケジュールが設定されている品物でも、**在庫がなくなれば自動的に品物リストから除外**されます。

#### ステータス遷移

```
品物登録時
    │ status: 'pending'
    │ currentQuantity: 初期数量
    ▼
初回提供時
    │ status: 'in_progress'
    │ currentQuantity: 残量
    ▼
在庫ゼロ時（自動）
    │ status: 'consumed'
    │ currentQuantity: 0
    ▼
品物リストから除外
    └─► getCareItems で status: ['pending', 'in_progress'] のみ取得するため
```

#### フィルタ条件

| ステータス | 意味 | 品物リスト表示 |
|------------|------|---------------|
| `pending` | 未提供（登録済み、まだ提供していない） | ✅ 表示 |
| `in_progress` | 提供中（一部消費、残量あり） | ✅ 表示 |
| `consumed` | 消費完了（残量ゼロ） | ❌ 非表示 |
| `expired` | 期限切れ | ❌ 非表示 |
| `discarded` | 廃棄 | ❌ 非表示 |

#### スケジュールとの関係

| スケジュール | 在庫あり | 在庫なし |
|-------------|---------|---------|
| 特定の日（once） | 表示 | 非表示 |
| 毎日（daily） | 表示 | 非表示 |
| 曜日指定（weekly） | 表示 | 非表示 |
| 複数日指定（specific_dates） | 表示 | 非表示 |

**結論**: スケジュール設定に関わらず、在庫がゼロになれば品物リストに表示されなくなります。

### 2.5 API設計

#### submitMealRecord 拡張

既存の `submitMealRecord` APIを拡張し、間食のみの記録に対応:

```typescript
interface SubmitMealRecordRequest {
  // === 既存フィールド ===
  staffName: string;
  facility: string;
  residentName: string;
  // ... 他の既存フィールド ...

  // === 拡張フィールド ===
  recordMode?: 'full' | 'snack_only';  // デフォルト: 'full'

  // recordMode = 'snack_only' の場合:
  // - 主食・副食・注入などの必須バリデーションをスキップ
  // - Sheet Bには間食フィールドのみ書き込み
  // - mealTimeは実際の食事時間ではなく記録時間
}
```

### 2.6 コンポーネント構成

```
MealInputPage.tsx
├── MealInputTabs.tsx (新規)
│   ├── tab: 'meal' | 'item_based'
│   └── onTabChange()
│
├── MealInputForm.tsx (既存 - 食事タブ)
│   └── SnackSection.tsx (既存)
│
└── ItemBasedSnackRecord.tsx (新規 - 品物から記録タブ)
    ├── ItemBasedSnackList.tsx (新規)
    │   ├── 【今日提供予定】グループ
    │   ├── 【期限が近い】グループ
    │   └── 【その他の品物】グループ
    │
    ├── ItemBasedSnackCard.tsx (新規)
    │   ├── 品物情報表示
    │   ├── スケジュール表示
    │   └── [提供記録] ボタン
    │
    └── SnackRecordModal.tsx (新規)
        ├── 品物情報サマリー
        ├── 提供数入力
        ├── 摂食状況選択
        ├── メモ入力
        └── [記録を保存] ボタン
```

### 2.7 実装ファイル

| ファイル | 内容 | 新規/既存 |
|----------|------|----------|
| `frontend/src/components/meal/MealInputTabs.tsx` | タブ切替コンポーネント | 新規 |
| `frontend/src/components/meal/ItemBasedSnackRecord.tsx` | 品物から記録タブ本体 | 新規 |
| `frontend/src/components/meal/ItemBasedSnackList.tsx` | 品物リスト（グループ化） | 新規 |
| `frontend/src/components/meal/ItemBasedSnackCard.tsx` | 品物カード | 新規 |
| `frontend/src/components/meal/SnackRecordModal.tsx` | 記録入力モーダル | 新規 |
| `frontend/src/hooks/useItemBasedSnackSort.ts` | ソートロジック | 新規 |
| `frontend/src/pages/MealInputPage.tsx` | タブ統合 | 既存改修 |
| `functions/src/functions/submitMealRecord.ts` | snack_onlyモード対応 | 既存改修 |

---

## 3. Phase 13.1: スケジュール拡張

### 3.1 機能概要

家族が品物登録時に、より柔軟な提供スケジュールを設定できるようにする。

### 3.2 データ構造

#### 現状

```typescript
interface CareItem {
  // ...
  plannedServeDate?: string;          // 単一日付 (YYYY-MM-DD)
  preferredServingSchedule?: string;  // 自由テキスト
  // ...
}
```

#### 拡張後

```typescript
interface CareItem {
  // ... 既存フィールド維持 ...
  plannedServeDate?: string;          // 後方互換のため維持
  preferredServingSchedule?: string;  // 後方互換のため維持

  // === 新規フィールド ===
  servingSchedule?: ServingSchedule;  // 構造化スケジュール
}

interface ServingSchedule {
  type: 'once' | 'daily' | 'weekly' | 'specific_dates';

  // type = 'once' の場合
  date?: string;  // YYYY-MM-DD

  // type = 'weekly' の場合
  weekdays?: number[];  // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土

  // type = 'specific_dates' の場合
  dates?: string[];  // ['2024-12-20', '2024-12-22', ...]

  // 共通
  timeSlot?: ServingTimeSlot;
  note?: string;  // 補足（自由記述）
}

type ServingTimeSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'anytime';

const SERVING_TIME_SLOT_LABELS: Record<ServingTimeSlot, string> = {
  breakfast: '朝食時',
  lunch: '昼食時',
  dinner: '夕食時',
  snack: 'おやつ時',
  anytime: 'いつでも',
};

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
```

### 3.3 UI設計（家族ページ - ItemForm）

```
┌──────────────────────────────────────────────────────────────┐
│  📅 提供スケジュール                                         │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  スケジュールタイプ:                                         │
│  ● 特定の日  ○ 毎日  ○ 曜日指定  ○ 複数日指定              │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  【特定の日の場合】                                          │
│  日付: [2024-12-20       📅]                                 │
│                                                              │
│  【毎日の場合】                                              │
│  （特に追加設定なし）                                        │
│                                                              │
│  【曜日指定の場合】                                          │
│  ┌────┬────┬────┬────┬────┬────┬────┐                       │
│  │ 日 │ 月 │ 火 │ 水 │ 木 │ 金 │ 土 │                       │
│  │    │ ✓  │    │ ✓  │    │ ✓  │    │                       │
│  └────┴────┴────┴────┴────┴────┴────┘                       │
│                                                              │
│  【複数日指定の場合】                                        │
│  選択した日付:                                               │
│  [12/20] [12/22] [12/25] [+ 日付を追加]                      │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  提供タイミング:                                             │
│  ○ 朝食時  ○ 昼食時  ○ 夕食時  ● おやつ時  ○ いつでも     │
│                                                              │
│  補足（任意）:                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 15時頃が望ましい                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 スケジュール表示フォーマット

| タイプ | 表示例 |
|--------|--------|
| once | `12/20 おやつ時` |
| daily | `毎日 おやつ時` |
| weekly | `月・水・金 おやつ時` |
| specific_dates | `12/20, 12/22, 12/25 おやつ時` |

### 3.5 「今日が提供予定日か」判定ロジック

```typescript
function isScheduledForToday(schedule: ServingSchedule): boolean {
  const today = new Date();
  const todayStr = formatDate(today); // YYYY-MM-DD
  const todayWeekday = today.getDay(); // 0-6

  switch (schedule.type) {
    case 'once':
      return schedule.date === todayStr;

    case 'daily':
      return true;

    case 'weekly':
      return schedule.weekdays?.includes(todayWeekday) ?? false;

    case 'specific_dates':
      return schedule.dates?.includes(todayStr) ?? false;

    default:
      return false;
  }
}
```

### 3.6 コンポーネント構成

```
ItemForm.tsx
├── ... 既存フィールド ...
│
└── ServingScheduleInput.tsx (新規)
    ├── ScheduleTypeSelector.tsx (新規)
    │   └── 'once' | 'daily' | 'weekly' | 'specific_dates'
    │
    ├── DatePickerField.tsx (type = 'once')
    │
    ├── WeekdaySelector.tsx (type = 'weekly')
    │   └── 曜日チェックボックス
    │
    ├── MultipleDatePicker.tsx (type = 'specific_dates')
    │   └── 日付リスト + 追加ボタン
    │
    └── TimeSlotSelector.tsx (共通)
        └── 提供タイミング選択
```

### 3.7 実装ファイル

| ファイル | 内容 | 新規/既存 |
|----------|------|----------|
| `frontend/src/types/careItem.ts` | ServingSchedule型追加 | 既存改修 |
| `frontend/src/components/family/ServingScheduleInput.tsx` | スケジュール入力コンポーネント | 新規 |
| `frontend/src/components/family/WeekdaySelector.tsx` | 曜日選択コンポーネント | 新規 |
| `frontend/src/components/family/MultipleDatePicker.tsx` | 複数日選択コンポーネント | 新規 |
| `frontend/src/utils/scheduleUtils.ts` | スケジュール判定・表示ユーティリティ | 新規 |
| `frontend/src/pages/family/ItemForm.tsx` | スケジュール入力統合 | 既存改修 |
| `functions/src/types/index.ts` | ServingSchedule型追加 | 既存改修 |
| `functions/src/functions/careItems.ts` | スケジュールフィールド対応 | 既存改修 |

### 3.8 後方互換性

既存の `plannedServeDate` フィールドとの互換性を維持:

```typescript
// 保存時: servingSchedule → plannedServeDate への変換
function scheduleToPlannedDate(schedule: ServingSchedule): string | undefined {
  if (schedule.type === 'once' && schedule.date) {
    return schedule.date;
  }
  // その他のタイプは plannedServeDate には変換しない
  return undefined;
}

// 読み込み時: 古いデータの変換
function plannedDateToSchedule(plannedDate: string): ServingSchedule {
  return {
    type: 'once',
    date: plannedDate,
    timeSlot: 'anytime',
  };
}
```

---

## 4. 実装計画

### 4.1 Phase分割

| Phase | 内容 | 依存関係 | 状況 |
|-------|------|----------|------|
| **Phase 13.0** | 品物から記録タブ | なし | ✅ 完了 |
| Phase 13.0.1 | タブUI・切替機能 | - | ✅ 完了 |
| Phase 13.0.2 | 品物リスト（ソート・グループ化） | 13.0.1 | ✅ 完了 |
| Phase 13.0.3 | 記録入力モーダル | 13.0.2 | ✅ 完了 |
| Phase 13.0.4 | API連携・Sheet B書き込み | 13.0.3 | ✅ 完了 |
| Phase 13.0.5 | E2Eテスト | 13.0.4 | ✅ 完了（13テスト） |
| **Phase 13.1** | スケジュール拡張 | なし（並行可能） | ✅ 完了 |
| Phase 13.1.1 | 型定義・ユーティリティ | - | ✅ 完了 |
| Phase 13.1.2 | スケジュール入力UI | 13.1.1 | ✅ 完了 |
| Phase 13.1.3 | API・Firestore対応 | 13.1.2 | ✅ 完了 |
| Phase 13.1.4 | 品物から記録タブとの統合 | 13.0, 13.1.3 | ✅ 完了 |
| Phase 13.1.5 | E2Eテスト | 13.1.4 | ✅ 完了（7テスト） |

### 4.2 優先順位

1. **Phase 13.0.2**: 品物リスト（ソート優先度実装）← 既存の `plannedServeDate` でまず対応
2. **Phase 13.0.1-13.0.5**: 品物から記録タブ全体
3. **Phase 13.1**: スケジュール拡張（独立して進行可能）

---

## 5. テスト計画

### 5.1 Phase 13.0 テストケース

| ID | テスト内容 | 期待結果 |
|----|-----------|----------|
| ITEM-REC-001 | タブ切替 | 食事タブ↔品物から記録タブが切り替わる |
| ITEM-REC-002 | 品物リスト表示 | 在庫あり品物が表示される |
| ITEM-REC-003 | ソート優先度 | 今日提供予定 → 期限近い → その他の順 |
| ITEM-REC-010 | 提供記録モーダル表示 | [提供記録]ボタンでモーダル表示 |
| ITEM-REC-011 | 提供数サジェスト | 家族指示から提供数がサジェストされる |
| ITEM-REC-012 | 摂食状況選択 | 5段階選択が機能する |
| ITEM-REC-020 | 記録保存 | Sheet Bに書き込まれる |
| ITEM-REC-021 | 消費ログ作成 | consumption_logsに記録される |
| ITEM-REC-022 | 在庫更新 | currentQuantityが減少する |

### 5.2 Phase 13.1 テストケース

| ID | テスト内容 | 期待結果 |
|----|-----------|----------|
| SCHED-001 | スケジュールタイプ切替 | 4種類のタイプが選択できる |
| SCHED-002 | 曜日選択 | 複数曜日が選択できる |
| SCHED-003 | 複数日選択 | 複数日付が追加・削除できる |
| SCHED-010 | 今日判定（daily） | 毎日タイプは常にtrue |
| SCHED-011 | 今日判定（weekly） | 今日の曜日が含まれていればtrue |
| SCHED-012 | スケジュール表示 | 「月・水・金 おやつ時」形式で表示 |

---

## 4. Phase 13.2: スタッフ向けスケジュール表示強化

### 4.1 機能概要

Phase 13.1で家族が設定したスケジュール情報を、スタッフ側の「品物から記録」タブでより分かりやすく表示する。

### 4.2 改善ポイント

| 現状 | 改善後 |
|------|--------|
| タイムスロットが表示されない | 「おやつ時」「朝食時」など提供タイミングを表示 |
| 曜日の視覚的強調がない | 今日の曜日をバッジでハイライト |
| 次回提供予定日が不明 | 今日でなくても「次回: 12/22（月）」を表示 |
| 補足メモ(note)が未表示 | 家族のスケジュール補足メモを表示 |

### 4.3 UI設計

#### 品物カードのスケジュール表示

```
【現状】
📅 月・水・金 ← 今日

【改善後】
📅 月・水・金 おやつ時
   ↳ 今日は金曜日 ✓
   💬 「15時頃が望ましい」

【dailyの場合】
📅 毎日 おやつ時
   ↳ 今日も提供予定 ✓

【今日が該当しない場合】
📅 月・水・金 朝食時
   ↳ 次回: 12/23（月）
```

#### 曜日バッジ（今日ハイライト）

```
週間スケジュール:
┌──────────────────────────────────────┐
│ 日  月  火  水  木 [金] 土          │
│ ○  ●  ○  ●  ○  ◉  ○           │
│                    ↑今日            │
└──────────────────────────────────────┘
```

- ●: 提供予定日
- ◉: 提供予定日 かつ 今日（ハイライト）
- ○: 提供なし

### 4.4 コンポーネント設計

```
ItemBasedSnackRecord.tsx
├── ItemCard.tsx（既存・改修）
│   └── ScheduleDisplay.tsx（新規）
│       ├── タイムスロット表示
│       ├── WeekdayBadges.tsx（新規・曜日バッジ）
│       ├── 次回提供予定日表示
│       └── スケジュール補足メモ表示
└── ...
```

### 4.5 実装ファイル

| ファイル | 内容 | 新規/既存 |
|----------|------|----------|
| `frontend/src/components/meal/ScheduleDisplay.tsx` | スケジュール表示コンポーネント | 新規 |
| `frontend/src/components/meal/WeekdayBadges.tsx` | 曜日バッジコンポーネント | 新規 |
| `frontend/src/components/meal/ItemBasedSnackRecord.tsx` | ScheduleDisplay統合 | 既存改修 |
| `frontend/src/utils/scheduleUtils.ts` | `getNextScheduledDateDisplay()` 追加 | 既存改修 |

### 4.6 テストケース

| ID | テスト内容 | 期待結果 |
|----|-----------|----------|
| SCHED-020 | タイムスロット表示 | 「おやつ時」が表示される |
| SCHED-021 | 曜日バッジ表示（weekly） | 設定曜日にバッジが表示される |
| SCHED-022 | 今日ハイライト | 今日の曜日がハイライトされる |
| SCHED-023 | 次回予定日表示 | 今日が該当しない場合、次回日付が表示される |
| SCHED-024 | 補足メモ表示 | スケジュールnoteが表示される |

### 4.7 Phase分割

| Phase | 内容 | 状況 |
|-------|------|------|
| Phase 13.2.1 | scheduleUtils拡張・ScheduleDisplay基本実装 | ✅ 完了 |
| Phase 13.2.2 | WeekdayBadgesコンポーネント | ✅ 完了 |
| Phase 13.2.3 | ItemCard統合・E2Eテスト | ✅ 完了（7テスト） |

---

## 5. Phase 36: スケジュール開始日対応

### 5.1 機能概要

「毎日」「曜日指定」スケジュールタイプに開始日（startDate）フィールドを追加し、「12/25から毎日」「1/1から月・水・金」のような将来開始スケジュールを設定可能にする。

### 5.2 データ構造拡張

```typescript
interface ServingSchedule {
  type: 'once' | 'daily' | 'weekly' | 'specific_dates';
  date?: string;
  weekdays?: number[];
  dates?: string[];
  startDate?: string;  // ← Phase 36で追加（daily/weeklyタイプでのみ使用）
  timeSlot?: ServingTimeSlot;
  note?: string;
}
```

#### 開始日の適用範囲

| スケジュールタイプ | startDate対応 | 理由 |
|-------------------|--------------|------|
| `once` | ❌ 非対応 | 単一日付なので開始日の概念が不要 |
| `daily` | ✅ 対応 | 「12/25から毎日」などの将来開始に対応 |
| `weekly` | ✅ 対応 | 「1/1から月・水・金」などの将来開始に対応 |
| `specific_dates` | ❌ 非対応 | 複数日付を直接指定するため開始日不要 |

### 5.3 判定ロジック

```typescript
function isScheduledForToday(schedule: ServingSchedule): boolean {
  const today = new Date();
  const todayStr = formatDateString(today);
  const todayWeekday = today.getDay();

  // Phase 36: 開始日チェック（daily/weeklyの場合のみ）
  if (schedule.startDate && (schedule.type === 'daily' || schedule.type === 'weekly')) {
    if (todayStr < schedule.startDate) {
      return false;  // 開始日より前は対象外
    }
  }

  switch (schedule.type) {
    case 'once':
      return schedule.date === todayStr;
    case 'daily':
      return true;
    case 'weekly':
      return schedule.weekdays?.includes(todayWeekday) ?? false;
    case 'specific_dates':
      return schedule.dates?.includes(todayStr) ?? false;
    default:
      return false;
  }
}
```

### 5.4 UI設計

#### 開始日入力フィールド（daily/weekly選択時のみ表示）

```
┌──────────────────────────────────────────────────────────────┐
│  スケジュールタイプ:                                         │
│  ○ 特定の日  ● 毎日  ○ 曜日指定  ○ 複数日指定              │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  毎日、選択したタイミングで提供します                        │
│                                                              │
│  開始日（任意）:                                             │
│  [2024-12-25       📅]                                       │
│  設定すると、この日以降からスケジュールが有効になります      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 開始日表示（開始日が未来の場合）

```
【品物カード - コンパクト表示】
📅 毎日 おやつ時
⏳ 12/25から開始

【品物カード - 詳細表示】
📅 月・水・金 おやつ時
⏳ 1/1から開始
   ↳ 次回: 1/1（月）
```

### 5.5 品物編集ページ対応

Phase 36で品物編集ページ（`ItemEditPage.tsx`）にスケジュール編集機能を追加:

- `ServingScheduleInput`コンポーネントを統合
- 既存の`servingSchedule`を読み込み・編集可能に
- 保存時に`servingSchedule`と後方互換用`plannedServeDate`を両方送信

### 5.6 タスク自動生成対応

`taskGenerator.ts`で構造化スケジュールに対応:

```typescript
async function generateServeReminders(db): Promise<number> {
  // Phase 1: plannedServeDateが今日の品物（後方互換）
  const legacySnapshot = await db
    .collection(CARE_ITEMS_COLLECTION)
    .where("status", "==", "pending")
    .where("plannedServeDate", "==", today)
    .get();

  for (const doc of legacySnapshot.docs) {
    // タスク生成
  }

  // Phase 2: 構造化スケジュールを持つ品物
  const allPendingSnapshot = await db
    .collection(CARE_ITEMS_COLLECTION)
    .where("status", "==", "pending")
    .get();

  for (const doc of allPendingSnapshot.docs) {
    const item = doc.data() as CareItem;
    if (item.servingSchedule && isScheduledForToday(item.servingSchedule)) {
      // タスク生成（開始日も考慮される）
    }
  }
}
```

### 5.7 実装ファイル

| ファイル | 内容 | 新規/既存 |
|----------|------|----------|
| `frontend/src/types/careItem.ts` | `ServingSchedule.startDate`追加 | 既存改修 |
| `functions/src/types/index.ts` | `ServingSchedule.startDate`追加 | 既存改修 |
| `frontend/src/utils/scheduleUtils.ts` | 開始日対応判定ロジック | 既存改修 |
| `functions/src/utils/scheduleUtils.ts` | サーバーサイド判定ロジック | 新規 |
| `functions/src/functions/taskGenerator.ts` | 構造化スケジュール対応 | 既存改修 |
| `frontend/src/components/family/ServingScheduleInput.tsx` | 開始日入力UI | 既存改修 |
| `frontend/src/pages/family/ItemEditPage.tsx` | スケジュール編集統合 | 既存改修 |
| `frontend/src/components/meal/ScheduleDisplay.tsx` | 開始日表示 | 既存改修 |
| `frontend/e2e/schedule-start-date.spec.ts` | E2Eテスト | 新規 |

### 5.8 テストケース

| ID | テスト内容 | 期待結果 |
|----|-----------|----------|
| SCHEDULE-001 | 毎日選択時に開始日入力表示 | 開始日フィールドが表示される |
| SCHEDULE-002 | 曜日指定選択時に開始日入力表示 | 開始日フィールドが表示される |
| SCHEDULE-003 | 特定の日選択時に開始日非表示 | 開始日フィールドが表示されない |
| SCHEDULE-004 | 複数日指定選択時に開始日非表示 | 開始日フィールドが表示されない |
| SCHEDULE-005 | 開始日ヘルプテキスト表示 | 説明文が表示される |
| SCHEDULE-EDIT-001 | 編集画面にスケジュール入力表示 | ServingScheduleInputが表示される |
| SCHEDULE-EDIT-002 | スケジュール保存 | 変更が保存される |
| SCHEDULE-PREVIEW-001 | 毎日プレビュー表示 | 「毎日」が表示される |
| SCHEDULE-PREVIEW-002 | 曜日プレビュー表示 | 選択曜日が表示される |

---

## 6. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-18 | 初版作成 |
| 2025-12-19 | Phase 13.0 実装完了（13.0.1〜13.0.5）、API設計をrecordModeに修正、在庫なし品物自動除外セクション追加 |
| 2025-12-19 | Phase 13.1 実装完了（13.1.1〜13.1.5）、ServingSchedule型・scheduleUtils・スケジュール入力UI・E2Eテスト追加 |
| 2025-12-19 | Phase 13.2 実装完了（13.2.1〜13.2.3）、ScheduleDisplay・WeekdayBadges・スタッフ向けスケジュール表示強化 |
| 2025-12-21 | Phase 36 実装完了: スケジュール開始日対応、品物編集スケジュール統合、タスク自動生成の構造化スケジュール対応、E2Eテスト13件追加 |
