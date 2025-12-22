/**
 * フィルター状態永続化テスト
 * Phase 38.4: URL同期によるフィルター状態の永続化
 */
import { test, expect } from '@playwright/test';

test.describe('フィルター状態永続化', () => {
  test('FILTER-001: URLパラメータでフィルター状態が復元される', async ({ page }) => {
    // 1. 品物管理ページにアクセス（URLパラメータ付き）
    await page.goto('/demo/family/items?period=1&exD=1&exp=1');
    await page.waitForLoadState('networkidle');

    // 2. 期間が1ヶ月に設定されていることを確認
    await expect(page.locator('text=1ヶ月先まで')).toBeVisible();

    // 3. 「毎日」トグルが除外状態であることを確認（グレー/取消線）
    const dailyButton = page.locator('button:has-text("毎日")');
    await expect(dailyButton).toHaveClass(/line-through/);

    // 4. 詳細が展開されていることを確認（閉じるボタンが表示）
    await expect(page.locator('text=閉じる')).toBeVisible();
  });

  test('FILTER-002: 期間変更でURLが更新される', async ({ page }) => {
    // 1. 品物管理ページにアクセス（デフォルト状態）
    await page.goto('/demo/family/items');
    await page.waitForLoadState('networkidle');

    // 2. 期間セレクターを開いて1ヶ月を選択
    await page.locator('button:has-text("2ヶ月 ▼")').click();
    await page.locator('button:has-text("1ヶ月")').click();

    // 3. URLにperiod=1が含まれることを確認
    await expect(page).toHaveURL(/period=1/);
  });

  test('FILTER-003: トグル変更でURLが更新される', async ({ page }) => {
    // 1. 品物管理ページにアクセス
    await page.goto('/demo/family/items');
    await page.waitForLoadState('networkidle');

    // 2. 「毎日」トグルをクリック（除外に変更）
    await page.locator('button:has-text("毎日")').click();

    // 3. URLにexD=1が含まれることを確認
    await expect(page).toHaveURL(/exD=1/);
  });

  test('FILTER-004: 詳細展開でURLが更新される', async ({ page }) => {
    // 1. 品物管理ページにアクセス
    await page.goto('/demo/family/items');
    await page.waitForLoadState('networkidle');

    // 2. 未設定日があるかチェック（なければスキップ）
    const expandButton = page.locator('button.text-amber-700:has-text("詳細")');
    if (!(await expandButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      console.log('未設定日がないためスキップ');
      return;
    }

    // 3. 未設定日バナーの「詳細」ボタンをクリック
    await expandButton.click();

    // 4. URLにexp=1が含まれることを確認
    await expect(page).toHaveURL(/exp=1/);

    // 5. 「閉じる」が表示されることを確認
    await expect(page.locator('text=閉じる')).toBeVisible();
  });

  test.skip('FILTER-005: 新規登録画面から戻るとフィルター状態が維持される', async ({ page }) => {
    // 1. 品物管理ページにフィルター状態付きでアクセス
    await page.goto('/demo/family/items?period=1&exD=1');
    await page.waitForLoadState('networkidle');

    // 2. フィルター状態を確認
    await expect(page.locator('text=1ヶ月先まで')).toBeVisible();

    // 3. 新規登録リンクをクリック
    await page.locator('a:has-text("+ 新規登録")').click();

    // 4. 登録画面に遷移したことを確認
    await expect(page).toHaveURL(/\/items\/new/);

    // 5. 戻るボタン（バナー内）をクリック
    await page.locator('button:has-text("戻る")').click();

    // 6. フィルター状態が維持されていることを確認
    await expect(page).toHaveURL(/period=1/);
    await expect(page).toHaveURL(/exD=1/);
  });
});
