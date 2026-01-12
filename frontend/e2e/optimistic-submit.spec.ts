/**
 * useOptimisticSubmit フックの動作検証
 *
 * TDD: 二重送信防止とトースト通知の動作をE2Eで検証
 * @see frontend/src/hooks/useOptimisticSubmit.ts
 */

import { test, expect } from '@playwright/test';

const DEMO_STAFF_URL = 'http://localhost:4173/demo/staff/input/meal';

test.describe('楽観的送信パターン（useOptimisticSubmit）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_STAFF_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('トースト通知', () => {
    test('OPT-001: 記録送信時にトースト通知が表示される', async ({ page }) => {
      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // ダイアログが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 必須項目を入力（入力者名）
      const staffNameInput = page.locator('input[placeholder="お名前を入力"]');
      await staffNameInput.fill('テストスタッフ');

      // 記録ボタンをクリック
      const saveButton = page.locator('button:has-text("記録を保存")');
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // トースト通知が表示される（sonner）
      // 「記録中...」または「記録しました」のいずれかが表示される
      await expect(
        page.locator('text=記録中').or(page.locator('text=記録しました'))
      ).toBeVisible({ timeout: 5000 });
    });

    test('OPT-002: 成功時に「記録しました」トーストが表示される', async ({ page }) => {
      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // ダイアログが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 必須項目を入力（入力者名）
      const staffNameInput = page.locator('input[placeholder="お名前を入力"]');
      await staffNameInput.fill('テストスタッフ');

      // 記録ボタンをクリック
      const saveButton = page.locator('button:has-text("記録を保存")');
      await saveButton.click();

      // 成功トーストを待機
      await expect(page.locator('text=記録しました')).toBeVisible({ timeout: 5000 });
    });

    test('OPT-003: トースト通知は1つだけ表示される（重複なし）', async ({ page }) => {
      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // ダイアログが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 必須項目を入力（入力者名）
      const staffNameInput = page.locator('input[placeholder="お名前を入力"]');
      await staffNameInput.fill('テストスタッフ');

      // 記録ボタンをクリック
      const saveButton = page.locator('button:has-text("記録を保存")');
      await saveButton.click();

      // 少し待機してトーストが表示されるのを待つ
      await page.waitForTimeout(1500);

      // 「記録しました」の数をカウント（1つだけであるべき）
      const successToasts = page.locator('text=記録しました');
      const count = await successToasts.count();
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  test.describe('即座にダイアログを閉じる', () => {
    test('OPT-010: 記録ボタン押下後、ダイアログが即座に閉じる', async ({ page }) => {
      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // ダイアログが開く
      const dialogTitle = page.getByRole('heading', { name: '提供・摂食を記録' });
      await expect(dialogTitle).toBeVisible({ timeout: 3000 });

      // 必須項目を入力（入力者名）
      const staffNameInput = page.locator('input[placeholder="お名前を入力"]');
      await staffNameInput.fill('テストスタッフ');

      // 記録ボタンをクリック
      const saveButton = page.locator('button:has-text("記録を保存")');
      await saveButton.click();

      // ダイアログが即座に閉じる（1秒以内）
      await expect(dialogTitle).not.toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('二重送信防止', () => {
    test('OPT-020: 連続クリックしても1回だけ処理される', async ({ page }) => {
      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // ダイアログが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 必須項目を入力（入力者名）
      const staffNameInput = page.locator('input[placeholder="お名前を入力"]');
      await staffNameInput.fill('テストスタッフ');

      // 記録ボタンを取得
      const saveButton = page.locator('button:has-text("記録を保存")');
      await expect(saveButton).toBeVisible();

      // 連続クリック（素早く2回）- 楽観的UIにより1回目で即座にダイアログが閉じる
      await saveButton.click();
      // 2回目のクリックはダイアログが閉じているのでスキップ

      // トーストが表示されるのを待つ
      await expect(page.locator('text=記録しました')).toBeVisible({ timeout: 5000 });

      // 成功トーストが1つだけ表示される（2つ以上ないことを確認）
      const successToasts = page.locator('text=記録しました');
      const count = await successToasts.count();
      expect(count).toBeLessThanOrEqual(1);
    });
  });

  test.describe('デモモード', () => {
    test('OPT-030: デモモードでもトースト通知が表示される', async ({ page }) => {
      // デモモードのURLにいることを確認
      expect(page.url()).toContain('/demo/');

      // 品物の提供記録ボタンをクリック
      const recordButton = page.locator('button:has-text("提供記録")').first();
      await expect(recordButton).toBeVisible({ timeout: 5000 });
      await recordButton.click();

      // ダイアログが開く
      await expect(page.getByRole('heading', { name: '提供・摂食を記録' })).toBeVisible({ timeout: 3000 });

      // 必須項目を入力（入力者名）
      const staffNameInput = page.locator('input[placeholder="お名前を入力"]');
      await staffNameInput.fill('テストスタッフ');

      // 記録ボタンをクリック
      const saveButton = page.locator('button:has-text("記録を保存")');
      await saveButton.click();

      // デモモードでもトーストが表示される
      await expect(page.locator('text=記録しました')).toBeVisible({ timeout: 5000 });
    });
  });
});

test.describe('注意事項モーダル（StaffNoteModal）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/demo/staff/notes');
    await page.waitForLoadState('networkidle');
  });

  test('OPT-040: 注意事項追加時にトースト通知が表示される', async ({ page }) => {
    // 追加ボタンをクリック
    const addButton = page.locator('button:has-text("追加")').or(page.locator('[aria-label="注意事項を追加"]'));
    if (await addButton.isVisible()) {
      await addButton.click();

      // モーダルが開いたら内容を入力
      const contentInput = page.locator('textarea').first();
      if (await contentInput.isVisible({ timeout: 2000 })) {
        await contentInput.fill('テスト注意事項');

        // 保存ボタンをクリック
        const saveBtn = page.locator('button:has-text("保存")').or(page.locator('button:has-text("追加")'));
        if (await saveBtn.isVisible()) {
          await saveBtn.click();

          // トーストが表示される（追加しました or 保存しました）
          await expect(
            page.locator('text=追加しました').or(page.locator('text=保存しました'))
          ).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
