/**
 * E2Eテスト: プリセットのインライン編集・新規追加（Phase 44）
 * 品物登録フォームから直接プリセットの編集・新規追加が可能
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

test.describe('プリセットインライン編集・新規追加（Phase 44）', () => {
  test.beforeEach(async ({ page }) => {
    // 家族デモの品物登録フォームに移動
    await page.goto(`${BASE_URL}/demo/family/items/new`);
  });

  test('PRESET-INLINE-001: 「+ 新規追加」ボタンが表示される', async ({ page }) => {
    // プリセットセクション内に「+ 新規追加」ボタンがあること
    const addButton = page.locator('button:has-text("+ 新規追加")');
    await expect(addButton).toBeVisible();
  });

  test('PRESET-INLINE-002: 「+ 新規追加」ボタンクリックでモーダルが開く', async ({ page }) => {
    // 「+ 新規追加」ボタンをクリック
    await page.click('button:has-text("+ 新規追加")');

    // モーダルが表示される
    const modal = page.locator('text=プリセットを追加');
    await expect(modal).toBeVisible();

    // プリセット名入力欄がある
    const nameInput = page.locator('input[placeholder="例: キウイ"]');
    await expect(nameInput).toBeVisible();
  });

  test('PRESET-INLINE-003: プリセットカードに編集アイコンが表示される（ホバー時）', async ({ page }) => {
    // プリセットカードをホバー
    const presetCard = page.locator('.grid.grid-cols-3 > div').first();
    await presetCard.hover();

    // 編集アイコン（✏️）が表示される
    const editButton = presetCard.locator('button[title="編集"]');
    await expect(editButton).toBeVisible();
  });

  test('PRESET-INLINE-004: 編集アイコンクリックでモーダルが開く', async ({ page }) => {
    // プリセットカードをホバー
    const presetCard = page.locator('.grid.grid-cols-3 > div').first();
    await presetCard.hover();

    // 編集アイコンをクリック
    await presetCard.locator('button[title="編集"]').click();

    // モーダルが「編集」モードで表示される
    const modal = page.locator('text=プリセットを編集');
    await expect(modal).toBeVisible();
  });

  test('PRESET-INLINE-005: 「📋 一覧で管理」リンクが表示される', async ({ page }) => {
    // 「📋 一覧で管理」リンクがある
    const manageLink = page.locator('a:has-text("📋 一覧で管理")');
    await expect(manageLink).toBeVisible();

    // リンク先が正しい
    await expect(manageLink).toHaveAttribute('href', '/demo/family/presets');
  });

  test('PRESET-INLINE-006: 新規追加モーダルで×ボタンを押すと閉じる', async ({ page }) => {
    // 「+ 新規追加」ボタンをクリック
    await page.click('button:has-text("+ 新規追加")');

    // モーダルが表示される
    await expect(page.locator('text=プリセットを追加')).toBeVisible();

    // ×ボタンをクリック
    await page.locator('.bg-white.rounded-xl button:has-text("×")').click();

    // モーダルが閉じる
    await expect(page.locator('text=プリセットを追加')).not.toBeVisible();
  });

  test('PRESET-INLINE-007: デモモードで保存するとアラートが表示される', async ({ page }) => {
    // ダイアログハンドラを設定
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('デモモード');
      await dialog.accept();
    });

    // 「+ 新規追加」ボタンをクリック
    await page.click('button:has-text("+ 新規追加")');

    // プリセット名を入力
    await page.fill('input[placeholder="例: キウイ"]', 'テストプリセット');

    // 保存ボタンをクリック
    await page.click('button:has-text("保存する")');

    // モーダルが閉じる（アラート後）
    await expect(page.locator('text=プリセットを追加')).not.toBeVisible({ timeout: 3000 });
  });

  test('PRESET-INLINE-008: プリセットカードクリックで適用される（編集モードでない場合）', async ({ page }) => {
    // プリセットカードの中央部分をクリック（編集アイコンではない）
    const presetCard = page.locator('.grid.grid-cols-3 > div').first();
    await presetCard.locator('button.w-full').click();

    // 品物名が入力されている
    const itemNameInput = page.locator('#itemName');
    const value = await itemNameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});
