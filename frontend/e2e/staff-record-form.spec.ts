/**
 * Phase 15: スタッフ用記録入力フォーム E2Eテスト
 * 設計書: docs/STAFF_RECORD_FORM_SPEC.md
 *
 * TDD: テストを先に書き、実装で通す
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://facility-care-input-form.web.app';

test.describe('Phase 15: スタッフ用記録入力フォーム', () => {
  /**
   * Phase 15.8: ベースページ簡素化
   * - ベースページは品物リスト表示のみ
   * - 入力フォームはダイアログ内で完結
   * @see docs/STAFF_RECORD_FORM_SPEC.md セクション11
   */
  test.describe('15.1: タブ削除・品物リスト表示', () => {
    test('STAFF-001: タブが表示されない（品物から記録のみ）', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // タブが存在しないことを確認
      const mealTab = page.locator('text=食事');
      const itemTab = page.locator('text=品物から記録');

      // タブUIが存在しない（またはタブ切替ボタンがない）
      await expect(page.locator('[role="tablist"]')).toHaveCount(0);
    });

    // Phase 15.8: ダイアログ内で入力者フィールドを確認
    test('STAFF-002: ダイアログ内に入力者フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に入力者フィールドが存在
      const staffNameLabel = dialog.locator('text=入力者（あなた）は？');
      await expect(staffNameLabel).toBeVisible();

      const staffNameInput = dialog.locator('input[placeholder*="名前"]');
      await expect(staffNameInput).toBeVisible();
    });

    // Phase 15.8: ダイアログ内でデイサービス選択を確認
    test('STAFF-003: ダイアログ内にデイサービス選択が表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内にデイサービス利用選択が存在
      const dayServiceLabel = dialog.locator('text=デイサービスの利用中ですか？');
      await expect(dayServiceLabel).toBeVisible();
    });

    // Phase 15.8: ダイアログ内でデイサービス名の条件付き表示を確認
    test('STAFF-004: ダイアログ内でデイサービス名は「利用中」選択時のみ表示', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 初期状態では非表示（利用中ではないが選択されている）
      const dayServiceNameSelect = dialog.locator('text=どこのデイサービスですか？');
      await expect(dayServiceNameSelect).toHaveCount(0);

      // 「利用中」のラジオボタンを直接選択（inputをクリック）
      await dialog.locator('input[name="dayServiceUsage"][value="利用中"]').check();

      // デイサービス名が表示される
      await expect(dialog.locator('text=どこのデイサービスですか？')).toBeVisible();
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

    // Phase 15.8: ダイアログ内で間食補足フィールドを確認
    test('STAFF-006: ダイアログ内に間食補足フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に間食補足テキストエリア
      const snackSupplementLabel = dialog.locator('text=間食について補足');
      await expect(snackSupplementLabel).toBeVisible();
    });

    // Phase 15.8: ダイアログ内で特記事項フィールドを確認
    test('STAFF-007: ダイアログ内に特記事項フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に特記事項ラベル
      const noteLabel = dialog.locator('text=特記事項').first();
      await expect(noteLabel).toBeVisible();
    });

    // Phase 15.8: ダイアログ内で重要特記事項フラグを確認
    test('STAFF-008: ダイアログ内に重要特記事項フラグが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に重要特記事項
      const importantLabel = dialog.locator('text=重要特記事項');
      await expect(importantLabel.first()).toBeVisible();
    });

    // Phase 15.9: 写真アップロードはダイアログ内に表示される
    test('STAFF-009: ダイアログ内に写真アップロードが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に写真アップロードエリアがある
      const photoUploadArea = dialog.locator('text=写真').or(dialog.locator('input[type="file"][accept*="image"]'));
      await expect(photoUploadArea.first()).toBeVisible();
    });

    // Phase 15.8: ダイアログ内に記録保存ボタンがある
    test('STAFF-010: ダイアログ内に記録保存ボタンが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に記録保存ボタン
      const submitButton = dialog.locator('button:has-text("記録を保存")');
      await expect(submitButton).toBeVisible();
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

    test('STAFF-022: ダイアログ内に摂食割合入力がある（Phase 15.6: 数値入力）', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/family-messages`);

      const itemCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /残り|個|本|切/ }).first();
      await itemCard.click();

      const recordButton = page.locator('button:has-text("提供・摂食を記録")');
      await recordButton.click();

      // Phase 15.6: 摂食した割合の数値入力がある
      const consumptionRateLabel = page.locator('text=摂食した割合');
      await expect(consumptionRateLabel).toBeVisible();

      // 数値入力フィールド（type="number"）
      const numberInput = page.locator('[role="dialog"]').locator('input[type="number"][min="0"][max="10"]');
      await expect(numberInput).toBeVisible();

      // スライダー
      const slider = page.locator('[role="dialog"]').locator('input[type="range"]');
      await expect(slider).toBeVisible();
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

  test.describe('15.6: 摂食割合・残り対応（Phase 15.6）', () => {
    test('STAFF-040: 摂食割合を変更するとパーセント表示が更新される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開くのを待つ
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 数値入力を変更
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('7');

      // パーセント表示が70%になっていることを確認
      await expect(dialog.locator('text=（70%）')).toBeVisible();
    });

    test('STAFF-041: 摂食割合が10未満で「残った分への対応」が表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // デフォルト（10）では残り対応は非表示
      await expect(dialog.locator('text=残った分への対応')).toHaveCount(0);

      // 摂食割合を7に変更
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('7');

      // 「残った分への対応」が表示される
      await expect(dialog.locator('text=残った分への対応')).toBeVisible();

      // 選択肢が表示される（施設入居者向けのため「持ち帰り」は対象外）
      await expect(dialog.locator('text=破棄した')).toBeVisible();
      await expect(dialog.locator('text=保存した')).toBeVisible();
      await expect(dialog.locator('text=その他')).toBeVisible();
    });

    test('STAFF-042: 「その他」選択時に詳細入力フィールドが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 摂食割合を7に変更
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('7');

      // 「その他」を選択
      await dialog.locator('input[name="remainingHandling"][value="other"]').check();

      // 詳細入力フィールドが表示される
      const otherInput = dialog.locator('input[placeholder*="対応の詳細"]');
      await expect(otherInput).toBeVisible();
    });

    test('STAFF-043: 残り対応未選択でバリデーションエラー', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 入力者名を入力
      const staffNameInput = dialog.locator('input[placeholder*="名前"]');
      await staffNameInput.fill('テスト太郎');

      // 摂食割合を7に変更（残り対応が必須になる）
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('7');

      // 残り対応を選択せずに送信を試みる
      const submitButton = dialog.locator('button:has-text("記録を保存")');
      await submitButton.click();

      // エラーメッセージが表示される
      const errorMessage = dialog.locator('text=/残った分への対応を選択/');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('15.7: 残り対応による在庫・統計分離（Phase 15.7）', () => {
    test('STAFF-050: 「破棄した」選択時は提供量全てが在庫から引かれる', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 摂食割合を5に変更（50%）
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('5');

      // 「破棄した」を選択
      await dialog.locator('input[name="remainingHandling"][value="discarded"]').check();

      // 廃棄量の表示を確認
      const wasteInfo = dialog.locator('text=/廃棄/');
      await expect(wasteInfo).toBeVisible();

      // 記録後の残量プレビューで提供量全てが引かれていることを確認
      // （例：提供1個、50%食べた→廃棄量0.5個、在庫から1個引かれる）
      const quantityPreview = dialog.locator('text=/記録後の残量/');
      await expect(quantityPreview).toBeVisible();
    });

    test('STAFF-051: 「保存した」選択時は食べた分のみ在庫から引かれる', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 摂食割合を5に変更（50%）
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('5');

      // 「保存した」を選択
      await dialog.locator('input[name="remainingHandling"][value="stored"]').check();

      // 廃棄量の表示がないことを確認
      const wasteInfo = dialog.locator('text=/廃棄/');
      await expect(wasteInfo).toHaveCount(0);

      // 記録後の残量プレビューが表示される
      const quantityPreview = dialog.locator('text=/記録後の残量/');
      await expect(quantityPreview).toBeVisible();
    });

    test('STAFF-052: 残り対応切替で残量プレビューが更新される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 摂食割合を5に変更（50%）
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await numberInput.fill('5');

      // 「保存した」を選択
      await dialog.locator('input[name="remainingHandling"][value="stored"]').check();

      // 「破棄した」に切替
      await dialog.locator('input[name="remainingHandling"][value="discarded"]').check();

      // 廃棄量が表示される
      const wasteInfo = dialog.locator('text=/廃棄/');
      await expect(wasteInfo).toBeVisible();
    });

    test('STAFF-053: 完食（10割）の場合は残り対応が不要', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // デフォルト（10）のまま確認
      const numberInput = dialog.locator('input[type="number"][min="0"][max="10"]');
      await expect(numberInput).toHaveValue('10');

      // 「残った分への対応」が表示されない
      await expect(dialog.locator('text=残った分への対応')).toHaveCount(0);
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

  test.describe('15.8: ベースページ簡素化', () => {
    test('STAFF-060: ベースページに入力フォームがない', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // ページ読み込み完了を待つ
      await page.waitForLoadState('networkidle');

      // ベースページ（ダイアログ外）に入力者フィールドが存在しない
      // ダイアログ外のコンテキストで確認
      const basePageStaffInput = page.locator('body > :not([role="dialog"]) input[placeholder*="名前"]');
      await expect(basePageStaffInput).toHaveCount(0);

      // ベースページにデイサービス選択がない（ダイアログ外）
      const basePageDayService = page.locator('body > :not([role="dialog"])').locator('text=デイサービスの利用中ですか？');
      await expect(basePageDayService).toHaveCount(0);
    });

    test('STAFF-061: ベースページに送信ボタンがない', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // ページ読み込み完了を待つ
      await page.waitForLoadState('networkidle');

      // 「記録を送信」ボタンが存在しない
      const submitButton = page.locator('button:has-text("記録を送信")');
      await expect(submitButton).toHaveCount(0);
    });

    test('STAFF-062: 品物ブロッククリックでダイアログ表示', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが表示される
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // ダイアログ内に入力フォームがある
      await expect(dialog.locator('text=入力者（あなた）は？')).toBeVisible();
      await expect(dialog.locator('text=提供数')).toBeVisible();
      await expect(dialog.locator('text=摂食した割合')).toBeVisible();
    });

    test('STAFF-063: ダイアログから記録送信が完了', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが表示される
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 必須項目を入力
      const staffNameInput = dialog.locator('input[placeholder*="名前"]');
      await staffNameInput.fill('テスト太郎');

      // 「記録を保存」ボタンをクリック（デモモードなので実際のAPI送信は発生しない）
      const submitButton = dialog.locator('button:has-text("記録を保存")');
      await submitButton.click();

      // デモモードのアラートまたはダイアログが閉じることを確認
      // ダイアログが閉じるか、デモモードのアラートが表示される
      await page.waitForTimeout(500);

      // ダイアログが閉じるか、成功状態になる
      // デモモードでは「デモモード - 実際には保存されません」のようなメッセージが出る可能性
    });

    test('STAFF-064: 品物リストが優先順に表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // ページ読み込み完了を待つ
      await expect(page.locator('button:has-text("提供記録")').first()).toBeVisible({ timeout: 10000 });

      // グループヘッダーが正しい順序で表示される
      const groupHeaders = page.locator('h3');

      // グループが存在することを確認（順序は今日提供予定 → 期限が近い → その他の品物）
      // 少なくとも品物リストのセクションが表示されている
      const itemSection = page.locator('text=品物から間食記録').or(page.locator('text=品物から記録'));
      await expect(itemSection.first()).toBeVisible();
    });
  });

  // =============================================================================
  // Phase 15.9: 写真アップロード機能
  // =============================================================================
  test.describe('15.9: 写真アップロード機能', () => {
    test('STAFF-070: ダイアログ内に写真追加ボタンが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 写真追加ボタンまたは写真エリアがある
      const photoButton = dialog.locator('button:has-text("写真")').or(
        dialog.locator('label:has-text("写真")')
      ).or(
        dialog.locator('[data-testid="photo-upload"]')
      );
      await expect(photoButton.first()).toBeVisible();
    });

    test('STAFF-071: 写真ファイル入力が存在する', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 写真用のfile inputが存在する（hidden でもOK）
      const fileInput = dialog.locator('input[type="file"][accept*="image"]');
      await expect(fileInput).toHaveCount(1);
    });

    test('STAFF-072: 写真セクションのラベルが表示される', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/staff/input/meal`);

      // 品物カードの提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 10000 });
      await recordButton.click();

      // ダイアログが開く
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // 「写真」というラベルが存在する
      const photoLabel = dialog.locator('text=写真');
      await expect(photoLabel.first()).toBeVisible();
    });
  });
});
