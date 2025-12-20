/**
 * チャット連携 E2Eテスト (Phase 18)
 * @see docs/CHAT_INTEGRATION_SPEC.md
 * @see docs/E2E_TEST_SPEC.md
 *
 * 品物起点のチャット機能を検証します。
 *
 * Phase 21: チャット機能一時非表示のため全テストスキップ
 */

import { test, expect, Page } from '@playwright/test';

// SPAのロード完了を待つヘルパー
async function waitForSpaLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// Phase 21: チャット機能一時非表示のため全テストスキップ
test.describe.skip('チャット連携基本動作', () => {
  test.describe.configure({ timeout: 60000 });

  test('CHAT-001: 家族用チャット一覧にアクセスできる', async ({ page }) => {
    await page.goto('/demo/family/chats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/family\/chats/);

    // チャットタイトルが表示される
    await expect(page.getByRole('heading', { name: 'チャット', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('CHAT-002: スタッフ用チャット一覧にアクセスできる', async ({ page }) => {
    await page.goto('/demo/staff/chats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/staff\/chats/);

    // チャットタイトルが表示される
    await expect(page.getByRole('heading', { name: 'チャット', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('CHAT-003: フッターにチャットタブがある（家族）', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターのチャットタブが表示される
    const chatTab = page.locator('nav[aria-label="家族用ナビゲーション"]').getByText('チャット');
    await expect(chatTab).toBeVisible({ timeout: 15000 });
  });

  test('CHAT-004: フッターにチャットタブがある（スタッフ）', async ({ page }) => {
    await page.goto('/demo/staff', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターのチャットタブが表示される
    const chatTab = page.locator('nav[aria-label="スタッフ用ナビゲーション"]').getByText('チャット');
    await expect(chatTab).toBeVisible({ timeout: 15000 });
  });

  test('CHAT-005: フッターからチャット一覧へ遷移できる（家族）', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターのチャットタブをクリック
    const chatTab = page.locator('nav[aria-label="家族用ナビゲーション"]').getByText('チャット');
    await chatTab.click();

    // チャット一覧に遷移
    await page.waitForURL(/\/demo\/family\/chats/);
    await expect(page.getByRole('heading', { name: 'チャット', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('CHAT-006: フッターからチャット一覧へ遷移できる（スタッフ）', async ({ page }) => {
    await page.goto('/demo/staff', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターのチャットタブをクリック
    const chatTab = page.locator('nav[aria-label="スタッフ用ナビゲーション"]').getByText('チャット');
    await chatTab.click();

    // チャット一覧に遷移
    await page.waitForURL(/\/demo\/staff\/chats/);
    await expect(page.getByRole('heading', { name: 'チャット', exact: true })).toBeVisible({ timeout: 15000 });
  });
});

// Phase 21: チャット機能一時非表示のため全テストスキップ
test.describe.skip('品物詳細からのチャット連携', () => {
  test.describe.configure({ timeout: 60000 });

  test('CHAT-007: 家族品物詳細にチャットリンクがある', async ({ page }) => {
    // 品物一覧から品物を選択
    await page.goto('/demo/family/items', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 最初の品物をクリック
    const itemCard = page.locator('[data-testid="item-card"]').first();
    if (await itemCard.isVisible()) {
      await itemCard.click();
      await waitForSpaLoad(page);

      // チャットリンクが表示される
      await expect(page.locator('text=スタッフにチャット')).toBeVisible({ timeout: 15000 });
    }
  });
});

// Phase 21: チャット機能一時非表示のため全テストスキップ
test.describe.skip('チャット一覧の表示', () => {
  test.describe.configure({ timeout: 60000 });

  test('CHAT-008: チャット一覧で空の状態メッセージが表示される', async ({ page }) => {
    await page.goto('/demo/family/chats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 空の状態メッセージ、またはチャット一覧が表示される
    const emptyMessage = page.locator('text=チャットはまだありません');
    const chatItems = page.locator('button').filter({ hasText: /.*/ });

    // どちらかが表示されることを確認
    const hasEmptyMessage = await emptyMessage.isVisible();
    const hasChatItems = await chatItems.first().isVisible();

    expect(hasEmptyMessage || hasChatItems).toBe(true);
  });
});
