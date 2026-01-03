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
