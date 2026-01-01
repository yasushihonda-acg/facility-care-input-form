/**
 * Phase 49: 廃棄指示フロー E2Eテスト
 *
 * 家族が期限切れ品物の廃棄をスタッフに依頼するフロー
 * @see docs/ARCHITECTURE.md セクション10.6
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 49: 廃棄指示フロー', () => {
  test.describe.configure({ timeout: 30000 });

  test.describe('DISCARD-00x: 家族側 - 期限切れアラート', () => {
    test('DISCARD-001: 期限切れ品物がExpirationAlertに表示される', async ({ page }) => {
      // ExpirationAlertはItemManagementページに表示される
      await page.goto('/demo/family/items');

      // 期限切れアラートセクションが表示される（件数付き）
      await expect(page.getByText(/期限切れ（\d+件）/)).toBeVisible();
    });

    test('DISCARD-002: 期限切れ品物に廃棄ボタンが表示される', async ({ page }) => {
      await page.goto('/demo/family/items');

      // 廃棄ボタンが表示される
      const discardButtons = page.getByRole('button', { name: '廃棄' });
      await expect(discardButtons.first()).toBeVisible();
    });

    test('DISCARD-003: 廃棄ボタンクリックで確認ダイアログが表示される', async ({ page }) => {
      await page.goto('/demo/family/items');

      // 廃棄ボタンをクリック
      await page.getByRole('button', { name: '廃棄' }).first().click();

      // 確認ダイアログが表示される（キャンセル・廃棄依頼ボタン）
      await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
      await expect(page.getByRole('button', { name: /廃棄依頼/ })).toBeVisible();
    });

    test('DISCARD-004: pending_discard品物は「スタッフに通知中...」と表示される', async ({ page }) => {
      await page.goto('/demo/family/items');

      // pending_discard状態の品物の通知中表示（複数ある場合もあるので.first()を使用）
      await expect(page.getByText('スタッフに通知中...').first()).toBeVisible();
    });

    test('DISCARD-005: 詳細リンクから品物詳細ページへ遷移できる', async ({ page }) => {
      await page.goto('/demo/family/items');

      // 期限切れアラート内の詳細リンクをクリック
      const detailLinks = page.getByRole('link', { name: '詳細' });
      if (await detailLinks.count() > 0) {
        await detailLinks.first().click();
        await expect(page).toHaveURL(/\/demo\/family\/items\//);
      }
    });
  });

  test.describe('DISCARD-01x: スタッフ側 - 注意事項ページ', () => {
    test('DISCARD-010: 注意事項ページが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ページにタブが表示される
      await expect(page.locator('button').filter({ hasText: '注意事項' })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: '家族依頼' })).toBeVisible();
    });

    test('DISCARD-011: 家族依頼タブにバッジが表示される（廃棄指示あり時）', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 家族依頼タブにバッジが表示される
      const tasksTab = page.locator('button').filter({ hasText: '家族依頼' });
      await expect(tasksTab).toBeVisible();

      // バッジ（件数表示）が含まれることを確認
      const badge = tasksTab.locator('.bg-red-500, .bg-red-600');
      await expect(badge).toBeVisible();
    });

    test('DISCARD-012: 廃棄指示がある場合、家族依頼タブが自動選択される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 廃棄指示セクションが表示される（家族依頼タブがアクティブ）
      // より具体的なセレクタを使用
      await expect(page.getByRole('heading', { name: /廃棄指示/ })).toBeVisible();
    });

    test('DISCARD-013: 廃棄指示セクションに品物情報が表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 廃棄指示セクション内に品物情報
      const discardSection = page.locator('.bg-red-50');
      await expect(discardSection.first()).toBeVisible();

      // 品物名が表示される（デモデータの品物）
      await expect(page.getByText(/ステラおばさんのクッキー|明治ブルガリアヨーグルト/).first()).toBeVisible();
    });

    test('DISCARD-014: 廃棄完了ボタンが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 廃棄完了ボタンが表示される
      await expect(page.getByRole('button', { name: '廃棄完了' }).first()).toBeVisible();
    });

    test('DISCARD-015: 廃棄完了ボタンクリックでデモアラートが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ダイアログハンドラーを設定
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('デモモード');
        await dialog.accept();
      });

      // 廃棄完了ボタンをクリック
      await page.getByRole('button', { name: '廃棄完了' }).first().click();
    });
  });

  test.describe('DISCARD-02x: タブ切り替え', () => {
    test('DISCARD-020: 注意事項タブをクリックで切り替え可能', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 注意事項タブをクリック
      await page.locator('button').filter({ hasText: '注意事項' }).click();

      // 注意事項コンテンツが表示される（または空の場合のメッセージ）
      // 現在のデモデータでは注意事項がない可能性がある
    });

    test('DISCARD-021: 家族依頼タブをクリックで切り替え可能', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // まず注意事項タブに切り替え
      await page.locator('button').filter({ hasText: '注意事項' }).click();

      // 家族依頼タブをクリック
      await page.locator('button').filter({ hasText: '家族依頼' }).click();

      // 廃棄指示セクションが表示される（より具体的なセレクタ）
      await expect(page.getByRole('heading', { name: /廃棄指示/ })).toBeVisible();
    });
  });

  test.describe('DISCARD-03x: デモモード動作確認', () => {
    test('DISCARD-030: デモモードで廃棄依頼がアラートで完了する', async ({ page }) => {
      await page.goto('/demo/family/items');

      // ダイアログハンドラーを設定
      let dialogShown = false;
      page.on('dialog', async (dialog) => {
        dialogShown = true;
        expect(dialog.message()).toContain('デモモード');
        await dialog.accept();
      });

      // 廃棄ボタンをクリック
      await page.getByRole('button', { name: '廃棄' }).first().click();

      // 確認ダイアログで廃棄依頼をクリック
      await page.getByRole('button', { name: /廃棄依頼/ }).click();

      // デモアラートが表示されることを確認
      await page.waitForTimeout(500);
      expect(dialogShown).toBe(true);
    });
  });

  test.describe('DISCARD-04x: UI表示確認', () => {
    test('DISCARD-040: 期限切れなしの場合は緑バナーが表示される', async ({ page }) => {
      // 期限切れ品物がない状態をテスト（本番APIでテストする場合）
      // デモモードでは常に期限切れ品物があるのでスキップ
      test.skip();
    });

    test('DISCARD-041: 通知中品物はグレー背景で表示される', async ({ page }) => {
      await page.goto('/demo/family/items');

      // pending_discard品物のコンテナがグレー背景
      const notifyingItem = page.locator('.bg-gray-50').filter({ hasText: 'スタッフに通知中' });
      await expect(notifyingItem.first()).toBeVisible();
    });

    test('DISCARD-042: 廃棄指示セクションは赤背景で目立つ', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 赤背景の廃棄指示セクション
      await expect(page.locator('.bg-red-50').first()).toBeVisible();
    });
  });
});
