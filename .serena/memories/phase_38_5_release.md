# Phase 38.5 Release Notes

## リリース日
2025-12-22

## 概要
品物起点間食記録（ItemBasedSnackRecord）にタブUIを追加

## 主な変更点

### タブUI追加
1. **今日提供予定タブ**
   - 今日スケジュールされた品物を優先表示
   - 「今日提供予定」セクションと「その他の品物」セクション

2. **賞味期限タブ**
   - 期限切れ / 期限間近（3日以内）/ 期限あり / 期限なし で分類
   - 期限切れアラートバナー
   - 廃棄ボタン・確認ダイアログ

### 分類ロジック
- `classifyForTodayTab`: 今日予定 / その他
- `classifyForExpirationTab`: 期限切れ / 期限間近 / 期限あり / 期限なし

### カードハイライト
- amber: 今日提供予定
- orange: 期限間近
- red: 期限切れ
- gray: その他

## 影響ファイル
- `frontend/src/components/meal/ItemBasedSnackRecord.tsx` (MODIFIED)
- `frontend/e2e/item-snack-tab-ui.spec.ts` (NEW)

## E2Eテスト
- 15件追加（全パス）
- SNACK-TAB-001 〜 SNACK-TAB-007

## コミット
- `0f1cb4b` - feat(Phase 38.5): 品物起点間食記録にタブUI追加
- `7755c0a` - test(Phase 38.5): タブUI E2Eテスト追加（15件）

## 動作確認URL
https://facility-care-input-form.web.app/demo/staff/input/meal
