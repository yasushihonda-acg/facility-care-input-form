/**
 * プリセット管理へのナビゲーションテスト
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 * Phase 37: プリセット管理へのアクセス改善
 */
import { test, expect } from '@playwright/test';

test.describe('プリセット管理ナビゲーション', () => {
  test.describe.configure({ timeout: 30000 });

  test('PRESET-NAV-001: 品物管理ページにいつもの指示リンクが表示される', async ({ page }) => {
    await page.goto('/demo/family/items');

    // いつもの指示ボタンが表示されていること
    const presetLink = page.locator('a[href="/demo/family/presets"]');
    await expect(presetLink).toBeVisible();

    // ⭐アイコンが表示されていること
    await expect(presetLink.locator('text=⭐')).toBeVisible();
  });

  test('PRESET-NAV-002: リンククリックでプリセット管理ページに遷移', async ({ page }) => {
    await page.goto('/demo/family/items');

    // いつもの指示リンクをクリック
    await page.click('a[href="/demo/family/presets"]');

    // プリセット管理ページに遷移すること
    await expect(page).toHaveURL('/demo/family/presets');

    // ページタイトルが表示されること（📋アイコンを含むh1を検索）
    await expect(page.getByRole('heading', { name: /📋.*いつもの指示/ })).toBeVisible();
  });

  test('PRESET-NAV-003: デモモードでプリセット管理ページが正常に動作', async ({ page }) => {
    await page.goto('/demo/family/presets');

    // ページが正常に表示されること（📋アイコンを含むh1を検索）
    await expect(page.getByRole('heading', { name: /📋.*いつもの指示/ })).toBeVisible();

    // 新規作成ボタンが表示されること
    await expect(page.locator('button:has-text("新規作成"), a:has-text("新規作成")')).toBeVisible();
  });

  test('PRESET-NAV-004: 本番モードでもリンクが正しく機能', async ({ page }) => {
    await page.goto('/family/items');

    // いつもの指示リンクが本番パスを指していること
    const presetLink = page.locator('a[href="/family/presets"]');
    await expect(presetLink).toBeVisible();
  });

  test('PRESET-NAV-005: レスポンシブ表示（モバイル幅）', async ({ page }) => {
    // モバイル幅に設定
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/demo/family/items');

    // いつもの指示リンクが表示されていること
    const presetLink = page.locator('a[href="/demo/family/presets"]');
    await expect(presetLink).toBeVisible();

    // アイコンが表示されていること
    await expect(presetLink.locator('text=⭐')).toBeVisible();
  });
});
