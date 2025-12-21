# Phase 29 Release: 水分記録機能

## 完了日
2025-12-21

## 実装内容

### Frontend (StaffRecordDialog.tsx)
- タブ式UI追加（食事🍪 / 水分💧）
- カテゴリ連動デフォルトタブ選択
  - drink カテゴリ → 水分タブ
  - その他 → 食事タブ
- 水分量自動計算（calculateHydrationAmount関数）
  - ml/cc: そのまま
  - l: ×1000
  - コップ/杯: ×200
- 特記事項にdefaultValue設定: `【ケアに関すること】\n\n【ACPiece】`

### Backend (Cloud Functions)
- submitHydrationRecord新規作成
- 水分摂取量シート連携: `1su5K9TjmzMfKc8OIK2aZYXCfuDrNeIRM0a3LUCFcct4`
- 投稿ID形式: `HYD{YYYYMMDDHHmmssSSS}{RANDOM6}`
- Google Chat Webhook通知: `#水分摂取💧` タグ

### 水分タブ「残った分への対応」
- 全量消費時（水分量 >= 提供量）は非表示
- 未消費時は必須項目
- 選択肢: 破棄した / 保存した / その他

### E2Eテスト
- 17件追加（STAFF-080 〜 STAFF-096）
- 本番環境テスト: 16/17パス（1件スキップ: テストデータ依存）
- 総テスト数: 302件（26件スキップ含む）

## 設計ドキュメント
- docs/STAFF_RECORD_FORM_SPEC.md セクション7.3, 13
- docs/GOOGLE_CHAT_WEBHOOK_SPEC.md Phase 29セクション
