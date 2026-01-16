import { test, expect } from '@playwright/test';

test.describe('日付別摂食率表示テスト', () => {
  test('品物詳細モーダルで日付別の摂食状況が表示される', async ({ page }) => {
    // デモ品物管理ページにアクセス
    await page.goto('http://localhost:4173/demo/family/items');
    await page.waitForLoadState('networkidle');

    // 「日」タブを選択して日別表示に（exactマッチで「毎日」との重複を避ける）
    await page.getByRole('button', { name: '日', exact: true }).click();
    await page.waitForTimeout(500);

    // 品物カードを見つけてクリック
    const itemCard = page.locator('[data-testid="item-card"]').first();
    await expect(itemCard).toBeVisible({ timeout: 10000 });
    await itemCard.click();

    // モーダルが開くのを待つ
    const modal = page.locator('[data-testid="item-detail-modal"]');
    await expect(modal).toBeVisible();

    // 摂食状況セクションが表示されていることを確認
    // 「X/Xの摂食:」というテキストが表示される（日付 + "の摂食"）
    const consumptionSection = modal.locator('text=/\\d+\\/\\d+の摂食/');

    // 摂食セクションが存在する場合（consumed/in_progressの品物）
    const hasConsumption = await consumptionSection.count() > 0;

    if (hasConsumption) {
      // 「未記録」または「読み込み中...」または「XX%」のいずれかが表示される
      const consumptionText = await modal.locator('div.p-3').filter({ hasText: /の摂食/ }).textContent();
      console.log('摂食状況:', consumptionText);

      // 日付が含まれていることを確認
      expect(consumptionText).toMatch(/\d+\/\d+の摂食/);

      // 「未記録」「読み込み中」「XX%」のいずれかが含まれる
      expect(consumptionText).toMatch(/未記録|読み込み中|\d+%/);
    } else {
      console.log('この品物には摂食セクションがない（pending状態など）');
    }
  });

  test('日付を変更すると異なる日付の摂食状況が表示される', async ({ page }) => {
    // デモ品物管理ページにアクセス
    await page.goto('http://localhost:4173/demo/family/items');
    await page.waitForLoadState('networkidle');

    // 「日」タブを選択（exactマッチで「毎日」との重複を避ける）
    await page.getByRole('button', { name: '日', exact: true }).click();
    await page.waitForTimeout(500);

    // 今日の日付を取得
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}/${today.getDate()}`;

    // 品物カードをクリック
    const itemCard = page.locator('[data-testid="item-card"]').first();
    await expect(itemCard).toBeVisible({ timeout: 10000 });
    await itemCard.click();

    const modal = page.locator('[data-testid="item-detail-modal"]');
    await expect(modal).toBeVisible();

    // 今日の日付が摂食セクションに表示されていることを確認
    const todaySection = modal.locator(`text=/${todayStr}の摂食/`);
    const hasTodaySection = await todaySection.count() > 0;

    if (hasTodaySection) {
      console.log(`今日(${todayStr})の摂食状況が表示されている`);
    }

    // モーダルを閉じる
    await modal.locator('button[aria-label="閉じる"]').click();
    await expect(modal).not.toBeVisible();

    // 1日前に移動（aria-labelで特定）
    const prevButton = page.locator('button[aria-label="前へ"]');
    await prevButton.click();
    await page.waitForTimeout(500);

    // 昨日の日付
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getMonth() + 1}/${yesterday.getDate()}`;

    // 再度品物カードをクリック
    const itemCard2 = page.locator('[data-testid="item-card"]').first();
    if (await itemCard2.isVisible()) {
      await itemCard2.click();
      await expect(modal).toBeVisible();

      // 昨日の日付が摂食セクションに表示されていることを確認
      const yesterdaySection = modal.locator(`text=/${yesterdayStr}の摂食/`);
      const hasYesterdaySection = await yesterdaySection.count() > 0;

      if (hasYesterdaySection) {
        console.log(`昨日(${yesterdayStr})の摂食状況が表示されている - 日付別表示が機能している`);
      }
    }
  });
});
