# Phase 30.1: 品物削除通知・記録チェック時間設定

## リリース日
2025-12-21

## 概要
品物削除時のGoogle Chat通知追加、記録チェック通知時間の管理画面設定対応。

## 主な変更点

### 1. 品物削除通知
- `deleteCareItemHandler`: 削除成功時にGoogle Chat通知を送信
- `formatCareItemNotification`: 'delete'アクションをサポート（#品物削除🗑️）
- 登録・編集と同じ`familyNotifyWebhookUrl`を使用

### 2. 記録チェック通知時間の設定
- `MealFormSettings.recordCheckHour`: 通知時刻フィールド追加（0-23、デフォルト16）
- `checkDailyRecords`: Cloud Schedulerを毎時0分実行に変更、設定時刻と比較
- スケジュール変更: `0 16 * * *` → `0 * * * *`
- `formatNoRecordNotification`: 設定時刻をメッセージに反映

### 3. 管理画面UI
- 通知時間セレクトボックス追加（0-23時）
- 説明文更新: 「品物登録・編集・削除時、設定時刻の入力無し時に通知」

## ファイル変更一覧
- `docs/FAMILY_NOTIFY_SPEC.md` - 仕様書更新
- `functions/src/types/index.ts` - recordCheckHour追加
- `frontend/src/types/index.ts` - recordCheckHour追加
- `functions/src/functions/careItems.ts` - 削除通知ロジック追加
- `functions/src/functions/checkDailyRecords.ts` - 毎時実行＋時間比較
- `functions/src/services/googleChatService.ts` - formatCareItemNotification拡張、formatNoRecordNotification拡張
- `frontend/src/components/MealSettingsModal.tsx` - 通知時間設定UI追加

## テスト結果
- functions build: 成功
- frontend build: 成功
- Lint: 成功
- 本番デプロイ: 成功
