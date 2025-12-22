# Phase 41: プリセット機能改善

## 概要
プリセット（いつもの指示）のカテゴリ設計を改善し、複数カテゴリの指示を独立管理可能にする。

## 背景
- 現状: `category`が単一選択（cut/serve/condition）
- 問題: 品物登録画面では複数アイコン選択可能だが、プリセットは1カテゴリのみ
- 要望: カテゴリごとにテキスト入力を分離したい

## 設計決定
**改善案A「カテゴリ別テキスト入力」を採用**

```typescript
// 新構造
instructions: {
  cut?: string;       // カット・調理方法
  serve?: string;     // 提供方法・温度
  condition?: string; // 条件付き対応
}
```

## 実装計画

### Phase 41.1: 型定義・後方互換性（Day 1）
- [ ] `frontend/src/types/careItem.ts`: CarePresetに`instructions`フィールド追加
- [ ] `functions/src/types/index.ts`: バックエンド型も同様に更新
- [ ] 既存`category`/`instruction`は残す（後方互換性）

### Phase 41.2: バックエンドAPI改修（Day 1-2）
- [ ] `functions/src/functions/presets.ts`: CRUD対応
  - createPreset: 新旧両方のフィールドを保存
  - updatePreset: 同上
  - getPresets: 両形式を返却
- [ ] `functions/src/functions/getPresetSuggestions.ts`: 新形式対応

### Phase 41.3: フロントエンドUI改修（Day 2-3）
- [ ] `PresetManagement.tsx`: フォームをカテゴリ別テキスト入力に変更
  - 3つのテキストエリア（cut/serve/condition）
  - 空欄は保存しない（オプショナル）
- [ ] `usePresets.ts`: 新形式の読み書き対応
- [ ] `usePresetSuggestions.ts`: マッチロジック更新

### Phase 41.4: スタッフ記録画面改修（Day 3）
- [ ] `ItemBasedSnackRecord.tsx`: カテゴリ別アイコン表示
- [ ] `StaffRecordDialog.tsx`: プリセット適用表示の改善

### Phase 41.5: デモデータ更新（Day 3）
- [ ] `demoFamilyData.ts`: 新形式のデモプリセット

### Phase 41.6: E2Eテスト追加（Day 4）
- [ ] プリセット作成テスト（新形式）
- [ ] プリセット適用テスト
- [ ] 後方互換性テスト（旧形式データ）

### Phase 41.7: マイグレーション（Day 4-5）
- [ ] 既存Firestoreデータの移行スクリプト作成
- [ ] 本番データ移行実行
- [ ] 検証期間（1週間）

### Phase 41.8: 旧フィールド削除（検証後）
- [ ] `category`/`instruction`フィールド削除
- [ ] 関連コード整理

## 影響ファイル一覧

### 型定義
- `frontend/src/types/careItem.ts`
- `functions/src/types/index.ts`

### フロントエンド
- `frontend/src/pages/family/PresetManagement.tsx`
- `frontend/src/components/meal/ItemBasedSnackRecord.tsx`
- `frontend/src/components/meal/StaffRecordDialog.tsx`
- `frontend/src/hooks/usePresets.ts`
- `frontend/src/hooks/usePresetSuggestions.ts`

### バックエンド
- `functions/src/functions/presets.ts`
- `functions/src/functions/getPresetSuggestions.ts`

### デモデータ
- `frontend/src/data/demo/demoFamilyData.ts`

### ドキュメント
- `docs/BUSINESS_RULES.md` (セクション7: 完了)
- `docs/DATA_MODEL.md` (セクション5.1: 完了)

## 注意事項
- 後方互換性を必ず維持
- マイグレーション前に既存データをバックアップ
- デモモードで十分にテストしてから本番適用

## 関連ドキュメント
- docs/BUSINESS_RULES.md セクション7
- docs/DATA_MODEL.md セクション5.1
