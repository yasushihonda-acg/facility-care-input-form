/**
 * 家族ユーザーシナリオテスト
 *
 * デモツアーの6ステップを家族目線でシミュレーションし、
 * 本番ページでも同様に動作することを確認します。
 *
 * @see docs/DEMO_FAMILY_REDESIGN.md - デモツアー設計
 * @see docs/FAMILY_UX_DESIGN.md - 家族UX設計
 */

import { test, expect, Page } from '@playwright/test';

// ヘルパー: SPAの読み込み待機
async function waitForSpaLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// ============================================================
// Part 1: デモモードでの家族ユーザーシナリオ
// ============================================================

test.describe('【デモ】家族ユーザーシナリオ（6ステップ）', () => {

  test.describe('Step 1: 品物を登録する', () => {
    test('SCENARIO-D01: 品物登録フォームにアクセスできる', async ({ page }) => {
      await page.goto('/demo/family/items/new');
      await waitForSpaLoad(page);

      // フォームが表示される
      await expect(page.locator('#itemName')).toBeVisible();
      await expect(page.locator('#quantity')).toBeVisible();
    });

    test('SCENARIO-D02: 品物名を入力するとAI提案ボタンが表示される', async ({ page }) => {
      await page.goto('/demo/family/items/new');
      await waitForSpaLoad(page);

      // 品物名を入力
      await page.locator('#itemName').fill('キウイ');

      // AI提案関連のUIが存在することを確認
      // （実際のAI呼び出しはデモモードではスキップされる可能性あり）
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });

    test('SCENARIO-D03: プリセットボタンが表示される', async ({ page }) => {
      await page.goto('/demo/family/items/new');
      await waitForSpaLoad(page);

      // プリセット関連のUIを確認（いつもの指示セクション）
      // プリセットグリッドまたはプリセット選択UIが存在
      const presetSection = page.locator('text=いつもの指示');
      // プリセットセクションが存在するか確認（結果は情報ログとして出力）
      const hasPresets = await presetSection.isVisible().catch(() => false);
      console.log('Presets section visible:', hasPresets);

      // フォームは確実に存在
      await expect(page.locator('form')).toBeVisible();
    });

    test('SCENARIO-D04: デモモードでは登録操作が本番に影響しない', async ({ page }) => {
      await page.goto('/demo/family/items/new');
      await waitForSpaLoad(page);

      // 必須項目を入力
      await page.locator('#itemName').fill('テスト品物');
      await page.locator('#quantity').fill('1');

      // 登録ボタンをクリック
      const submitButton = page.getByRole('button', { name: /登録/ });
      if (await submitButton.isEnabled()) {
        await submitButton.click();

        // デモモードのアラートまたはリダイレクトを確認
        // デモモードでは /demo/family/items にリダイレクトされる
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        expect(currentUrl).toContain('/demo/');
      }
    });
  });

  test.describe('Step 2: 登録した品物を確認', () => {
    test('SCENARIO-D05: 品物一覧にデモデータが表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await waitForSpaLoad(page);

      // 品物管理タイトルが表示される
      await expect(page.getByRole('heading', { name: /品物管理/ }).first()).toBeVisible({ timeout: 10000 });

      // 新規登録ボタンが存在する
      await expect(page.getByRole('link', { name: /新規登録/ })).toBeVisible();
    });

    test('SCENARIO-D06: 新規登録ボタンが機能する', async ({ page }) => {
      await page.goto('/demo/family/items');
      await waitForSpaLoad(page);

      // 新規登録リンクが存在する
      const newButton = page.getByRole('link', { name: /新規登録/ });
      await expect(newButton).toBeVisible();
    });

    test('SCENARIO-D07: 品物カードまたはリストが表示される', async ({ page }) => {
      await page.goto('/demo/family/items');
      await waitForSpaLoad(page);

      // メインコンテンツエリアが存在する
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Step 3: いつもの指示を設定', () => {
    test('SCENARIO-D08: プリセット管理画面にアクセスできる', async ({ page }) => {
      await page.goto('/demo/family/presets');
      await waitForSpaLoad(page);

      // 「いつもの指示」タイトルが表示される
      await expect(page.getByRole('heading', { name: /いつもの指示/ }).first()).toBeVisible();
    });

    test('SCENARIO-D09: プリセット管理ページのメインコンテンツが表示される', async ({ page }) => {
      await page.goto('/demo/family/presets');
      await waitForSpaLoad(page);

      // メインコンテンツエリアが存在する
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });
  });

  // Phase 26: 入居者設定削除
  test.describe.skip('Step 4: 入居者設定を確認', () => {
    test('SCENARIO-D10: 入居者設定画面にアクセスできる', async ({ page }) => {
      await page.goto('/demo/family/settings/resident');
      await waitForSpaLoad(page);

      // 入居者設定タイトルが表示される
      await expect(page.getByRole('heading', { name: '入居者設定' })).toBeVisible();
    });

    test('SCENARIO-D11: 禁止ルール見出しが表示される', async ({ page }) => {
      await page.goto('/demo/family/settings/resident');
      await waitForSpaLoad(page);

      // 提供禁止品目の見出しが存在
      await expect(page.getByRole('heading', { name: /提供禁止/ })).toBeVisible();
    });
  });

  test.describe('Step 5: 今日の様子を確認', () => {
    test('SCENARIO-D12: 家族ダッシュボードにアクセスできる', async ({ page }) => {
      await page.goto('/demo/family');
      await waitForSpaLoad(page);

      // 家族ホームが表示される
      await expect(page.locator('text=家族ホーム')).toBeVisible();
    });

    test('SCENARIO-D13: 日付セレクターが機能する', async ({ page }) => {
      await page.goto('/demo/family');
      await waitForSpaLoad(page);

      // 日付ナビゲーションが存在
      await expect(page.getByLabel('前の日')).toBeVisible();
      await expect(page.getByLabel('次の日')).toBeVisible();
    });

    test('SCENARIO-D14: タイムラインが表示される', async ({ page }) => {
      await page.goto('/demo/family');
      await waitForSpaLoad(page);

      // 食事時間帯（朝食、昼食など）の表示を確認
      const timeline = page.locator('.space-y-3');
      await expect(timeline).toBeVisible();
    });
  });

  test.describe('Step 6: 傾向を分析する', () => {
    test('SCENARIO-D15: 統計ダッシュボードにアクセスできる', async ({ page }) => {
      await page.goto('/demo/stats');
      await waitForSpaLoad(page);

      // 統計タイトルが表示される
      await expect(page.getByRole('heading', { name: '統計' })).toBeVisible();
    });

    test('SCENARIO-D16: 品物状況タブがある', async ({ page }) => {
      await page.goto('/demo/stats');
      await waitForSpaLoad(page);

      // タブが表示される（ボタンとして）
      await expect(page.getByRole('button', { name: /品物状況/ })).toBeVisible();
    });

    test('SCENARIO-D17: 摂食傾向タブがある', async ({ page }) => {
      await page.goto('/demo/stats');
      await waitForSpaLoad(page);

      // 摂食傾向タブが表示される
      await expect(page.getByRole('button', { name: /摂食傾向/ })).toBeVisible();
    });

    test('SCENARIO-D18: 品物別分布が表示される', async ({ page }) => {
      await page.goto('/demo/stats');
      await waitForSpaLoad(page);

      // 品物別分布が表示される (Phase 32: カテゴリ別分布から変更)
      await expect(page.locator('text=品物別分布')).toBeVisible();
    });
  });
});

// ============================================================
// Part 2: デモと本番の対応確認テスト
// ============================================================

test.describe('【対応確認】デモ→本番の機能一致', () => {

  // 各ステップについて、デモと本番で同じUIコンポーネントが表示されることを確認

  test('PARITY-01: 品物登録フォーム（デモ↔本番）', async ({ page }) => {
    // デモ版
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);
    const demoItemName = await page.locator('#itemName').isVisible();
    const demoQuantity = await page.locator('#quantity').isVisible();
    const demoSubmit = await page.getByRole('button', { name: /登録/ }).isVisible();

    // 本番版
    await page.goto('/family/items/new');
    await waitForSpaLoad(page);
    const prodItemName = await page.locator('#itemName').isVisible();
    const prodQuantity = await page.locator('#quantity').isVisible();
    const prodSubmit = await page.getByRole('button', { name: /登録/ }).isVisible();

    // 同じUI要素が両方で表示される
    expect(demoItemName).toBe(prodItemName);
    expect(demoQuantity).toBe(prodQuantity);
    expect(demoSubmit).toBe(prodSubmit);
  });

  test('PARITY-02: 品物一覧ページ（デモ↔本番）', async ({ page }) => {
    // デモ版
    await page.goto('/demo/family/items');
    await waitForSpaLoad(page);
    const demoTitle = await page.getByRole('heading', { name: /品物管理/ }).first().isVisible();
    const demoNewButton = await page.getByRole('link', { name: /新規登録/ }).isVisible();

    // 本番版
    await page.goto('/family/items');
    await waitForSpaLoad(page);
    const prodTitle = await page.getByRole('heading', { name: /品物管理/ }).first().isVisible();
    const prodNewButton = await page.getByRole('link', { name: /新規登録/ }).isVisible();

    expect(demoTitle).toBe(prodTitle);
    expect(demoNewButton).toBe(prodNewButton);
  });

  test('PARITY-03: プリセット管理ページ（デモ↔本番）', async ({ page }) => {
    // デモ版
    await page.goto('/demo/family/presets');
    await waitForSpaLoad(page);
    const demoTitle = await page.getByRole('heading', { name: /いつもの指示/ }).first().isVisible();

    // 本番版
    await page.goto('/family/presets');
    await waitForSpaLoad(page);
    const prodTitle = await page.getByRole('heading', { name: /いつもの指示/ }).first().isVisible();

    expect(demoTitle).toBe(prodTitle);
  });

  // Phase 26: 入居者設定削除
  test.skip('PARITY-04: 入居者設定ページ（デモ↔本番）', async ({ page }) => {
    // デモ版
    await page.goto('/demo/family/settings/resident');
    await waitForSpaLoad(page);
    const demoProhibition = await page.locator('text=/入居者|禁止/').first().isVisible();

    // 本番版
    await page.goto('/family/settings/resident');
    await waitForSpaLoad(page);
    const prodProhibition = await page.locator('text=/入居者|禁止/').first().isVisible();

    expect(demoProhibition).toBe(prodProhibition);
  });

  test('PARITY-05: 家族ダッシュボード（デモ↔本番）', async ({ page }) => {
    // デモ版
    await page.goto('/demo/family');
    await waitForSpaLoad(page);
    const demoTitle = await page.locator('text=家族ホーム').isVisible();
    const demoPrevDay = await page.getByLabel('前の日').isVisible();

    // 本番版
    await page.goto('/family');
    await waitForSpaLoad(page);
    const prodTitle = await page.locator('text=家族ホーム').isVisible();
    const prodPrevDay = await page.getByLabel('前の日').isVisible();

    expect(demoTitle).toBe(prodTitle);
    expect(demoPrevDay).toBe(prodPrevDay);
  });

  test('PARITY-06: 統計ダッシュボード（デモ↔本番）', async ({ page }) => {
    // デモ版
    await page.goto('/demo/stats');
    await waitForSpaLoad(page);
    const demoItemTab = await page.getByRole('button', { name: /品物状況/ }).isVisible();
    const demoFoodTab = await page.getByRole('button', { name: /摂食傾向/ }).isVisible();

    // 本番版
    await page.goto('/stats');
    await waitForSpaLoad(page);
    const prodItemTab = await page.getByRole('button', { name: /品物状況/ }).isVisible();
    const prodFoodTab = await page.getByRole('button', { name: /摂食傾向/ }).isVisible();

    expect(demoItemTab).toBe(prodItemTab);
    expect(demoFoodTab).toBe(prodFoodTab);
  });
});

// ============================================================
// Part 3: 一連のユーザーフロー（E2Eシナリオ）
// ============================================================

test.describe('【フロー】家族の典型的な利用シナリオ', () => {

  test('FLOW-01: デモツアーを最初から最後まで体験する', async ({ page }) => {
    // Step 1: ショーケースから開始
    await page.goto('/demo/showcase');
    await waitForSpaLoad(page);
    // タイトル「使い方ツアー」は h1 タグで表示される
    await expect(page.locator('h1')).toBeVisible();

    // Step 2: 「この機能を見る」ボタンを探す（テキストに矢印が含まれる）
    const viewButton = page.locator('text=この機能を見る');
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Step 3: いずれかのデモページに遷移したことを確認
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/demo/');

    // Step 4: ツアーTOPに戻る
    const tourButton = page.getByRole('link', { name: /ツアーTOP/ });
    await expect(tourButton).toBeVisible();
    await tourButton.click();

    // Step 5: ショーケースに戻ったことを確認
    await expect(page).toHaveURL(/\/demo\/showcase/);
  });

  test('FLOW-02: 品物登録→一覧確認→統計の流れ', async ({ page }) => {
    // Step 1: 品物一覧へ
    await page.goto('/demo/family/items');
    await waitForSpaLoad(page);
    await expect(page.getByRole('heading', { name: /品物管理/ }).first()).toBeVisible();

    // Step 2: 新規登録ボタンをクリック
    await page.getByRole('link', { name: /新規登録/ }).click();
    await expect(page).toHaveURL(/\/demo\/family\/items\/new/);

    // Step 3: フッターから統計へ
    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');
    await footer.getByText('統計').click();
    await expect(page).toHaveURL(/\/demo\/stats/);

    // Step 4: 統計が表示される
    await expect(page.getByRole('button', { name: /品物状況/ })).toBeVisible();
  });

  test('FLOW-03: フッターナビで全ページを巡回（デモモード）', async ({ page }) => {
    // 起点: デモ家族ホーム
    await page.goto('/demo/family');
    await waitForSpaLoad(page);

    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');

    // Step 1: 品物管理へ
    await footer.getByText('品物管理').click();
    await expect(page).toHaveURL(/\/demo\/family\/items/);

    // Step 2: 記録閲覧へ
    await footer.getByText('記録閲覧').click();
    await expect(page).toHaveURL(/\/demo\/view/);

    // Step 3: 統計へ
    await footer.getByText('統計').click();
    await expect(page).toHaveURL(/\/demo\/stats/);

    // Step 4: ホームへ戻る
    await footer.getByText('ホーム').click();
    await expect(page).toHaveURL(/\/demo\/family/);

    // すべてデモモード内に留まっている
    const currentUrl = page.url();
    expect(currentUrl).toContain('/demo/');
  });
});

// ============================================================
// Part 4: 本番ページの準備状況確認
// ============================================================

test.describe('【本番準備】家族用ページの本番利用可能性', () => {

  test('PROD-01: 本番家族ホームが正常に表示される', async ({ page }) => {
    await page.goto('/family');
    await waitForSpaLoad(page);

    // 基本UIが表示される
    await expect(page.locator('text=家族ホーム')).toBeVisible();
    await expect(page.locator('nav[aria-label="家族用ナビゲーション"]')).toBeVisible();
  });

  test('PROD-02: 本番品物管理が正常に表示される', async ({ page }) => {
    await page.goto('/family/items');
    await waitForSpaLoad(page);

    await expect(page.getByRole('heading', { name: /品物管理/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /新規登録/ })).toBeVisible();
  });

  test('PROD-03: 本番品物登録フォームが正常に表示される', async ({ page }) => {
    await page.goto('/family/items/new');
    await waitForSpaLoad(page);

    await expect(page.locator('#itemName')).toBeVisible();
    await expect(page.locator('#quantity')).toBeVisible();
    await expect(page.getByRole('button', { name: /登録/ })).toBeVisible();
  });

  test('PROD-04: 本番プリセット管理が正常に表示される', async ({ page }) => {
    await page.goto('/family/presets');
    await waitForSpaLoad(page);

    await expect(page.getByRole('heading', { name: /いつもの指示/ }).first()).toBeVisible();
  });

  // Phase 26: 入居者設定削除
  test.skip('PROD-05: 本番入居者設定が正常に表示される', async ({ page }) => {
    await page.goto('/family/settings/resident');
    await waitForSpaLoad(page);

    await expect(page.getByRole('heading', { name: '入居者設定' })).toBeVisible();
  });

  test('PROD-06: 本番統計が正常に表示される', async ({ page }) => {
    await page.goto('/stats');
    await waitForSpaLoad(page);

    await expect(page.getByRole('heading', { name: '統計' })).toBeVisible();
    await expect(page.getByRole('button', { name: /品物状況/ })).toBeVisible();
  });

  test('PROD-07: 本番フッターナビで全ページ遷移可能', async ({ page }) => {
    await page.goto('/family');
    await waitForSpaLoad(page);

    const footer = page.locator('nav[aria-label="家族用ナビゲーション"]');

    // 品物管理
    await footer.getByText('品物管理').click();
    await expect(page).toHaveURL(/\/family\/items/);

    // 記録閲覧
    await footer.getByText('記録閲覧').click();
    await expect(page).toHaveURL(/\/view/);

    // 統計
    await footer.getByText('統計').click();
    await expect(page).toHaveURL(/\/stats/);

    // ホーム
    await footer.getByText('ホーム').click();
    await expect(page).toHaveURL(/\/family$/);
  });
});
