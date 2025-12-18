/**
 * Phase 13.1: スケジュール拡張 E2Eテスト
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション5.2
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://facility-care-input-form.web.app';

test.describe('Phase 13.1: スケジュール拡張', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    // デモの品物登録ページに移動
    await page.goto(`${BASE_URL}/demo/family/items/new`);
    await page.waitForLoadState('networkidle');
  });

  test.describe('スケジュール入力UI', () => {
    test('SCHED-001: スケジュールタイプを切り替えできる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      const scheduleButton = page.locator('button:has-text("スケジュールを設定")');
      await expect(scheduleButton).toBeVisible();
      await scheduleButton.click();

      // タイプ選択ボタンが表示される
      await expect(page.locator('button:has-text("特定の日")')).toBeVisible();
      await expect(page.locator('button:has-text("毎日")')).toBeVisible();
      await expect(page.locator('button:has-text("曜日指定")')).toBeVisible();
      await expect(page.locator('button:has-text("複数日指定")')).toBeVisible();

      // デフォルトは「特定の日」が選択されている
      const onceButton = page.locator('button:has-text("特定の日")');
      await expect(onceButton).toHaveClass(/bg-blue-500/);

      // 「毎日」に切り替え
      await page.locator('button:has-text("毎日")').click();
      const dailyButton = page.locator('button:has-text("毎日")');
      await expect(dailyButton).toHaveClass(/bg-blue-500/);

      // メッセージが表示される
      await expect(page.locator('text=毎日、選択したタイミングで提供します')).toBeVisible();
    });

    test('SCHED-002: 曜日を選択できる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      await page.locator('button:has-text("スケジュールを設定")').click();

      // 曜日指定に切り替え
      await page.locator('button:has-text("曜日指定")').click();

      // 曜日選択UIが表示される（labelを指定）
      await expect(page.locator('label:has-text("曜日を選択")')).toBeVisible();

      // 日〜土のボタンが表示される
      const weekdayButtons = page.locator('button[aria-label*="曜日"]');
      await expect(weekdayButtons).toHaveCount(7);

      // 月・水・金を選択（aria-labelは曜日で始まるボタンを特定）
      await page.locator('button[aria-label^="月曜日"]').click();
      await page.locator('button[aria-label^="水曜日"]').click();
      await page.locator('button[aria-label^="金曜日"]').click();

      // 選択されたボタンは bg-blue-500 になる（選択後はaria-labelが「〇曜日選択中」に変わる）
      await expect(page.locator('button[aria-label="月曜日選択中"]')).toHaveClass(/bg-blue-500/);
      await expect(page.locator('button[aria-label="水曜日選択中"]')).toHaveClass(/bg-blue-500/);
      await expect(page.locator('button[aria-label="金曜日選択中"]')).toHaveClass(/bg-blue-500/);

      // プレビュー表示を確認
      await expect(page.locator('text=月・水・金')).toBeVisible();
    });

    test('SCHED-003: 複数日を追加・削除できる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      await page.locator('button:has-text("スケジュールを設定")').click();

      // 複数日指定に切り替え
      await page.locator('button:has-text("複数日指定")').click();

      // 日付入力と追加ボタンが表示される
      await expect(page.locator('label:has-text("日付を選択")')).toBeVisible();

      // 複数日用のdate input（specific_dates用）を特定
      const dateInput = page.locator('input[type="date"]').last();
      await expect(dateInput).toBeVisible();

      // 日付を追加（dispatchEventで確実にonChangeをトリガー）
      const today = new Date();
      const futureDate1 = new Date(today);
      futureDate1.setDate(futureDate1.getDate() + 3);
      const futureDate1Str = futureDate1.toISOString().split('T')[0];

      // フォーカスして値を入力し、changeイベントをトリガー
      await dateInput.click();
      await dateInput.fill(futureDate1Str);
      await dateInput.dispatchEvent('change');

      // 追加ボタンがenabledになるのを待つ
      const addButton = page.locator('button:has-text("追加")');
      await expect(addButton).toBeEnabled({ timeout: 5000 });
      await addButton.click();

      // 追加された日付がチップとして表示される
      const dateChips = page.locator('.bg-blue-100.rounded-full');
      await expect(dateChips).toHaveCount(1);

      // 削除ボタンをクリック
      await page.locator('.bg-blue-100.rounded-full button').click();

      // 日付が削除される
      await expect(page.locator('text=日付を追加してください')).toBeVisible();
    });

    test('SCHED-004: 提供タイミングを選択できる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      await page.locator('button:has-text("スケジュールを設定")').click();

      // 提供タイミングの選択肢が表示される
      await expect(page.locator('button:has-text("朝食時")')).toBeVisible();
      await expect(page.locator('button:has-text("昼食時")')).toBeVisible();
      await expect(page.locator('button:has-text("夕食時")')).toBeVisible();
      await expect(page.locator('button:has-text("おやつ時")')).toBeVisible();
      await expect(page.locator('button:has-text("いつでも")')).toBeVisible();

      // おやつ時がデフォルトで選択されている
      await expect(page.locator('button:has-text("おやつ時")')).toHaveClass(/bg-green-500/);

      // 朝食時に変更
      await page.locator('button:has-text("朝食時")').click();
      await expect(page.locator('button:has-text("朝食時")')).toHaveClass(/bg-green-500/);
    });

    test('SCHED-005: スケジュールをクリアできる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      await page.locator('button:has-text("スケジュールを設定")').click();

      // スケジュール設定UIが表示される
      await expect(page.locator('text=タイプ')).toBeVisible();

      // クリアボタンをクリック
      await page.locator('button:has-text("クリア")').click();

      // スケジュール設定ボタンに戻る
      await expect(page.locator('button:has-text("スケジュールを設定")')).toBeVisible();
    });

    test('SCHED-006: 補足メモを入力できる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      await page.locator('button:has-text("スケジュールを設定")').click();

      // 毎日に切り替え（シンプルなUI）
      await page.locator('button:has-text("毎日")').click();

      // 補足入力フィールドが表示される
      await expect(page.locator('input[placeholder*="15時頃"]')).toBeVisible();

      // 補足を入力
      await page.locator('input[placeholder*="15時頃"]').fill('午後3時に提供してください');

      // 入力が反映される
      await expect(page.locator('input[placeholder*="15時頃"]')).toHaveValue('午後3時に提供してください');
    });
  });

  test.describe('スケジュール表示', () => {
    test('SCHED-012: スケジュール表示が正しくフォーマットされる', async ({ page }) => {
      // スケジュール設定ボタンをクリック
      await page.locator('button:has-text("スケジュールを設定")').click();

      // 毎日・おやつ時を選択
      await page.locator('button:has-text("毎日")').click();
      await page.locator('button:has-text("おやつ時")').click();

      // プレビューに「毎日 おやつ時」が表示される
      await expect(page.locator('text=毎日 おやつ時')).toBeVisible();

      // 曜日指定に切り替え
      await page.locator('button:has-text("曜日指定")').click();
      await page.locator('button:has-text("月")').first().click();
      await page.locator('button:has-text("水")').first().click();

      // プレビューに「月・水 おやつ時」が表示される
      await expect(page.locator('text=月・水 おやつ時')).toBeVisible();
    });
  });
});
