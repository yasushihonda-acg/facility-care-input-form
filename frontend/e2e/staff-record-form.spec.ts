/**
 * Phase 15: スタッフ用記録入力フォーム E2Eテスト
 * 設計書: docs/STAFF_RECORD_FORM_SPEC.md
 *
 * TDD: テストを先に書き、実装で通す
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://facility-care-input-form.web.app';

test.describe('Phase 15: スタッフ用記録入力フォーム', () => {
  test.describe('15.1: タブ削除・フォーム統一', () => {
    test('STAFF-001: タブが表示されない（品物から記録のみ）', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // タブが存在しないことを確認
      const mealTab = page.locator('text=食事');
      const itemTab = page.locator('text=品物から記録');

      // タブUIが存在しない（またはタブ切替ボタンがない）
      await expect(page.locator('[role="tablist"]')).toHaveCount(0);
    });

    test('STAFF-002: 入力者フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 入力者フィールドが存在
      const staffNameLabel = page.locator('text=入力者（あなた）は？');
      await expect(staffNameLabel).toBeVisible();

      const staffNameInput = page.locator('input[placeholder*="名前"]');
      await expect(staffNameInput).toBeVisible();
    });

    test('STAFF-003: デイサービス選択が表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // デイサービス利用選択が存在
      const dayServiceLabel = page.locator('text=デイサービスの利用中ですか？');
      await expect(dayServiceLabel).toBeVisible();

      // ラジオボタン
      const yesRadio = page.locator('text=利用中').first();
      const noRadio = page.locator('text=利用中ではない');
      await expect(yesRadio).toBeVisible();
      await expect(noRadio).toBeVisible();
    });

    test('STAFF-004: デイサービス名は「利用中」選択時のみ表示', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 初期状態では非表示（利用中ではないが選択されている）
      const dayServiceNameSelect = page.locator('text=どこのデイサービスですか？');
      await expect(dayServiceNameSelect).toHaveCount(0);

      // 「利用中」のラジオボタンを直接選択（inputをクリック）
      await page.locator('input[name="dayServiceUsage"][value="利用中"]').check();

      // デイサービス名が表示される
      await expect(page.locator('text=どこのデイサービスですか？')).toBeVisible();
    });

    test('STAFF-005: 品物リストが直接表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物リストのヘッダーが表示される
      const itemListHeader = page.locator('text=品物から記録').or(page.locator('text=品物から間食記録'));
      await expect(itemListHeader.first()).toBeVisible();

      // 品物カードが表示される（デモデータ）
      const itemCards = page.locator('[class*="rounded-lg"][class*="border"]');
      await expect(itemCards.first()).toBeVisible({ timeout: 10000 });
    });

    test('STAFF-006: 間食補足フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // スクロールして下部を表示
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // 間食補足テキストエリア
      const snackSupplementLabel = page.locator('text=間食について補足');
      await expect(snackSupplementLabel).toBeVisible();
    });

    test('STAFF-007: 特記事項フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 特記事項ラベルを探す（「重要特記事項」を除外する正確なマッチ）
      const noteLabel = page.locator('label').filter({ hasText: /^特記事項$/ });

      // スクロールして要素を表示
      await noteLabel.scrollIntoViewIfNeeded();

      // 特記事項テキストエリア
      await expect(noteLabel).toBeVisible();
    });

    test('STAFF-008: 重要特記事項フラグが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // スクロールして下部を表示
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // 重要特記事項
      const importantLabel = page.locator('text=重要特記事項');
      await expect(importantLabel.first()).toBeVisible();
    });

    test('STAFF-009: 写真アップロードが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // スクロールして下部を表示
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // 写真アップロード
      const photoLabel = page.locator('text=写真');
      await expect(photoLabel.first()).toBeVisible();
    });

    test('STAFF-010: 送信ボタンが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // スクロールして下部を表示
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // 送信ボタン
      const submitButton = page.locator('button:has-text("送信"), button:has-text("記録")');
      await expect(submitButton.first()).toBeVisible();
    });

    test('STAFF-011: 食事関連フィールドが削除されている', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 削除された項目が存在しないことを確認
      const mealTimeLabel = page.locator('text=食事はいつのことですか');
      const mainDishLabel = page.locator('text=主食の摂取量');
      const sideDishLabel = page.locator('text=副食の摂取量');
      const injectionLabel = page.locator('text=注入の種類');

      await expect(mealTimeLabel).toHaveCount(0);
      await expect(mainDishLabel).toHaveCount(0);
      await expect(sideDishLabel).toHaveCount(0);
      await expect(injectionLabel).toHaveCount(0);
    });

    test('STAFF-012: 施設名・利用者名が非表示', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 施設名・利用者名のラベルが表示されていない
      const facilityLabel = page.locator('text=利用者様のお住まいの施設は');
      const residentLabel = page.locator('text=利用者名は');

      await expect(facilityLabel).toHaveCount(0);
      await expect(residentLabel).toHaveCount(0);
    });
  });

  test.describe('15.3: 家族連絡詳細からのダイアログ', () => {
    test('STAFF-020: 提供・摂食記録ボタンでダイアログが開く', async ({ page }) => {
      // 家族連絡一覧に移動
      await page.goto(`${BASE_URL}/demo/staff/family-messages`);

      // 品物カードをクリック
      const itemCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /残り|個|本|切/ }).first();
      await itemCard.click();

      // 詳細ページで「提供・摂食を記録する」ボタンをクリック
      const recordButton = page.locator('button:has-text("提供・摂食を記録")');
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"], .fixed.inset-0');
      await expect(dialog).toBeVisible();

      // ダイアログ内に統一フォーム項目がある
      await expect(page.locator('text=入力者（あなた）は')).toBeVisible();
    });

    test('STAFF-021: ダイアログに品物情報が自動表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/family-messages`);

      // 品物カードをクリック
      const itemCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /残り|個|本|切/ }).first();
      await itemCard.click();

      // 詳細ページで「提供・摂食を記録する」ボタンをクリック
      const recordButton = page.locator('button:has-text("提供・摂食を記録")');
      await recordButton.click();

      // ダイアログ内に品物情報が表示されている
      const itemInfo = page.locator('.fixed').locator('text=/残り.*[0-9]/');
      await expect(itemInfo).toBeVisible();
    });

    test('STAFF-022: ダイアログ内に摂食状況選択がある', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/family-messages`);

      const itemCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /残り|個|本|切/ }).first();
      await itemCard.click();

      const recordButton = page.locator('button:has-text("提供・摂食を記録")');
      await recordButton.click();

      // 摂食状況選択がある
      const consumptionStatus = page.locator('text=摂食状況').or(page.locator('text=完食'));
      await expect(consumptionStatus.first()).toBeVisible();
    });

    test('STAFF-023: ダイアログを閉じることができる', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/family-messages`);

      const itemCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /残り|個|本|切/ }).first();
      await itemCard.click();

      const recordButton = page.locator('button:has-text("提供・摂食を記録")');
      await recordButton.click();

      // 閉じるボタンをクリック
      const closeButton = page.locator('button:has-text("キャンセル"), button:has-text("✕"), button[aria-label*="閉じる"]').first();
      await closeButton.click();

      // ダイアログが閉じる
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toHaveCount(0);
    });
  });

  test.describe('15.4: バリデーション・送信', () => {
    test('STAFF-030: 入力者名が空の場合はエラー', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // モーダルが開くのを待つ
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // モーダル内で送信を試みる（入力者名空のまま）
      const submitButton = dialog.locator('button:has-text("記録を保存")');
      await submitButton.click();

      // エラーメッセージが表示される
      const errorMessage = dialog.locator('text=/入力者名を入力/');
      await expect(errorMessage).toBeVisible();
    });

    test('STAFF-031: デイサービス利用中でデイサービス名未選択はエラー', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // モーダルが開くのを待つ
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // モーダル内で入力者名を入力
      const staffNameInput = dialog.locator('input[placeholder*="名前"]');
      await staffNameInput.fill('テスト太郎');

      // 「利用中」を選択（ラジオボタンの入力要素をクリック）
      const yesRadio = dialog.locator('input[name="dayServiceUsage"][value="利用中"]');
      await yesRadio.click();

      // デイサービス名フィールドが表示されるのを待つ
      const dayServiceSelect = dialog.locator('text=どこのデイサービスですか？');
      await expect(dayServiceSelect).toBeVisible();

      // 送信を試みる（デイサービス名未選択）
      const submitButton = dialog.locator('button:has-text("記録を保存")');
      await submitButton.click();

      // デイサービス名未選択のエラーメッセージが表示される
      const errorMessage = dialog.locator('text=/デイサービスを選択してください/');
      await expect(errorMessage).toBeVisible();
    });
  });
});
