# Phase 38.2: 品物管理UIリデザイン設計書

## 1. 概要

品物管理ページを「確認ファースト」から「日付ナビゲーション中心」のUIに再設計する。

### 1.1 設計方針

| 要素 | 旧設計 | 新設計 |
|------|--------|--------|
| 日付選択 | 固定タブ（今日/今週/今月） | カレンダー + 矢印ナビゲーション |
| 未設定日通知 | バナー（折りたたみ） | 常時表示 + 除外フィルタ |
| 期限切れ通知 | サマリーカード内 | 独立アラート + クイックアクション |
| ステータスフィルタ | タブ（全て/未提供/提供済み/消費済み） | **削除** |

---

## 2. UI構造

```
┌─────────────────────────────────────────────────┐
│ 📦 品物管理               [⭐いつもの指示] [+新規] │
├─────────────────────────────────────────────────┤
│ ⚠️ 期限切れアラート                              │
│   バナナ (12/20期限)        [廃棄] [詳細]        │
│   プリン (12/21期限)        [廃棄] [詳細]        │
├─────────────────────────────────────────────────┤
│ 📅 未設定日 (2ヶ月先まで)   [期間変更▼]          │
│   12/25(水), 12/26(木), 1/1(水祝)...            │
│   [毎日除外] [週次除外]     [すべて見る]         │
├─────────────────────────────────────────────────┤
│ ◀ │ 今日 (12/22) │ ▶   📅カレンダー            │
│ ◀ │ 今週 (12/16-22) │ ▶                        │
│ ◀ │ 今月 (12月) │ ▶                            │
├─────────────────────────────────────────────────┤
│ [品物リスト]                                     │
│  🍌 バナナ [未提供]        残: 2本              │
│  🍎 りんご [提供中]        残: 1個              │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

---

## 3. データモデル

### 3.1 ItemStatus（既存・変更なし）

```typescript
type ItemStatus =
  | 'pending'      // 未提供
  | 'in_progress'  // 提供中
  | 'served'       // 提供済み
  | 'consumed'     // 消費完了
  | 'expired'      // 期限切れ
  | 'discarded';   // 廃棄
```

### 3.2 期限切れアラート表示条件

| 条件 | アラート表示 |
|------|-------------|
| status === 'pending' && 期限切れ | ✅ 表示 |
| status === 'in_progress' && 期限切れ | ✅ 表示 |
| status === 'served' | ❌ 非表示（提供済み） |
| status === 'consumed' | ❌ 非表示（消費済み） |
| status === 'discarded' | ❌ 非表示（廃棄済み） |
| status === 'expired' | ❌ 非表示（既に期限切れ処理済み） |

---

## 4. API設計

### 4.1 廃棄処理（既存API使用）

**エンドポイント**: `PUT /updateCareItem`

**リクエスト**:
```json
{
  "itemId": "item-123",
  "updates": {
    "status": "discarded",
    "discardedAt": "2025-12-22T10:00:00Z",
    "discardedBy": "family_user",
    "discardReason": "期限切れのため廃棄"
  }
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "itemId": "item-123",
    "updatedAt": "2025-12-22T10:00:00Z"
  }
}
```

### 4.2 CareItem拡張フィールド（任意追加）

```typescript
interface CareItem {
  // ... 既存フィールド ...

  // Phase 38.2: 廃棄関連（オプション）
  discardedAt?: string;      // 廃棄日時
  discardedBy?: string;      // 廃棄実行者
  discardReason?: string;    // 廃棄理由
}
```

---

## 5. フロントエンドコンポーネント

### 5.1 新規作成

| コンポーネント | 役割 |
|---------------|------|
| `ExpirationAlert.tsx` | 期限切れアラートバナー + クイックアクション |
| `DateNavigator.tsx` | 今日/今週/今月 矢印ナビゲーション + カレンダー |
| `UnscheduledDatesNotice.tsx` | 未設定日通知（期間変更・除外フィルタ付き） |

### 5.2 修正

| コンポーネント | 変更内容 |
|---------------|----------|
| `ItemManagement.tsx` | ステータスフィルタ削除、新コンポーネント統合 |
| `TodaySummaryCard.tsx` | 削除（ExpirationAlertに統合） |
| `DateRangeTabs.tsx` | DateNavigatorに置き換え |

### 5.3 削除（不要になるコンポーネント）

- `TodaySummaryCard.tsx` → ExpirationAlertに機能統合

---

## 6. フック設計

### 6.1 useDiscardItem

```typescript
function useDiscardItem() {
  return useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason?: string }) => {
      const response = await fetch(`${API_BASE}/updateCareItem`, {
        method: 'PUT',
        body: JSON.stringify({
          itemId,
          updates: {
            status: 'discarded',
            discardedAt: new Date().toISOString(),
            discardedBy: 'family_user',
            discardReason: reason || '家族により廃棄',
          },
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['careItems'] });
    },
  });
}
```

---

## 7. ユーザーフロー

### 7.1 期限切れ品物の廃棄

```
1. アラートに期限切れ品物が表示される
2. [廃棄] ボタンをクリック
3. 確認ダイアログ表示
4. 「廃棄する」で確定
5. ステータスが 'discarded' に更新
6. アラートから消える
```

### 7.2 日付ナビゲーション

```
1. 「今日」タブ選択時: 今日提供予定の品物を表示
2. ◀ クリック: 前日/前週/前月に移動
3. ▶ クリック: 翌日/翌週/翌月に移動
4. カレンダーアイコン: 日付ピッカーで直接選択
```

---

## 8. 実装ステップ

1. **データモデル確認** ✅ 既存で対応可能
2. **バックエンド** ✅ 既存updateCareItemで対応可能
3. **フロントエンド**
   - [ ] ExpirationAlert.tsx 作成
   - [ ] DateNavigator.tsx 作成
   - [ ] UnscheduledDatesNotice.tsx 修正
   - [ ] useDiscardItem フック作成
   - [ ] ItemManagement.tsx 統合
4. **テスト・デプロイ**

---

## 9. 影響範囲

### 9.1 削除対象

- ステータスフィルタタブ（全て/未提供/提供済み/消費済み）
- TodaySummaryCard（Phase 38.1で追加したが不要に）

### 9.2 既存機能への影響

- 品物カードの表示は維持
- 削除ボタンの動作は維持
- 未設定日モーダルは維持（拡張）

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-22 | 初版作成（Phase 38.2設計） |
