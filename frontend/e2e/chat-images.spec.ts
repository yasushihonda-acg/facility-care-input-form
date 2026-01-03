/**
 * Google Chat画像タブ E2Eテスト
 * Phase 51: 記録閲覧ページへの画像タブ追加
 */
import { test, expect, Page } from '@playwright/test';

// ページ読み込み待機
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('画像タブ機能', () => {
  test.describe('ViewPage 画像タブ', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/view');
      await waitForPageLoad(page);
    });

    test('IMG-001: 画像タブが表示される', async ({ page }) => {
      // 4つのビュータブ（データ/相関分析/グラフ/画像）が表示されることを確認
      const viewTabs = page.locator('button:has-text("画像")');
      await expect(viewTabs).toBeVisible();
    });

    test('IMG-002: 画像タブをクリックすると画像表示エリアに切り替わる', async ({ page }) => {
      // 画像タブをクリック
      await page.click('button:has-text("画像")');
      await waitForPageLoad(page);

      // 未設定メッセージまたは画像コンテンツが表示される
      const settingsMessage = page.locator('text=画像閲覧設定が必要です');
      const imagesContent = page.locator('text=件の画像');

      // どちらかが表示されていればOK
      const hasSettingsMessage = await settingsMessage.isVisible().catch(() => false);
      const hasImagesContent = await imagesContent.isVisible().catch(() => false);

      expect(hasSettingsMessage || hasImagesContent).toBeTruthy();
    });

    test('IMG-003: 未設定時に設定ページへのリンクが表示される', async ({ page }) => {
      // 画像タブをクリック
      await page.click('button:has-text("画像")');
      await waitForPageLoad(page);

      // 設定ページへのリンクを確認（未設定の場合のみ）
      const settingsLink = page.locator('a[href="/settings"]:has-text("設定ページへ")');
      const isUnconfigured = await settingsLink.isVisible().catch(() => false);

      if (isUnconfigured) {
        await expect(settingsLink).toBeVisible();
      } else {
        // 設定済みの場合は画像表示エリアが見える
        await expect(page.locator('text=件の画像')).toBeVisible();
      }
    });
  });

  test.describe('設定ページ 画像閲覧設定', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/settings');
      await waitForPageLoad(page);
    });

    test('IMG-010: 画像閲覧設定セクションが表示される', async ({ page }) => {
      // 画像閲覧設定のヘッダーを確認
      await expect(page.locator('text=画像閲覧設定')).toBeVisible();
    });

    test('IMG-011: 利用者ID入力欄が表示される', async ({ page }) => {
      // 利用者IDラベルを確認
      await expect(page.locator('label:has-text("対象利用者ID")')).toBeVisible();

      // 入力欄が存在することを確認（placeholder="例: 7282"）
      const residentIdInput = page.locator('input[placeholder="例: 7282"]');
      await expect(residentIdInput).toBeVisible();
    });

    test('IMG-012: チャットスペースID入力欄が表示される', async ({ page }) => {
      // スペースIDラベルを確認（Google ChatスペースID）
      await expect(page.locator('label:has-text("Google ChatスペースID")')).toBeVisible();

      // 入力欄が存在することを確認（placeholder="例: AAAAL1Foxd8"）
      const spaceIdInput = page.locator('input[placeholder="例: AAAAL1Foxd8"]');
      await expect(spaceIdInput).toBeVisible();
    });

    test('IMG-013: 利用者IDに数値を入力できる', async ({ page }) => {
      const residentIdInput = page.locator('input[placeholder="例: 7282"]');
      await residentIdInput.fill('1234');
      await expect(residentIdInput).toHaveValue('1234');
    });

    test('IMG-014: スペースIDに文字列を入力できる', async ({ page }) => {
      const spaceIdInput = page.locator('input[placeholder="例: AAAAL1Foxd8"]');
      await spaceIdInput.fill('TESTSPACE123');
      await expect(spaceIdInput).toHaveValue('TESTSPACE123');
    });
  });

  test.describe('表示モード切り替え', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/view');
      await waitForPageLoad(page);
      // 画像タブをクリック
      await page.click('button:has-text("画像")');
      await waitForPageLoad(page);
    });

    // 注: 以下のテストは設定済みかつ画像データがある場合のみ動作
    // テスト環境では未設定なのでスキップ

    test.skip('IMG-020: ギャラリーモードボタンが表示される', async ({ page }) => {
      await expect(page.locator('button:has-text("ギャラリー")')).toBeVisible();
    });

    test.skip('IMG-021: タイムラインモードボタンが表示される', async ({ page }) => {
      await expect(page.locator('button:has-text("タイムライン")')).toBeVisible();
    });

    test.skip('IMG-022: テーブルモードボタンが表示される', async ({ page }) => {
      await expect(page.locator('button:has-text("テーブル")')).toBeVisible();
    });
  });
});
