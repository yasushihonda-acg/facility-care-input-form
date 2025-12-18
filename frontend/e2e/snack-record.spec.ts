/**
 * 間食記録連携 E2Eテスト
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md - Phase 6
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('間食記録連携機能', () => {
  test.describe('品物リスト表示', () => {
    test('SNACK-001: 食事入力ページに間食セクションが表示される', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 間食セクションのヘッダーが表示される（h3タグを指定）
      await expect(page.getByRole('heading', { name: '間食について' })).toBeVisible({ timeout: 10000 });
    });

    test('SNACK-002: 在庫あり品物がリスト表示される（デモモード）', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 「家族からの品物」セクションが表示される
      await expect(page.getByText('【家族からの品物】')).toBeVisible({ timeout: 10000 });

      // デモデータの品物が表示される（demoCareItemsより - 羊羹はpending/in_progressで在庫あり）
      await expect(page.getByText('羊羹').first()).toBeVisible({ timeout: 10000 });
    });

    test('SNACK-003: 品物に家族指示が表示される', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 品物リストが表示されるまで待機
      await expect(page.getByText('【家族からの品物】')).toBeVisible({ timeout: 10000 });

      // 家族指示が表示される（demoCareItemsのnoteToStaffフィールド - 羊羹: 1日1切れまで）
      await expect(page.getByText('1日1切れまで').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('提供記録入力UI', () => {
    // ヘルパー: 品物カード内の「提供記録」ボタンをクリック
    async function selectItem(page: Page, itemName: string) {
      // 品物リストが表示されるまで待機
      await expect(page.getByText('【家族からの品物】')).toBeVisible({ timeout: 10000 });

      // 品物カードを見つける（h4要素で品物名を探し、その親カードを特定）
      // FamilyItemCardはdivで、内部にh4でitemNameが表示される
      const itemHeading = page.locator('h4').filter({ hasText: itemName }).first();
      // 親のカード(border rounded-lgを持つdiv)を探す
      const itemCard = itemHeading.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
      // そのカード内の「提供記録」ボタンをクリック
      await itemCard.getByRole('button', { name: /提供記録/ }).click();
    }

    test('SNACK-010: 品物を選択すると提供記録カードが表示される', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 羊羹の「提供記録」ボタンをクリック
      await selectItem(page, '羊羹');

      // 提供記録セクションが表示される
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });
    });

    test('SNACK-011: 品物選択時にサジェスト量が設定される', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 羊羹を選択（1日1切れまでの指示あり → サジェスト量は1）
      await selectItem(page, '羊羹');

      // 提供記録セクションが表示されるまで待機
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });

      // 提供数入力欄の値が1になっている
      const quantityInput = page.locator('input[type="number"]').first();
      await expect(quantityInput).toHaveValue('1');
    });

    test('SNACK-012: 摂食状況を選択できる', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 品物を選択
      await selectItem(page, '羊羹');

      // 提供記録セクションが表示されるまで待機
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });

      // デフォルトで完食が選択されている（「ほぼ完食」を除外するため exact match に近い形で）
      const fullButton = page.getByRole('button', { name: '😋 完食' });
      await expect(fullButton).toHaveClass(/bg-primary/);

      // 半分を選択
      await page.getByRole('button', { name: '😐 半分' }).click();

      // 半分が選択状態になる
      const halfButton = page.getByRole('button', { name: '😐 半分' });
      await expect(halfButton).toHaveClass(/bg-primary/);
    });

    test('SNACK-013: 品物を選択解除できる', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 品物を選択
      await selectItem(page, '羊羹');

      // 提供記録が表示される
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });

      // 削除ボタンをクリック
      await page.getByRole('button', { name: '羊羹を削除' }).click();

      // 提供記録セクションが消える（0件になるため表示されなくなる）
      await expect(page.getByText('【今回の提供記録】')).not.toBeVisible();
    });

    test('SNACK-014: 家族へのメモを入力できる', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 品物を選択
      await selectItem(page, '羊羹');

      // 提供記録セクションが表示されるまで待機
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });

      // 家族へのメモ入力欄が表示される
      await expect(page.getByText('家族へのメモ（任意）')).toBeVisible();

      // メモを入力
      const noteInput = page.getByPlaceholder('おいしそうに召し上がっていました');
      await noteInput.fill('とても喜んでいました');

      // 入力値が反映される
      await expect(noteInput).toHaveValue('とても喜んでいました');
    });
  });

  test.describe('サジェスト表示', () => {
    // ヘルパー: 品物カード内の「提供記録」ボタンをクリック
    async function selectItem(page: Page, itemName: string) {
      await expect(page.getByText('【家族からの品物】')).toBeVisible({ timeout: 10000 });
      const itemHeading = page.locator('h4').filter({ hasText: itemName }).first();
      const itemCard = itemHeading.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
      await itemCard.getByRole('button', { name: /提供記録/ }).click();
    }

    test('SNACK-020: サジェスト理由が表示される', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 品物を選択
      await selectItem(page, '羊羹');

      // 提供記録セクションが表示されるまで待機
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });

      // サジェスト理由が表示される（指示より: ...）
      await expect(page.getByText('指示より:').first()).toBeVisible({ timeout: 5000 });
    });

    test('SNACK-021: 在庫残量が表示される', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 品物を選択
      await selectItem(page, '羊羹');

      // 提供記録セクションが表示されるまで待機
      await expect(page.getByText('【今回の提供記録】')).toBeVisible({ timeout: 5000 });

      // 在庫残量が表示される（残り X切れ）
      await expect(page.getByText(/残り.*切れ/).first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('自由テキスト入力（従来互換）', () => {
    test('SNACK-030: 間食補足テキストを入力できる', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // 自由テキスト入力欄が表示される
      await expect(page.getByText('間食について補足（自由記入）')).toBeVisible({ timeout: 10000 });

      // テキストを入力
      const freeTextInput = page.getByPlaceholder('その他の間食について記入');
      await freeTextInput.fill('持参のゼリーを少し');

      // 入力値が反映される
      await expect(freeTextInput).toHaveValue('持参のゼリーを少し');
    });
  });
});
