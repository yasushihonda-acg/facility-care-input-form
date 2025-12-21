# 残ったものへの処置指示機能設計書

> Phase 33 設計書
>
> 作成日: 2024-12-21

## 1. 概要

### 1.1 目的

家族が品物登録時に「残った場合の処置」を事前に指示できるようにし、スタッフの記録入力時にその指示に従った選択を促す機能を実装する。

### 1.2 背景

現在、スタッフが記録入力時に残り対応（破棄/保存/その他）を自由に選択できるが、家族によっては「必ず保存して」「期限切れなら破棄して」など明確な意向がある。この意向を事前に登録し、スタッフが迷わず対応できるようにする。

## 2. 機能要件

### 2.1 家族側機能

| 機能 | 説明 |
|------|------|
| 品物登録時の処置指示 | 新規品物登録時に「残った場合の処置」を選択可能 |
| 品物編集時の処置指示 | 既存品物の処置指示を変更可能 |
| 選択肢 | `破棄してください` / `保存してください` / `指定なし（スタッフ判断）` |

### 2.2 スタッフ側機能

| 機能 | 説明 |
|------|------|
| 指示ありの場合 | 家族指示の選択肢のみ選択可能（他は非活性） |
| 指示なしの場合 | 従来通り全選択肢から選択可能 |
| 指示表示 | 家族からの指示がある場合は明示的に表示 |

## 3. データ設計

### 3.1 CareItem 拡張

```typescript
// frontend/src/types/careItem.ts
export interface CareItem {
  // ... 既存フィールド ...

  // Phase 33: 残った場合の処置指示（家族が設定）
  remainingHandlingInstruction?: RemainingHandlingInstruction;
}

// 処置指示の型（'other'は家族指示では不要、スタッフ判断用にnoneを追加）
export type RemainingHandlingInstruction = 'discarded' | 'stored' | 'none';
```

### 3.2 定数定義

```typescript
// frontend/src/types/careItem.ts に追加

export const REMAINING_HANDLING_INSTRUCTION_OPTIONS: {
  value: RemainingHandlingInstruction;
  label: string;
  description: string;
}[] = [
  { value: 'none', label: '指定なし', description: 'スタッフの判断に任せます' },
  { value: 'discarded', label: '破棄してください', description: '残った場合は破棄してください' },
  { value: 'stored', label: '保存してください', description: '残った場合は保存してください' },
];
```

### 3.3 Firestore 構造

```
care_items/{itemId}
├── ... 既存フィールド ...
└── remainingHandlingInstruction: "discarded" | "stored" | "none" | null
```

## 4. UI設計

### 4.1 家族用品物登録フォーム（ItemForm.tsx）

```
┌─────────────────────────────────────────┐
│ 🍎 品物を登録                           │
├─────────────────────────────────────────┤
│ ... 既存フィールド ...                  │
│                                         │
│ 残った場合の処置指示（任意）            │
│ ┌─────────────────────────────────────┐ │
│ │ ○ 指定なし（スタッフ判断）          │ │
│ │ ○ 破棄してください                  │ │
│ │ ○ 保存してください                  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ... 既存フィールド ...                  │
└─────────────────────────────────────────┘
```

**配置**: `noteToStaff`（スタッフへの申し送り）の近くに配置

### 4.2 スタッフ用記録入力ダイアログ（StaffRecordDialog.tsx）

#### 4.2.1 指示ありの場合

```
┌─────────────────────────────────────────┐
│ 残った分への対応                        │
│                                         │
│ 💡 ご家族からの指示があります           │
│ ┌─────────────────────────────────────┐ │
│ │ 📌 保存してください                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ◉ 保存した                              │ ← 自動選択・他は非活性
│ ○ 破棄した (家族指示により選択不可)     │
│ ○ その他 (家族指示により選択不可)       │
└─────────────────────────────────────────┘
```

#### 4.2.2 指示なしの場合（従来通り）

```
┌─────────────────────────────────────────┐
│ 残った分への対応                        │
│                                         │
│ ○ 破棄した                              │
│ ○ 保存した                              │
│ ○ その他                                │
└─────────────────────────────────────────┘
```

## 5. 実装計画

### 5.1 Phase 33.1: 型定義・定数追加

**対象ファイル**:
- `frontend/src/types/careItem.ts`

**変更内容**:
1. `RemainingHandlingInstruction` 型を追加
2. `REMAINING_HANDLING_INSTRUCTION_OPTIONS` 定数を追加
3. `CareItem` インターフェースに `remainingHandlingInstruction` フィールドを追加

### 5.2 Phase 33.2: 家族用品物登録UI

**対象ファイル**:
- `frontend/src/pages/family/ItemForm.tsx`

**変更内容**:
1. フォームデータに `remainingHandlingInstruction` を追加
2. ラジオボタングループでの選択UIを追加
3. API送信時にフィールドを含める

### 5.3 Phase 33.3: 家族用品物編集UI

**対象ファイル**:
- `frontend/src/pages/family/ItemEditPage.tsx`

**変更内容**:
1. 既存値の読み込み
2. 編集UIの追加
3. 更新API送信時にフィールドを含める

### 5.4 Phase 33.4: スタッフ記録入力連動

**対象ファイル**:
- `frontend/src/components/staff/StaffRecordDialog.tsx`

**変更内容**:
1. `item.remainingHandlingInstruction` を参照
2. 指示がある場合:
   - 指示バナーを表示
   - 該当選択肢を自動選択
   - 他の選択肢を非活性化
3. 指示がない場合: 従来通り全選択肢を有効化

### 5.5 Phase 33.5: E2Eテスト

**テストケース**:
| ID | シナリオ | 期待結果 |
|----|----------|----------|
| RHI-001 | 品物登録時に「破棄」指示を設定 | 登録成功、指示が保存される |
| RHI-002 | 品物登録時に「保存」指示を設定 | 登録成功、指示が保存される |
| RHI-003 | 品物登録時に「指定なし」を設定 | 登録成功、指示がnone |
| RHI-004 | 品物編集で指示を変更 | 更新成功、新しい指示が保存される |
| RHI-005 | スタッフ記録: 指示ありで該当選択肢のみ有効 | 他の選択肢が非活性 |
| RHI-006 | スタッフ記録: 指示なしで全選択肢有効 | 従来通り動作 |

## 6. API対応

### 6.1 submitCareItem（品物登録）

既存APIに `remainingHandlingInstruction` フィールドを追加。
Firestore書き込み時に含める。

### 6.2 updateCareItem（品物更新）

既存APIに `remainingHandlingInstruction` フィールドを追加。
Firestore更新時に含める。

### 6.3 getCareItems / getCareItem

レスポンスに `remainingHandlingInstruction` が含まれる（Firestoreから自動取得）。

## 7. 後方互換性

- 既存の品物データには `remainingHandlingInstruction` フィールドがない
- フィールドがない場合は「指示なし」として扱う（`undefined` = 従来動作）
- スタッフ側は従来通り全選択肢から選択可能

## 8. 将来拡張

- 条件付き指示（例: 期限1日前なら破棄、それ以外は保存）
- 品物カテゴリ別のデフォルト指示設定
- 通知機能（家族指示に反した対応があった場合）
