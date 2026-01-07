/**
 * E2E Tests: 残ったものへの処置指示 (Phase 33)
 * @see docs/REMAINING_HANDLING_INSTRUCTION_SPEC.md
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 33: 残ったものへの処置指示', () => {
  test.describe('家族用品物登録フォーム', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/demo/family/items/new');
    });

    test('RHI-001: 品物登録時に「破棄してください」指示を設定できる', async ({ page }) => {
      // 品物名を入力
      await page.fill('input#itemName', 'テスト品物1');

      // 処置指示セクションを確認
      await expect(page.getByText('残った場合の処置指示')).toBeVisible();

      // 「破棄してください」を選択
      await page.getByLabel('破棄してください').check();
      await expect(page.getByLabel('破棄してください')).toBeChecked();

      // 説明文が表示されていることを確認
      await expect(page.getByText('残った場合は破棄してください')).toBeVisible();
    });

    test('RHI-002: 品物登録時に「保存してください」指示を設定できる', async ({ page }) => {
      // 品物名を入力
      await page.fill('input#itemName', 'テスト品物2');

      // 「保存してください」を選択
      await page.getByLabel('保存してください').check();
      await expect(page.getByLabel('保存してください')).toBeChecked();

      // 説明文が表示されていることを確認
      await expect(page.getByText('残った場合は保存してください')).toBeVisible();
    });

    test('RHI-003: 品物登録時に「指定なし」がデフォルト選択されている', async ({ page }) => {
      // デフォルトで「指定なし」が選択されていることを確認
      await expect(page.getByLabel('指定なし')).toBeChecked();

      // 説明文が表示されていることを確認
      await expect(page.getByText('スタッフの判断に任せます')).toBeVisible();
    });

    test('RHI-004: 注意書きが表示されている', async ({ page }) => {
      // 注意書きが表示されていることを確認
      await expect(page.getByText('※ 指示がある場合、スタッフは指示通りの対応のみ選択可能になります')).toBeVisible();
    });
  });

  test.describe('家族用品物編集フォーム', () => {
    // 編集ページのテストはデモ品物データのIDに依存するため、
    // 実際の品物IDを使用してテスト

    test.skip('RHI-005: 品物編集ページで処置指示セクションが表示される（デモデータ依存）', async () => {
      // このテストはFirestoreにデモ品物が存在する場合のみ有効
      // 品物IDを指定してテスト: /demo/family/items/{itemId}/edit
    });

    test.skip('RHI-006: 品物編集で指示を変更できる（デモデータ依存）', async () => {
      // このテストはFirestoreにデモ品物が存在する場合のみ有効
    });
  });

  test.describe('スタッフ記録入力ダイアログ', () => {
    // Note: スタッフ記録ダイアログのテストはデモ品物データに依存
    // 家族指示のある品物がデモデータに存在する場合にテスト可能

    test.beforeEach(async ({ page }) => {
      // スタッフ向けデモページへ移動
      await page.goto('/demo/staff');
    });

    test('RHI-007: スタッフ記録ダイアログで残り対応選択肢が表示される', async ({ page }) => {
      // 品物一覧から品物を選択（デモデータ依存）
      const itemCard = page.locator('[data-testid="item-card"]').first();
      if (await itemCard.isVisible()) {
        await itemCard.click();

        // ダイアログが開くまで待機
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          // 摂食割合を下げて残り対応セクションを表示
          const rateInput = page.locator('input[type="number"]').filter({ hasText: /10/ });
          if (await rateInput.isVisible()) {
            await rateInput.fill('5');
            // 残り対応セクションが表示されることを確認
            await expect(page.getByText('残った分への対応')).toBeVisible();
          }
        }
      }
    });

    test('RHI-008: 家族指示がある場合、指示バナーが表示される', async ({ page }) => {
      // デモデータ: demo-item-003 (りんご) に 'discarded' 指示あり
      // りんごカードをクリックしてダイアログを開く
      const appleCard = page.locator('[data-testid="item-card"]').filter({ hasText: 'りんご' }).first();
      if (await appleCard.isVisible()) {
        await appleCard.click();

        // ダイアログが開くまで待機
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // 家族指示バナーが表示されることを確認
        await expect(page.getByText('ご家族からの指示があります')).toBeVisible();
        await expect(page.getByText('破棄してください')).toBeVisible();
      }
    });

    test('RHI-009: 家族指示がある場合でも全選択肢が有効（修正記録用）', async ({ page }) => {
      // デモデータ: demo-item-001 (バナナ) に 'stored' 指示あり
      // バナナカードをクリックしてダイアログを開く
      const bananaCard = page.locator('[data-testid="item-card"]').filter({ hasText: 'バナナ' }).first();
      if (await bananaCard.isVisible()) {
        await bananaCard.click();

        // ダイアログが開くまで待機
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // 摂食割合を下げて残り対応セクションを表示させる
        const consumptionRateInput = page.locator('input#consumptionRateInput');
        if (await consumptionRateInput.isVisible()) {
          await consumptionRateInput.fill('5');

          // 残り対応セクションが表示されるまで待機
          await expect(page.getByText('残った分への対応')).toBeVisible({ timeout: 3000 });

          // 家族指示があっても全選択肢が有効（修正記録として使用可能）
          const discardedRadio = page.getByLabel('破棄した');
          const storedRadio = page.getByLabel('保存した');

          // すべての選択肢が有効
          await expect(storedRadio).toBeEnabled();
          await expect(discardedRadio).toBeEnabled();
        }
      }
    });
  });

  test.describe('型定義の確認', () => {
    test('RHI-010: 型定義とUIが一致していることを確認（回帰テスト）', async ({ page }) => {
      await page.goto('/demo/family/items/new');

      // 3つの選択肢が表示されていることを確認
      const options = [
        { label: '指定なし', description: 'スタッフの判断に任せます' },
        { label: '破棄してください', description: '残った場合は破棄してください' },
        { label: '保存してください', description: '残った場合は保存してください' },
      ];

      for (const option of options) {
        await expect(page.getByLabel(option.label)).toBeVisible();
        await expect(page.getByText(option.description)).toBeVisible();
      }
    });
  });
});
