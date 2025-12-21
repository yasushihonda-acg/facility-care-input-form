# Phase 32 リリースノート

## 概要
- **Phase番号**: Phase 32
- **機能名**: 統計ダッシュボード「カテゴリ別分布」→「品物別分布」
- **完了日**: 2025-12-21
- **コミット**: 17a3b01

## 背景
Phase 31でカテゴリが7→2種類（食べ物/飲み物）に簡素化されたため、
カテゴリ別分布の情報価値が低下。より有用な品物別表示に変更。

## 変更内容

### 品物別分布（新機能）
- 消費割合の高い順に上位6品目を表示
- 表示内容: 品物名、消費量/初期量、消費割合（%）
- 色分け:
  - 緑 (#10B981): 60%以上
  - 青 (#3B82F6): 40%以上
  - 黄 (#F59E0B): 20%以上
  - 赤 (#EF4444): 20%未満

### 削除機能
- カテゴリ別分布: @deprecated（後方互換のため型定義は残存）

## 修正ファイル

### ドキュメント
- `docs/STATS_DASHBOARD_SPEC.md` - セクション3.1, 3.2を更新
- `docs/CURRENT_STATUS.md` - Phase 32追加

### フロントエンド
- `frontend/src/types/stats.ts` - ItemDistribution型追加、ItemStatsData更新
- `frontend/src/data/demo/demoStats.ts` - itemDistributionデモデータ追加
- `frontend/src/pages/shared/StatsDashboard.tsx` - ItemDistributionChart実装

### テスト
- `frontend/e2e/family-user-scenario.spec.ts` - SCENARIO-D18を「品物別分布が表示される」に更新

## E2Eテスト結果
- 238件パス
- 19件スキップ（チャット関連など）

## 関連ドキュメント
- STATS_DASHBOARD_SPEC.md セクション3「品物状況タブ」
