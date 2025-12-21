/**
 * デモモード統計ダッシュボード AI分析テスト
 * @see docs/DEMO_AI_ANALYSIS_SPEC.md
 *
 * Phase 34: AI分析のデモモード対応
 */

import { test, expect } from '@playwright/test';

test.describe('Demo Stats AI Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // 統計ダッシュボードのデモページに移動
    await page.goto('/demo/stats');
    await page.waitForLoadState('networkidle');

    // 摂食傾向タブをクリック（絵文字付きのタブ）
    await page.locator('button:has-text("摂食傾向")').click();
    await page.waitForTimeout(800);
  });

  /**
   * DEMO-STATS-AI-001: AI分析パネルが表示される
   */
  test('DEMO-STATS-AI-001: AI分析パネルが表示される', async ({ page }) => {
    // AI分析パネルが表示されていることを確認
    await expect(page.locator('text=AI分析')).toBeVisible();
    await expect(page.locator('text=🤖')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-002: 分析ボタンが表示される
   */
  test('DEMO-STATS-AI-002: 分析開始ボタンが表示される', async ({ page }) => {
    // 「分析を開始」ボタンが表示されていることを確認
    await expect(page.locator('button:has-text("分析を開始")')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-003: 分析実行で結果が表示される
   */
  test('DEMO-STATS-AI-003: 分析実行で結果が表示される', async ({ page }) => {
    // 分析を開始
    await page.locator('button:has-text("分析を開始")').click();

    // ローディング表示を確認
    await expect(page.locator('text=分析中')).toBeVisible();

    // 分析結果が表示されるまで待機（モック遅延800ms + マージン）
    await page.waitForTimeout(1500);

    // サマリーが表示されていることを確認
    await expect(page.locator('text=過去30日間の摂食傾向を分析しました')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-004: 発見事項（positive）が表示される
   */
  test('DEMO-STATS-AI-004: 発見事項が表示される', async ({ page }) => {
    await page.locator('button:has-text("分析を開始")').click();
    await page.waitForTimeout(1500);

    // 発見事項セクションが表示されていることを確認
    await expect(page.locator('text=発見事項')).toBeVisible();

    // プリンの摂取率が表示されていることを確認
    await expect(page.locator('text=プリンの摂取率が非常に高い')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-005: 発見事項（negative）が表示される
   */
  test('DEMO-STATS-AI-005: 注意傾向が表示される', async ({ page }) => {
    await page.locator('button:has-text("分析を開始")').click();
    await page.waitForTimeout(1500);

    // りんごの摂取率低下が表示されていることを確認
    await expect(page.locator('text=りんごの摂取率が低下傾向')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-006: 改善提案が表示される
   */
  test('DEMO-STATS-AI-006: 改善提案が表示される', async ({ page }) => {
    await page.locator('button:has-text("分析を開始")').click();
    await page.waitForTimeout(1500);

    // 改善提案セクションが表示されていることを確認
    await expect(page.locator('text=改善提案')).toBeVisible();

    // りんごの提供方法変更提案が表示されていることを確認
    await expect(page.locator('text=りんごの提供方法を変更')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-007: 再分析ボタンが表示される
   */
  test('DEMO-STATS-AI-007: 分析後に再分析ボタンが表示される', async ({ page }) => {
    await page.locator('button:has-text("分析を開始")').click();
    await page.waitForTimeout(1500);

    // 「再分析」ボタンが表示されていることを確認
    await expect(page.locator('button:has-text("再分析")')).toBeVisible();
  });

  /**
   * DEMO-STATS-AI-008: APIエラーが発生しないこと
   */
  test('DEMO-STATS-AI-008: デモモードでAPIエラーが発生しない', async ({ page }) => {
    const networkErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.locator('button:has-text("分析を開始")').click();
    await page.waitForTimeout(1500);

    // aiAnalyze APIへのエラーリクエストがないことを確認
    const hasAiAnalyzeError = networkErrors.some((err) => err.includes('aiAnalyze'));
    expect(hasAiAnalyzeError, `API errors found: ${networkErrors.join(', ')}`).toBe(false);
  });

  /**
   * DEMO-STATS-AI-009: メトリクスが表示される
   */
  test('DEMO-STATS-AI-009: メトリクスが正しく表示される', async ({ page }) => {
    await page.locator('button:has-text("分析を開始")').click();
    await page.waitForTimeout(1500);

    // メトリクスの「現在」と「前回」が表示されていることを確認
    await expect(page.locator('text=現在: 95%')).toBeVisible();
    await expect(page.locator('text=+7%')).toBeVisible();
  });
});
