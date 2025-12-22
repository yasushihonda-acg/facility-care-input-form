/**
 * Phase 20: スタッフデモ環境完結テスト
 *
 * デモ環境 (/demo/*) 内での操作が本番環境に離脱しないことを検証
 * TDD: 先にテストを書き、実装後にパスさせる
 * 設計書: docs/DEMO_STAFF_CONTAINMENT.md
 */

import { test, expect, Page } from '@playwright/test';

/**
 * URLがデモ環境内であることを検証するヘルパー
 */
function assertDemoUrl(url: string, context: string) {
  const isDemoUrl = url.includes('/demo');
  if (!isDemoUrl) {
    throw new Error(`[${context}] デモ環境を離脱しています: ${url}`);
  }
}

test.describe('Phase 20: スタッフデモ環境完結', () => {
  // タイムアウト設定
  test.describe.configure({ timeout: 30000 });

  test.describe('DSC-00x: 記録入力ページからの戻り', () => {
    test('DSC-001: 記録入力ページの戻るボタンがデモ環境内に留まる', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // ヘッダーの戻るボタンをクリック
      const backButton = page.locator('[aria-label="記録閲覧に戻る"]');
      await expect(backButton).toBeVisible();
      await backButton.click();

      // デモ環境内に留まることを確認
      await page.waitForLoadState('networkidle');
      assertDemoUrl(page.url(), 'DSC-001');
      await expect(page).toHaveURL(/\/demo\//);
    });

    test('DSC-002: 記録入力からフッターで記録閲覧に遷移してもデモ内', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // フッターの「記録閲覧」をクリック
      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await footer.getByText('記録閲覧').click();

      // /demo/view に遷移
      await expect(page).toHaveURL('/demo/view');
    });
  });

  test.describe('DSC-01x: フッターナビの統計タブ', () => {
    test('DSC-010: フッターの統計タブがデモ環境内に遷移', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');
      await page.waitForLoadState('networkidle');

      // フッターの「統計」をクリック
      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await footer.getByText('統計').click();

      // デモ環境内の統計ページに遷移
      await page.waitForLoadState('networkidle');
      assertDemoUrl(page.url(), 'DSC-010');
      // /demo/stats または /demo/staff/stats のいずれか
      await expect(page).toHaveURL(/\/demo\/(stats|staff\/stats)/);
    });

    test('DSC-011: 記録入力ページからも統計タブがデモ内遷移', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');
      await page.waitForLoadState('networkidle');

      // フッターの「統計」をクリック
      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await footer.getByText('統計').click();

      // デモ環境内の統計ページに遷移
      await page.waitForLoadState('networkidle');
      assertDemoUrl(page.url(), 'DSC-011');
    });
  });

  test.describe('DSC-02x: タイムラインページ', () => {
    test('DSC-020: タイムラインからの戻りリンクがデモ内', async ({ page }) => {
      // まず家族連絡詳細から品物のタイムラインに遷移
      await page.goto('/demo/staff/family-messages');
      await page.waitForLoadState('networkidle');

      // 品物をクリックして詳細へ
      await page.getByRole('link', { name: /バナナ|みかん|りんご|羊羹/i }).first().click();
      await page.waitForLoadState('networkidle');

      // タイムラインリンクがある場合はクリック
      const timelineLink = page.getByRole('link', { name: /タイムライン/i });
      if (await timelineLink.isVisible()) {
        await timelineLink.click();
        await page.waitForLoadState('networkidle');

        // タイムラインページがデモ環境内
        assertDemoUrl(page.url(), 'DSC-020');
        await expect(page).toHaveURL(/\/demo\/items\/.+\/timeline/);
      }
    });

    test('DSC-021: タイムラインのアクションボタンがデモ内', async ({ page }) => {
      // デモのタイムラインページに直接アクセス
      // 品物IDはデモデータから（item-001等）
      await page.goto('/demo/items/item-001/timeline');

      // ページが読み込まれたか確認（404でないこと）
      const content = await page.content();
      if (!content.includes('品物が見つかりません') && !content.includes('エラー')) {
        // アクションボタンがある場合
        const actionButton = page.getByRole('link', { name: /提供・摂食を記録/i });
        if (await actionButton.isVisible()) {
          await actionButton.click();
          await page.waitForLoadState('networkidle');

          // デモ環境内に留まる
          assertDemoUrl(page.url(), 'DSC-021');
          await expect(page).toHaveURL(/\/demo\/staff\//);
        }
      }
    });
  });

  test.describe('DSC-03x: 全ページ巡回テスト', () => {
    const demoStaffPages = [
      '/demo/staff',
      '/demo/staff/showcase',
      '/demo/staff/input/meal',
      '/demo/staff/family-messages',
      '/demo/staff/chats',
      '/demo/view',
      '/demo/stats',
    ];

    for (const startPage of demoStaffPages) {
      test(`DSC-030-${startPage}: ${startPage}からの全リンクがデモ内`, async ({ page }) => {
        await page.goto(startPage);
        await page.waitForLoadState('networkidle');

        // ページ内の全リンクを収集
        const links = await page.locator('a[href]').all();

        for (const link of links) {
          const href = await link.getAttribute('href');
          if (href) {
            // 外部リンクは除外
            if (href.startsWith('http') && !href.includes('localhost')) {
              continue;
            }
            // ハッシュリンクは除外
            if (href.startsWith('#')) {
              continue;
            }

            // 内部リンクはデモ環境内であるべき
            // 本番環境へのリンク（/demo で始まらない内部リンク）は問題
            if (href.startsWith('/') && !href.startsWith('/demo')) {
              // 本番モードへの意図的なリンクは許可（例: 「本番モードへ」ボタン）
              const linkText = await link.textContent();
              if (linkText?.includes('本番モード')) {
                continue;
              }

              // それ以外は離脱とみなす
              throw new Error(
                `[DSC-030] ${startPage} のリンクがデモ環境を離脱: href="${href}"`
              );
            }
          }
        }
      });
    }
  });

  test.describe('DSC-04x: フッターナビ完全性', () => {
    test('DSC-040: 全フッタータブがデモ内遷移', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');
      await page.waitForLoadState('networkidle');

      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(footer).toBeVisible();

      // 各タブをクリックして遷移先を確認
      // Phase 21: チャット機能は一時非表示
      const tabs = ['記録閲覧', '記録入力', '家族連絡', '統計'];

      for (const tab of tabs) {
        await page.goto('/demo/staff/family-messages');
        await page.waitForLoadState('networkidle');

        await footer.getByText(tab).click();
        await page.waitForLoadState('networkidle');

        assertDemoUrl(page.url(), `DSC-040-${tab}`);
      }
    });
  });

  test.describe('DSC-05x: ブラウザバック対応', () => {
    test('DSC-050: ブラウザバックでデモ内に留まる', async ({ page }) => {
      // デモホーム → 家族連絡 → 詳細 と遷移
      await page.goto('/demo/staff');
      await page.waitForLoadState('networkidle');

      await page.getByText('家族連絡を確認').click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL('/demo/staff/family-messages');

      // 品物詳細へ
      await page.getByRole('link', { name: /バナナ|みかん|りんご|羊羹/i }).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/demo\/staff\/family-messages\/.+/);

      // ブラウザバック
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // デモ環境内に留まる
      assertDemoUrl(page.url(), 'DSC-050');
    });
  });
});
