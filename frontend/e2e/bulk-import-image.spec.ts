/**
 * 画像一括登録 E2Eテスト (Phase 68)
 *
 * 画像からの品物一括登録機能をテストします。
 * - タブUI切り替え
 * - 画像アップロードUI
 * - デモモードでの解析・登録フロー
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// SPAのロード完了を待つヘルパー
async function waitForSpaLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('画像一括登録機能', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/family/items/bulk-import', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);
  });

  test('IMG-001: 一括登録ページにタブUIが表示される', async ({ page }) => {
    // Excelタブが表示される
    await expect(page.getByRole('button', { name: /Excelファイル/ })).toBeVisible({ timeout: 10000 });

    // 画像タブが表示される
    await expect(page.getByRole('button', { name: /画像から読み取り/ })).toBeVisible({ timeout: 10000 });
  });

  test('IMG-002: デフォルトでExcelタブが選択されている', async ({ page }) => {
    // Excelタブがアクティブ（青系の色）
    const excelTab = page.getByRole('button', { name: /Excelファイル/ });
    await expect(excelTab).toHaveClass(/bg-blue-50/);

    // テンプレートダウンロードボタンが表示される
    await expect(page.getByRole('button', { name: /テンプレートをダウンロード/ })).toBeVisible({ timeout: 10000 });
  });

  test('IMG-003: 画像タブをクリックすると画像アップロードUIが表示される', async ({ page }) => {
    // 画像タブをクリック
    await page.getByRole('button', { name: /画像から読み取り/ }).click();
    await page.waitForTimeout(500);

    // 画像タブがアクティブ（緑系の色）
    const imageTab = page.getByRole('button', { name: /画像から読み取り/ });
    await expect(imageTab).toHaveClass(/bg-green-50/);

    // 画像アップロードの説明文が表示される
    await expect(page.getByText('食事スケジュール表の写真をアップロード')).toBeVisible({ timeout: 10000 });

    // ヒントが表示される
    await expect(page.getByText('読み取りのヒント')).toBeVisible({ timeout: 10000 });
  });

  test('IMG-004: 画像タブで対応形式が表示される', async ({ page }) => {
    await page.getByRole('button', { name: /画像から読み取り/ }).click();
    await page.waitForTimeout(500);

    // 対応形式の説明が表示される
    await expect(page.getByText(/JPEG, PNG, WebP/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/最大5MB/)).toBeVisible({ timeout: 10000 });
  });

  test('IMG-005: タブを切り替えても状態がリセットされる', async ({ page }) => {
    // 画像タブに切り替え
    await page.getByRole('button', { name: /画像から読み取り/ }).click();
    await page.waitForTimeout(500);

    // Excelタブに戻る
    await page.getByRole('button', { name: /Excelファイル/ }).click();
    await page.waitForTimeout(500);

    // Excelタブの内容が表示される
    await expect(page.getByRole('button', { name: /テンプレートをダウンロード/ })).toBeVisible({ timeout: 10000 });
  });

  test('IMG-006: デモモードで画像解析がモックデータを返す', async ({ page }) => {
    // 画像タブに切り替え
    await page.getByRole('button', { name: /画像から読み取り/ }).click();
    await page.waitForTimeout(500);

    // テスト用のダミー画像を作成してアップロード
    // 実際のE2Eテストでは、テスト用の画像ファイルを用意するか、
    // ファイル選択をシミュレートする必要があります。
    // ここではファイル入力のシミュレーションを行います。

    // 1x1ピクセルのダミーPNG（base64）
    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dummyPngBuffer = Buffer.from(dummyPngBase64, 'base64');

    // ファイル入力を取得してファイルを設定（capture属性なしの通常のファイル選択用）
    const fileInput = page.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles({
      name: 'test-schedule.png',
      mimeType: 'image/png',
      buffer: dummyPngBuffer,
    });

    // 解析中の表示を待つ
    await expect(page.getByText('画像を解析中')).toBeVisible({ timeout: 10000 });

    // プレビュー画面に遷移することを確認（デモモードではモックデータが返る）
    await expect(page.getByText('プレビュー')).toBeVisible({ timeout: 20000 });

    // デモモードのモックデータが表示される（バナナ、りんごジュース、みかん）
    await expect(page.getByText('バナナ')).toBeVisible({ timeout: 10000 });
  });

  test('IMG-007: プレビュー画面で「画像を選び直す」ボタンが機能する', async ({ page }) => {
    // 画像タブに切り替えて画像をアップロード
    await page.getByRole('button', { name: /画像から読み取り/ }).click();
    await page.waitForTimeout(500);

    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dummyPngBuffer = Buffer.from(dummyPngBase64, 'base64');

    const fileInput = page.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles({
      name: 'test-schedule.png',
      mimeType: 'image/png',
      buffer: dummyPngBuffer,
    });

    // プレビュー画面を待つ
    await expect(page.getByText('プレビュー')).toBeVisible({ timeout: 20000 });

    // 「画像を選び直す」ボタンをクリック
    await page.getByRole('button', { name: '画像を選び直す' }).click();
    await page.waitForTimeout(500);

    // アップロード画面に戻る
    await expect(page.getByText('食事スケジュール表の写真をアップロード')).toBeVisible({ timeout: 10000 });
  });

  test('IMG-008: デモモードで一括登録が完了する', async ({ page }) => {
    // 画像タブに切り替えて画像をアップロード
    await page.getByRole('button', { name: /画像から読み取り/ }).click();
    await page.waitForTimeout(500);

    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const dummyPngBuffer = Buffer.from(dummyPngBase64, 'base64');

    const fileInput = page.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles({
      name: 'test-schedule.png',
      mimeType: 'image/png',
      buffer: dummyPngBuffer,
    });

    // プレビュー画面を待つ
    await expect(page.getByRole('heading', { name: 'プレビュー' })).toBeVisible({ timeout: 20000 });

    // 登録ボタンをクリック
    const registerButton = page.getByRole('button', { name: /件を登録する/ });
    await expect(registerButton).toBeVisible({ timeout: 10000 });
    await registerButton.click();

    // 確認ダイアログが表示される
    await expect(page.locator('h3').filter({ hasText: '品物の一括登録' })).toBeVisible({ timeout: 10000 });

    // 確認ボタンをクリック（ダイアログ内の「登録する」ボタン）
    await page.getByRole('button', { name: '登録する', exact: true }).click();

    // 完了画面が表示される
    await expect(page.getByText('登録が完了しました')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/登録成功:/)).toBeVisible({ timeout: 10000 });
  });
});
