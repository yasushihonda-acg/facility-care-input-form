# Phase 30: 家族操作・入力無し通知機能 設計書

## 概要

| 項目 | 値 |
|------|-----|
| Phase番号 | Phase 30 |
| 機能名 | 家族操作・入力無し通知 |
| 目的 | 品物登録/編集時の即座通知、16時入力無し警告通知 |
| Webhook URL | 1個（共通）: `familyNotifyWebhookUrl` |

---

## 通知トリガー

| トリガー | タイミング | 条件 |
|----------|------------|------|
| 品物登録 | submitCareItem成功時 | 即座 |
| 品物編集 | updateCareItem成功時 | 即座 |
| 入力無し警告 | 毎日16:00 JST | その日の食事記録または水分記録が未入力 |

---

## 設定UI

### 場所

管理者設定モーダル（`/staff/input/meal?admin=true` → 設定アイコン）

### 新規セクション

**「家族・入力監視 通知設定」**

| 要素 | 説明 |
|------|------|
| ラベル | 監視通知Webhook URL |
| 説明文 | 品物登録・編集時、16時入力無し時に通知 |
| 入力欄 | `https://chat.googleapis.com/...` |
| テスト送信ボタン | 設定したURLへテストメッセージ送信 |

### バリデーション

- 空の場合: テスト送信ボタンはdisabled
- プレフィックスチェック: `https://chat.googleapis.com/` で始まる必要あり
- 保存: 他の設定と同時に保存

---

## データ構造

### 設定（Firestore）

**コレクション**: `settings`
**ドキュメント**: `mealFormDefaults`

```typescript
interface MealFormSettings {
  // ... 既存フィールド
  webhookUrl: string;
  importantWebhookUrl: string;
  familyNotifyWebhookUrl: string;  // Phase 30で追加
}
```

### 日次記録ログ（Firestore）

**コレクション**: `daily_record_logs`
**ドキュメントID**: `YYYY-MM-DD` 形式

```typescript
interface DailyRecordLog {
  date: string;              // YYYY-MM-DD
  hasMealRecord: boolean;    // 食事記録あり
  hasHydrationRecord: boolean; // 水分記録あり
  lastMealAt?: string;       // 最終食事記録時刻
  lastHydrationAt?: string;  // 最終水分記録時刻
  updatedAt: string;         // 更新日時
}
```

---

## メッセージフォーマット

### 品物登録通知

```
#品物登録📦

【せんべい】
カテゴリ: お菓子
数量: 2袋
賞味期限: 2025-01-15
スタッフへの伝達事項: 小分けにして提供してください

登録者: family_user_001
時刻: 2025/12/21 14:30:00
```

### 品物編集通知

```
#品物編集✏️

【せんべい】
カテゴリ: お菓子
数量: 1袋
賞味期限: 2025-01-15

編集者: family_user_001
時刻: 2025/12/21 15:00:00
```

### 16時入力無し通知

```
#入力無し警告⚠️

【2025-12-21】の記録が未入力です

- 食事記録: 未入力
- 水分記録: 入力済み

※ 16:00時点の確認
```

---

## API

### 品物登録・編集（既存API拡張）

**エンドポイント**:
- `POST /submitCareItem` - 登録時に通知
- `POST /updateCareItem` - 編集時に通知

**通知処理**:
- 非同期（メイン処理をブロックしない）
- エラー時はログ記録のみ、API自体は成功扱い

### 16時定時チェック（新規）

**関数名**: `checkDailyRecords`
**トリガー**: Cloud Scheduler (Pub/Sub)
**スケジュール**: `0 16 * * *` (毎日16:00 JST)

**処理フロー**:
1. 当日の日次記録ログを取得
2. 食事記録・水分記録の有無を確認
3. どちらかが未入力の場合、Webhook通知送信
4. 両方入力済みの場合、通知なし

---

## 実装ファイル

### バックエンド

| ファイル | 変更内容 |
|----------|----------|
| `functions/src/types/index.ts` | 型拡張（familyNotifyWebhookUrl, DailyRecordLog） |
| `functions/src/functions/careItems.ts` | 通知追加 |
| `functions/src/functions/submitMealRecord.ts` | ログ更新追加 |
| `functions/src/functions/submitHydrationRecord.ts` | ログ更新追加 |
| `functions/src/functions/mealFormSettings.ts` | 設定対応 |
| `functions/src/services/googleChatService.ts` | フォーマット関数追加 |
| `functions/src/index.ts` | エクスポート追加 |

### フロントエンド

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/types/index.ts` | 型拡張 |
| `frontend/src/components/MealSettingsModal.tsx` | 設定UI追加 |

### 新規ファイル

| ファイル | 用途 |
|----------|------|
| `functions/src/services/dailyRecordLogService.ts` | 日次ログサービス |
| `functions/src/functions/checkDailyRecords.ts` | 16時定時チェック |
| `frontend/e2e/family-notify.spec.ts` | E2Eテスト |
| `docs/FAMILY_NOTIFY_SPEC.md` | 設計書（本ファイル） |

---

## エラーハンドリング

| シナリオ | 対応 |
|----------|------|
| Webhook送信失敗 | エラーログ記録、メイン処理は続行 |
| 日次ログ更新失敗 | エラーログ記録、記録保存は成功扱い |
| 設定未登録 | 通知スキップ（エラーなし） |

---

## E2Eテスト

**ファイル**: `frontend/e2e/family-notify.spec.ts`

| テストID | 内容 |
|----------|------|
| SETTINGS-030-001 | 設定モーダルに監視通知Webhook URL欄が表示される |
| SETTINGS-030-002 | 監視通知Webhook URLの保存と復元 |
| SETTINGS-030-003 | 空のURLでテスト送信するとエラー表示 |
| SETTINGS-030-004 | 不正なURLプレフィックスでテスト送信するとエラー表示 |
| SETTINGS-030-005 | 説明文が正しく表示される |
| SETTINGS-030-006 | キャンセル時に入力値がリセットされる |
| SETTINGS-030-007 | クリア操作でfamilyNotifyWebhookUrlもクリアされる |

---

## Cloud Scheduler設定

16時チェック関数のスケジュール設定:

```
名前: checkDailyRecords
スケジュール: 0 16 * * * (毎日16:00)
タイムゾーン: Asia/Tokyo
ターゲット: Pub/Sub
```

**注意**: Cloud Functions v1のPub/Subスケジュール関数は、デプロイ時に自動でCloud Schedulerジョブが作成される。

---

## 関連ドキュメント

- [SETTINGS_MODAL_UI_SPEC.md](./SETTINGS_MODAL_UI_SPEC.md) - 設定モーダル全体仕様
- [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) - Webhook連携仕様
- [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) - 品物管理機能仕様
- [STAFF_RECORD_FORM_SPEC.md](./STAFF_RECORD_FORM_SPEC.md) - 記録入力フォーム仕様
