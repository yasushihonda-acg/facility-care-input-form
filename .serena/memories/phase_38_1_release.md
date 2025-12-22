# Phase 38.1: 品物管理UI確認優先リデザイン

## リリース日
2025-12-22

## 概要
家族向け品物管理画面のUI/UXを改善。「確認ファースト、計画はオンデマンド」設計思想に基づき、日常的な確認タスクを優先表示し、詳細フィルタは必要時のみ展開する構成に変更。

## 新規コンポーネント

### TodaySummaryCard.tsx
品物管理ページ上部に表示する「今日のステータス」サマリーカード。

表示項目:
- **今日の予定**: 今日提供予定の品物数
- **確認待ち**: 提供済みだが摂食結果未入力
- **期限間近**: 賞味期限3日以内
- **期限切れ**: 賞味期限切れ（要対応）

クリック時にフィルタと連動:
- 今日の予定 → dateRange='today', フィルタ展開
- 確認待ち → statusFilter='served'
- 期限間近/期限切れ → 全表示

## UI改善

### DateRangeTabs.tsx
- 折りたたみ式に変更（デフォルト非表示）
- 適用中フィルタをバッジで表示
- フィルタリセットボタン追加

### ItemManagement.tsx
- TodaySummaryCardをフィルタ上部に配置
- サマリーカードクリックでフィルタ連動
- 確認優先のレイアウト構成

## 設計思想
ユーザーシナリオ分析に基づく改善:
1. 日常的なチェック（今日の予定確認、摂食結果確認）を最上部に
2. 詳細フィルタは必要時のみ展開（デフォルト非表示）
3. 期限警告を視覚的に目立たせる

## ファイル構成
- `frontend/src/components/family/TodaySummaryCard.tsx` (NEW)
- `frontend/src/components/family/DateRangeTabs.tsx` (MODIFIED)
- `frontend/src/pages/family/ItemManagement.tsx` (MODIFIED)

## 本番URL
https://facility-care-input-form.web.app/demo/family/items
