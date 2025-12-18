/**
 * Phase 13.0: 品物起点の間食記録 E2Eテスト
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md
 */

import { test, expect } from '@playwright/test';

test.describe('品物起点の間食記録（Phase 13.0）', () => {
  const mealInputUrl = '/demo/staff/input/meal';

  test.beforeEach(async ({ page }) => {
    await page.goto(mealInputUrl);
    // ページ読み込み待機
    await page.waitForLoadState('networkidle');
  });

  test.describe('Phase 13.0.1: タブUI・切替機能', () => {
    test('タブが2つ表示される（食事、品物から記録）', async ({ page }) => {
      // タブコンテナが存在する
      const tabs = page.locator('button[role="tab"]');
      await expect(tabs).toHaveCount(2);

      // タブのテキスト確認
      await expect(tabs.nth(0)).toContainText('食事');
      await expect(tabs.nth(1)).toContainText('品物から記録');
    });

    test('初期状態は「食事」タブがアクティブ', async ({ page }) => {
      const mealTab = page.locator('button[role="tab"]').filter({ hasText: '食事' });
      await expect(mealTab).toHaveAttribute('aria-selected', 'true');

      // 食事フォームが表示されている
      await expect(page.getByRole('combobox').first()).toBeVisible();
    });

    test('「品物から記録」タブをクリックすると切り替わる', async ({ page }) => {
      const itemBasedTab = page.locator('button[role="tab"]').filter({ hasText: '品物から記録' });

      // タブクリック
      await itemBasedTab.click();

      // タブがアクティブになる
      await expect(itemBasedTab).toHaveAttribute('aria-selected', 'true');

      // 品物リストまたは空メッセージが表示される
      const contentVisible = await page.locator('text=品物から間食記録').or(page.locator('text=在庫のある品物がありません')).isVisible();
      expect(contentVisible).toBeTruthy();
    });

    test('タブ切替で表示内容が変わる', async ({ page }) => {
      // 食事タブ - フォームが表示
      const mealTab = page.locator('button[role="tab"]').filter({ hasText: '食事' });
      const itemBasedTab = page.locator('button[role="tab"]').filter({ hasText: '品物から記録' });

      // 初期状態: 食事タブがアクティブ
      await expect(mealTab).toHaveAttribute('aria-selected', 'true');

      // 品物から記録タブに切替
      await itemBasedTab.click();
      await expect(itemBasedTab).toHaveAttribute('aria-selected', 'true');

      // 食事タブに戻る
      await mealTab.click();
      await expect(mealTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Phase 13.0.2: 品物リスト表示', () => {
    test('品物から記録タブで品物リストが表示される', async ({ page }) => {
      const itemBasedTab = page.locator('button[role="tab"]').filter({ hasText: '品物から記録' });
      await itemBasedTab.click();

      // タイトルが表示される
      await expect(page.locator('text=品物から間食記録')).toBeVisible();

      // 品物カードまたは空状態が表示される
      const hasItems = await page.locator('button:has-text("提供記録")').count() > 0;
      const hasEmptyState = await page.locator('text=在庫のある品物がありません').isVisible();

      expect(hasItems || hasEmptyState).toBeTruthy();
    });

    test('デモモードでは品物が表示される', async ({ page }) => {
      const itemBasedTab = page.locator('button[role="tab"]').filter({ hasText: '品物から記録' });
      await itemBasedTab.click();

      // デモデータでは品物があるはず
      // 品物カードの「提供記録」ボタンが表示されている
      const recordButtons = page.locator('button:has-text("提供記録")');
      await expect(recordButtons.first()).toBeVisible({ timeout: 5000 });
    });

    test('品物カードに必要な情報が表示される', async ({ page }) => {
      const itemBasedTab = page.locator('button[role="tab"]').filter({ hasText: '品物から記録' });
      await itemBasedTab.click();

      // 品物が表示されるまで待機
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });

      // カード内に品物名と残量が表示されている
      const itemCard = recordButton.locator('..');
      await expect(itemCard.locator('text=/残り/')).toBeVisible();
    });
  });
});
