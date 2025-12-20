/**
 * FooterNav デモモード対応テスト
 * @see docs/FOOTERNAV_DEMO_FIX_SPEC.md
 *
 * Phase 20.1: getActiveChatItems 500エラー修正
 */

import { test, expect } from '@playwright/test';

test.describe('FooterNav Demo Mode - Console Error Check', () => {
  /**
   * FND-001: デモスタッフページで500エラーがないこと
   */
  test('FND-001: /demo/staff should not have 500 errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    // コンソールエラーを収集
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ネットワークエラーを収集
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/demo/staff');
    await page.waitForLoadState('networkidle');

    // 500エラーがないことを確認
    const has500Error = networkErrors.some((err) => err.includes('getActiveChatItems'));
    expect(has500Error, `500 errors found: ${networkErrors.join(', ')}`).toBe(false);
  });

  /**
   * FND-002: デモ家族ページで500エラーがないこと
   */
  test('FND-002: /demo/family should not have 500 errors', async ({ page }) => {
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/demo/family');
    await page.waitForLoadState('networkidle');

    const has500Error = networkErrors.some((err) => err.includes('getActiveChatItems'));
    expect(has500Error, `500 errors found: ${networkErrors.join(', ')}`).toBe(false);
  });

  /**
   * FND-003: デモ閲覧ページで500エラーがないこと
   */
  test('FND-003: /demo/view should not have 500 errors', async ({ page }) => {
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/demo/view');
    await page.waitForLoadState('networkidle');

    const has500Error = networkErrors.some((err) => err.includes('getActiveChatItems'));
    expect(has500Error, `500 errors found: ${networkErrors.join(', ')}`).toBe(false);
  });
});

test.describe('FooterNav Demo Mode - UI Check', () => {
  /**
   * FND-010: デモスタッフページでフッターが表示されること
   */
  test('FND-010: /demo/staff should display footer navigation', async ({ page }) => {
    await page.goto('/demo/staff');
    await page.waitForLoadState('networkidle');

    // フッターナビゲーションが表示されること
    const footer = page.locator('nav[aria-label]');
    await expect(footer).toBeVisible();
  });

  /**
   * FND-011: デモ家族ページでフッターが表示されること
   */
  test('FND-011: /demo/family should display footer navigation', async ({ page }) => {
    await page.goto('/demo/family');
    await page.waitForLoadState('networkidle');

    // フッターナビゲーションが表示されること
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await expect(footer).toBeVisible();
  });

  /**
   * FND-012: デモモードでgetActiveChatItems APIが呼ばれないこと
   */
  test('FND-012: Demo mode should not call getActiveChatItems API', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', (request) => {
      if (request.url().includes('getActiveChatItems')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/demo/staff');
    await page.waitForLoadState('networkidle');

    // デモモードではAPIが呼ばれないこと
    expect(apiCalls.length, `API calls found: ${apiCalls.join(', ')}`).toBe(0);
  });

  /**
   * FND-013: デモ家族ページでもgetActiveChatItems APIが呼ばれないこと
   */
  test('FND-013: Demo family mode should not call getActiveChatItems API', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', (request) => {
      if (request.url().includes('getActiveChatItems')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/demo/family');
    await page.waitForLoadState('networkidle');

    // デモモードではAPIが呼ばれないこと
    expect(apiCalls.length, `API calls found: ${apiCalls.join(', ')}`).toBe(0);
  });
});

test.describe('FooterNav Demo Mode - Navigation Check', () => {
  /**
   * FND-020: デモスタッフのフッターからデモ内ナビゲーションできること
   */
  test('FND-020: Demo staff footer navigation stays in demo', async ({ page }) => {
    await page.goto('/demo/staff');
    await page.waitForLoadState('networkidle');

    // フッターの記録入力リンクをクリック（ナビゲーション内の最後のリンク）
    const inputLink = page.locator('nav a[href="/demo/staff/input/meal"]').first();
    if (await inputLink.isVisible()) {
      await inputLink.click();
      await page.waitForLoadState('networkidle');

      // デモ環境内にいることを確認
      expect(page.url()).toContain('/demo/');
    }
  });

  /**
   * FND-021: デモ家族のフッターからデモ内ナビゲーションできること
   */
  test('FND-021: Demo family footer navigation stays in demo', async ({ page }) => {
    await page.goto('/demo/family');
    await page.waitForLoadState('networkidle');

    // 品物リンクをクリック
    const itemsLink = page.locator('a[href="/demo/family/items"]');
    if (await itemsLink.isVisible()) {
      await itemsLink.click();
      await page.waitForLoadState('networkidle');

      // デモ環境内にいることを確認
      expect(page.url()).toContain('/demo/');
    }
  });
});
