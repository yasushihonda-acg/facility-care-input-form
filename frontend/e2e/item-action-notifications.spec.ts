/**
 * Phase 55: 品物操作通知 E2Eテスト
 *
 * スタッフ用注意事項ビューの「家族依頼」タブで
 * 品物操作（新規・編集・削除）の通知がバッジ付きで表示されることをテスト
 */

import { test, expect } from '@playwright/test';

test.describe('品物操作通知（Phase 55）', () => {
  test('ITEM-NOTIFY-001: 注意事項ページに家族依頼タブが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // タブが表示されることを確認
    await expect(page.locator('button').filter({ hasText: '注意事項' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '家族依頼' })).toBeVisible();
  });

  test('ITEM-NOTIFY-002: 家族依頼タブに品物更新通知セクションが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック（デモモードでは自動で選択される可能性あり）
    const familyRequestsTab = page.locator('button').filter({ hasText: '家族依頼' });
    await familyRequestsTab.click();
    await page.waitForTimeout(500);

    // 品物更新通知セクションが表示されることを確認
    await expect(page.locator('text=品物更新通知')).toBeVisible();
  });

  test('ITEM-NOTIFY-003: 新規登録通知に緑バッジが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 新規バッジが存在することを確認（緑色）
    const newBadge = page.locator('span.bg-green-100').filter({ hasText: '新規' });
    await expect(newBadge).toBeVisible();

    // 関連するカードが表示されることを確認
    await expect(page.locator('text=【新規】いちご')).toBeVisible();
  });

  test('ITEM-NOTIFY-004: 変更通知に青バッジが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 変更バッジが存在することを確認（青色）- 複数あるので.first()
    const updateBadge = page.locator('span.bg-blue-100').filter({ hasText: '変更' }).first();
    await expect(updateBadge).toBeVisible();

    // 関連するカードが表示されることを確認
    await expect(page.locator('text=【変更】バナナ')).toBeVisible();
  });

  test('ITEM-NOTIFY-005: 削除通知に赤バッジが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 削除バッジが存在することを確認（赤色）
    const deleteBadge = page.locator('span.bg-red-100').filter({ hasText: '削除' });
    await expect(deleteBadge).toBeVisible();

    // 関連するカードが表示されることを確認
    await expect(page.locator('text=【削除】ぶどう')).toBeVisible();
  });

  test('ITEM-NOTIFY-006: 品物更新通知が廃棄指示より上に表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 品物更新通知セクションと廃棄指示セクションの位置を取得（ヘッダーh2を使用）
    const itemNotifySection = page.getByRole('heading', { name: /品物更新通知/ });
    const discardSection = page.getByRole('heading', { name: /廃棄指示/ });

    // 両方が表示されていることを確認
    await expect(itemNotifySection).toBeVisible();
    await expect(discardSection).toBeVisible();

    // 品物更新通知が廃棄指示より上に表示されていることを確認
    const itemNotifyY = await itemNotifySection.boundingBox().then(box => box?.y ?? 0);
    const discardY = await discardSection.boundingBox().then(box => box?.y ?? 0);
    expect(itemNotifyY).toBeLessThan(discardY);
  });

  test('ITEM-NOTIFY-007: 24時間後に自動削除される旨の表示', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 自動削除の説明が表示されることを確認
    await expect(page.locator('text=24時間後に自動削除')).toBeVisible();
  });

  test('ITEM-NOTIFY-008: 品物操作カードに左ボーダーが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 新規登録カードを特定（border-l-4クラスを持つカード）
    const newItemCard = page.locator('div.border-l-4').filter({ hasText: '【新規】いちご' }).first();
    await expect(newItemCard).toBeVisible();
  });

  test('ITEM-NOTIFY-009: 品物操作カードには専用アイコンが表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 各操作タイプのアイコンが表示されることを確認
    // 新規: ➕
    await expect(page.locator('text=➕').first()).toBeVisible();
    // 変更: ✏️
    await expect(page.locator('text=✏️').first()).toBeVisible();
    // 削除: 🗑️ (廃棄指示セクションにも表示されるが、通知カード内にもある)
    const deleteIcon = page.locator('.border-l-red-500').locator('text=🗑️').first();
    await expect(deleteIcon).toBeVisible();
  });

  test('ITEM-NOTIFY-010: 品物操作カードに登録日時が表示される', async ({ page }) => {
    await page.goto('/demo/staff/notes');
    await page.waitForLoadState('networkidle');

    // 家族依頼タブをクリック
    await page.locator('button').filter({ hasText: '家族依頼' }).click();
    await page.waitForTimeout(500);

    // 登録日時の表示を確認
    await expect(page.locator('text=登録日時:').first()).toBeVisible();
  });
});
