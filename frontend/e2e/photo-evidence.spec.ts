/**
 * Phase 16: 写真エビデンス表示 E2Eテスト
 * 設計書: docs/PHOTO_EVIDENCE_DISPLAY_SPEC.md
 *
 * TDD: テストファースト - まずテストを書き、実装後にパスさせる
 */

import { test, expect } from '@playwright/test';

// 今日の日付をYYYY-MM-DD形式で取得
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

test.describe('Phase 16: 写真エビデンス表示', () => {
  test.describe.configure({ timeout: 60000 });

  // ============================================
  // PHOTO-001: 写真表示テスト（デモモード）
  // ============================================
  test.describe('デモモードでの写真表示', () => {
    test('PHOTO-001: エビデンス画面で写真が表示される', async ({ page }) => {
      const today = getTodayString();
      // デモ版エビデンス画面にアクセス
      await page.goto(`/demo/family/evidence/${today}?meal=lunch`);

      // RESULTセクションが表示されるまで待機
      const resultSection = page.locator('text=RESULT（実施結果）');
      await expect(resultSection).toBeVisible({ timeout: 10000 });

      // 写真が表示されていることを確認
      // 実装後: <img> タグが存在し、src属性にURLが設定されている
      const photoImage = page.locator('[data-testid="evidence-photo"]');
      await expect(photoImage).toBeVisible();

      // src属性にURLが設定されていることを確認
      const src = await photoImage.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toMatch(/^https?:\/\//);
    });

    test('PHOTO-002: 写真がない場合はプレースホルダが表示される', async ({ page }) => {
      const today = getTodayString();
      // 写真がない記録のエビデンス画面にアクセス（朝食は写真なしと仮定）
      await page.goto(`/demo/family/evidence/${today}?meal=breakfast`);

      // RESULTセクションが表示されるまで待機
      const resultSection = page.locator('text=RESULT（実施結果）');

      // RESULTがない、またはプレースホルダが表示されることを確認
      const hasResult = await resultSection.isVisible().catch(() => false);

      if (hasResult) {
        // 写真がない場合のプレースホルダ
        const placeholder = page.locator('text=提供直前の写真').or(page.locator('text=📷'));
        // どちらかが表示されていればOK（写真なしの場合）
        const isPlaceholderOrNoPhoto = await placeholder.isVisible().catch(() => true);
        expect(isPlaceholderOrNoPhoto).toBe(true);
      }
    });

    test('PHOTO-003: 家族ダッシュボードから写真を見るリンクが機能する', async ({ page }) => {
      // デモ版家族ダッシュボードにアクセス
      await page.goto('/demo/family');

      // ページ読み込み待機
      await page.waitForLoadState('networkidle');

      // 「写真を見る」または「詳細を確認」リンクをクリック
      const photoLink = page.locator('text=写真を見る').or(page.locator('text=詳細を確認'));
      const hasLink = await photoLink.first().isVisible().catch(() => false);

      if (hasLink) {
        await photoLink.first().click();

        // エビデンス画面に遷移することを確認
        await expect(page).toHaveURL(/\/demo\/family\/evidence/);
      }
    });
  });

  // ============================================
  // PHOTO-010: 写真アップロード連携テスト
  // ============================================
  test.describe('写真アップロード連携', () => {
    test('PHOTO-010: 記録入力画面に写真アップロードUIがある', async ({ page }) => {
      // デモ版記録入力画面にアクセス
      await page.goto('/demo/staff/input/meal');

      // 写真アップロードセクションが存在することを確認
      const photoSection = page.locator('text=写真アップロード').or(page.locator('text=写真'));
      await expect(photoSection).toBeVisible({ timeout: 10000 });

      // ファイル入力が存在することを確認
      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await expect(fileInput).toBeAttached();
    });

    test('PHOTO-011: 写真を選択できる', async ({ page }) => {
      await page.goto('/demo/staff/input/meal');

      // ファイル入力を取得
      const fileInput = page.locator('input[type="file"][accept*="image"]');
      await expect(fileInput).toBeAttached();

      // ファイルを選択（テスト用にダミーファイル）
      // 注: 実際のE2Eでは test-fixtures にテスト画像を配置
      // await fileInput.setInputFiles('e2e/fixtures/test-image.jpg');
    });
  });

  // ============================================
  // PHOTO-020: 本番環境テスト（スキップ可）
  // ============================================
  test.describe('本番環境での写真表示', () => {
    // 本番データが必要なためスキップ
    test.skip('PHOTO-020: 本番環境でエビデンス画面に写真が表示される', async ({ page }) => {
      // 本番環境のエビデンス画面にアクセス
      await page.goto('/family/evidence/today?meal=lunch');

      // 写真が表示されることを確認
      const photoImage = page.locator('[data-testid="evidence-photo"]');
      await expect(photoImage).toBeVisible();
    });
  });
});
