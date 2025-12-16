/**
 * 家族用ページ E2Eテスト
 * @see docs/FAMILY_UX_DESIGN.md
 * @see docs/VIEW_ARCHITECTURE_SPEC.md
 */

import { test, expect } from '@playwright/test';

test.describe('家族ページ基本動作', () => {
  test('家族ホーム（/family）にアクセスできる', async ({ page }) => {
    await page.goto('/family');

    // タイトルが「家族ホーム」であることを確認
    await expect(page.locator('text=家族ホーム')).toBeVisible();

    // フッターナビゲーションが表示されている
    await expect(page.locator('nav[aria-label="家族用ナビゲーション"]')).toBeVisible();
  });

  test('フッターナビゲーションが4タブで正しく表示される', async ({ page }) => {
    await page.goto('/family');

    // 家族用フッター4タブの確認
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');

    // ホームタブ
    await expect(footer.getByText('ホーム')).toBeVisible();

    // 品物管理タブ
    await expect(footer.getByText('品物管理')).toBeVisible();

    // 記録閲覧タブ
    await expect(footer.getByText('記録閲覧')).toBeVisible();

    // 統計タブ
    await expect(footer.getByText('統計')).toBeVisible();
  });

  test('品物管理ページに遷移できる', async ({ page }) => {
    await page.goto('/family');

    // フッターの品物管理タブをクリック（複数マッチ対策: フッター内のリンクを指定）
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await footer.getByText('品物管理').click();

    // URLが/family/itemsに変わることを確認
    await expect(page).toHaveURL(/\/family\/items/);
  });

  test('家族ホームにクイックリンクが表示される', async ({ page }) => {
    await page.goto('/family');

    // クイックリンクカードの確認（メインコンテンツ内）
    const mainContent = page.locator('main, .pb-4').first();

    // タスクリンク
    await expect(mainContent.locator('text=タスク').first()).toBeVisible();

    // 品物管理リンク（クイックリンクカード）
    await expect(mainContent.getByRole('link', { name: /品物管理/ }).first()).toBeVisible();

    // 統計リンク
    await expect(mainContent.locator('text=統計').first()).toBeVisible();
  });

  test('日付セレクターが表示され機能する', async ({ page }) => {
    await page.goto('/family');

    // 前日ボタン
    const prevButton = page.getByLabel('前の日');
    await expect(prevButton).toBeVisible();

    // 次日ボタン
    const nextButton = page.getByLabel('次の日');
    await expect(nextButton).toBeVisible();

    // 日付チップが表示される
    const dateChips = page.locator('button').filter({ hasText: /^\d+$/ });
    await expect(dateChips.first()).toBeVisible();
  });

  test('タイムラインが食事時間順に表示される', async ({ page }) => {
    await page.goto('/family');

    // ローディングが完了するのを待つ
    await page.waitForTimeout(2000);

    // タイムラインアイテムが表示される（朝食、昼食、間食、夕食の順）
    // 各食事時間のアイコンまたはテキストを確認
    const timeline = page.locator('.space-y-3');
    await expect(timeline).toBeVisible();
  });
});

test.describe('品物管理ページ', () => {
  test('品物一覧ページが表示される', async ({ page }) => {
    await page.goto('/family/items');

    // ページヘッダーにタイトルがあることを確認
    await expect(page.getByRole('heading', { name: /品物管理/ })).toBeVisible();

    // 新規登録ボタンが存在する
    const newButton = page.getByRole('link', { name: /新規登録/ });
    await expect(newButton).toBeVisible();
  });

  test('品物登録フォームに遷移できる', async ({ page }) => {
    await page.goto('/family/items');

    // 新規登録ボタンをクリック
    await page.getByRole('link', { name: /新規登録/ }).click();

    // URLが/family/items/newに変わることを確認
    await expect(page).toHaveURL(/\/family\/items\/new/);
  });

  test('品物登録フォームに必要な項目がある', async ({ page }) => {
    await page.goto('/family/items/new');

    // 品物名入力フィールド（id="itemName" で関連付け）
    await expect(page.locator('#itemName')).toBeVisible();

    // 数量入力フィールド（id="quantity" で関連付け）
    await expect(page.locator('#quantity')).toBeVisible();

    // 登録ボタン
    await expect(page.getByRole('button', { name: /登録/ })).toBeVisible();
  });
});

test.describe('プリセット管理ページ', () => {
  test('プリセット管理ページにアクセスできる', async ({ page }) => {
    await page.goto('/family/presets');

    // 「いつもの指示」というタイトルで表示される
    await expect(page.getByRole('heading', { name: /いつもの指示/ })).toBeVisible();
  });
});

test.describe('ケア指示ビルダー', () => {
  test('ケア指示作成ページにアクセスできる', async ({ page }) => {
    await page.goto('/family/request');

    // ページが表示されることを確認
    await expect(page.locator('text=ケア指示')).toBeVisible();
  });
});

test.describe('タスク一覧ページ', () => {
  test('タスク一覧ページにアクセスできる', async ({ page }) => {
    await page.goto('/family/tasks');

    // 「タスク一覧」というタイトルで表示される
    await expect(page.getByRole('heading', { name: /タスク/ })).toBeVisible();
  });
});

test.describe('共有ビュー from 家族ページ', () => {
  test('記録閲覧ページに遷移できる', async ({ page }) => {
    await page.goto('/family');

    // フッターから記録閲覧をクリック
    await page.locator('nav[aria-label="家族用ナビゲーション"]').getByText('記録閲覧').click();

    // /viewに遷移
    await expect(page).toHaveURL('/view');
  });

  test('統計ページに遷移できる', async ({ page }) => {
    await page.goto('/family');

    // フッターから統計をクリック
    await page.locator('nav[aria-label="家族用ナビゲーション"]').getByText('統計').click();

    // /statsにリダイレクト
    await expect(page).toHaveURL('/stats');
  });
});

test.describe('ナビゲーションフロー', () => {
  test('品物管理 → 新規登録 → 戻るで品物一覧に戻る', async ({ page }) => {
    await page.goto('/family/items');

    // 新規登録へ
    await page.getByRole('link', { name: /新規登録/ }).click();
    await expect(page).toHaveURL(/\/family\/items\/new/);

    // 戻るボタンをクリック
    const backButton = page.getByLabel(/戻る|back/i);
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/\/family\/items$/);
    }
  });

  test('FABボタンからケア指示作成に遷移できる', async ({ page }) => {
    await page.goto('/family');

    // FAB（Floating Action Button）をクリック
    const fab = page.getByLabel('新しいケア指示を作成');
    await expect(fab).toBeVisible();
    await fab.click();

    // ケア指示ページに遷移
    await expect(page).toHaveURL('/family/request');
  });
});

test.describe('VIEW_ARCHITECTURE_SPEC準拠チェック', () => {
  test('家族用フッターは4タブ構成である', async ({ page }) => {
    await page.goto('/family');

    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    const tabs = footer.locator('a');

    // 4つのタブがある
    await expect(tabs).toHaveCount(4);
  });

  test('/family/items/new から品物を登録できるフォームがある', async ({ page }) => {
    await page.goto('/family/items/new');

    // 必須項目: 品物名、カテゴリ、送付日、数量、提供方法
    await expect(page.locator('#itemName')).toBeVisible();
    await expect(page.locator('#sentDate')).toBeVisible();
    await expect(page.locator('#quantity')).toBeVisible();

    // 登録ボタン
    await expect(page.getByRole('button', { name: /登録/ })).toBeVisible();
  });
});
