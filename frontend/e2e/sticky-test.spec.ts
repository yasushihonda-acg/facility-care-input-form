import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

// ヘッダーがsticky固定されていないことを確認するページ
const nonStickyPages = [
  { path: '/demo/family/items', name: 'Demo Items' },
  { path: '/demo/staff/input/meal', name: 'Demo Meal' },
  { path: '/family/items', name: 'Family Items' },
  { path: '/staff/input/meal', name: 'Staff Meal' },
];

// ヘッダーがsticky固定されていることを確認するページ
const stickyPages = [
  { path: '/view', name: 'ViewPage' },
  { path: '/demo/view', name: 'Demo ViewPage' },
];

for (const page of nonStickyPages) {
  test(`${page.name}: ヘッダーがsticky固定されていないこと`, async ({ page: p }) => {
    await p.goto(`${BASE_URL}${page.path}`);
    await p.waitForLoadState('networkidle');

    const header = p.locator('header').first();
    await expect(header).toBeVisible();

    const position = await header.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });

    expect(position).not.toBe('sticky');
    expect(position).not.toBe('fixed');
  });
}

for (const page of stickyPages) {
  test(`${page.name}: ヘッダーがsticky固定されていること`, async ({ page: p }) => {
    await p.goto(`${BASE_URL}${page.path}`);
    await p.waitForLoadState('networkidle');

    const header = p.locator('header').first();
    await expect(header).toBeVisible();

    const position = await header.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });

    expect(position).toBe('sticky');
  });
}

// ViewPageでスクロール後もヘッダーが画面上部に固定されていることを確認
test('ViewPage: スクロール後もヘッダーが画面上部に固定されている', async ({ page }) => {
  await page.goto(`${BASE_URL}/view`);
  await page.waitForLoadState('networkidle');

  const header = page.locator('header').first();
  await expect(header).toBeVisible();

  // スクロール前のヘッダー位置を記録
  const initialBox = await header.boundingBox();
  expect(initialBox).not.toBeNull();

  // メインコンテンツ内でスクロール（Layoutのmain要素）
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollBy(0, 500);
  });
  await page.waitForTimeout(300);

  // スクロール後のヘッダー位置を確認
  const afterScrollBox = await header.boundingBox();
  expect(afterScrollBox).not.toBeNull();

  // ヘッダーのy座標が変わっていない（画面上部に固定されている）
  expect(afterScrollBox!.y).toBe(initialBox!.y);
});
