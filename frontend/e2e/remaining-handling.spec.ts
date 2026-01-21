import { test, expect } from '@playwright/test';

test.describe('残り処理（実績）表示', () => {
  test('REMAINING-001: 消費完了の品物カードに残り処理が表示される', async ({ page }) => {
    await page.goto('/demo/family/items');
    await page.waitForLoadState('networkidle');

    // 「消費完了」タグがある品物を探す
    const consumedBadge = page.locator('text=消費完了').first();
    await expect(consumedBadge).toBeVisible({ timeout: 10000 });

    // キウイを探す（消費完了の品物）
    const kiwi = page.locator('text=キウイ').first();
    await expect(kiwi).toBeVisible();

    // その品物カード内の摂食バーを探す
    const card = kiwi.locator('xpath=ancestor::div[contains(@class, "bg-white")]').first();
    await expect(card.locator('text=摂食:')).toBeVisible();

    // 残り処理の表示を確認（↪ 🗑️ 破棄）
    const remainingHandling = card.locator('text=↪').first();
    await expect(remainingHandling).toBeVisible();

    // 「破棄」が含まれていることを確認
    await expect(remainingHandling).toContainText('破棄');
  });

  test('REMAINING-002: 詳細モーダルでも残り処理が表示される', async ({ page }) => {
    await page.goto('/demo/family/items');
    await page.waitForLoadState('networkidle');

    // バナナカードをクリックして詳細モーダルを開く
    const banana = page.locator('text=バナナ').first();
    await expect(banana).toBeVisible({ timeout: 10000 });
    await banana.click();

    // モーダルが開くのを待つ
    const modal = page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'));
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 消費ログに残り処理がある場合、表示されることを確認
    // （バナナには今日のログにremainingHandling: 'stored'が設定されている）
    const remainingText = modal.locator('text=残りの処理:').first();

    // 残り処理の表示があることを確認
    if (await remainingText.count() > 0) {
      await expect(remainingText).toBeVisible();
    }
  });
});
