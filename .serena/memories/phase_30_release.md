# Phase 30 Release: 家族操作・入力無し通知

## 完了日
2025-12-21

## 機能概要
- 品物登録/編集時の即座通知
- 毎日16時の入力無し警告通知
- 共通Webhook URL: `familyNotifyWebhookUrl`

## 実装内容

### Frontend (MealSettingsModal.tsx)
- 新セクション「家族・入力監視 通知設定」追加
- 監視通知Webhook URL入力欄
- テスト送信ボタン（通常/重要/監視の3つ）

### Backend (Cloud Functions)

#### 品物通知 (careItems.ts)
- submitCareItem成功後に通知送信
- updateCareItem成功後に通知送信
- 非同期処理（エラーでもメイン処理は続行）

#### 日次ログサービス (dailyRecordLogService.ts)
- updateDailyRecordLog(recordType): 食事/水分記録時にログ更新
- getDailyRecordLog(date): 日次ログ取得
- Firestoreコレクション: `daily_record_logs`

#### 16時定時チェック (checkDailyRecords.ts)
- Cloud Scheduler: `0 16 * * *` (毎日16:00 JST)
- 日次ログから食事/水分記録有無を確認
- どちらか未入力の場合、Webhook通知送信

### メッセージフォーマット (googleChatService.ts)
- `#品物登録📦`: formatCareItemNotification("register", item, userId)
- `#品物編集✏️`: formatCareItemNotification("update", item, userId)
- `#入力無し警告⚠️`: formatNoRecordNotification(date, hasMeal, hasHydration)

## データ構造

### DailyRecordLog (Firestore)
```typescript
interface DailyRecordLog {
  date: string;              // YYYY-MM-DD（ドキュメントID）
  hasMealRecord: boolean;
  hasHydrationRecord: boolean;
  lastMealAt?: string;
  lastHydrationAt?: string;
  updatedAt: string;
}
```

### 設定拡張
- `settings/mealFormDefaults.familyNotifyWebhookUrl`

## テスト送信メッセージ

監視通知Webhookのテスト送信は、食事記録形式（#食事 🍚）ではなく品物登録形式（#品物登録📦）で送信される。

**実装**: `testWebhook` APIに `webhookType` パラメータを追加
- `webhookType: "familyNotify"` → 品物登録形式
- `webhookType: undefined` または `"normal"` → 従来の食事記録形式

## E2Eテスト
- family-notify.spec.ts: 7件（5件パス、2件スキップ=API依存）
- 総テスト数: 309件（28件スキップ含む）

## 設計ドキュメント
- docs/FAMILY_NOTIFY_SPEC.md
