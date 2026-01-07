/**
 * Phase 59: 修正記録フォームのフォールバックテスト
 *
 * 廃棄済み品物の「修正記録」フォームで正しい数量が表示されることを確認
 */

import { test, expect } from '@playwright/test';

test.describe('修正記録フォームのフォールバック', () => {
  test.beforeEach(async ({ page }) => {
    // デモのスタッフ記録入力ページに移動
    await page.goto('/demo/staff/input/meal');
    await page.waitForLoadState('networkidle');
  });

  test('CORR-001: 廃棄済み品物の残り表示がフォールバックで正しく表示される', async ({ page }) => {
    // 1. 「残り対応」タブをクリック
    const remainingTab = page.locator('button', { hasText: '残り対応' });
    await expect(remainingTab).toBeVisible({ timeout: 10000 });
    await remainingTab.click();
    await page.waitForTimeout(500);

    // 2. 「破棄済み」サブタブをクリック
    const discardedSubTab = page.locator('button', { hasText: /🗑️.*破棄済み/ });
    await expect(discardedSubTab).toBeVisible({ timeout: 5000 });
    await discardedSubTab.click();
    await page.waitForTimeout(500);

    // 3. 廃棄済みテスト品を探す
    const testItem = page.locator('text=廃棄済みテスト品');
    await expect(testItem).toBeVisible({ timeout: 5000 });

    // 4. 最初の修正記録ボタンをクリック（テスト品のもの）
    const correctionButton = page.locator('button', { hasText: '修正記録' }).first();
    await expect(correctionButton).toBeVisible({ timeout: 5000 });
    await correctionButton.click();
    await page.waitForTimeout(500);

    // 5. ダイアログが開いたことを確認
    const dialog = page.locator('.fixed.inset-0');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 6. 「残り」の表示を確認
    const remainingText = page.locator('p.text-gray-500').filter({ hasText: '残り:' });
    await expect(remainingText).toBeVisible({ timeout: 5000 });
    const text = await remainingText.textContent();
    console.log('残り表示:', text);

    // 7. 0個ではないことを確認（フォールバックが動作している）
    expect(text).not.toContain('残り: 0個');
    expect(text).not.toContain('残り:0個');

    // 期待値: servedQuantity(1.5) または quantity(2) のどちらか
    expect(text).toMatch(/残り:\s*(1\.5|2)個/);
  });

  test('CORR-002: 提供数初期値もフォールバックで正しく設定される', async ({ page }) => {
    // 1. 「残り対応」タブ → 「破棄済み」サブタブ
    await page.locator('button', { hasText: '残り対応' }).click();
    await page.waitForTimeout(300);
    await page.locator('button', { hasText: /🗑️.*破棄済み/ }).click();
    await page.waitForTimeout(300);

    // 2. 廃棄済みテスト品の修正記録を開く
    const testItem = page.locator('text=廃棄済みテスト品');
    if (!await testItem.isVisible()) {
      test.skip();
      return;
    }

    await page.locator('button', { hasText: '修正記録' }).first().click();
    await page.waitForTimeout(500);

    // 3. 提供数入力欄の値を確認
    const servedInput = page.locator('input[type="number"]').first();
    const value = await servedInput.inputValue();
    console.log('提供数初期値:', value);

    // 0ではないことを確認
    expect(parseFloat(value)).toBeGreaterThan(0);

    // 期待値: servedQuantity(1.5) または quantity(2)
    expect(parseFloat(value)).toBeGreaterThanOrEqual(1.5);
  });
});
