---
status: archived
scope: feature
owner: core-team
last_reviewed: 2025-12-20
---

# デモモードナビゲーション修正計画

> **作成日**: 2025年12月17日
> **状態**: 完了

---

## 1. 問題の概要

デモモード（`/demo/*`）で操作すると、本番ページ（`/family/*`, `/staff/*`, `/view`, `/stats`）に遷移してしまう問題を修正。

### 1.1 E2Eテスト結果（修正前）

| テストID | 期待動作 | 実際の動作 | 結果 |
|----------|----------|------------|------|
| DEMO-NAV-001 | フッターが `/demo/*` を指す | フッターが表示されない | ❌ |
| DEMO-NAV-002 | 品物管理→`/demo/family/items` | フッターなし | ❌ |
| DEMO-NAV-005 | 新規登録→`/demo/family/items/new` | `/family/items/new` | ❌ |

### 1.2 根本原因

1. **FooterNav.tsx**: デモパス（`/demo/family`）を家族パスとして認識しない
2. **FooterNav.tsx**: リンク先がハードコードされている（`/family`, `/view`, `/stats`）
3. **各ページコンポーネント**: 内部リンクがデモモードを考慮していない

---

## 2. 修正内容

### 2.1 FooterNav.tsx の修正（既存）

デモモード対応は実装済みだった:
- `isDemoMode` でパス判定
- `paths` オブジェクトで動的にリンク先を生成

### 2.2 ItemDetail.tsx の修正

- 削除後のリダイレクト先をデモモード対応
- タイムラインへのリンクをデモモード対応

### 2.3 FamilyDashboard.tsx の修正

- `useDemoMode` フックを追加
- `/family/tasks` → `${pathPrefix}/family/tasks`
- `/family/settings/resident` → `${pathPrefix}/family/settings/resident`
- `/family/request` → `${pathPrefix}/family/request`

### 2.4 playwright.config.ts の修正

- `baseURL` をローカルテスト可能に変更
- 環境変数 `BASE_URL` で上書き可能

---

## 3. 実装順序

1. ✅ E2Eテスト作成（問題検出用）
2. ✅ FooterNav.tsx 修正（既存）
3. ✅ App.tsx に /demo/view ルート追加（既存）
4. ✅ ItemManagement.tsx 修正（既存）
5. ✅ ItemDetail.tsx 修正
6. ✅ FamilyDashboard.tsx 修正
7. ✅ playwright.config.ts 修正
8. ✅ E2Eテスト再実行・検証

---

## 4. 検証結果

**全35件のE2Eテストがパス**

- ✅ `/demo/family` のフッターが家族用で表示される
- ✅ フッターからのナビゲーションがすべて `/demo/*` 内
- ✅ 新規登録リンクが `/demo/family/items/new` を指す
- ✅ `/demo/stats` から戻ってもデモ内に留まる

---

## 5. 修正ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/pages/family/ItemDetail.tsx` | デモモード対応リンク |
| `frontend/src/pages/family/FamilyDashboard.tsx` | デモモード対応リンク |
| `frontend/playwright.config.ts` | ローカルテスト対応 |

---

## 6. 追加修正（2025-12-17）

### 6.1 問題の報告

`/demo/staff/family-messages` で品物をクリックすると、本番ページ `/staff/family-messages/{id}` に遷移してしまう。

### 6.2 原因

`FamilyMessages.tsx` の `FamilyMessageCard` コンポーネントでリンク先がハードコードされている:

```tsx
<Link to={`/staff/family-messages/${item.id}`}
```

### 6.3 修正内容

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/pages/staff/FamilyMessages.tsx` | `FamilyMessageCard` のリンク先をデモモード対応 |
| `frontend/src/pages/staff/FamilyMessageDetail.tsx` | 「一覧に戻る」リンク、タイムラインリンクをデモモード対応 |

### 6.4 修正パターン

```tsx
// 修正前
<Link to={`/staff/family-messages/${item.id}`}

// 修正後
const { pathPrefix } = useDemoMode();
<Link to={`${pathPrefix}/staff/family-messages/${item.id}`}
```

### 6.5 修正箇所詳細

**FamilyMessages.tsx**:
- `FamilyMessageCard` コンポーネント内のリンク

**FamilyMessageDetail.tsx**:
- エラー時の「一覧に戻る」リンク
- 品物タイムラインへのリンク

### 6.6 検証結果

✅ E2Eテスト パス（デモナビゲーション関連テスト追加）
