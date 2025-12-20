---
status: canonical
scope: ops
owner: core-team
last_reviewed: 2025-12-20
---

# ドキュメント目次

> **最終更新**: 2025年12月20日
>
> 本プロジェクトの全ドキュメントへのインデックスです。

---

## 凡例

### ステータス

| ステータス | 意味 | 更新頻度 |
|-----------|------|----------|
| `canonical` | 正式版・単一の真実の源 | 機能変更時 |
| `working` | 作業中・開発中 | 随時 |
| `draft` | 下書き・検討中 | 随時 |
| `archived` | アーカイブ済み | 更新なし |

### スコープ

| スコープ | 対象 |
|----------|------|
| `core` | システム基盤・アーキテクチャ |
| `data` | データモデル・スキーマ |
| `feature` | 機能仕様 |
| `integration` | 外部連携・通知 |
| `ops` | 運用・セットアップ |
| `test` | テスト戦略・計画 |
| `status` | 進捗・ステータス |

### Owner

- **core-team**: コアチーム管理
- **contributor**: 貢献者管理

---

## Core（基盤）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | システム全体設計 | canonical |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | 業務ルール・Bot連携 | canonical |
| [API_SPEC.md](./API_SPEC.md) | API仕様書 | canonical |
| [USER_ROLE_SPEC.md](./USER_ROLE_SPEC.md) | ユーザータイプ別権限 | canonical |
| [VIEW_ARCHITECTURE_SPEC.md](./VIEW_ARCHITECTURE_SPEC.md) | View構成・ルーティング | canonical |

---

## Data Model（データモデル）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [DATA_MODEL.md](./DATA_MODEL.md) | データモデル統合ドキュメント | working |

> **詳細仕様（アーカイブ）**: [archive/SHEET_A_STRUCTURE.md](./archive/SHEET_A_STRUCTURE.md), [archive/SHEET_B_STRUCTURE.md](./archive/SHEET_B_STRUCTURE.md)

---

## Sync & Offline（同期・オフライン）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [SYNC_STRATEGY.md](./SYNC_STRATEGY.md) | 同期戦略・競合防止 | canonical |

> **詳細仕様（アーカイブ）**: [archive/SYNC_CONCURRENCY.md](./archive/SYNC_CONCURRENCY.md)

---

## Feature Specs（機能仕様）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md) | 食事入力フォーム | working |
| [STAFF_RECORD_FORM_SPEC.md](./STAFF_RECORD_FORM_SPEC.md) | スタッフ記録入力フォーム | working |
| [SETTINGS_MODAL_UI_SPEC.md](./SETTINGS_MODAL_UI_SPEC.md) | 設定モーダルUI | working |
| [FOOTER_NAVIGATION_SPEC.md](./FOOTER_NAVIGATION_SPEC.md) | フッターナビゲーション | canonical |
| [TABLE_VIEW_COLUMNS.md](./TABLE_VIEW_COLUMNS.md) | テーブルビュー列設計 | working |
| [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md) | 家族向けUX設計 | working |
| [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) | 統計ダッシュボード | working |
| [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md) | タスク管理機能 | working |
| [PLAN_RESULT_MANAGEMENT.md](./PLAN_RESULT_MANAGEMENT.md) | 予実管理設計 | working |
| [DAY_SERVICE_OPTIONS_SPEC.md](./DAY_SERVICE_OPTIONS_SPEC.md) | デイサービス選択肢 | working |
| [PHOTO_UPLOAD_SPEC.md](./PHOTO_UPLOAD_SPEC.md) | 写真アップロード（非推奨） | deprecated |
| [PHOTO_EVIDENCE_DISPLAY_SPEC.md](./PHOTO_EVIDENCE_DISPLAY_SPEC.md) | 写真エビデンス表示 | working |
| [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) | デザインガイドライン | working |

---

## Inventory Suite（在庫・品物管理）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [INVENTORY_SUITE.md](./INVENTORY_SUITE.md) | 在庫管理統合ドキュメント | working |
| [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) | 品物管理機能 | working |
| [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) | 在庫・消費追跡 | working |
| [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) | プリセット管理 | working |
| [FIFO_DESIGN_SPEC.md](./FIFO_DESIGN_SPEC.md) | FIFO対応設計 | working |

---

## UI/UX

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [UI_UX_SPEC.md](./UI_UX_SPEC.md) | UI/UX統合ドキュメント | working |

---

## Comms/Integrations（通信・連携）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [COMMS_INTEGRATIONS.md](./COMMS_INTEGRATIONS.md) | 通信連携統合ドキュメント | working |
| [CHAT_INTEGRATION_SPEC.md](./CHAT_INTEGRATION_SPEC.md) | チャット連携 | canonical |
| [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) | Gemini AI連携 | working |
| [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) | Google Chat Webhook | working |
| [MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md](./MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md) | 品物×ケア統合分析 | working |

---

## Snack/Meal（間食・食事）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [ITEM_BASED_SNACK_RECORD_SPEC.md](./ITEM_BASED_SNACK_RECORD_SPEC.md) | 品物起点の間食記録 | working |
| [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md) | 間食記録連携 | working |

---

## Testing（テスト）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [TEST_STRATEGY.md](./TEST_STRATEGY.md) | テスト戦略統合ドキュメント | working |
| [E2E_TEST_SPEC.md](./E2E_TEST_SPEC.md) | E2Eテスト仕様 | working |
| [API_TEST_PLAN.md](./API_TEST_PLAN.md) | APIテスト計画 | working |
| [ADMIN_TEST_FEATURE_SPEC.md](./ADMIN_TEST_FEATURE_SPEC.md) | 管理設定テスト機能 | working |

---

## Ops/Status（運用・ステータス）

| ドキュメント | 説明 | ステータス |
|--------------|------|-----------|
| [SETUP.md](./SETUP.md) | 環境セットアップ | canonical |
| [HANDOVER.md](./HANDOVER.md) | 引き継ぎドキュメント | canonical |
| [ROADMAP.md](./ROADMAP.md) | 開発ロードマップ | canonical |
| [CURRENT_STATUS.md](./CURRENT_STATUS.md) | 現在のステータス | working |
| [FIREBASE_STORAGE_MIGRATION_SPEC.md](./FIREBASE_STORAGE_MIGRATION_SPEC.md) | Firebase Storage移行 | working |
| [DEMO_STAFF_CONTAINMENT.md](./DEMO_STAFF_CONTAINMENT.md) | デモ環境完結・離脱防止（Phase 20） | canonical |
| [FOOTERNAV_DEMO_FIX_SPEC.md](./FOOTERNAV_DEMO_FIX_SPEC.md) | デモモードAPI 500エラー修正（Phase 20.1） | canonical |

### 週次ステータス

| 週 | リンク |
|----|--------|
| 2025-W51 | [status/2025/2025-W51.md](./status/2025/2025-W51.md) |

---

## Archive（アーカイブ）

> 以下は参照用にアーカイブされたドキュメントです。

| ドキュメント | 説明 | 備考 |
|--------------|------|------|
| [SYNC_CONCURRENCY.md](./archive/SYNC_CONCURRENCY.md) | 競合防止設計 | SYNC_STRATEGYに統合 |
| [SHEET_A_STRUCTURE.md](./archive/SHEET_A_STRUCTURE.md) | Sheet A構造 | DATA_MODELに統合 |
| [SHEET_B_STRUCTURE.md](./archive/SHEET_B_STRUCTURE.md) | Sheet B構造 | DATA_MODELに統合 |
| [DEMO_SHOWCASE_SPEC.md](./archive/DEMO_SHOWCASE_SPEC.md) | デモショーケース設計 | 完了・参照用 |
| [DEMO_FAMILY_REDESIGN.md](./archive/DEMO_FAMILY_REDESIGN.md) | 家族向けデモ設計 | 完了・参照用 |
| [DEMO_PWA_SPEC.md](./archive/DEMO_PWA_SPEC.md) | デモPWA仕様 | 完了・参照用 |
| [DEMO_STAFF_SPEC.md](./archive/DEMO_STAFF_SPEC.md) | スタッフデモ設計 | 完了・参照用 |
| [QUALITY_CHECK_DEMO_WRITE_OPS.md](./archive/QUALITY_CHECK_DEMO_WRITE_OPS.md) | デモ書き込み品質チェック | 完了・参照用 |
| [FIX_DEMO_NAVIGATION.md](./archive/FIX_DEMO_NAVIGATION.md) | デモナビ修正記録 | 完了・参照用 |

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-20 | DEMO_STAFF_CONTAINMENT.md, FOOTERNAV_DEMO_FIX_SPEC.md 追加（Phase 20/20.1） |
| 2025-12-20 | PHOTO_UPLOAD_SPEC.md を deprecated に変更（Phase 17移行済み） |
| 2025-12-20 | 初版作成・ドキュメント整理 |
