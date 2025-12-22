---
status: working
scope: data
owner: core-team
last_reviewed: 2025-12-23
links:
  - docs/archive/SHEET_A_STRUCTURE.md
  - docs/archive/SHEET_B_STRUCTURE.md
  - docs/API_SPEC.md
---

# データモデル

> **統合ドキュメント**: 本ドキュメントはデータ構造関連仕様を集約した包括的なガイドです。

---

## 1. 概要

本プロジェクトでは以下のデータストアを使用しています：

| ストア | 用途 | 備考 |
|--------|------|------|
| **Google Sheets** | ケア記録の永続化・共有 | Sheet A（読取）、Sheet B（書込） |
| **Firestore** | アプリ設定・品物管理・タスク | リアルタイム同期対応 |
| **Firebase Storage** | 写真エビデンス | 直接URL参照 |

---

## 2. データフロー

```
┌──────────────────────────────────────────────────────────────────┐
│                      データフロー概要                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│   [スタッフ入力]                                                   │
│        │                                                           │
│        ▼                                                           │
│   ┌─────────┐     ┌─────────────┐     ┌─────────────┐            │
│   │ Frontend │────▶│ Cloud Func  │────▶│  Sheet B    │            │
│   │ (PWA)    │     │ (API)       │     │  (書き込み) │            │
│   └─────────┘     └─────────────┘     └─────────────┘            │
│                          │                                         │
│                          ▼                                         │
│                   ┌─────────────┐     ┌─────────────┐            │
│                   │  Firestore  │     │  Sheet A    │            │
│                   │  (設定等)   │     │  (読み取り) │            │
│                   └─────────────┘     └─────────────┘            │
│                                              │                     │
│                                              ▼                     │
│                                       [家族閲覧]                   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Google Sheets 構造

### 3.1 Sheet A（記録の結果 / 読み取り専用）

**詳細仕様**: [SHEET_A_STRUCTURE.md](./archive/SHEET_A_STRUCTURE.md)

施設側の記録システムから出力されたケア記録データ。家族向け閲覧用。

#### シート一覧

| シート名 | 用途 |
|----------|------|
| 食事 | 食事摂取記録 |
| 水分摂取量 | 水分摂取記録 |
| 排便・排尿 | 排泄記録 |
| バイタル | バイタルサイン記録 |
| 口腔ケア | 口腔ケア記録 |
| 内服 | 服薬記録 |
| 特記事項 | 特記事項・メモ |
| 血糖値インスリン投与 | 血糖値・インスリン記録 |
| 往診録 | 往診記録 |
| 体重 | 体重測定記録 |
| カンファレンス録 | カンファレンス記録 |

### 3.2 Sheet B（実績入力先 / 書き込み用）

**詳細仕様**: [SHEET_B_STRUCTURE.md](./archive/SHEET_B_STRUCTURE.md)

PWAからの入力データを保存するシート。

#### カラム構成（フォームの回答 1）

| カラム | 内容 |
|--------|------|
| timestamp | 入力日時 |
| record_date | 記録日 |
| meal_type | 食事種別 |
| main_dish | 主食 |
| side_dish | 副食 |
| soup | 汁物 |
| snack | 間食 |
| water_intake | 水分摂取量 |
| note | 備考 |

---

## 4. Firestore コレクション

| コレクション | 用途 | 主要フィールド |
|--------------|------|----------------|
| `settings` | アプリ設定 | webhookUrl, driveSettings |
| `items` | 品物マスタ | name, category, isActive |
| `tasks` | タスク管理 | title, status, dueDate |
| `presets` | プリセット（いつもの指示） | name, category, instruction, matchConfig |
| `prohibitions` | 禁止ルール | itemId, reason |
| `careItems` | ケア記録 | recordDate, mealType, items |
| `chat_messages` | チャットメッセージ | content, sender, timestamp |
| `staffNotes` | スタッフ注意事項（Phase 40） | content, priority, startDate, endDate |

---

## 5. Firebase Storage 構造

```
gs://facility-care-input-form.appspot.com/
├── photos/
│   ├── meal/           # 食事写真
│   │   └── YYYY-MM-DD/
│   │       └── {timestamp}_{type}.jpg
│   └── evidence/       # エビデンス写真
│       └── YYYY-MM-DD/
│           └── {timestamp}.jpg
```

---

## 5.1 presetsコレクション詳細

プリセット（いつもの指示）の詳細構造。

### 構造

```typescript
// Firestore: presets/{presetId}
{
  id: string;
  residentId: string;

  // 基本情報
  name: string;                              // "キウイ（8等分・半月切り）"
  icon?: string;                             // "🥝"

  // 品物フォームへの適用値（プリセット選択時にフォームに自動入力）
  itemCategory?: 'food' | 'drink';           // 食べ物/飲み物
  storageMethod?: 'room_temp' | 'refrigerated' | 'frozen';
  servingMethod?: 'as_is' | 'cut' | 'peeled' | 'heated' | 'other';
  servingMethodDetail?: string;              // "輪切り8等分にして提供"
  noteToStaff?: string;                      // スタッフへの申し送り
  remainingHandlingInstruction?: 'none' | 'discarded' | 'stored';

  // マッチング設定
  matchConfig: {
    keywords: string[];                      // ["キウイ", "kiwi"]
    categories?: ItemCategory[];
    exactMatch?: boolean;
  },

  // 出所追跡
  source: 'manual' | 'ai';

  // ステータス
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;

  // メタ
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
```

### 条件の扱い

特別な条件（「体調不良時は除外」など）は、プリセットではなく品物の`noteToStaff`フィールドに記載します。

---

## 6. エンティティ関連図

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Item      │────▶│   Preset    │────▶│  CareItem   │
│  (品物)     │     │ (プリセット)│     │ (ケア記録)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│ Prohibition │                         │   Photo     │
│ (禁止ルール)│                         │  (写真)     │
└─────────────┘                         └─────────────┘
```

---

## 7. バージョニング・移行方針

| 項目 | 方針 |
|------|------|
| スキーマ変更 | 後方互換性を維持 |
| マイグレーション | Cloud Functions で実行 |
| バックアップ | Firestore自動エクスポート（未実装） |

---

## 8. 関連ドキュメント

- [SHEET_A_STRUCTURE.md](./archive/SHEET_A_STRUCTURE.md) - Sheet A 詳細仕様
- [SHEET_B_STRUCTURE.md](./archive/SHEET_B_STRUCTURE.md) - Sheet B 詳細仕様
- [API_SPEC.md](./API_SPEC.md) - API仕様

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-23 | Phase 41設計を削除（既存フォーム構造と不整合のためリバート） |
| 2025-12-23 | Phase 40: staffNotesコレクション追加 |
| 2025-12-20 | 統合ドキュメント作成 |
