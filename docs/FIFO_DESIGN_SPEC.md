# FIFO（先入れ先出し）対応設計書

> **作成日**: 2025年12月18日
> **Phase**: 12.0
> **ステータス**: 完了 ✅

---

## 1. 概要

### 1.1 背景・課題

同じ品物（例：りんご）が複数回送付された場合、賞味期限が混同しないよう別管理が必要。
現状の設計では送付ごとに別レコード（CareItem）として管理されているが、以下の課題がある：

| 課題 | 現状 | 問題点 |
|------|------|--------|
| 表示順序 | 送付日の新しい順（desc） | 古いものが下に埋もれて見逃しやすい |
| 間食提供時 | 品物選択は任意 | 期限の近いものを見逃す可能性 |
| 品物詳細画面 | 同一品物の他在庫情報なし | FIFOの意識付けができない |

### 1.2 設計目標

1. **賞味期限が近い順に表示** - 期限切れリスクを最小化
2. **FIFOガイドの表示** - 同じ品物が複数ある場合に警告・推奨
3. **将来の拡張性確保** - ロット管理への拡張を考慮した設計

### 1.3 スコープ

| 項目 | Phase 12.0 | Phase 12.1（将来） |
|------|------------|-------------------|
| 表示順序変更 | ✅ 実装 | - |
| FIFOガイド（間食提供） | ✅ 実装 | - |
| FIFOガイド（品物詳細） | ✅ 実装 | - |
| ロット管理（batchId） | ❌ 設計のみ | 実装 |
| 送付履歴ビュー | ❌ 設計のみ | 実装 |

---

## 2. データモデル

### 2.1 現状のCareItem（変更なし）

```typescript
interface CareItem {
  id: string;                    // ユニークID（自動生成）
  itemName: string;              // 品物名
  sentDate: string;              // 送付日 (YYYY-MM-DD)
  expirationDate?: string;       // 賞味期限 (YYYY-MM-DD)
  currentQuantity: number;       // 現在の残量
  // ... 他のフィールド
}
```

### 2.2 将来の拡張（Phase 12.1）

```typescript
interface CareItem {
  // ... 既存フィールド
  batchId?: string;              // ロットID（例: "2024-12-01-001"）
  batchLabel?: string;           // ロットラベル（例: "12月1日の送付分"）
}
```

---

## 3. API変更

### 3.1 getCareItems API

**変更内容**: デフォルトソート順を変更

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| ソート順 | sentDate desc, createdAt desc | expirationDate asc, sentDate asc |
| 期限なしの扱い | - | 末尾に配置 |

**ファイル**: `functions/src/functions/careItems.ts`

```typescript
// 変更前
let query = db.collection(CARE_ITEMS_COLLECTION)
  .orderBy("sentDate", "desc")
  .orderBy("createdAt", "desc");

// 変更後
// Firestoreの制約上、expirationDateでのソートは複合インデックスが必要
// クライアント側でソートを行う
```

**注意**: Firestoreの複合クエリ制約により、expirationDateソートはクライアント側で実装。

### 3.2 クライアント側ソート

**ファイル**: `frontend/src/hooks/useCareItems.ts`

```typescript
// ソート関数
function sortByExpirationFirst(items: CareItem[]): CareItem[] {
  return [...items].sort((a, b) => {
    // 期限なしは末尾に
    if (!a.expirationDate && !b.expirationDate) {
      return new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime();
    }
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;

    // 期限が近い順
    const expA = new Date(a.expirationDate).getTime();
    const expB = new Date(b.expirationDate).getTime();
    if (expA !== expB) return expA - expB;

    // 同じ期限なら送付日が古い順
    return new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime();
  });
}
```

---

## 4. UI変更

### 4.1 品物一覧の表示順序

**対象画面**:
- `/family/items` - 家族の品物管理
- `/demo/family/items` - デモモード
- `/staff/family-messages` - スタッフの家族連絡一覧

**表示順序**:

```
1. 期限切れ（赤）      ← 最優先で表示
2. 期限3日以内（黄）
3. 期限7日以内（緑）
4. 期限8日以上
5. 期限なし            ← 最後に表示
```

**視覚的フィードバック**:

| 状態 | バッジ | 色 |
|------|--------|-----|
| 期限切れ | 🔴 期限切れ | 赤 |
| 3日以内 | 🟡 あと○日 | 黄 |
| 7日以内 | 🟢 あと○日 | 緑 |
| 8日以上 | - | グレー |
| 期限なし | - | グレー |

### 4.2 FIFOガイド（間食提供時）

**対象画面**: `/staff/input/meal`（間食セクション）

**トリガー**: 同じ品物名のCareItemが複数存在する場合

**UIコンポーネント**: `FIFOWarning.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ 「りんご」は複数の在庫があります                           │
│                                                             │
│  📦 12/1送付（期限: 12/10）残り2個 ← 推奨 ✨                  │
│  📦 12/10送付（期限: 12/20）残り3個                          │
│                                                             │
│  💡 期限の近いものから先に提供することをお勧めします            │
└─────────────────────────────────────────────────────────────┘
```

**ロジック**:

```typescript
interface FIFOWarningProps {
  itemName: string;
  items: CareItem[];  // 同じitemNameのCareItem一覧
  selectedItemId?: string;
}

// 推奨アイテムの判定
function getRecommendedItem(items: CareItem[]): CareItem {
  return items
    .filter(item => item.currentQuantity > 0)
    .sort((a, b) => {
      // 期限が近い順、同じなら送付日が古い順
      if (!a.expirationDate) return 1;
      if (!b.expirationDate) return -1;
      const expDiff = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      if (expDiff !== 0) return expDiff;
      return new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime();
    })[0];
}
```

### 4.3 FIFOガイド（品物詳細画面）

**対象画面**: `/family/items/:itemId`（品物詳細）

**トリガー**: 同じ品物名の他のCareItemが存在する場合

**UIコンポーネント**: `SameItemAlert.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  ℹ️ 同じ「りんご」の他の在庫                                   │
│                                                             │
│  📦 12/1送付（期限: 12/10）残り2個 ← この品物より先に消費推奨  │
│                                                             │
│  💡 期限の近いものから先に使い切ることをお勧めします            │
└─────────────────────────────────────────────────────────────┘
```

**表示条件**:
- 同じ品物名の他のCareItemが存在
- かつ、そのアイテムの方が期限が近い

---

## 5. 実装計画

### 5.1 ファイル変更一覧

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/hooks/useCareItems.ts` | ソート関数追加、デフォルトソート変更 |
| `frontend/src/components/family/FIFOWarning.tsx` | 新規作成 |
| `frontend/src/components/family/SameItemAlert.tsx` | 新規作成 |
| `frontend/src/components/meal/SnackSection.tsx` | FIFOWarning統合 |
| `frontend/src/pages/family/ItemDetail.tsx` | SameItemAlert統合 |
| `frontend/src/pages/family/ItemManagement.tsx` | ソート順反映確認 |

### 5.2 実装ステップ

| Step | 内容 | 依存 |
|------|------|------|
| 1 | `useCareItems.ts` にソート関数追加 | なし |
| 2 | `FIFOWarning.tsx` 作成 | Step 1 |
| 3 | `SameItemAlert.tsx` 作成 | Step 1 |
| 4 | `SnackSection.tsx` に統合 | Step 2 |
| 5 | `ItemDetail.tsx` に統合 | Step 3 |
| 6 | E2Eテスト追加 | Step 4, 5 |

---

## 6. テスト計画

### 6.1 ユニットテスト

| テストケース | 期待結果 |
|--------------|----------|
| 期限あり品物2つ | 期限が近い方が先 |
| 期限あり + 期限なし | 期限ありが先 |
| 期限なし品物2つ | 送付日が古い方が先 |
| 同じ期限、異なる送付日 | 送付日が古い方が先 |

### 6.2 E2Eテスト

| テストID | シナリオ | 検証内容 |
|----------|----------|----------|
| FIFO-001 | 品物一覧表示順序 | 期限が近い順に表示されること |
| FIFO-002 | 同一品物複数存在時の警告 | FIFOWarningが表示されること |
| FIFO-003 | 推奨アイテムのハイライト | 期限が近いアイテムに推奨マークがあること |
| FIFO-004 | 品物詳細での同一品物アラート | SameItemAlertが表示されること |

---

## 7. 将来の拡張（Phase 12.1）

### 7.1 ロット管理

**目的**: 同日に複数回送付した場合も明確に区別

**データモデル変更**:

```typescript
interface CareItem {
  // ... 既存フィールド
  batchId?: string;      // 例: "2024-12-01-001"
  batchLabel?: string;   // 例: "12月1日の送付（午前）"
}
```

**batchId生成ルール**:
- フォーマット: `YYYY-MM-DD-NNN`
- NNNは同日内の連番（001, 002, ...）

### 7.2 送付履歴ビュー

**目的**: 送付単位でグループ化して表示

```
📦 2024年12月1日の送付
├─ りんご 4個（残り2個）
└─ みかん 5個（残り0個）

📦 2024年12月10日の送付
└─ りんご 3個（残り3個）
```

### 7.3 実装見送り理由

- 現状のsentDate + createdAtで十分区別可能
- 実運用データがない状態での機能追加は過剰開発のリスク
- 必要性が確認されてから実装する方が効率的

---

## 8. 完了チェックリスト

### 8.1 実装チェック

- [ ] `useCareItems.ts` ソート関数追加
- [ ] `FIFOWarning.tsx` 作成
- [ ] `SameItemAlert.tsx` 作成
- [ ] `SnackSection.tsx` FIFOWarning統合
- [ ] `ItemDetail.tsx` SameItemAlert統合
- [ ] デモデータで動作確認

### 8.2 テストチェック

- [ ] ユニットテスト追加・パス
- [ ] E2Eテスト追加・パス
- [x] 既存E2Eテスト117件パス

### 8.3 ドキュメントチェック

- [ ] FIFO_DESIGN_SPEC.md 完成
- [ ] CURRENT_STATUS.md 更新
- [ ] ITEM_MANAGEMENT_SPEC.md 参照追加
- [ ] Serenaメモリ更新

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-12-18 | 初版作成 |
