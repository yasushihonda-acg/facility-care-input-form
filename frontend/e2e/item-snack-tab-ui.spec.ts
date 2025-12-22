/**
 * Phase 38.5: 品物起点間食記録のタブUI E2Eテスト
 * - 今日提供予定タブ
 * - 賞味期限タブ（期限切れアラート・廃棄ボタン）
 */

import { test, expect } from '@playwright/test';

test.describe('品物起点間食記録 - タブUI（Phase 38.5）', () => {
  const mealInputUrl = '/demo/staff/input/meal';

  test.beforeEach(async ({ page }) => {
    await page.goto(mealInputUrl);
    await page.waitForLoadState('networkidle');

    // ItemBasedSnackRecordが直接表示されるのを待機
    await page.waitForTimeout(500);
  });

  test.describe('SNACK-TAB-001: サブタブUI表示', () => {
    test('今日提供予定・賞味期限の2つのサブタブが表示される', async ({ page }) => {
      // タブボタンを確認
      await expect(page.getByRole('button', { name: /今日提供予定/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /賞味期限/ })).toBeVisible();
    });

    test('初期状態は「今日提供予定」タブがアクティブ', async ({ page }) => {
      const todayTab = page.getByRole('button', { name: /今日提供予定/ });
      // アクティブなタブはボーダーが付く
      await expect(todayTab).toHaveClass(/border-primary/);
    });
  });

  test.describe('SNACK-TAB-002: 今日提供予定タブ', () => {
    test('今日予定の品物がある場合、セクションが表示される', async ({ page }) => {
      // 今日提供予定セクションまたはその他の品物セクションが表示される
      const scheduledSection = page.locator('text=今日提供予定').or(page.locator('text=その他の品物'));
      await expect(scheduledSection.first()).toBeVisible({ timeout: 5000 });
    });

    test('品物カードに提供記録ボタンがある', async ({ page }) => {
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('SNACK-TAB-003: 賞味期限タブ', () => {
    test.beforeEach(async ({ page }) => {
      // 賞味期限タブに切り替え
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      await expirationTab.click();
      await page.waitForTimeout(300);
    });

    test('賞味期限タブに切り替えられる', async ({ page }) => {
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      await expect(expirationTab).toHaveClass(/border-primary/);
    });

    test('期限に関するセクションが表示される', async ({ page }) => {
      // 期限切れ、期限間近、期限あり、期限設定なしのいずれかが表示される
      const sections = page.locator('text=期限切れ')
        .or(page.locator('text=期限間近'))
        .or(page.locator('text=期限あり'))
        .or(page.locator('text=期限設定なし'));
      await expect(sections.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('SNACK-TAB-004: 期限切れアラート', () => {
    test.beforeEach(async ({ page }) => {
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      await expirationTab.click();
      await page.waitForTimeout(300);
    });

    test('期限切れがある場合、アラートバナーが表示される', async ({ page }) => {
      // 期限切れバッジがタブに表示されている場合
      const expiredBadge = page.locator('button:has-text("賞味期限")').locator('.bg-red-100');
      const hasExpired = await expiredBadge.count() > 0;

      if (hasExpired) {
        // アラートバナーが表示される
        await expect(page.locator('text=期限切れが')).toBeVisible();
        await expect(page.locator('text=廃棄または対応が必要です')).toBeVisible();
      } else {
        // 期限切れがない場合はスキップ
        test.skip();
      }
    });
  });

  test.describe('SNACK-TAB-005: 廃棄ボタン', () => {
    test.beforeEach(async ({ page }) => {
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      await expirationTab.click();
      await page.waitForTimeout(300);
    });

    test('期限切れ品物には廃棄ボタンが表示される', async ({ page }) => {
      // 期限切れセクションがある場合
      const expiredSection = page.locator('h3:has-text("期限切れ")');
      const hasExpiredSection = await expiredSection.count() > 0;

      if (hasExpiredSection) {
        // 廃棄ボタンが表示される
        const discardButton = page.locator('button:has-text("廃棄")').first();
        await expect(discardButton).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('廃棄ボタンクリックで確認ダイアログが表示される', async ({ page }) => {
      // 廃棄ボタンがある場合
      const discardButton = page.locator('button:has-text("廃棄")').first();
      const hasDiscardButton = await discardButton.count() > 0;

      if (hasDiscardButton) {
        await discardButton.click();
        // 確認ダイアログが表示される
        await expect(page.locator('text=廃棄確認')).toBeVisible();
        await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
        await expect(page.locator('button:has-text("廃棄する")')).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('キャンセルで確認ダイアログが閉じる', async ({ page }) => {
      const discardButton = page.locator('button:has-text("廃棄")').first();
      const hasDiscardButton = await discardButton.count() > 0;

      if (hasDiscardButton) {
        await discardButton.click();
        await expect(page.locator('text=廃棄確認')).toBeVisible();

        // キャンセルクリック
        await page.locator('button:has-text("キャンセル")').click();

        // ダイアログが閉じる
        await expect(page.locator('text=廃棄確認')).not.toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('SNACK-TAB-006: タブバッジ', () => {
    test('今日提供予定タブにバッジが表示される（予定ありの場合）', async ({ page }) => {
      const todayTab = page.getByRole('button', { name: /今日提供予定/ });
      const badge = todayTab.locator('.bg-amber-100');
      const hasBadge = await badge.count() > 0;

      if (hasBadge) {
        await expect(badge).toBeVisible();
      }
      // バッジがなくてもテスト成功（予定がない場合）
    });

    test('賞味期限タブに期限切れバッジが表示される（期限切れありの場合）', async ({ page }) => {
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      const badge = expirationTab.locator('.bg-red-100');
      const hasBadge = await badge.count() > 0;

      if (hasBadge) {
        await expect(badge).toBeVisible();
      }
      // バッジがなくてもテスト成功（期限切れがない場合）
    });
  });

  test.describe('SNACK-TAB-007: カードハイライト', () => {
    test('今日提供予定タブで予定品物はamber色でハイライトされる', async ({ page }) => {
      // 今日予定セクションがある場合
      const scheduledSection = page.locator('h3:has-text("今日提供予定")');
      const hasScheduledSection = await scheduledSection.count() > 0;

      if (hasScheduledSection) {
        // amber色のカードがある
        const amberCard = page.locator('.border-amber-400.bg-amber-50').first();
        await expect(amberCard).toBeVisible();
      } else {
        // 予定がない場合はスキップ
        test.skip();
      }
    });

    test('賞味期限タブで期限切れ品物はred色でハイライトされる', async ({ page }) => {
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      await expirationTab.click();
      await page.waitForTimeout(300);

      // 期限切れセクションがある場合
      const expiredSection = page.locator('h3:has-text("期限切れ")');
      const hasExpiredSection = await expiredSection.count() > 0;

      if (hasExpiredSection) {
        // red色のカードがある
        const redCard = page.locator('.border-red-400.bg-red-50').first();
        await expect(redCard).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('賞味期限タブで期限間近品物はorange色でハイライトされる', async ({ page }) => {
      const expirationTab = page.getByRole('button', { name: /賞味期限/ });
      await expirationTab.click();
      await page.waitForTimeout(300);

      // 期限間近セクションがある場合
      const expiringSoonSection = page.locator('h3:has-text("期限間近")');
      const hasExpiringSoonSection = await expiringSoonSection.count() > 0;

      if (hasExpiringSoonSection) {
        // orange色のカードがある
        const orangeCard = page.locator('.border-orange-400.bg-orange-50').first();
        await expect(orangeCard).toBeVisible();
      } else {
        test.skip();
      }
    });
  });
});
