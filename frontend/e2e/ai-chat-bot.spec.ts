/**
 * AIチャットボット E2Eテスト (Phase 45)
 * 記録閲覧ページのAIチャットボット機能を検証
 *
 * TDD: 各シートのデータが正しくフォーマットされてAIに渡されているかを検証
 */

import { test, expect, Page } from '@playwright/test';

// SPAのロード完了を待つヘルパー
async function waitForSpaLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// チャットドロワーを開くヘルパー
async function openChatDrawer(page: Page) {
  const fabButton = page.locator('[data-testid="chat-fab-button"]');
  await expect(fabButton).toBeVisible({ timeout: 10000 });
  await fabButton.click();
  await page.waitForTimeout(500);
}

// メッセージを送信して回答を待つヘルパー
async function sendMessageAndWait(page: Page, message: string): Promise<string> {
  const input = page.locator('[data-testid="chat-input"]');
  await expect(input).toBeVisible();
  await input.fill(message);

  const sendButton = page.locator('[data-testid="chat-send-button"]');
  await sendButton.click();

  // ローディング終了を待つ
  await page.waitForTimeout(500);
  const loading = page.locator('[data-testid="chat-loading"]');
  if (await loading.isVisible()) {
    await expect(loading).not.toBeVisible({ timeout: 30000 });
  }

  // 最新のアシスタントメッセージを取得
  const assistantMessages = page.locator('[data-testid="chat-message-assistant"]');
  const count = await assistantMessages.count();
  if (count > 0) {
    return await assistantMessages.last().textContent() || '';
  }
  return '';
}

test.describe('AIチャットボット - UI表示', () => {
  test.describe.configure({ timeout: 60000 });

  test('AICHAT-001: 記録閲覧ページにチャットFABボタンが表示される', async ({ page }) => {
    await page.goto('/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    const fabButton = page.locator('[data-testid="chat-fab-button"]');
    await expect(fabButton).toBeVisible({ timeout: 10000 });
  });

  test('AICHAT-002: デモ記録閲覧ページにチャットFABボタンが表示される', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    const fabButton = page.locator('[data-testid="chat-fab-button"]');
    await expect(fabButton).toBeVisible({ timeout: 10000 });
  });

  test('AICHAT-003: FABクリックでチャットドロワーが開く', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    await openChatDrawer(page);

    const drawer = page.locator('[data-testid="chat-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('AICHAT-004: チャットドロワーに提案質問が表示される', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    await openChatDrawer(page);

    const suggestions = page.locator('[data-testid="chat-suggestion"]');
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });
  });

  test('AICHAT-005: メッセージ入力欄が表示される', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    await openChatDrawer(page);

    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toBeVisible();
  });
});

// 本番APIを使用するため、CI環境ではスキップ
// ローカルで個別にテストする場合: npx playwright test ai-chat-bot.spec.ts --grep "シート別クエリ"
test.describe.skip('AIチャットボット - シート別クエリ', () => {
  test.describe.configure({ timeout: 120000 });

  // 本番APIを使用するため、実際のデータが必要
  // デモモードでも本番plan_dataを使用するため動作する

  test('AICHAT-010: 食事に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '最近の食事の記録を教えて');

    // 食事関連のキーワードが含まれるか確認
    expect(
      response.includes('食事') ||
      response.includes('主食') ||
      response.includes('副食') ||
      response.includes('摂取') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-011: 水分摂取に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '水分摂取量について教えて');

    expect(
      response.includes('水分') ||
      response.includes('cc') ||
      response.includes('摂取') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-012: 排泄に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '排泄の記録を教えて');

    expect(
      response.includes('排便') ||
      response.includes('排尿') ||
      response.includes('排泄') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-013: バイタルに関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, 'バイタルの記録を教えて');

    expect(
      response.includes('バイタル') ||
      response.includes('血圧') ||
      response.includes('体温') ||
      response.includes('脈拍') ||
      response.includes('BP') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-014: 内服に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '内服の記録を教えて');

    expect(
      response.includes('内服') ||
      response.includes('服薬') ||
      response.includes('薬') ||
      response.includes('頓服') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-015: 体重に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '体重の記録を教えて');

    expect(
      response.includes('体重') ||
      response.includes('kg') ||
      response.includes('キロ') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-016: 口腔ケアに関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '口腔ケアの記録を教えて');

    expect(
      response.includes('口腔') ||
      response.includes('歯') ||
      response.includes('ケア') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-017: 血糖値に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '血糖値の記録を教えて');

    expect(
      response.includes('血糖') ||
      response.includes('インスリン') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-018: 往診に関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '往診の記録を教えて');

    expect(
      response.includes('往診') ||
      response.includes('医師') ||
      response.includes('ドクター') ||
      response.includes('診察') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-019: カンファレンスに関する質問に回答できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, 'カンファレンスの記録を教えて');

    expect(
      response.includes('カンファレンス') ||
      response.includes('会議') ||
      response.includes('記録がありません')
    ).toBe(true);
  });

  test('AICHAT-020: 頓服と排泄の関係について質問できる', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const response = await sendMessageAndWait(page, '頓服と排泄の関係について教えて');

    // 複数シートを参照した回答が得られる
    expect(
      response.includes('頓服') ||
      response.includes('排') ||
      response.includes('内服') ||
      response.includes('関係') ||
      response.includes('記録がありません')
    ).toBe(true);
  });
});

test.describe('AIチャットボット - エラーハンドリング', () => {
  test.describe.configure({ timeout: 60000 });

  test('AICHAT-030: 空メッセージは送信できない', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const input = page.locator('[data-testid="chat-input"]');
    await expect(input).toBeVisible();

    // 空のまま送信ボタンをクリック
    const sendButton = page.locator('[data-testid="chat-send-button"]');

    // 送信ボタンがdisabledであることを確認
    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('AICHAT-031: 提案質問をクリックするとAPI呼び出しが開始される', async ({ page }) => {
    await page.goto('/demo/view', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
    await openChatDrawer(page);

    const suggestions = page.locator('[data-testid="chat-suggestion"]');
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });

    // 最初の提案質問をクリック
    const firstSuggestion = suggestions.first();
    await firstSuggestion.click();

    // API呼び出し中は入力欄がdisabledになる
    const input = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="chat-send-button"]');

    // 入力欄または送信ボタンがdisabledになっていることを確認
    // （APIリクエスト中の状態）
    const inputDisabled = await input.isDisabled();
    const buttonDisabled = await sendButton.isDisabled();

    expect(inputDisabled || buttonDisabled).toBe(true);
  });
});
