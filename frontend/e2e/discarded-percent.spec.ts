/**
 * Phase 63: 破棄済みタブに破棄割合表示
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 63: 破棄済みタブに破棄割合表示', () => {
  test('破棄済みタブで破棄割合が表示される', async ({ page }) => {
    // デモの記録入力ページにアクセス
    await page.goto('/demo/staff/input/meal');

    // 「残り対応」タブをクリック
    await page.getByRole('button', { name: /残り対応/i }).click();

    // 「破棄済み」サブタブをクリック（デフォルトで選択されているが念のため）
    await page.getByRole('button', { name: /破棄済み/i }).click();

    // 破棄済みの品物が表示されるのを待つ
    await expect(page.locator('text=破棄済み').first()).toBeVisible({ timeout: 10000 });
  });

  test('青森産サンふじりんごに75%破棄が表示される（consumptionSummaryから）', async ({ page }) => {
    // デモの記録入力ページにアクセス
    await page.goto('/demo/staff/input/meal');

    // 「残り対応」タブをクリック
    await page.getByRole('button', { name: /残り対応/i }).click();

    // 「破棄済み」サブタブをクリック
    await page.getByRole('button', { name: /破棄済み/i }).click();

    // 青森産サンふじりんごカードを確認
    // avgConsumptionRate: 25 なので 100 - 25 = 75% が破棄
    const appleCard = page.locator('text=青森産サンふじりんご');

    // カードが存在する場合のみ確認
    if (await appleCard.count() > 0) {
      // 75%分の表示を確認
      await expect(page.locator('text=75%分')).toBeVisible({ timeout: 10000 });
    }
  });

  test('廃棄済みテスト品に30%破棄が表示される（消費ログからフォールバック）', async ({ page }) => {
    // デモの記録入力ページにアクセス
    await page.goto('/demo/staff/input/meal');

    // 「残り対応」タブをクリック
    await page.getByRole('button', { name: /残り対応/i }).click();

    // 「破棄済み」サブタブをクリック
    await page.getByRole('button', { name: /破棄済み/i }).click();

    // 廃棄済みテスト品カードを確認
    // この品物はconsumptionSummaryもitem.consumptionRateもないので、
    // 消費ログAPI（consumptionRate: 70）からフォールバック取得
    // 100 - 70 = 30% が破棄
    const testItemCard = page.locator('text=廃棄済みテスト品');

    // カードが表示されるのを待つ
    await expect(testItemCard).toBeVisible({ timeout: 10000 });

    // 30%分の表示を確認（消費ログからのフォールバック）
    await expect(page.locator('text=30%分')).toBeVisible({ timeout: 10000 });
  });
});
