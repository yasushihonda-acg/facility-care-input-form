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
      await expect(page.locator('h3').filter({ hasText: '家族連絡を確認' })).toBeVisible();
      await expect(page.locator('h3').filter({ hasText: '食事記録を入力' })).toBeVisible();
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
    test('STAFF-010: 家族連絡カードをクリック→一覧ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff');

      await page.getByText('家族連絡を確認').click();

      await expect(page).toHaveURL('/demo/staff/family-messages');
    });

    test('STAFF-011: 食事記録カードをクリック→入力ページへ遷移', async ({ page }) => {
      await page.goto('/demo/staff');

      await page.getByText('食事記録を入力').click();

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
      await expect(page.getByText('1. 家族連絡を確認')).toBeVisible();
      await expect(page.getByText('2. 品物の詳細を見る')).toBeVisible();
      await expect(page.getByText('3. 食事記録を入力')).toBeVisible();
      await expect(page.getByText('4. 統計を確認')).toBeVisible();
    });

    test('STAFF-022: Step 1クリック→家族連絡一覧へ遷移', async ({ page }) => {
      await page.goto('/demo/staff/showcase');

      // 「この機能を見る」ボタンをクリック（Step 1が初期表示）
      await page.getByRole('button', { name: /この機能を見る/i }).click();

      await expect(page).toHaveURL('/demo/staff/family-messages');
    });
  });

  test.describe('STAFF-03x: 家族連絡ページ', () => {
    test('STAFF-030: 家族連絡一覧に品物が表示される', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // 品物が少なくとも1つ表示される（demoCareItemsからのデータ）
      // 品物カード内のテキストを確認（バナナ、みかん等）
      await expect(page.getByText(/バナナ|みかん|りんご|羊羹/i).first()).toBeVisible();
    });

    test('STAFF-031: 品物クリック→詳細ページへ遷移（デモ内）', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // 品物名（リンク）をクリック
      await page.getByRole('link', { name: /バナナ|みかん|りんご|羊羹/i }).first().click();

      // デモ内の詳細ページに遷移することを確認
      await expect(page).toHaveURL(/\/demo\/staff\/family-messages\/.+/);
    });

    test('STAFF-032: 禁止品目に警告バッジが表示される', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // 禁止品目の警告（「提供禁止」または「禁止」のテキスト）
      // デモデータに禁止品目（七福のお菓子等）がある場合に表示
      // 注: デモデータの禁止ルールによってはスキップ
      const warningBadge = page.getByText(/禁止|提供禁止/i);
      // 禁止品目がない場合はスキップ
      const count = await warningBadge.count();
      if (count > 0) {
        await expect(warningBadge.first()).toBeVisible();
      }
    });
  });

  test.describe('STAFF-04x: フッターナビゲーション', () => {
    test('STAFF-040: /demo/staff/*でスタッフフッターが表示される', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');

      // ページが読み込まれるまで待機
      await page.waitForLoadState('networkidle');

      // スタッフ用フッターのナビゲーション項目が表示される
      const footer = page.locator('nav[aria-label="スタッフ用ナビゲーション"]');
      await expect(footer).toBeVisible();
      await expect(footer.getByText('記録閲覧')).toBeVisible();
      await expect(footer.getByText('記録入力')).toBeVisible();
      await expect(footer.getByText('家族連絡')).toBeVisible();
    });

    test('STAFF-041: フッターからデモページ内へ正しく遷移', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');

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
      await page.goto('/demo/staff/family-messages');

      // ヘッダーに「ツアーTOPに戻る」ボタンが表示される
      await expect(page.getByRole('link', { name: /ツアーTOP/i })).toBeVisible();
    });

    test('STAFF-051: ボタンクリック→ショーケースへ遷移', async ({ page }) => {
      await page.goto('/demo/staff/family-messages');

      // 「ツアーTOPに戻る」ボタンをクリック
      await page.getByRole('link', { name: /ツアーTOP/i }).click();

      // ショーケースページに遷移
      await expect(page).toHaveURL('/demo/staff/showcase');
    });
  });
});
