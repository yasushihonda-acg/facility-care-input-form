/**
 * 未設定項目警告表示テスト
 *
 * 提供予定・賞味期限が未設定の場合に警告表示されることを確認
 */

import { test, expect } from '@playwright/test';

async function waitForSpaLoad(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('【未設定警告】品物カード・モーダル', () => {

  test('WARN-001: 未設定の品物カードに警告バッジが表示される', async ({ page }) => {
    await page.goto('/demo/family/items');
    await waitForSpaLoad(page);

    // 杏仁豆腐（テスト用・未設定項目あり）のカードを探す
    const testCard = page.locator('[data-testid="item-card"]', {
      hasText: '杏仁豆腐'
    });

    await expect(testCard).toBeVisible();

    // 提供予定: ⚠️ 未設定 が表示される
    await expect(testCard.getByText('⚠️ 未設定').first()).toBeVisible();
  });

  test('WARN-002: 設定済みの品物カードには通常表示される', async ({ page }) => {
    await page.goto('/demo/family/items');
    await waitForSpaLoad(page);

    // バナナは提供予定・賞味期限が設定されている
    const bananaCard = page.locator('[data-testid="item-card"]', {
      hasText: 'バナナ'
    }).first();

    await expect(bananaCard).toBeVisible();

    // 日付または曜日が表示される（設定済み）
    const hasSchedule = await bananaCard.getByText(/📅|毎日|週|\//).first().isVisible().catch(() => false);
    expect(hasSchedule).toBe(true);
  });

  test('WARN-003: モーダルで未設定項目が強調表示される', async ({ page }) => {
    await page.goto('/demo/family/items');
    await waitForSpaLoad(page);

    // 杏仁豆腐カードをクリック
    const testCard = page.locator('[data-testid="item-card"]', {
      hasText: '杏仁豆腐'
    });
    await testCard.click();
    await waitForSpaLoad(page);

    // モーダルが表示される
    const modal = page.locator('[data-testid="item-detail-modal"]');
    await expect(modal).toBeVisible();

    // 提供予定: ⚠️ 未設定（編集から設定できます）
    await expect(modal.getByText('⚠️ 未設定')).toHaveCount(2); // 提供予定と賞味期限

    // 編集ボタンが表示される
    await expect(modal.getByRole('button', { name: /編集/ })).toBeVisible();
  });

  test('WARN-004: 設定済みの品物モーダルには通常表示される', async ({ page }) => {
    await page.goto('/demo/family/items');
    await waitForSpaLoad(page);

    // カステラは提供予定・賞味期限が設定されている
    const card = page.locator('[data-testid="item-card"]', {
      hasText: 'カステラ'
    });
    await card.click();
    await waitForSpaLoad(page);

    const modal = page.locator('[data-testid="item-detail-modal"]');
    await expect(modal).toBeVisible();

    // 提供予定が表示される（毎日など）
    await expect(modal.getByText(/毎日|週|1\//).first()).toBeVisible();

    // 期限が表示される
    await expect(modal.getByText('期限:').or(modal.getByText('賞味期限'))).toBeVisible();
  });
});
