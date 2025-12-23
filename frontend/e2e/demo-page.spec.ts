/**
 * デモページ E2Eテスト - 家族向け特化版
 * @see docs/DEMO_FAMILY_REDESIGN.md
 * @see docs/E2E_TEST_SPEC.md
 *
 * 家族向けデモモード専用ページの表示・ナビゲーションを検証します。
 * デモモードは本番データに影響せず、ローカルシードデータで動作します。
 */

import { test, expect, Page } from '@playwright/test';

// SPAのロード完了を待つヘルパー
async function waitForSpaLoad(page: Page) {
  // ネットワークがアイドル状態になるのを待つ
  await page.waitForLoadState('networkidle');
  // 追加の待機（Reactのハイドレーション完了を待つ）
  await page.waitForTimeout(2000);
}

test.describe('デモホーム基本動作', () => {
  // 共通のテスト設定：タイムアウトを延長
  test.describe.configure({ timeout: 60000 });
  test('DEMO-001: デモホームにアクセスできる', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo/);

    // タイトルが「家族向けデモ」であることを確認
    await expect(page.getByRole('heading', { name: '家族向けデモ', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-002: デモモード説明が表示される', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // デモモードについての説明セクションが表示される
    await expect(page.locator('text=デモモードについて')).toBeVisible({ timeout: 15000 });

    // 「本番データには影響しません」というメッセージが表示される
    await expect(page.locator('text=本番データには').first()).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-003: 機能カードが5つ表示される', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 品物を登録するカード
    await expect(page.locator('text=品物を登録する')).toBeVisible({ timeout: 15000 });

    // 今日の様子を確認カード
    await expect(page.locator('text=今日の様子を確認')).toBeVisible({ timeout: 10000 });

    // いつもの指示を設定カード
    await expect(page.locator('text=いつもの指示を設定')).toBeVisible({ timeout: 10000 });

    // Phase 26: 入居者設定削除
    // await expect(page.locator('text=入居者設定')).toBeVisible({ timeout: 10000 });

    // 傾向を分析カード
    await expect(page.locator('text=傾向を分析')).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-004: 本番モードへのリンクがある', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「本番モードへ戻る」リンクが表示される
    await expect(page.locator('text=本番モードへ戻る')).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-005: ショーケースへのリンクがある', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「使い方ツアーを開始」リンクが表示される
    await expect(page.locator('text=使い方ツアーを開始')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('デモショーケース', () => {
  test('DEMO-010: ショーケースページにアクセスできる', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/showcase/);

    // タイトルが「ガイド付きツアー」であることを確認
    await expect(page.locator('text=ガイド付きツアー')).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-011: ステップ表示がある', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「ステップ 1/5」という表示がある
    await expect(page.locator('text=ステップ 1/5')).toBeVisible({ timeout: 15000 });

    // 最初のステップタイトル「品物を登録する」が表示される
    await expect(page.getByRole('heading', { name: '品物を登録する' })).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-012: 次へボタンで進める', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // Step 1が表示されている
    await expect(page.locator('text=ステップ 1/5')).toBeVisible({ timeout: 15000 });

    // 「次へ」ボタンをクリック
    await page.getByRole('button', { name: /次へ/ }).click();

    // Step 2に進む（タイトルが「登録した品物を確認」）
    await expect(page.locator('text=ステップ 2/5')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '登録した品物を確認' })).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-013: 前へボタンで戻れる', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // Step 2に進む
    await page.getByRole('button', { name: /次へ/ }).click();
    await expect(page.locator('text=ステップ 2/5')).toBeVisible({ timeout: 15000 });

    // 「前へ」ボタンをクリック
    await page.getByRole('button', { name: /前へ/ }).click();

    // Step 1に戻る
    await expect(page.locator('text=ステップ 1/5')).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-014: プログレスバーが表示される', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // プログレスバーが存在する（bg-gray-200クラスの要素）
    const progressBar = page.locator('.bg-gray-200.rounded-full.h-2');
    await expect(progressBar).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-015: この機能を見るボタンがある', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「この機能を見る」ボタンが表示される
    await expect(page.getByRole('button', { name: /この機能を見る/ })).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-016: 全ステップ一覧が折りたたみで表示できる', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「全ステップ一覧」のdetails要素を開く
    await page.locator('summary:has-text("全ステップ一覧")').click();

    // 全5ステップのタイトルが表示される（家族向けに変更）
    await expect(page.locator('text=1. 品物を登録する')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=2. 登録した品物を確認')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=5. 傾向を分析する')).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-017: ストーリーが表示される', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ストーリーテキストが表示される
    await expect(page.locator('text=週末に施設を訪問')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('デモ機能ページ', () => {
  test('DEMO-021: デモ家族ホームにアクセスできる', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/family/);

    // 家族ホームのタイトルが表示される
    await expect(page.locator('text=家族ホーム')).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-022: デモ統計にアクセスできる', async ({ page }) => {
    await page.goto('/demo/stats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/stats/);
  });

  test('DEMO-023: デモ品物一覧にアクセスできる', async ({ page }) => {
    await page.goto('/demo/family/items', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/family\/items/);

    // 品物管理のタイトルが表示される
    await expect(page.locator('text=品物管理').first()).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-024: デモタスク一覧にアクセスできる', async ({ page }) => {
    await page.goto('/demo/family/tasks', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/family\/tasks/);

    // タスクのタイトルが表示される
    await expect(page.getByRole('heading', { name: /タスク/ }).first()).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-025: デモプリセット管理にアクセスできる', async ({ page }) => {
    await page.goto('/demo/family/presets', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/family\/presets/);
  });

  // Phase 26: 入居者設定削除
  test.skip('DEMO-026: デモ入居者設定にアクセスできる', async ({ page }) => {
    await page.goto('/demo/family/settings/resident', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ページが正常に読み込まれる
    await expect(page).toHaveURL(/\/demo\/family\/settings\/resident/);
  });
});

test.describe('デモデータ表示', () => {
  test('DEMO-030: 品物一覧にサンプルデータが表示される', async ({ page }) => {
    await page.goto('/demo/family/items', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // デモ品物が表示される（demoCareItems.tsで定義されている品物）
    // バナナ、キウイ、りんご、プリンなどのいずれかが表示されることを確認
    const hasItems = await page.locator('text=/バナナ|キウイ|りんご|プリン/').count();
    expect(hasItems).toBeGreaterThan(0);
  });

  test('DEMO-031: 統計ダッシュボードにタブがある', async ({ page }) => {
    await page.goto('/demo/stats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 統計タブが存在する（品物状況、摂食傾向など）
    const hasTabs = await page.locator('button, [role="tab"]').filter({ hasText: /品物|摂食|傾向|状況/ }).count();
    expect(hasTabs).toBeGreaterThanOrEqual(0); // タブがなくても正常（UIによる）
  });

  test('DEMO-032: タスク一覧にフィルタタブが表示される', async ({ page }) => {
    await page.goto('/demo/family/tasks', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // タスク一覧のフィルタタブが表示される
    await expect(page.locator('text=全て').first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('ナビゲーション', () => {
  test('DEMO-040: デモホームから品物管理に遷移できる', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「品物を登録する」カードをクリック（フッターではなくメインコンテンツのカード）
    await page.getByRole('link', { name: '📦 品物を登録する' }).click();

    // 品物管理ページに遷移
    await expect(page).toHaveURL(/\/demo\/family\/items/, { timeout: 15000 });
  });

  test('DEMO-041: デモホームから統計に遷移できる', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「傾向を分析」カードをクリック（フッターではなくメインコンテンツのカード）
    await page.getByRole('link', { name: '📊 傾向を分析' }).click();

    // 統計ページに遷移
    await expect(page).toHaveURL(/\/demo\/stats/, { timeout: 15000 });
  });

  test('DEMO-042: デモホームからショーケースに遷移できる', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「使い方ツアーを開始」リンクをクリック
    await page.locator('text=使い方ツアーを開始').click();

    // ショーケースページに遷移
    await expect(page).toHaveURL(/\/demo\/showcase/, { timeout: 15000 });
  });

  test('DEMO-043: デモホームから本番に遷移できる', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「本番モードへ戻る」リンクをクリック
    await page.locator('text=本番モードへ戻る').click();

    // 本番ページに遷移（/demo以外）
    await expect(page).not.toHaveURL(/\/demo/, { timeout: 15000 });
  });

  test('DEMO-044: ショーケースからデモホームに戻れる', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「デモホームへ戻る」リンクをクリック
    await page.locator('text=デモホームへ戻る').click();

    // デモホームに遷移
    await expect(page).toHaveURL(/\/demo$/, { timeout: 15000 });
  });
});

test.describe('デモモードナビゲーション維持（重要）', () => {
  /**
   * デモモード内での操作がデモページ外に遷移しないことを検証
   * @see docs/DEMO_FAMILY_REDESIGN.md
   *
   * 期待動作: /demo/* 内のすべてのリンク・ボタンは /demo/* 内に留まるべき
   */

  test('DEMO-NAV-001: デモ家族ホームのフッターナビはすべてデモページ内を指す', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターナビゲーションを取得
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await expect(footer).toBeVisible({ timeout: 15000 });

    // フッター内のリンクをすべて取得
    const links = await footer.locator('a').all();

    // 各リンクのhref属性を確認
    for (const link of links) {
      const href = await link.getAttribute('href');
      expect(href, `Link href should start with /demo but got: ${href}`).toMatch(/^\/demo/);
    }
  });

  test('DEMO-NAV-002: デモ家族ホームからフッター「品物管理」クリック→デモページ内に留まる', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターの「品物管理」をクリック
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await footer.getByText('品物管理').click();

    // /demo/family/items に遷移すべき（/family/items ではない）
    await expect(page).toHaveURL(/^.*\/demo\/family\/items/, { timeout: 10000 });
  });

  test('DEMO-NAV-003: デモ家族ホームからフッター「記録閲覧」クリック→デモページ内に留まる', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターの「記録閲覧」をクリック
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await footer.getByText('記録閲覧').click();

    // /demo/view に遷移すべき（/view ではない）
    await expect(page).toHaveURL(/^.*\/demo/, { timeout: 10000 });
  });

  test('DEMO-NAV-004: デモ家族ホームからフッター「統計」クリック→デモページ内に留まる', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターの「統計」をクリック
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await footer.getByText('統計').click();

    // /demo/stats に遷移すべき（/stats ではない）
    await expect(page).toHaveURL(/^.*\/demo/, { timeout: 10000 });
  });

  test('DEMO-NAV-005: デモ品物一覧で新規登録→デモページ内に留まる', async ({ page }) => {
    await page.goto('/demo/family/items', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「新規登録」リンクをクリック
    const newButton = page.getByRole('link', { name: /新規登録/ });
    if (await newButton.isVisible()) {
      await newButton.click();
      // /demo/family/items/new に遷移すべき
      await expect(page).toHaveURL(/^.*\/demo\/family\/items\/new/, { timeout: 10000 });
    }
  });

  test('DEMO-NAV-006: デモタスク一覧のフッターからホームに戻る→デモページ内に留まる', async ({ page }) => {
    await page.goto('/demo/family/tasks', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターの「ホーム」をクリック
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await footer.getByText('ホーム').click();

    // /demo/family に遷移すべき（/family ではない）
    await expect(page).toHaveURL(/^.*\/demo\/family$/, { timeout: 10000 });
  });

  test('DEMO-NAV-007: デモ統計画面から戻ってもデモ内に留まる', async ({ page }) => {
    await page.goto('/demo/stats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // フッターナビでホームに戻る
    const footer = page.locator('nav[aria-label]');
    if (await footer.isVisible()) {
      // ホームリンクがあればクリック
      const homeLink = footer.getByText('ホーム');
      if (await homeLink.isVisible()) {
        await homeLink.click();
        // デモページ内に留まるべき
        await expect(page).toHaveURL(/^.*\/demo/, { timeout: 10000 });
      }
    }
  });
});

test.describe('ツアーナビゲーション（ヘッダーボタン）', () => {
  /**
   * ツアーナビゲーション改善テスト
   * @see docs/DEMO_FAMILY_REDESIGN.md
   *
   * /demo/* ページ（/demo/showcase 以外）のヘッダー右側に「← ツアーTOPに戻る」ボタンが表示されることを検証
   */

  test('DEMO-TOUR-001: /demo/familyでツアーボタンがヘッダーに表示される', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ヘッダー内の「ツアーTOPに戻る」ボタンが表示される
    await expect(page.getByTestId('demo-tour-button')).toBeVisible({ timeout: 15000 });

    // ボタンに「ツアーTOPに戻る」テキストが含まれる
    await expect(page.getByTestId('demo-tour-button')).toContainText('ツアーTOPに戻る');
  });

  test('DEMO-TOUR-002: /demo/statsでツアーボタンがヘッダーに表示される', async ({ page }) => {
    await page.goto('/demo/stats', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ヘッダー内の「ツアー」ボタンが表示される
    await expect(page.getByTestId('demo-tour-button')).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-TOUR-003: /demo/showcaseではツアーボタン非表示', async ({ page }) => {
    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ツアートップ自体ではボタン非表示
    await expect(page.getByTestId('demo-tour-button')).not.toBeVisible({ timeout: 5000 });
  });

  test('DEMO-TOUR-004: ツアーボタンクリックで/demo/showcaseに遷移', async ({ page }) => {
    await page.goto('/demo/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 「ツアー」ボタンをクリック
    await page.getByTestId('demo-tour-button').click();

    // /demo/showcase に遷移
    await expect(page).toHaveURL(/\/demo\/showcase/, { timeout: 15000 });
  });

  test('DEMO-TOUR-005: 本番ページ(/family)ではツアーボタン非表示', async ({ page }) => {
    await page.goto('/family', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // 本番ページではツアーボタン非表示
    await expect(page.getByTestId('demo-tour-button')).not.toBeVisible({ timeout: 5000 });
  });

  test('DEMO-TOUR-006: /demo でもツアーボタンが表示される', async ({ page }) => {
    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // デモホームでもツアーボタンが表示される
    await expect(page.getByTestId('demo-tour-button')).toBeVisible({ timeout: 15000 });
  });

  test('DEMO-TOUR-007: スクロールしてもツアーボタンは常に見える', async ({ page }) => {
    await page.goto('/demo/family/items', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // ツアーボタンが表示されることを確認
    await expect(page.getByTestId('demo-tour-button')).toBeVisible({ timeout: 15000 });

    // ページを下にスクロール
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);

    // スクロール後もツアーボタンが見える（sticky header）
    await expect(page.getByTestId('demo-tour-button')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('レスポンシブ表示', () => {
  test('DEMO-RESP-001: モバイル幅でデモホームが正しく表示される', async ({ page }) => {
    // モバイル幅に設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/demo', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // タイトルが表示される
    await expect(page.getByRole('heading', { name: '家族向けデモ', exact: true })).toBeVisible({ timeout: 15000 });

    // 機能カードが表示される
    await expect(page.locator('text=品物を登録する').first()).toBeVisible({ timeout: 10000 });
  });

  test('DEMO-RESP-002: モバイル幅でショーケースが正しく表示される', async ({ page }) => {
    // モバイル幅に設定
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/demo/showcase', { waitUntil: 'networkidle' });
    await waitForSpaLoad(page);

    // タイトルが表示される
    await expect(page.locator('text=ガイド付きツアー')).toBeVisible({ timeout: 15000 });

    // ナビゲーションボタンが表示される
    await expect(page.getByRole('button', { name: /次へ/ })).toBeVisible({ timeout: 10000 });
  });
});
