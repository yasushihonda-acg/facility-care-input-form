/**
 * カラムリサイズ機能 E2Eテスト
 * Phase 24: 記録閲覧テーブルのカラム幅調整機能
 */
import { test, expect, Page } from '@playwright/test';

// ページ読み込み待機
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

test.describe('カラムリサイズ機能', () => {
  test.beforeEach(async ({ page }) => {
    // 記録閲覧ページにアクセス
    await page.goto('/view');
    await waitForPageLoad(page);
  });

  test('VIEW-RESIZE-001: リサイズハンドルが表示される', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // リサイズハンドルを確認（最初のカラム）
    const resizeHandle = page.locator('[data-testid="resize-handle-0"]');
    await expect(resizeHandle).toBeVisible();
  });

  test('VIEW-RESIZE-002: リサイズハンドルにホバーで青色表示', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // リサイズハンドルにホバー
    const resizeHandle = page.locator('[data-testid="resize-handle-0"]');
    await resizeHandle.hover();

    // 青色のスタイルが適用されていることを確認
    // (Tailwindのhover:bg-blue-400クラス)
    await expect(resizeHandle).toHaveClass(/hover:bg-blue-400/);
  });

  test('VIEW-RESIZE-003: ドラッグでカラム幅が変更される', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // 最初のカラムヘッダー（日時）の幅を取得
    const firstHeader = page.locator('table thead th').first();
    const initialBox = await firstHeader.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    // リサイズハンドルをドラッグ（50px右へ）
    const resizeHandle = page.locator('[data-testid="resize-handle-0"]');
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 50, handleBox!.y + handleBox!.height / 2);
    await page.mouse.up();

    // 幅が変更されたことを確認
    const newBox = await firstHeader.boundingBox();
    expect(newBox).not.toBeNull();
    expect(newBox!.width).toBeGreaterThan(initialWidth);
  });

  test('VIEW-RESIZE-004: ダブルクリックでデフォルト幅にリセット', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // 最初のカラムヘッダー（日時）の初期幅を取得
    const firstHeader = page.locator('table thead th').first();
    const initialBox = await firstHeader.boundingBox();
    expect(initialBox).not.toBeNull();
    const initialWidth = initialBox!.width;

    // リサイズハンドルをドラッグして幅を変更
    const resizeHandle = page.locator('[data-testid="resize-handle-0"]');
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + 80, handleBox!.y + handleBox!.height / 2);
    await page.mouse.up();

    // 幅が変更されたことを確認
    const changedBox = await firstHeader.boundingBox();
    expect(changedBox).not.toBeNull();
    expect(changedBox!.width).toBeGreaterThan(initialWidth);

    // ダブルクリックでリセット
    await resizeHandle.dblclick();

    // デフォルト幅に戻ったことを確認（誤差許容）
    const resetBox = await firstHeader.boundingBox();
    expect(resetBox).not.toBeNull();
    expect(Math.abs(resetBox!.width - initialWidth)).toBeLessThan(5);
  });

  test('VIEW-RESIZE-005: 最小幅以下には縮小されない', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // リサイズハンドルをドラッグして大きく左に移動（最小幅テスト）
    const resizeHandle = page.locator('[data-testid="resize-handle-0"]');
    const handleBox = await resizeHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x - 200, handleBox!.y + handleBox!.height / 2); // 200px左へ
    await page.mouse.up();

    // 最小幅（100px）以上であることを確認
    const firstHeader = page.locator('table thead th').first();
    const newBox = await firstHeader.boundingBox();
    expect(newBox).not.toBeNull();
    expect(newBox!.width).toBeGreaterThanOrEqual(100);
  });

  test('VIEW-RESIZE-006: 日時カラムのデフォルト幅が165px', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // 日時カラムの幅を確認
    const dateHeader = page.locator('table thead th').first();
    const dateHeaderStyle = await dateHeader.getAttribute('style');

    // 165px幅が設定されていることを確認
    expect(dateHeaderStyle).toContain('165px');
  });

  test('VIEW-RESIZE-007: col-resizeカーソルが表示される', async ({ page }) => {
    // テーブルが表示されるまで待機
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });

    // リサイズハンドルにcursor-col-resizeクラスがあることを確認
    const resizeHandle = page.locator('[data-testid="resize-handle-0"]');
    await expect(resizeHandle).toHaveClass(/cursor-col-resize/);
  });
});
