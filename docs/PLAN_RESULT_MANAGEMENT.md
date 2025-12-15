# 予実管理設計書（Plan/Result Management Design）

> **最終更新**: 2025年12月15日
>
> このドキュメントは「食事入力」と「家族ビュー」を連携させる予実管理機能の設計を定義します。

---

## 1. 概要

### 1.1 目的

スタッフが食事入力フォームで記録した内容（Result）を、家族ビューのエビデンス・モニター（Plan vs Result対比）に自動反映させる。

### 1.2 設計方針

**方針B: 読み取り時JOIN**を採用

| メリット | 説明 |
|----------|------|
| 既存API活用 | getPlanData APIをそのまま使用 |
| バックエンド修正ゼロ | フロントエンドのみの変更 |
| コスト増なし | Firestoreトリガー不要 |
| シンプル | 障害ポイントが少ない |
| 安定運用 | 既存の同期インフラを活用 |

---

## 2. データソース

| データ種別 | ソース | 格納先 | 用途 |
|-----------|--------|--------|------|
| **Plan（予定）** | 家族のケア指示 | Firestore `care_instructions/` (将来) / モック (現在) | 家族ビュー表示 |
| **Result（実績）** | スタッフの食事入力 | Firestore `plan_data/` (食事シート) | 記録閲覧・家族ビュー表示 |

---

## 3. JOINキーの対応

| 家族ビュー (CareInstruction) | 食事シート (PlanDataRecord) | 変換方法 |
|------------------------------|------------------------------|----------|
| `targetDate` ("2025-12-14") | `timestamp` ("2025/12/14 12:15:00") | 日付部分を抽出 |
| `mealTime` ("lunch") | `data["食事はいつのことですか？"]` ("昼") | マッピング |
| `residentId` | `residentName` | 部分一致（デモ版） |

### 3.1 食事時間マッピング

```typescript
// 食事シートの値 → MealTime
const MEAL_TIME_FROM_SHEET = {
  '朝': 'breakfast',
  '昼': 'lunch',
  '夜': 'dinner',
};

// MealTime → 食事シートの値
const MEAL_TIME_TO_SHEET = {
  'breakfast': '朝',
  'lunch': '昼',
  'dinner': '夜',
  'snack': '間食',
};
```

---

## 4. データフロー

```
┌─────────────────────────────────────────────────────────────────┐
│                      家族ビュー (Frontend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EvidenceMonitor.tsx                                            │
│  ├─ useFamilyMealRecords(date, mealTime)                       │
│  │    └─ usePlanData('食事')                                   │
│  │         └─ フィルタ: 日付 + 食事時間                          │
│  │              └─ 変換: PlanDataRecord → MealResult           │
│  │                                                              │
│  ├─ getCareInstructionForDate(date, mealTime)                  │
│  │    └─ モックデータ (現在)                                    │
│  │                                                              │
│  └─ EvidenceData = { plan, result }                            │
│       └─ 画面表示: Plan vs Result 対比                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         │ Result取得                   │ Plan取得
         ↓                              ↓
┌─────────────────────┐    ┌─────────────────────┐
│  Firestore           │    │  モックデータ        │
│  plan_data/          │    │  (将来: Firestore)  │
│  (食事シート)         │    │                     │
└─────────────────────┘    └─────────────────────┘
         ↑
         │ 同期 (15分毎)
         │
┌─────────────────────┐
│  Sheet A (食事)      │
└─────────────────────┘
```

---

## 5. 実装ファイル一覧

| ファイル | 変更種別 | 内容 |
|---------|----------|------|
| `frontend/src/utils/mealTimeMapping.ts` | **新規** | 食事時間マッピングユーティリティ |
| `frontend/src/hooks/useFamilyMealRecords.ts` | **新規** | 食事シートからResult取得フック |
| `frontend/src/types/family.ts` | 修正 | MealResult型追加 |
| `frontend/src/pages/family/EvidenceMonitor.tsx` | 修正 | モック→実データ切替 |
| `frontend/src/pages/family/FamilyDashboard.tsx` | 修正 | タイムラインに実績反映 |

---

## 6. 型定義

### 6.1 MealResult型（新規追加）

```typescript
export interface MealResult {
  id: string;
  staffName: string;
  recordedAt: string;
  mainDishAmount: string;  // "8" など（割数）
  sideDishAmount: string;  // "7" など（割数）
  snack?: string;
  note?: string;
  isImportant: boolean;
  photoUrl?: string;
}
```

### 6.2 EvidenceData型（result部分を変更）

```typescript
export interface EvidenceData {
  date: string;
  mealTime: MealTime;
  plan?: {
    menuName: string;
    processingDetail: string;
    priority: CarePriority;
    conditions?: CareCondition[];
  };
  result?: MealResult;  // 既存の匿名型からMealResult型に変更
}
```

---

## 7. 制約・注意事項

### 7.1 データ同期のタイミング

- 食事シートのデータは **15分毎の差分同期** でFirestoreに反映
- 入力直後は表示されない可能性あり（最大15分のラグ）
- **これは許容範囲として設計**

### 7.2 入居者の紐付け

- デモ版: `residentName` の部分一致でフィルタ
- 本番: `residentId` を使った厳密な紐付けが必要

### 7.3 写真エビデンス

- 現在の `uploadCareImage` は Google Drive にアップロード
- 家族ビューでの写真表示は Phase 7.2 以降で対応予定

---

## 8. 将来の拡張

| 機能 | 説明 | 優先度 |
|------|------|--------|
| ケア指示のFirestore保存 | モックデータ → Firestore | 中 |
| リアルタイム更新 | Firestoreリスナーで即時反映 | 低 |
| 写真エビデンス表示 | Google Drive画像の表示 | 中 |
| 複数入居者対応 | residentIdでの厳密フィルタ | 中 |

---

## 9. 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md) | 家族向けUX設計 |
| [SHEET_A_STRUCTURE.md](./SHEET_A_STRUCTURE.md) | 食事シート構造 |
| [CURRENT_STATUS.md](./CURRENT_STATUS.md) | 現在の進捗 |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-15 | 初版作成（読み取り時JOIN方式） |
