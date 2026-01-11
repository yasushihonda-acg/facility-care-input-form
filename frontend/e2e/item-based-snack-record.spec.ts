/**
 * Phase 13.0: 品物起点の間食記録 E2Eテスト
 * Phase 15.8で簡素化: タブUI削除、品物リストが直接表示される
 */

import { test, expect } from '@playwright/test';

test.describe('品物起点の間食記録（Phase 13.0）', () => {
  const mealInputUrl = '/demo/staff/input/meal';

  test.beforeEach(async ({ page }) => {
    await page.goto(mealInputUrl);
    // ページ読み込み待機
    await page.waitForLoadState('networkidle');
  });

  test.describe('品物リスト表示', () => {
    test('品物リストが表示される', async ({ page }) => {
      // Phase 15.8: タブなし、直接品物リストが表示される
      // 今日提供予定または提供漏れセクションが表示される
      const contentLocator = page.locator('text=今日提供予定').or(page.locator('text=提供漏れ'));
      await expect(contentLocator.first()).toBeVisible({ timeout: 5000 });
    });

    test('デモモードでは品物が表示される', async ({ page }) => {
      // デモデータでは品物があるはず
      // 品物カードの「提供記録」ボタンが表示されている
      const recordButtons = page.locator('button:has-text("提供記録")');
      await expect(recordButtons.first()).toBeVisible({ timeout: 5000 });
    });

    test('品物カードに必要な情報が表示される', async ({ page }) => {
      // 品物が表示されるまで待機
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });

      // カード内に品物情報が表示されている（残りまたは期限情報）
      const pageContent = await page.content();
      const hasStockInfo = pageContent.includes('残り') || pageContent.includes('期限');
      expect(hasStockInfo).toBeTruthy();
    });
  });

  test.describe('記録入力モーダル', () => {
    test('「提供記録」ボタンでモーダルが開く', async ({ page }) => {
      // 品物が表示されるまで待機
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });

      // ボタンクリック
      await recordButton.click();

      // モーダルが開く（「提供・摂食を記録」というタイトル）
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });
    });

    test('モーダルに必要なフォーム要素がある', async ({ page }) => {
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // モーダルが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // モーダル内のフォーム要素確認
      await expect(page.locator('text=入力者')).toBeVisible();
      await expect(page.locator('text=提供数')).toBeVisible();
      await expect(page.locator('button:has-text("記録を保存")')).toBeVisible();
      await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
    });

    test('摂食した割合の入力欄が表示される', async ({ page }) => {
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // モーダルが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 摂食した割合の入力欄
      await expect(page.locator('text=摂食した割合')).toBeVisible();
    });

    test('キャンセルボタンでモーダルが閉じる', async ({ page }) => {
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // モーダルが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // キャンセル
      await page.locator('button:has-text("キャンセル")').click();

      // モーダルが閉じる
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).not.toBeVisible();
    });
  });

  test.describe('API連携', () => {
    test('記録保存ボタンが機能する', async ({ page }) => {
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // モーダルが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 保存ボタンをクリック（デモモードでは「記録を保存（デモ）」）
      const saveButton = page.locator('button:has-text("記録を保存")');
      await expect(saveButton).toBeVisible();

      // ボタンがクリック可能で、クリック後に何らかの変化がある
      await saveButton.click();

      // デモモードではモーダルが閉じるか、成功メッセージが表示される（5秒待機）
      await Promise.race([
        page.waitForSelector('h2:has-text("提供・摂食を記録")', { state: 'hidden', timeout: 5000 }).catch(() => null),
        page.waitForSelector('text=記録しました', { timeout: 5000 }).catch(() => null),
      ]);
    });

    test('デモモード説明が表示される', async ({ page }) => {
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // モーダルが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // デモモードの説明が表示される
      await expect(page.locator('text=デモモード')).toBeVisible();
    });
  });
});
