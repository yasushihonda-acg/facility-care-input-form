/**
 * Phase 39: ロール別ベースカラー整合性テスト
 *
 * 4パターンのフッター・ベースカラーを検証:
 * 1. スタッフ（本番）: /staff/* → Green
 * 2. 家族（本番）: /family/* → Orange
 * 3. 家族デモ: /demo/family/* → Orange
 * 4. スタッフデモ: /demo/staff/* → Green
 *
 * Note: 管理者モード（?admin=true → Blue）はPhase 39.1で廃止
 *       /settings は独立ページとして実装
 */

import { test, expect, Page } from '@playwright/test';

// 期待されるカラー値（HEX形式とRGB形式両方）
const EXPECTED_COLORS = {
  staff: {
    primaryHex: '#22C55E',
    primaryRgb: 'rgb(34, 197, 94)',
    primaryLight: '#4ADE80',
    primaryDark: '#16A34A',
  },
  family: {
    primaryHex: '#F97316',
    primaryRgb: 'rgb(249, 115, 22)',
    primaryLight: '#FB923C',
    primaryDark: '#EA580C',
  },
  admin: {
    primaryHex: '#2563EB',
    primaryRgb: 'rgb(37, 99, 235)',
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
  },
};

/**
 * CSS変数の値を取得するヘルパー
 */
async function getCssVariable(page: Page, varName: string): Promise<string> {
  return await page.evaluate((name) => {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }, varName);
}

/**
 * data-role属性を取得するヘルパー
 */
async function getDataRole(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return document.documentElement.getAttribute('data-role') || '';
  });
}

test.describe('Phase 39: ロール別ベースカラー整合性', () => {

  test.describe('1. スタッフ（本番）: /staff/*', () => {
    test('ROLE-001: /staff/input/meal でスタッフカラー（Green）が適用される', async ({ page }) => {
      await page.goto('/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // data-role属性の確認
      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('staff');

      // CSS変数の確認（hex形式で保存されている）
      const primaryColor = await getCssVariable(page, '--color-primary');
      expect(primaryColor.toUpperCase()).toBe(EXPECTED_COLORS.staff.primaryHex);
    });

    test('ROLE-002: /staff/input/meal でスタッフ用フッターが表示される', async ({ page }) => {
      await page.goto('/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // スタッフ用フッターの確認
      const staffFooter = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(staffFooter).toBeVisible();

      // 家族用フッターがないこと
      const familyFooter = page.locator('nav[aria-label="家族用ナビゲーション"]');
      await expect(familyFooter).not.toBeVisible();
    });

    test('ROLE-003: /staff/input/meal のアクティブタブがGreenである', async ({ page }) => {
      await page.goto('/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // 記録入力タブがアクティブ
      const inputTab = page.locator('nav a[href*="input/meal"]');
      await expect(inputTab).toBeVisible();

      const bgColor = await inputTab.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe(EXPECTED_COLORS.staff.primaryRgb);
    });
  });

  test.describe('2. 家族（本番）: /family/*', () => {
    test('ROLE-010: /family で家族カラー（Orange）が適用される', async ({ page }) => {
      await page.goto('/family');
      await page.waitForLoadState('networkidle');

      // data-role属性の確認
      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('family');
    });

    test('ROLE-011: /family で家族用フッターが表示される', async ({ page }) => {
      await page.goto('/family');
      await page.waitForLoadState('networkidle');

      // 家族用フッターの確認
      const familyFooter = page.locator('nav[aria-label="家族用ナビゲーション"]');
      await expect(familyFooter).toBeVisible();

      // スタッフ用フッターがないこと
      const staffFooter = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(staffFooter).not.toBeVisible();
    });

    test('ROLE-012: /family のアクティブタブがOrangeである', async ({ page }) => {
      await page.goto('/family');
      await page.waitForLoadState('networkidle');

      // ホームタブがアクティブ
      const homeTab = page.locator('nav a[href="/family"]');
      await expect(homeTab).toBeVisible();

      const bgColor = await homeTab.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe(EXPECTED_COLORS.family.primaryRgb);
    });

    test('ROLE-013: /family/items でも家族カラーが維持される', async ({ page }) => {
      await page.goto('/family/items');
      await page.waitForLoadState('networkidle');

      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('family');

      // 品物管理タブがアクティブでOrange
      const itemsTab = page.locator('nav a[href="/family/items"]');
      const bgColor = await itemsTab.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe(EXPECTED_COLORS.family.primaryRgb);
    });
  });

  // Phase 39.1: 管理者モード（?admin=true）は廃止されました
  // /settings が独立ページとして実装されているため、admin判定テストは削除

  test.describe('3. 家族デモ: /demo/family/*', () => {
    test('ROLE-030: /demo/family で家族カラー（Orange）が適用される', async ({ page }) => {
      await page.goto('/demo/family');
      await page.waitForLoadState('networkidle');

      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('family');
    });

    test('ROLE-031: /demo/family で家族用フッターが表示される', async ({ page }) => {
      await page.goto('/demo/family');
      await page.waitForLoadState('networkidle');

      const familyFooter = page.locator('nav[aria-label="家族用ナビゲーション"]');
      await expect(familyFooter).toBeVisible();
    });

    test('ROLE-032: /demo/family のアクティブタブがOrangeである', async ({ page }) => {
      await page.goto('/demo/family');
      await page.waitForLoadState('networkidle');

      const homeTab = page.locator('nav a[href="/demo/family"]');
      const bgColor = await homeTab.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe(EXPECTED_COLORS.family.primaryRgb);
    });

    test('ROLE-033: /demo/family/items でも家族カラーが維持される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('family');

      const itemsTab = page.locator('nav a[href="/demo/family/items"]');
      const bgColor = await itemsTab.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe(EXPECTED_COLORS.family.primaryRgb);
    });
  });

  test.describe('4. スタッフデモ: /demo/staff/*', () => {
    test('ROLE-040: /demo/staff でスタッフカラー（Green）が適用される', async ({ page }) => {
      await page.goto('/demo/staff');
      await page.waitForLoadState('networkidle');

      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('staff');
    });

    test('ROLE-041: /demo/staff でスタッフ用フッターが表示される', async ({ page }) => {
      await page.goto('/demo/staff');
      await page.waitForLoadState('networkidle');

      const staffFooter = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(staffFooter).toBeVisible();
    });

    test('ROLE-042: /demo/staff/input/meal のアクティブタブがGreenである', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');
      await page.waitForLoadState('networkidle');

      const inputTab = page.locator('nav a[href="/demo/staff/input/meal"]');
      const bgColor = await inputTab.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).toBe(EXPECTED_COLORS.staff.primaryRgb);
    });
  });

  test.describe('6. 共有ページでのロール維持', () => {
    test('ROLE-050: /family → /view で家族カラーが維持される', async ({ page }) => {
      // まず家族ページにアクセス
      await page.goto('/family');
      await page.waitForLoadState('networkidle');

      // 記録閲覧に遷移
      await page.goto('/view');
      await page.waitForLoadState('networkidle');

      // 家族カラーが維持される
      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('family');

      // 家族用フッターが表示される
      const familyFooter = page.locator('nav[aria-label="家族用ナビゲーション"]');
      await expect(familyFooter).toBeVisible();
    });

    test('ROLE-051: /staff/input/meal → /view でスタッフカラーが維持される', async ({ page }) => {
      // まずスタッフページにアクセス
      await page.goto('/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // 記録閲覧に遷移
      await page.goto('/view');
      await page.waitForLoadState('networkidle');

      // スタッフカラーが維持される
      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('staff');

      // スタッフ用フッターが表示される
      const staffFooter = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(staffFooter).toBeVisible();
    });

    test('ROLE-052: /demo/family → /demo/view で家族カラーが維持される', async ({ page }) => {
      await page.goto('/demo/family');
      await page.waitForLoadState('networkidle');

      await page.goto('/demo/view');
      await page.waitForLoadState('networkidle');

      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('family');

      const familyFooter = page.locator('nav[aria-label="家族用ナビゲーション"]');
      await expect(familyFooter).toBeVisible();
    });

    test('ROLE-053: /demo/staff → /demo/view でスタッフカラーが維持される', async ({ page }) => {
      await page.goto('/demo/staff');
      await page.waitForLoadState('networkidle');

      await page.goto('/demo/view');
      await page.waitForLoadState('networkidle');

      const dataRole = await getDataRole(page);
      expect(dataRole).toBe('staff');

      const staffFooter = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(staffFooter).toBeVisible();
    });
  });
});
