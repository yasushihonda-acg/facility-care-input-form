# Phase 36: スケジュール開始日・品物編集スケジュール対応

## リリース日
2025-12-21

## 概要
「毎日」「曜日指定」スケジュールタイプに開始日（startDate）フィールドを追加。品物編集ページでのスケジュール編集対応、タスク自動生成の構造化スケジュール対応を実装。

## 主な変更点

### 1. 型定義
- `ServingSchedule`インターフェースに`startDate?: string`フィールド追加
- frontend/functions両方で同期

### 2. スケジュール判定ロジック
- `isScheduledForToday()`に開始日チェック追加
- `isScheduledForTomorrow()`に開始日チェック追加
- `getNextScheduledDate()`で開始日が未来の場合は開始日から探索
- `formatScheduleDisplay()`/`formatScheduleShort()`に開始日表示追加

### 3. サーバーサイド判定ロジック（新規）
- `functions/src/utils/scheduleUtils.ts`新規作成
- `isScheduledForDate()`/`isScheduledForToday()`をサーバーサイドで実装

### 4. taskGenerator.ts構造化スケジュール対応
- ハイブリッドアプローチ:
  - Phase 1: plannedServeDateが今日の品物（後方互換）
  - Phase 2: servingScheduleを持つ品物をサーバー側で判定
- `buildServeReminderDescription()`共通化

### 5. ServingScheduleInput.tsx
- daily/weekly選択時に「開始日（任意）」入力フィールド表示
- ヘルプテキスト追加

### 6. ItemEditPage.tsx
- `EditFormData`に`servingSchedule`フィールド追加
- `ServingScheduleInput`コンポーネント表示
- 保存時に`servingSchedule`送信

### 7. ScheduleDisplay.tsx
- 開始日が未来の場合「⏳{日付}から開始」表示（compact/詳細両対応）

## E2Eテスト
- `schedule-start-date.spec.ts`新規追加（13テスト）
- 開始日UI表示、品物編集、プレビュー表示のテスト

## テスト結果
- 13/13テスト成功（1件スキップ：テストデータ依存）
- 本番デプロイ済み

## ドキュメント更新
- `docs/ITEM_BASED_SNACK_RECORD_SPEC.md`: Phase 36セクション追加（5.1-5.8）
- `gh-pages/index.html`: Phase 36開発進捗追加
- Serenaメモリ: phase_36_release作成

## ファイル変更一覧
- `frontend/src/types/careItem.ts` - startDate追加
- `functions/src/types/index.ts` - startDate追加
- `frontend/src/utils/scheduleUtils.ts` - 判定ロジック修正
- `functions/src/utils/scheduleUtils.ts` - 新規作成
- `functions/src/functions/taskGenerator.ts` - 構造化スケジュール対応
- `frontend/src/components/family/ServingScheduleInput.tsx` - 開始日UI
- `frontend/src/pages/family/ItemEditPage.tsx` - スケジュール編集対応
- `frontend/src/components/meal/ScheduleDisplay.tsx` - 開始日表示
- `frontend/e2e/schedule-start-date.spec.ts` - E2Eテスト新規
