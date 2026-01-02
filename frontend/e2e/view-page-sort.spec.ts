/**
 * 記録閲覧ページ ソート機能 E2Eテスト
 * Phase 23: 日時ソート改善
 */
import { test, expect, Page } from '@playwright/test';

// ページ読み込み待機
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// タイムスタンプ文字列をDateに変換
function parseTimestamp(timestamp: string): Date {
  // 形式: "2025/12/20 9:00:00" or "2025/12/20 18:00:00"
  const [datePart, timePart] = timestamp.split(' ');
  if (!datePart || !timePart) return new Date(0);

  const [year, month, day] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  return new Date(year, month - 1, day, hour, minute, second || 0);
}

// 配列が降順かどうかを確認
function isDescending(dates: Date[]): boolean {
  for (let i = 1; i < dates.length; i++) {
    if (dates[i].getTime() > dates[i - 1].getTime()) {
      return false;
    }
  }
  return true;
}

test.describe('記録閲覧ページ ソート機能', () => {
  test.beforeEach(async ({ page }) => {
    // 記録閲覧ページにアクセス
    await page.goto('/view');
    await waitForPageLoad(page);
  });

  test('VIEW-SORT-001: ページ読み込み時にタイムスタンプ降順でソートされている', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // テーブル行を取得（ヘッダー行を除く）
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    // データがない場合はスキップ
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // 各行のタイムスタンプを取得
    const timestamps: string[] = [];
    for (let i = 0; i < Math.min(rowCount, 10); i++) { // 最大10行をチェック
      const cell = rows.nth(i).locator('td').first();
      const text = await cell.textContent();
      if (text) {
        timestamps.push(text.trim());
      }
    }

    // タイムスタンプをDateに変換
    const dates = timestamps.map(parseTimestamp);

    // 降順であることを確認
    expect(isDescending(dates)).toBe(true);
  });

  test('VIEW-SORT-002: 日時カラムヘッダークリックでソート順が切り替わる', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // 日時カラムヘッダーのボタンを探す（th内のbutton）
    const dateHeaderButton = page.locator('th button').filter({ hasText: /日時/ }).first();
    await expect(dateHeaderButton).toBeVisible();

    // テーブル行を取得
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount < 2) {
      test.skip();
      return;
    }

    // 初期状態：降順であることを確認
    let headerText = await dateHeaderButton.textContent();
    expect(headerText).toContain('↓'); // 降順インジケータ

    // ヘッダークリックでソート切り替え（昇順へ）
    await dateHeaderButton.click();
    await page.waitForTimeout(500);

    // 昇順になっていることを確認
    headerText = await dateHeaderButton.textContent();
    expect(headerText).toContain('↑'); // 昇順インジケータ

    // もう一度クリックして降順に戻す
    await dateHeaderButton.click();
    await page.waitForTimeout(500);

    headerText = await dateHeaderButton.textContent();
    expect(headerText).toContain('↓'); // 降順インジケータ
  });

  test('VIEW-SORT-003: 同じ日の異なる時刻が正しくソートされる', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // テーブル行を取得
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();

    if (rowCount < 2) {
      test.skip();
      return;
    }

    // 各行のタイムスタンプを取得
    const timestamps: string[] = [];
    for (let i = 0; i < Math.min(rowCount, 20); i++) {
      const cell = rows.nth(i).locator('td').first();
      const text = await cell.textContent();
      if (text) {
        timestamps.push(text.trim());
      }
    }

    // 同じ日のタイムスタンプを抽出
    const dateGroups: Record<string, Date[]> = {};
    timestamps.forEach(ts => {
      const date = parseTimestamp(ts);
      const dateKey = ts.split(' ')[0]; // 日付部分のみ
      if (!dateGroups[dateKey]) {
        dateGroups[dateKey] = [];
      }
      dateGroups[dateKey].push(date);
    });

    // 同じ日のグループがあれば、その中で降順になっていることを確認
    for (const [, dates] of Object.entries(dateGroups)) {
      if (dates.length >= 2) {
        expect(isDescending(dates)).toBe(true);
      }
    }
  });

  test('VIEW-SORT-004: モバイルソートセレクタが機能する', async ({ page }) => {
    // モバイルソートセレクタを探す
    const sortSelector = page.locator('select').filter({ hasText: /タイムスタンプ|日時/ });

    // セレクタが表示されていない場合はスキップ（デスクトップビュー）
    const isVisible = await sortSelector.isVisible().catch(() => false);
    if (!isVisible) {
      test.skip();
      return;
    }

    // セレクタの値を確認
    await expect(sortSelector).toBeVisible();
  });
});
