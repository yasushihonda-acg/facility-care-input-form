# Phase 31 リリースノート

## 概要
- **Phase番号**: Phase 31
- **機能名**: カテゴリ簡素化 + タブ固定化
- **完了日**: 2025-12-21
- **コミット**: 50cfc2c

## 変更内容

### カテゴリの簡素化（7→2）

| 変更前 | 変更後 |
|--------|--------|
| fruit, snack, dairy, prepared, supplement, other | food（食べ物） |
| drink | drink（飲み物） |

### スタッフ記録フォームのタブ固定化

| カテゴリ | 表示フォーム | タブ切替 |
|----------|-------------|----------|
| 食べ物 (food) | 食事フォーム（摂食割合入力） | ❌ 不可 |
| 飲み物 (drink) | 水分フォーム（cc入力） | ❌ 不可 |

### 後方互換性

`migrateCategory()` 関数で旧カテゴリを自動変換:
- drink → drink
- その他（fruit, snack, dairy, prepared, supplement, other） → food

## 修正ファイル

### フロントエンド
- `frontend/src/types/careItem.ts` - ItemCategory型を2値に変更、migrateCategory()追加
- `frontend/src/components/staff/StaffRecordDialog.tsx` - タブ切替を廃止、固定ヘッダー表示
- `frontend/src/pages/family/ItemForm.tsx` - カテゴリ選択UI: 7ボタン→2ボタン
- `frontend/src/pages/family/ItemEditPage.tsx` - カテゴリ選択UI: 7ボタン→2ボタン
- `frontend/src/pages/shared/StatsDashboard.tsx` - 統計の2カテゴリ対応
- `frontend/src/data/demo/demoCareItems.ts` - デモデータを2カテゴリに更新
- `frontend/src/data/demo/demoStats.ts` - 統計デモデータを2カテゴリに更新
- `frontend/src/data/demoFamilyData.ts` - prohibitions categoryを'food'に変更

### バックエンド
- `functions/src/types/index.ts` - ItemCategory型を2値に変更
- `functions/src/services/googleChatService.ts` - 通知メッセージのカテゴリラベル更新

## Phase 30: 入力無し警告の実装確認

### 確認結果: ✅ 要件通りに実装済み

**ユーザー要件**:
> このアプリから食事または水分の入力が１回でも有ったかをトリガー条件としたい

**実装フロー**:
```
submitMealRecord API成功 → updateDailyRecordLog("meal") → hasMealRecord=true
submitHydrationRecord API成功 → updateDailyRecordLog("hydration") → hasHydrationRecord=true

毎日16:00 JST: checkDailyRecords
  ↓
Firestore daily_record_logs/{date} を読み取り
  ↓
hasMealRecord==false または hasHydrationRecord==false → Google Chat警告通知
```

**結論**: スプレッドシートは一切参照せず、アプリからの入力APIのみでフラグを更新

## 関連ドキュメント
- ITEM_MANAGEMENT_SPEC.md セクション2.2
- STAFF_RECORD_FORM_SPEC.md タブ固定動作セクション
- FAMILY_NOTIFY_SPEC.md（Phase 30 入力無し警告）
