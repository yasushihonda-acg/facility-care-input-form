---
status: working
scope: feature
owner: core-team
last_reviewed: 2025-12-20
links:
  - docs/ITEM_MANAGEMENT_SPEC.md
  - docs/INVENTORY_CONSUMPTION_SPEC.md
  - docs/PRESET_MANAGEMENT_SPEC.md
  - docs/FIFO_DESIGN_SPEC.md
---

# 在庫・品物管理スイート

> **統合ドキュメント**: 本ドキュメントは在庫・品物管理関連仕様を集約した包括的なガイドです。

---

## 1. 概要

本スイートは、施設入居者への持ち込み品物の管理・消費追跡・FIFO運用を包括的にカバーします。

### 機能一覧

| 機能 | 説明 | 詳細仕様 |
|------|------|----------|
| **品物管理** | 持ち込み品物の登録・更新・削除 | [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) |
| **在庫・消費追跡** | 消費ログ・残量管理・ステータス判定 | [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) |
| **プリセット管理** | 提供方法・ケア指示のテンプレート | [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) |
| **FIFO対応** | 先入れ先出しガイド・賞味期限管理 | [FIFO_DESIGN_SPEC.md](./FIFO_DESIGN_SPEC.md) |

---

## 2. データモデル概観

### 2.1 3層モデル

```
┌─────────────────────────────────────────────────────────────┐
│                   3層データモデル                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: FoodMaster（食品マスタ）                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - AI蓄積による栄養・分類情報                        │   │
│  │ - 全利用者共通                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  Layer 2: CareItem（品物/在庫）                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - 個別の持ち込み品物                                 │   │
│  │ - 残量・ステータス・賞味期限                         │   │
│  └─────────────────────────────────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  Layer 3: ConsumptionLog（消費ログ）                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - 提供日時・消費量                                   │   │
│  │ - 監査証跡                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 主要エンティティ

| エンティティ | コレクション | 主要フィールド |
|--------------|--------------|----------------|
| FoodMaster | `foodMaster` | name, category, nutrition, source |
| CareItem | `careItems` | name, quantity, status, expiryDate, presetIds |
| ConsumptionLog | `consumptionLogs` | itemId, consumedAt, amount, note |
| CarePreset | `presets` | name, category, items[], conditions |
| Prohibition | `prohibitions` | itemId, reason, createdAt |

---

## 3. ステータス管理

### 3.1 品物ステータス遷移

```
              ┌───────────┐
              │  active   │ ← 初期状態（残量あり）
              └─────┬─────┘
                    │ 消費
                    ▼
              ┌───────────┐
              │  low      │ ← 残量少（閾値以下）
              └─────┬─────┘
                    │ 消費
                    ▼
              ┌───────────┐
              │  empty    │ ← 残量ゼロ
              └─────┬─────┘
                    │ 期限切れ or 削除
                    ▼
              ┌───────────┐
              │ inactive  │ ← 非アクティブ
              └───────────┘
```

### 3.2 判定ロジック

| ステータス | 条件 |
|-----------|------|
| `active` | 残量 > lowThreshold |
| `low` | 0 < 残量 <= lowThreshold |
| `empty` | 残量 = 0 |
| `inactive` | 削除済み or 期限切れ |

---

## 4. FIFO運用

### 4.1 ソートルール

品物リストは以下の優先順位でソート：

1. `expiryDate` 昇順（期限が近い順）
2. `createdAt` 昇順（登録が古い順）
3. `name` 昇順（名前順）

### 4.2 FIFOガイドUI

- 品物リスト画面で「先に使う」バッジを表示
- 間食提供時に推奨品物をハイライト
- 期限切れ警告（3日前から黄色、当日は赤）

---

## 5. プリセット機能

### 5.1 カテゴリ

| カテゴリ | 用途 | 例 |
|----------|------|-----|
| `cut` | 調理・カット方法 | 一口大、刻み、ミキサー |
| `serve` | 提供方法 | 別皿、汁物で提供 |
| `condition` | 条件付きロジック | 朝のみ、週末除く |

### 5.2 初期プリセット（FAX準拠）

詳細は [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) を参照

---

## 6. 監査・トレーサビリティ

| 項目 | 実装 |
|------|------|
| 消費ログ | ConsumptionLog コレクションに全記録 |
| 変更履歴 | CareItem.updatedAt を自動更新 |
| 削除 | 論理削除（isActive: false） |

---

## 7. API一覧

| エンドポイント | 用途 | 詳細仕様 |
|----------------|------|----------|
| `POST /createCareItem` | 品物登録 | ITEM_MANAGEMENT_SPEC |
| `GET /getCareItems` | 品物一覧取得 | ITEM_MANAGEMENT_SPEC |
| `PUT /updateCareItem` | 品物更新 | ITEM_MANAGEMENT_SPEC |
| `DELETE /deleteCareItem` | 品物削除 | ITEM_MANAGEMENT_SPEC |
| `POST /submitCareItem` | 消費記録 | INVENTORY_CONSUMPTION_SPEC |
| `GET /getPresets` | プリセット一覧 | PRESET_MANAGEMENT_SPEC |
| `POST /createPreset` | プリセット作成 | PRESET_MANAGEMENT_SPEC |

---

## 8. 関連ドキュメント

- [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) - 品物管理詳細
- [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) - 在庫・消費追跡詳細
- [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md) - プリセット管理詳細
- [FIFO_DESIGN_SPEC.md](./FIFO_DESIGN_SPEC.md) - FIFO対応詳細

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-20 | 統合ドキュメント作成 |
