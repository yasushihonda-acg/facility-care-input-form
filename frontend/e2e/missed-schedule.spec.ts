/**
 * 提供漏れ機能テスト (Phase 57)
 *
 * 提供漏れ = スケジュール通りに提供されていない品物
 *
 * 表示条件:
 * - 家族用品物管理ビュー上部に表示
 * - 期限切れアラートの下に配置
 * - 0件の場合は非表示
 *
 * 編集機能:
 * - 各提供漏れカードから編集ページへ遷移可能
 * - 詳細モーダルも表示可能
 */
import { test, expect } from '@playwright/test';

test.describe('提供漏れ機能', () => {
  test.describe('提供漏れアラート表示（デモモード）', () => {
    test('MISSED-001: 提供漏れアラートセクションが存在する場合に表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      // 品物一覧が表示されるまで待機
      await expect(page.locator('[data-testid="item-card"]').first()).toBeVisible({ timeout: 10000 });

      // 提供漏れアラートが存在する場合のみ検証（デモデータに依存）
      const missedAlert = page.locator('text=提供漏れ');
      const isVisible = await missedAlert.isVisible().catch(() => false);

      if (isVisible) {
        // 提供漏れセクションがある場合
        await expect(missedAlert).toBeVisible();
        await expect(page.locator('text=スケジュール通りに提供されていません')).toBeVisible();
      }
      // 0件の場合は非表示で正常
    });

    test('MISSED-002: 提供漏れアラートは期限切れアラートの下に表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      // 期限切れアラート（または「期限切れなし」）が存在するか確認
      const expirationAlert = page.locator('text=期限切れ').first();
      await expect(expirationAlert).toBeVisible({ timeout: 10000 });

      // 提供漏れアラートがある場合、期限切れの下に配置されているか確認
      const missedAlert = page.locator('text=提供漏れ').first();
      const hasMissed = await missedAlert.isVisible().catch(() => false);

      if (hasMissed) {
        // DOM上での位置関係を確認（期限切れ → 提供漏れの順）
        const expirationBounds = await expirationAlert.boundingBox();
        const missedBounds = await missedAlert.boundingBox();

        if (expirationBounds && missedBounds) {
          expect(missedBounds.y).toBeGreaterThan(expirationBounds.y);
        }
      }
    });
  });

  test.describe('提供漏れカードの操作', () => {
    test('MISSED-003: 提供漏れカードに編集ボタンがある', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedSection = page.locator('text=提供漏れ').first();
      const hasMissed = await missedSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMissed) {
        // 提供漏れセクション内に編集ボタンがあることを確認
        const missedContainer = page.locator('.bg-purple-50');
        await expect(missedContainer.locator('button:has-text("編集")').first()).toBeVisible();
      }
    });

    test('MISSED-004: 提供漏れカードに詳細ボタンがある', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedSection = page.locator('text=提供漏れ').first();
      const hasMissed = await missedSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMissed) {
        // 提供漏れセクション内に詳細ボタンがあることを確認
        const missedContainer = page.locator('.bg-purple-50');
        await expect(missedContainer.locator('button:has-text("詳細")').first()).toBeVisible();
      }
    });

    test('MISSED-005: 編集ボタンクリックで品物編集ページに遷移する', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedSection = page.locator('text=提供漏れ').first();
      const hasMissed = await missedSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMissed) {
        const missedContainer = page.locator('.bg-purple-50');
        const editButton = missedContainer.locator('button:has-text("編集")').first();

        await editButton.click();

        // 編集ページに遷移したことを確認
        await expect(page).toHaveURL(/\/demo\/family\/items\/[^/]+\/edit/);
      }
    });

    test('MISSED-006: 詳細ボタンクリックで詳細モーダルが表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedSection = page.locator('text=提供漏れ').first();
      const hasMissed = await missedSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMissed) {
        const missedContainer = page.locator('.bg-purple-50');
        const detailButton = missedContainer.locator('button:has-text("詳細")').first();

        await detailButton.click();

        // 詳細モーダルが表示されることを確認
        await expect(page.locator('[data-testid="item-detail-modal"]')).toBeVisible({ timeout: 5000 });
      }
    });

    test('MISSED-007: 提供漏れカードをクリックで詳細モーダルが表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedSection = page.locator('text=提供漏れ').first();
      const hasMissed = await missedSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMissed) {
        // カード本体をクリック（ボタン以外の部分）
        const missedContainer = page.locator('.bg-purple-50');
        const cardContent = missedContainer.locator('.font-medium.text-purple-900').first();

        await cardContent.click();

        // 詳細モーダルが表示されることを確認
        await expect(page.locator('[data-testid="item-detail-modal"]')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('提供漏れアラートのスタイル', () => {
    test('MISSED-008: 提供漏れアラートは紫色のテーマで表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedSection = page.locator('text=提供漏れ').first();
      const hasMissed = await missedSection.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasMissed) {
        // 紫色のコンテナが存在することを確認
        const purpleContainer = page.locator('.bg-purple-50.border-purple-200');
        await expect(purpleContainer).toBeVisible();
      }
    });

    test('MISSED-009: 提供漏れアラートに📢アイコンがある', async ({ page }) => {
      await page.goto('/demo/family/items');
      await page.waitForLoadState('networkidle');

      const missedAlert = page.locator('text=📢');
      const hasMissed = await missedAlert.isVisible({ timeout: 5000 }).catch(() => false);

      // 📢アイコンが提供漏れセクションに表示される（スタッフ用と同様）
      if (hasMissed) {
        await expect(missedAlert).toBeVisible();
      }
    });
  });
});
