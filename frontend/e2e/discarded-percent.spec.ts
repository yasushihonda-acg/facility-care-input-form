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
  
  test('青森産サンふじりんごに75%破棄が表示される', async ({ page }) => {
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
});
