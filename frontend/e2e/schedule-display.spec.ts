/**
 * Phase 13.2: スタッフ向けスケジュール表示強化 E2Eテスト
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション4
 *
 * TDDアプローチ: テストを先に作成し、実装で通す
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://facility-care-input-form.web.app';

test.describe('Phase 13.2: スタッフ向けスケジュール表示', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    // デモのスタッフ食事入力ページ → 品物から記録タブ
    await page.goto(`${BASE_URL}/demo/staff/input/meal`);
    await page.waitForLoadState('networkidle');

    // 「品物から記録」タブに切り替え
    const itemBasedTab = page.locator('button:has-text("品物から記録")');
    if (await itemBasedTab.isVisible()) {
      await itemBasedTab.click();
      await page.waitForTimeout(500);
    }
  });

  test.describe('タイムスロット表示', () => {
    test('SCHED-020: タイムスロットが表示される（おやつ時）', async ({ page }) => {
      // カステラまたは羊羹のカードを探す（どちらもスケジュール設定あり）
      // 「おやつ時」テキストが表示される
      await expect(page.locator('text=おやつ時').first()).toBeVisible({ timeout: 10000 });
    });

    test('SCHED-020b: 毎日スケジュールのタイムスロット表示', async ({ page }) => {
      // カステラ: daily + snack
      const castella = page.locator('text=カステラ').first();
      if (await castella.isVisible()) {
        // 同じカード内にタイムスロットが表示される
        const card = castella.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
        await expect(card.locator('text=毎日')).toBeVisible();
        await expect(card.locator('text=おやつ時')).toBeVisible();
      }
    });
  });

  test.describe('曜日バッジ表示', () => {
    test('SCHED-021: 曜日指定スケジュールで曜日が表示される', async ({ page }) => {
      // 羊羹: weekly + 月・水・金
      const yokan = page.locator('text=羊羹').first();
      if (await yokan.isVisible()) {
        const card = yokan.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
        // 曜日表示を確認（テキスト「月・水・金」が含まれる要素）
        await expect(card.locator('text=月・水・金').first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('SCHED-022: 今日の曜日がハイライトされる', async ({ page }) => {
      // 今日の曜日を取得
      const today = new Date();

      // 羊羹カードを探す（月・水・金スケジュール）
      const yokan = page.locator('text=羊羹').first();
      if (await yokan.isVisible()) {
        const card = yokan.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();

        // 今日が月・水・金の場合、ハイライト表示を確認
        if ([1, 3, 5].includes(today.getDay())) {
          // 「今日は○曜日 ✓」メッセージが表示される
          await expect(card.locator('text=/今日は.*曜日 ✓/').first()).toBeVisible();
        }
      }
    });
  });

  test.describe('次回提供予定日表示', () => {
    test('SCHED-023: 今日が該当しない場合、次回日付が表示される', async ({ page }) => {
      // 羊羹: 月・水・金スケジュール
      // 今日が火・木・土・日の場合、「次回」表示がある
      const today = new Date();
      const todayDay = today.getDay();

      // 月(1)・水(3)・金(5)以外の日
      if (![1, 3, 5].includes(todayDay)) {
        const yokan = page.locator('text=羊羹').first();
        if (await yokan.isVisible()) {
          const card = yokan.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
          // 「次回」または次の日付が表示される
          await expect(card.locator('text=/次回|（[月火水木金土日]）/')).toBeVisible({ timeout: 5000 });
        }
      } else {
        // 今日が該当日の場合はスキップ
        test.skip();
      }
    });
  });

  test.describe('スケジュール補足メモ表示', () => {
    test('SCHED-024: 補足メモが表示される', async ({ page }) => {
      // 羊羹: note = "15時のおやつに提供"
      const yokan = page.locator('text=羊羹').first();
      if (await yokan.isVisible()) {
        const card = yokan.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
        // 補足メモが表示される
        await expect(card.locator('text=15時のおやつに提供')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('スケジュール表示全般', () => {
    test('SCHED-025: スケジュールなし品物にはスケジュール表示がない', async ({ page }) => {
      // バナナ: スケジュールなし（期限のみ）
      const banana = page.locator('text=バナナ').first();
      if (await banana.isVisible()) {
        const card = banana.locator('xpath=ancestor::div[contains(@class, "rounded-lg")]').first();
        // スケジュール関連表示がないことを確認
        // 「毎日」「月・水・金」などがないこと
        const scheduleText = card.locator('text=/毎日|曜日|週間/');
        await expect(scheduleText).not.toBeVisible();
      }
    });

    test('SCHED-026: 品物から記録タブが正しく表示される', async ({ page }) => {
      // 基本的な表示確認
      await expect(page.locator('text=品物から間食記録')).toBeVisible();

      // 品物グループヘッダーが少なくとも1つ表示されている
      const groupHeaders = page.locator('h3:has-text("今日提供予定"), h3:has-text("期限が近い"), h3:has-text("その他の品物")');
      await expect(groupHeaders.first()).toBeVisible();
    });
  });
});
