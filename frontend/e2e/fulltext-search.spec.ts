/**
 * 全文検索機能 E2Eテスト
 * Phase 25: 記録閲覧テーブルの全文検索機能
 */
import { test, expect, Page } from '@playwright/test';

// ページ読み込み待機
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('全文検索機能', () => {
  test.beforeEach(async ({ page }) => {
    // 記録閲覧ページにアクセス
    await page.goto('/view');
    await waitForPageLoad(page);
  });

  test('VIEW-SEARCH-001: 検索ボタンをクリックで検索バーが開く', async ({ page }) => {
    // 検索トグルボタンをクリック
    const searchToggle = page.locator('button[title="検索"]');
    await expect(searchToggle).toBeVisible();
    await searchToggle.click();

    // 検索入力フィールドが表示される
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await expect(searchInput).toBeVisible();
  });

  test('VIEW-SEARCH-002: スタッフ名で検索できる', async ({ page }) => {
    // 検索バーを開く
    const searchToggle = page.locator('button[title="検索"]');
    await searchToggle.click();

    // 検索入力フィールドに入力
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await searchInput.fill('田中');

    // 検索結果の件数が表示される
    await page.waitForTimeout(500);
    const resultText = page.locator('text=/「田中」の検索結果/');
    await expect(resultText).toBeVisible({ timeout: 5000 });
  });

  test('VIEW-SEARCH-003: 日付で検索できる', async ({ page }) => {
    // 検索バーを開く
    const searchToggle = page.locator('button[title="検索"]');
    await searchToggle.click();

    // 日付で検索（2025/12形式）
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await searchInput.fill('2025/12');

    // 検索結果が表示される
    await page.waitForTimeout(500);
    const resultText = page.locator('text=/「2025\\/12」の検索結果/');
    await expect(resultText).toBeVisible({ timeout: 5000 });
  });

  test('VIEW-SEARCH-004: 特記事項の内容で検索できる（特記事項タブ）', async ({ page }) => {
    // 特記事項タブに切り替え
    const specialNotesTab = page.locator('button').filter({ hasText: '特記事項' });
    await specialNotesTab.click();
    await waitForPageLoad(page);

    // 検索バーを開く
    const searchToggle = page.locator('button[title="検索"]');
    await searchToggle.click();

    // 特記事項に含まれそうなキーワードで検索
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await searchInput.fill('ケア');

    // 検索結果が表示される
    await page.waitForTimeout(500);
    const resultText = page.locator('text=/「ケア」の検索結果/');
    await expect(resultText).toBeVisible({ timeout: 5000 });
  });

  test('VIEW-SEARCH-005: 時間帯で検索できる（食事タブ）', async ({ page }) => {
    // 食事タブに切り替え
    const mealTab = page.locator('button').filter({ hasText: '食事' });
    await mealTab.click();
    await waitForPageLoad(page);

    // 検索バーを開く
    const searchToggle = page.locator('button[title="検索"]');
    await searchToggle.click();

    // 時間帯で検索
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await searchInput.fill('朝');

    // 検索結果が表示される（件数は可変）
    await page.waitForTimeout(500);
    const resultText = page.locator('text=/「朝」の検索結果/');
    await expect(resultText).toBeVisible({ timeout: 5000 });
  });

  test('VIEW-SEARCH-006: 検索結果が0件の場合メッセージが表示される', async ({ page }) => {
    // 検索バーを開く
    const searchToggle = page.locator('button[title="検索"]');
    await searchToggle.click();

    // 存在しないキーワードで検索
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await searchInput.fill('あいうえおかきくけこ存在しない文字列XYZ123');

    // 「該当するデータがありません」メッセージが表示される
    await page.waitForTimeout(500);
    const noDataMessage = page.locator('text=該当するデータがありません');
    await expect(noDataMessage).toBeVisible({ timeout: 5000 });
  });

  test('VIEW-SEARCH-007: 検索クリアで全件表示に戻る', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // 初期件数を取得
    const initialCountText = await page.locator('text=/\\d+件/').first().textContent();
    const initialCount = parseInt(initialCountText?.match(/(\d+)件/)?.[1] || '0', 10);

    // 検索バーを開く
    const searchToggle = page.locator('button[title="検索"]');
    await searchToggle.click();

    // 検索を実行
    const searchInput = page.locator('input[placeholder="内容・担当者で検索..."]');
    await searchInput.fill('テスト');
    await page.waitForTimeout(500);

    // 検索をクリア
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // 件数が元に戻ることを確認
    const resetCountText = await page.locator('text=/\\d+件/').first().textContent();
    const resetCount = parseInt(resetCountText?.match(/(\d+)件/)?.[1] || '0', 10);
    expect(resetCount).toBe(initialCount);
  });
});
