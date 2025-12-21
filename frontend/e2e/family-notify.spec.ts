/**
 * Phase 30: 家族操作・入力無し通知 E2Eテスト
 *
 * 設定モーダルでの familyNotifyWebhookUrl 設定機能をテスト
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 30: 家族操作・入力無し通知設定', () => {
  test.beforeEach(async ({ page }) => {
    // 設定モーダルを開く（管理者モード）
    await page.goto('/staff/input/meal?admin=true');
    await page.waitForLoadState('networkidle');
  });

  test('SETTINGS-030-001: 設定モーダルに監視通知Webhook URL欄が表示される', async ({ page }) => {
    // 設定アイコンをクリック
    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // モーダルが開く
    const modal = page.locator('text=グローバル初期値設定');
    await expect(modal).toBeVisible();

    // 「家族・入力監視 通知設定」セクションが表示される
    await expect(page.locator('text=家族・入力監視 通知設定')).toBeVisible();

    // 監視通知Webhook URLラベルが表示される
    await expect(page.locator('text=監視通知Webhook URL')).toBeVisible();

    // 入力欄が存在する
    const webhookInput = page.locator('input[placeholder*="chat.googleapis.com"]').nth(2);
    await expect(webhookInput).toBeVisible();

    // テスト送信ボタンが存在する
    const testButtons = page.locator('button:has-text("テスト送信")');
    await expect(testButtons).toHaveCount(3); // 通常、重要、監視の3つ
  });

  test.skip('SETTINGS-030-002: 監視通知Webhook URLの保存と復元（本番API依存）', async ({ page }) => {
    // このテストは本番APIへの接続が必要なためスキップ
    // 本番環境での動作確認は手動で実施
    const testUrl = 'https://chat.googleapis.com/v1/spaces/test-family-notify';

    // 設定モーダルを開く
    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 監視通知Webhook URLを入力
    const webhookInput = page.locator('input[placeholder*="chat.googleapis.com"]').nth(2);
    await webhookInput.fill(testUrl);

    // 保存ボタンをクリック
    await page.locator('button:has-text("保存")').click();

    // 成功メッセージが表示される
    await expect(page.locator('text=設定を保存しました')).toBeVisible({ timeout: 5000 });

    // モーダルを再度開く
    await page.waitForTimeout(2000);
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 保存した値が復元されている
    await expect(webhookInput).toHaveValue(testUrl);
  });

  test('SETTINGS-030-003: 空のURLでテスト送信するとエラー表示', async ({ page }) => {
    // 設定モーダルを開く
    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 監視通知Webhook URLを空にする
    const webhookInput = page.locator('input[placeholder*="chat.googleapis.com"]').nth(2);
    await webhookInput.fill('');

    // テスト送信ボタンをクリック（3番目）
    const testButton = page.locator('button:has-text("テスト送信")').nth(2);

    // ボタンがdisabledになっている（空の場合）
    await expect(testButton).toBeDisabled();
  });

  test('SETTINGS-030-004: 不正なURLプレフィックスでテスト送信するとエラー表示', async ({ page }) => {
    // 設定モーダルを開く
    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 不正なURLを入力
    const webhookInput = page.locator('input[placeholder*="chat.googleapis.com"]').nth(2);
    await webhookInput.fill('https://example.com/webhook');

    // テスト送信ボタンをクリック
    const testButton = page.locator('button:has-text("テスト送信")').nth(2);
    await testButton.click();

    // エラーメッセージが表示される
    await expect(page.locator('text=https://chat.googleapis.com/')).toBeVisible({ timeout: 3000 });
  });

  test('SETTINGS-030-005: 説明文が正しく表示される', async ({ page }) => {
    // 設定モーダルを開く
    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 説明文が表示される
    await expect(page.locator('text=品物登録・編集時、16時入力無し時に通知')).toBeVisible();
  });

  test('SETTINGS-030-006: キャンセル時に入力値がリセットされる', async ({ page }) => {
    const testUrl = 'https://chat.googleapis.com/v1/spaces/test-cancel';

    // 設定モーダルを開く
    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 現在の値を確認
    const webhookInput = page.locator('input[placeholder*="chat.googleapis.com"]').nth(2);
    const originalValue = await webhookInput.inputValue();

    // 新しい値を入力
    await webhookInput.fill(testUrl);

    // キャンセルボタンをクリック
    await page.locator('button:has-text("キャンセル")').click();
    await page.waitForTimeout(500);

    // モーダルを再度開く
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 元の値に戻っている
    await expect(webhookInput).toHaveValue(originalValue);
  });

  test.skip('SETTINGS-030-007: クリア操作でfamilyNotifyWebhookUrlもクリアされる（本番API依存）', async ({ page }) => {
    // このテストは本番APIへの接続が必要なためスキップ
    // 本番環境での動作確認は手動で実施
    const testUrl = 'https://chat.googleapis.com/v1/spaces/test-clear';

    const settingsButton = page.locator('button').filter({ has: page.locator('svg path[d*="10.325"]') }).first();
    await settingsButton.click();
    await page.waitForTimeout(500);

    const webhookInput = page.locator('input[placeholder*="chat.googleapis.com"]').nth(2);
    await webhookInput.fill(testUrl);
    await page.locator('button:has-text("保存")').click();
    await page.waitForTimeout(2000);

    // 再度モーダルを開く
    await settingsButton.click();
    await page.waitForTimeout(500);

    // 全設定をクリアをクリック
    await page.locator('text=全設定をクリア').click();
    await page.waitForTimeout(300);

    // 確認ダイアログでクリアを選択
    await page.locator('button:has-text("クリア")').last().click();

    // 成功メッセージ
    await expect(page.locator('text=設定をクリアしました')).toBeVisible({ timeout: 5000 });

    // 再度モーダルを開いて確認
    await page.waitForTimeout(2000);
    await settingsButton.click();
    await page.waitForTimeout(500);

    // クリアされている
    await expect(webhookInput).toHaveValue('');
  });
});
