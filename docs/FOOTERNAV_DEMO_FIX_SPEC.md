# FooterNav デモモード対応・getActiveChatItems 500エラー修正設計

> **Phase**: 20.1
> **最終更新**: 2025年12月20日
> **ステータス**: 完了
> **コミット**: `29570f7`

---

## 1. 問題の概要

### 1.1 現象

`/demo/staff` にアクセスすると、コンソールに以下の500エラーが発生:

```
GET https://asia-northeast1-facility-care-input-form.cloudfunctions.net/getActiveChatItems?residentId=resident-001&userType=family 500
```

### 1.2 影響範囲

- **影響を受けるページ**: `/demo/staff`, `/demo/family`, `/demo/view` など全デモページ
- **ユーザー影響**: ページは表示されるが、フッターナビの未読バッジが表示されない

---

## 2. 根本原因分析

### 2.1 原因1: FooterNav.tsx がデモモードでもAPIを呼び出している

**ファイル**: `frontend/src/components/FooterNav.tsx` (行 78-115)

```typescript
// 問題のコード: デモモードでもAPIを呼び出している
useEffect(() => {
  const fetchUnreadCounts = async () => {
    try {
      // 家族の未読数 - デモモードでもAPIを呼び出す!
      const familyResponse = await getActiveChatItems({
        residentId: DEMO_RESIDENT_ID,
        userType: 'family',
      });
      // ...
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  fetchUnreadCounts();
  const interval = setInterval(fetchUnreadCounts, 30000);
  return () => clearInterval(interval);
}, []);
```

### 2.2 原因2: NotificationSection.tsx がデモモードでもAPIを呼び出している

**ファイル**: `frontend/src/components/shared/NotificationSection.tsx` (行 38-58)

```typescript
// 問題のコード: デモモード判定はあるがAPIは呼び出している
const loadNotifications = async () => {
  // isDemo判定なしにAPI呼び出し!
  const response = await getNotifications({
    residentId: DEMO_RESIDENT_ID,
    targetType: userType,
    // ...
  });
};
```

### 2.3 原因3: Firestore複合インデックスが存在しない

**ファイル**: `functions/src/functions/chat.ts` (行 478-481)

```typescript
// バックエンドクエリ - 複合インデックスが必要
const query = db
  .collection("care_items")
  .where("residentId", "==", residentId)
  .where("hasMessages", "==", true)  // ← 複合フィルタ
  .orderBy("lastMessageAt", "desc")   // ← ソート順
  .limit(queryLimit);
```

**必要なインデックス**: `care_items` コレクションに対する複合インデックス
- `residentId` (Ascending)
- `hasMessages` (Ascending)
- `lastMessageAt` (Descending)

**現状**: `firestore.indexes.json` には該当するインデックスが存在しない

---

## 3. 修正設計

### 3.1 フロントエンド修正: FooterNav.tsx

デモモードではAPIを呼び出さず、ダミーデータを使用する。

```typescript
// 修正後のuseEffect
useEffect(() => {
  // デモモードではAPIを呼び出さない
  if (isDemoMode) {
    // デモ用のダミー未読数を設定
    setFamilyUnreadCount(2);  // 家族: 2件の未読
    setStaffUnreadCount(1);   // スタッフ: 1件の未読
    return;
  }

  const fetchUnreadCounts = async () => {
    try {
      const familyResponse = await getActiveChatItems({
        residentId: DEMO_RESIDENT_ID,
        userType: 'family',
      });
      // ... 既存のAPI呼び出しロジック
    } catch (error) {
      console.error('Failed to fetch unread counts:', error);
    }
  };

  fetchUnreadCounts();
  const interval = setInterval(fetchUnreadCounts, 30000);
  return () => clearInterval(interval);
}, [isDemoMode]);  // 依存配列にisDemoModeを追加
```

### 3.2 バックエンド修正: Firestoreインデックス追加

`firestore.indexes.json` に以下のインデックスを追加:

```json
{
  "collectionGroup": "care_items",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "residentId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "hasMessages",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "lastMessageAt",
      "order": "DESCENDING"
    }
  ]
}
```

---

## 4. 実装計画

### 4.1 ステップ一覧

| ステップ | 内容 | 担当ファイル |
|----------|------|--------------|
| 4.1.1 | E2Eテスト作成（TDD: Red） | `e2e/footer-nav-demo.spec.ts` |
| 4.1.2 | FooterNav.tsx デモモード対応 | `src/components/FooterNav.tsx` |
| 4.1.3 | Firestore インデックス追加 | `firestore.indexes.json` |
| 4.1.4 | ローカルテスト実行（Green） | - |
| 4.1.5 | コミット・Push（自動デプロイ） | - |
| 4.1.6 | 本番E2Eテスト実行・動作確認 | - |
| 4.1.7 | ドキュメント更新 | `docs/CURRENT_STATUS.md` |

### 4.2 テスト計画

#### E2Eテストケース

| ID | テスト内容 | 期待結果 |
|----|-----------|----------|
| FND-001 | デモスタッフページでコンソールエラーがないこと | 500エラーなし |
| FND-002 | デモ家族ページでコンソールエラーがないこと | 500エラーなし |
| FND-003 | デモモードでフッターが正常表示されること | フッターナビ表示 |
| FND-004 | 本番モードでAPIが呼び出されること | API呼び出し成功 |

---

## 5. リスクと対策

### 5.1 リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| インデックス作成に時間がかかる | 中 | 先にフロントエンド修正をデプロイし、デモモードでの500エラーを解消 |
| 本番環境でのインデックス未作成 | 高 | インデックスはデプロイ時に自動作成される |

### 5.2 ロールバック計画

問題が発生した場合:
1. `git revert` でコミットを取り消し
2. `git push` で自動デプロイ

---

## 6. 関連ドキュメント

- [DEMO_STAFF_CONTAINMENT.md](./DEMO_STAFF_CONTAINMENT.md) - Phase 20 デモ環境完結設計
- [FOOTER_NAVIGATION_SPEC.md](./FOOTER_NAVIGATION_SPEC.md) - フッターナビゲーション仕様
- [CHAT_INTEGRATION_SPEC.md](./CHAT_INTEGRATION_SPEC.md) - チャット連携仕様

---

## 7. 変更履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-20 | 初版作成 |
