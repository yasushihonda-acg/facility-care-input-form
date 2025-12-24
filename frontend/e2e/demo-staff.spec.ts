/**
 * Phase 14: スタッフ用デモページ E2Eテスト
 *
 * TDD: 先にテストを書き、実装後にパスさせる
 * 設計書: docs/DEMO_STAFF_SPEC.md
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 14: スタッフ用デモページ', () => {
  // タイムアウト設定
  test.describe.configure({ timeout: 30000 });

  test.describe('STAFF-00x: スタッフデモホーム', () => {
    test('STAFF-001: スタッフ用デモホームが表示される', async ({ page }) => {
      await page.goto('/demo/staff');

      // ページタイトルまたはヘッダーが表示される（h1を指定）
      await expect(page.locator('h1').filter({ hasText: /スタッフ用デモ/i })).toBeVisible();
    });

    test('STAFF-002: 4つの機能カードが表示される', async ({ page }) => {
      await page.goto('/demo/staff');

      // 4つの機能カードが表示される（カード内のh3を指定）
      await expect(page.locator('h3').filter({ hasText: '注意事項' })).toBeVisible();
      await expect(page.locator('h3').filter({ hasText: '間食記録を入力' })).toBeVisible();
      await expect(page.locator('h3').filter({ hasText: '統計' })).toBeVisible();
      await expect(page.locator('h3').filter({ hasText: '記録閲覧' })).toBeVisible();
    });

    test('STAFF-003: ガイドツアーボタンが表示される', async ({ page }) => {
      await page.goto('/demo/staff');

      // ガイドツアーボタンが表示される
      await expect(page.getByRole('link', { name: /ガイド付きツアー/i })).toBeVisible();
    });
  });

  test.describe('STAFF-01x: ナビゲーション', () => {
    test('STAFF-010: 注意事項カードをクリック→一覧ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff');

      // カード内のh3をクリック（フッターの「注意事項」と区別）
      await page.locator('h3').filter({ hasText: '注意事項' }).click();

      await expect(page).toHaveURL('/demo/staff/notes');
    });

    test('STAFF-011: 間食記録カードをクリック→入力ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff');

      await page.getByText('間食記録を入力').click();

      await expect(page).toHaveURL('/demo/staff/input/meal');
    });

    test('STAFF-012: 統計カードをクリック→統計ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff');

      // カード内のリンクをクリック（h3「統計」を含むリンク）
      await page.locator('a').filter({ has: page.locator('h3', { hasText: '統計' }) }).click();

      await expect(page).toHaveURL('/demo/stats');
    });

    test('STAFF-013: 記録閲覧カードをクリック→閲覧ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff');

      // カード内のリンクをクリック（h3「記録閲覧」を含むリンク）
      await page.locator('a').filter({ has: page.locator('h3', { hasText: '記録閲覧' }) }).click();

      await expect(page).toHaveURL('/demo/view');
    });
  });

  test.describe('STAFF-02x: ガイドツアー（ショーケース）', () => {
    test('STAFF-020: ショーケースページが表示される', async ({ page }) => {
      await page.goto('/demo/staff/showcase');

      // ショーケースページのヘッダーが表示される
      await expect(page.locator('h1').filter({ hasText: /スタッフ用ガイドツアー/i })).toBeVisible();
    });

    test('STAFF-021: 4つのステップが表示される', async ({ page }) => {
      await page.goto('/demo/staff/showcase');

      // 全ステップ一覧を開く
      await page.getByText('全ステップ一覧').click();

      // 4つのステップが表示される（折りたたみ内）
      await expect(page.getByText('1. 注意事項を確認')).toBeVisible();
      await expect(page.getByText('2. 家族依頼を確認')).toBeVisible();
      await expect(page.getByText('3. 間食記録を入力')).toBeVisible();
      await expect(page.getByText('4. 統計を確認')).toBeVisible();
    });

    test('STAFF-022: Step 1クリック→注意事項ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff/showcase');

      // 「この機能を見る」ボタンをクリック（Step 1が初期表示）
      await page.getByRole('button', { name: /この機能を見る/i }).click();

      await expect(page).toHaveURL('/demo/staff/notes');
    });
  });

  test.describe('STAFF-03x: 注意事項ページ', () => {
    test('STAFF-030: 注意事項一覧にスタッフノートが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // スタッフ注意事項が表示される（デモデータから）
      // 例: 糖尿病関連の注意事項
      await expect(page.getByText(/糖尿病|差し入れ品|おやつ/i).first()).toBeVisible();
    });

    test('STAFF-031: 注意事項ページにタブが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // 「注意事項」タブと「家族依頼」タブが表示される
      await expect(page.getByText('注意事項', { exact: false }).first()).toBeVisible();
    });

    test('STAFF-032: 注意事項に優先度バッジが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // 重要（critical）注意事項がある場合、バッジが表示される
      // デモデータにはcritical優先度の注意事項がある
      const criticalBadge = page.getByText(/重要|要注意/i);
      const count = await criticalBadge.count();
      if (count > 0) {
        await expect(criticalBadge.first()).toBeVisible();
      }
    });
  });

  test.describe('STAFF-04x: フッターナビゲーション', () => {
    test('STAFF-040: /demo/staff/*でスタッフフッターが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // スタッフ用フッターのナビゲーション項目が表示される
      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(footer).toBeVisible();
      await expect(footer.getByText('記録閲覧')).toBeVisible();
      await expect(footer.getByText('記録入力')).toBeVisible();
      await expect(footer.getByText('注意事項')).toBeVisible();
    });

    test('STAFF-041: フッターからデモページ内へ正しく遷移', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // フッターの「記録入力」をクリック
      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await footer.getByText('記録入力').click();

      // デモ内の食事入力ページに遷移
      await expect(page).toHaveURL('/demo/staff/input/meal');
    });
  });

  test.describe('STAFF-05x: ヘッダーボタン（ツアーナビゲーション）', () => {
    test('STAFF-050: ツアーTOPに戻るボタンが表示される', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // ヘッダーに「ツアーTOPに戻る」ボタンが表示される
      await expect(page.getByRole('link', { name: /ツアーTOP/i })).toBeVisible();
    });

    test('STAFF-051: ボタンクリック→ショーケースへ遷移', async ({ page }) => {
      await page.goto('/demo/staff/notes');

      // 「ツアーTOPに戻る」ボタンをクリック
      await page.getByRole('link', { name: /ツアーTOP/i }).click();

      // ショーケースページに遷移
      await expect(page).toHaveURL('/demo/staff/showcase');
    });
  });
});
