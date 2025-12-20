# スタッフデモ環境完結設計書

> **Phase**: 20（デモ環境品質改善）
> **作成日**: 2025-12-20
> **ステータス**: 実装中

---

## 1. 概要

### 1.1 背景

スタッフ用デモページ (`/demo/staff`) からの操作中に、本番環境 (`/staff/*`, `/view` 等) へ遷移してしまう問題が発生している。デモ体験の一貫性と品質を確保するため、デモ環境内で全ての操作が完結するよう修正する。

### 1.2 目的

- デモ環境 (`/demo/*`) 内での全ナビゲーションが `/demo/*` 内に留まること
- 本番環境への意図しない離脱を防止
- E2Eテストで離脱ポイントを自動検出・防止

---

## 2. 調査結果

### 2.1 離脱ポイント一覧

| ファイル | 行 | 問題のコード | 影響 |
|----------|-----|--------------|------|
| `MealInputPage.tsx` | 31 | `to="/view"` ハードコード | 戻るボタンが本番に離脱 |
| `ItemTimeline.tsx` | 63 | `to="/view"` ハードコード | エラー時の戻りリンクが本番に離脱 |
| `ItemTimeline.tsx` | 222 | `to="/staff/family-messages/${item.id}"` ハードコード | アクションボタンが本番に離脱 |
| `App.tsx` | - | `/demo/staff/stats` ルート未定義 | フッターナビの統計タブが404 |

### 2.2 対応済みコンポーネント

以下のコンポーネントは既にデモモード対応済み：

| ファイル | 対応方法 |
|----------|----------|
| `FamilyMessages.tsx` | `useDemoMode()` + `pathPrefix` |
| `FamilyMessageDetail.tsx` | `useDemoMode()` + `pathPrefix` |
| `FooterNav.tsx` | `isDemoMode` + `paths`オブジェクト |
| `ChatListPage.tsx` | `location.pathname.startsWith('/demo')` |
| `StatsDashboard.tsx` | `location.pathname.startsWith('/demo')` |
| `Layout.tsx` | `navigate(-1)` (ブラウザ履歴) |
| `ItemBasedSnackRecord.tsx` | リンクなし（モーダルのみ） |
| `StaffRecordDialog.tsx` | リンクなし（モーダルのみ） |

---

## 3. 修正計画

### 3.1 MealInputPage.tsx

**問題**: 戻るボタンのリンク先がハードコード

```tsx
// Before (line 31)
<Link to="/view" ...>

// After
const isDemo = useDemoMode();
const backPath = isDemo ? '/demo/view' : '/view';
<Link to={backPath} ...>
```

### 3.2 ItemTimeline.tsx

**問題1**: エラー時の戻りリンクがハードコード (line 63)

```tsx
// Before
<Link to="/view" ...>

// After
const isDemo = location.pathname.startsWith('/demo');
const viewPath = isDemo ? '/demo/view' : '/view';
<Link to={viewPath} ...>
```

**問題2**: アクションボタンのリンクがハードコード (line 222)

```tsx
// Before
<Link to={`/staff/family-messages/${item.id}`} ...>

// After
const pathPrefix = isDemo ? '/demo' : '';
<Link to={`${pathPrefix}/staff/family-messages/${item.id}`} ...>
```

### 3.3 App.tsx

**問題**: `/demo/staff/stats` ルートが未定義

```tsx
// 追加するルート
<Route path="/demo/staff/stats" element={<Navigate to="/demo/stats" replace />} />
```

---

## 4. E2Eテスト設計

### 4.1 テストファイル

`frontend/tests/demo-staff-containment.spec.ts`

### 4.2 テストケース

| ID | テスト名 | 内容 |
|----|----------|------|
| DSC-001 | デモ記録入力から戻る | `/demo/staff/input/meal` の戻るボタンが `/demo/*` 内に留まる |
| DSC-002 | デモ統計タブ遷移 | フッターナビの統計タブが `/demo/stats` に遷移 |
| DSC-003 | デモタイムラインからの戻り | `/demo/items/:id/timeline` のリンクが `/demo/*` 内に留まる |
| DSC-004 | デモタイムラインのアクション | アクションボタンが `/demo/staff/*` に遷移 |
| DSC-005 | 全デモページでURL検証 | 任意のリンククリック後もURLが `/demo/` で始まる |

### 4.3 実装方針

```typescript
// URL検証ヘルパー
function assertDemoUrl(page: Page) {
  const url = page.url();
  expect(url).toContain('/demo');
}

// 各ナビゲーション後にURL検証
test('DSC-001: デモ記録入力から戻る', async ({ page }) => {
  await page.goto('/demo/staff/input/meal');
  await page.click('[aria-label="記録閲覧に戻る"]');
  assertDemoUrl(page);
  expect(page.url()).toContain('/demo/view');
});
```

---

## 5. 実装手順

### Phase 20.1: E2Eテスト追加（TDD）

1. `demo-staff-containment.spec.ts` を作成
2. テストケース DSC-001 〜 DSC-005 を実装
3. テスト実行 → 全て失敗することを確認（Red）

### Phase 20.2: 修正実装

1. `App.tsx` に `/demo/staff/stats` ルート追加
2. `MealInputPage.tsx` にデモモード対応追加
3. `ItemTimeline.tsx` にデモモード対応追加

### Phase 20.3: 検証

1. ローカルでE2Eテスト実行 → 全てパス（Green）
2. 本番デプロイ（git push）
3. 本番E2Eテスト実行 → 全てパス
4. 手動確認

---

## 6. 設計原則

### 6.1 デモモード判定の統一

デモモードの判定は以下のいずれかを使用：

```tsx
// フック使用（推奨）
import { useDemoMode } from '../../hooks/useDemoMode';
const isDemo = useDemoMode();

// 直接判定（ルーターコンテキスト外）
const isDemo = location.pathname.startsWith('/demo');
```

### 6.2 パスプレフィックスパターン

```tsx
const isDemo = useDemoMode();
const pathPrefix = isDemo ? '/demo' : '';

// 使用例
<Link to={`${pathPrefix}/staff/input/meal`}>
```

### 6.3 レビューチェックリスト

新規コンポーネント追加時のチェック項目：

- [ ] `<Link>` の `to` 属性がハードコードされていないか
- [ ] デモモードで呼ばれる可能性があるか
- [ ] ある場合、`useDemoMode()` で判定しているか
- [ ] フッターナビの遷移先がデモ対応しているか

---

## 7. 関連ドキュメント

- [DEMO_SHOWCASE_SPEC.md](./DEMO_SHOWCASE_SPEC.md) - デモ全体設計
- [DEMO_FAMILY_REDESIGN.md](./DEMO_FAMILY_REDESIGN.md) - 家族デモ設計
- [VIEW_ARCHITECTURE_SPEC.md](./VIEW_ARCHITECTURE_SPEC.md) - View構成
- [FOOTER_NAVIGATION_SPEC.md](./FOOTER_NAVIGATION_SPEC.md) - フッターナビ設計
