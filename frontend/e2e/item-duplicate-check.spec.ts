/**
 * 品物重複チェック E2Eテスト
 *
 * 品物名 + 提供日 + 提供タイミングが同じ品物の登録を防止する機能のテスト
 */

import { test, expect, Page } from '@playwright/test';

// ヘルパー: SPAの読み込み待機
async function waitForSpaLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// ヘルパー: 明日の日付文字列を取得（ローカル時間ベース）
function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ヘルパー: スケジュールを設定（新規登録用）
async function setScheduleForNew(page: Page, dateStr: string, timeSlotLabel: string) {
  // スケジュール設定ボタンをクリック（見つかるまで待機）
  const scheduleButton = page.getByRole('button', { name: /スケジュールを設定/ });
  await expect(scheduleButton).toBeVisible();
  await scheduleButton.click();

  // スケジュールエリアが表示されるまで待機
  const scheduleArea = page.locator('.bg-gray-50.rounded-lg.border');
  await expect(scheduleArea).toBeVisible();

  // 少し待機してReactの再レンダリングを待つ
  await page.waitForTimeout(300);

  // 日付を設定
  const dateInput = scheduleArea.locator('input[type="date"]').first();
  await expect(dateInput).toBeVisible();
  // トリプルクリックで全選択してから入力
  await dateInput.click({ clickCount: 3 });
  await dateInput.fill(dateStr);

  // 入力後に少し待機
  await page.waitForTimeout(100);

  // タイムスロットをボタンで選択
  const timeSlotButton = scheduleArea.getByRole('button', { name: timeSlotLabel });
  await expect(timeSlotButton).toBeVisible();
  await timeSlotButton.click();
}

// ============================================================
// 新規登録での重複チェック
// ============================================================

test.describe('【重複チェック】新規登録', () => {

  test('DUP-001: 重複する品物を登録しようとすると警告が表示される', async ({ page }) => {
    // デモモードの品物登録ページへ
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);

    // デモデータに存在する品物と同じ条件で入力
    // demo-item-001: フィリピン産バナナ, 明日, breakfast (朝食時)
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // 必須フィールドを入力（カテゴリ、数量、提供方法）
    await page.getByRole('button', { name: '食べ物' }).click();
    await page.locator('#quantity').fill('1');
    await page.getByRole('button', { name: 'そのまま' }).click();

    // スケジュール設定：1回のみ、明日、朝食時
    await setScheduleForNew(page, getTomorrowString(), '朝食時');

    // バリデーションをトリガー（登録ボタンをクリック）
    const submitButton = page.getByRole('button', { name: '登録する' });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // バリデーション結果を待機
    await page.waitForTimeout(1000);

    // 重複警告が表示される
    const duplicateWarning = page.locator('text=同じ品物が既に登録されています');
    await expect(duplicateWarning).toBeVisible({ timeout: 10000 });
  });

  test('DUP-002: 重複警告に既存品物への編集リンクが表示される', async ({ page }) => {
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);

    // 重複する品物名を入力
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // 必須フィールドを入力
    await page.getByRole('button', { name: '食べ物' }).click();
    await page.locator('#quantity').fill('1');
    await page.getByRole('button', { name: 'そのまま' }).click();

    // スケジュール設定
    await setScheduleForNew(page, getTomorrowString(), '朝食時');

    // バリデーションをトリガー
    const submitButton = page.getByRole('button', { name: '登録する' });
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 既存品物への編集リンクが表示される
    const editLink = page.locator('a:has-text("既存品物を編集する")');
    await expect(editLink).toBeVisible({ timeout: 10000 });

    // リンクのhrefが正しいパスを指している
    const href = await editLink.getAttribute('href');
    expect(href).toMatch(/\/demo\/family\/items\/[^/]+\/edit/);
  });

  test('DUP-003: 品物名を変更すると重複警告が消える', async ({ page }) => {
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);

    // 重複する品物名を入力
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // 必須フィールドを入力
    await page.getByRole('button', { name: '食べ物' }).click();
    await page.locator('#quantity').fill('1');
    await page.getByRole('button', { name: 'そのまま' }).click();

    // スケジュール設定
    await setScheduleForNew(page, getTomorrowString(), '朝食時');

    // バリデーションをトリガー
    const submitButton = page.getByRole('button', { name: '登録する' });
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が表示される
    await expect(page.locator('text=同じ品物が既に登録されています')).toBeVisible({ timeout: 10000 });

    // 品物名を変更
    await itemNameInput.fill('バナナ（別物）');

    // 再度バリデーションをトリガー
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が消える（または登録成功）
    const duplicateWarning = page.locator('text=同じ品物が既に登録されています');
    await expect(duplicateWarning).not.toBeVisible({ timeout: 5000 });
  });

  test('DUP-004a: 数量指定無しチェックボックスで進行しても重複警告が表示される', async ({ page }) => {
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);

    // 重複する品物名を入力
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // 必須フィールドを入力（数量はチェックボックスで省略）
    await page.getByRole('button', { name: '食べ物' }).click();

    // 「数量指定無し」チェックボックスをチェック
    const skipQuantityCheckbox = page.locator('#skipQuantity');
    await expect(skipQuantityCheckbox).toBeVisible();
    await skipQuantityCheckbox.check();

    await page.getByRole('button', { name: 'そのまま' }).click();

    // スケジュール設定
    await setScheduleForNew(page, getTomorrowString(), '朝食時');

    // バリデーションをトリガー
    const submitButton = page.getByRole('button', { name: '登録する' });
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が表示される
    await expect(page.locator('text=同じ品物が既に登録されています')).toBeVisible({ timeout: 10000 });
  });

  test('DUP-004: 提供タイミングを変更すると重複警告が消える', async ({ page }) => {
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);

    // 重複する品物名を入力
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // 必須フィールドを入力
    await page.getByRole('button', { name: '食べ物' }).click();
    await page.locator('#quantity').fill('1');
    await page.getByRole('button', { name: 'そのまま' }).click();

    // スケジュール設定
    await setScheduleForNew(page, getTomorrowString(), '朝食時');

    // バリデーションをトリガー
    const submitButton = page.getByRole('button', { name: '登録する' });
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が表示される
    await expect(page.locator('text=同じ品物が既に登録されています')).toBeVisible({ timeout: 10000 });

    // 提供タイミングを変更（昼食に変更）
    const scheduleArea = page.locator('.bg-gray-50.rounded-lg.border');
    const lunchButton = scheduleArea.getByRole('button', { name: '昼食時' });
    await lunchButton.click();

    // 再度バリデーションをトリガー
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が消える
    const duplicateWarning = page.locator('text=同じ品物が既に登録されています');
    await expect(duplicateWarning).not.toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 編集での重複チェック
// ============================================================

test.describe('【重複チェック】編集', () => {

  test('DUP-005: 編集時に他の品物と重複すると警告が表示される', async ({ page }) => {
    // demo-item-004（みかん、スケジュール設定済み）の編集ページへ
    await page.goto('/demo/family/items/demo-item-004/edit');
    await waitForSpaLoad(page);

    // 品物名を「フィリピン産バナナ」に変更（demo-item-001と重複）
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // スケジュールを明日の朝食に変更（demo-item-001と同じ）
    // まずスケジュールタイプを「特定の日」に変更（demo-item-004は「複数日指定」のため）
    const scheduleArea = page.locator('.bg-gray-50.rounded-lg.border');
    await expect(scheduleArea).toBeVisible();
    await scheduleArea.getByRole('button', { name: '特定の日' }).click();
    await page.waitForTimeout(200);

    // 日付を明日に設定
    const dateInput = scheduleArea.locator('input[type="date"]').first();
    await expect(dateInput).toBeVisible();
    await dateInput.click({ clickCount: 3 });
    await dateInput.fill(getTomorrowString());
    await page.waitForTimeout(100);

    // タイムスロットを朝食時に変更
    await scheduleArea.getByRole('button', { name: '朝食時' }).click();

    // 保存ボタンをクリック
    const saveButton = page.getByRole('button', { name: /保存|更新/ });
    await saveButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が表示される
    const duplicateWarning = page.locator('text=同じ品物が既に登録されています');
    await expect(duplicateWarning).toBeVisible({ timeout: 10000 });
  });

  test('DUP-006: 自分自身との重複は検出されない（同じ品物の編集）', async ({ page }) => {
    // demo-item-001の編集ページへ
    await page.goto('/demo/family/items/demo-item-001/edit');
    await waitForSpaLoad(page);

    // 品物名を確認（フィリピン産バナナ）
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toHaveValue('フィリピン産バナナ');

    // スケジュールを変更せずに保存を試行
    const saveButton = page.getByRole('button', { name: /保存|更新/ });
    await saveButton.click();
    await page.waitForTimeout(1000);

    // 重複警告が表示されない（自分自身は除外されるため）
    const duplicateWarning = page.locator('text=同じ品物が既に登録されています');
    await expect(duplicateWarning).not.toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 既存品物リンクの遷移
// ============================================================

test.describe('【重複チェック】既存品物リンク', () => {

  test('DUP-007: 既存品物へのリンクをクリックすると編集ページへ遷移する', async ({ page }) => {
    await page.goto('/demo/family/items/new');
    await waitForSpaLoad(page);

    // 重複する品物名を入力
    const itemNameInput = page.locator('#itemName');
    await expect(itemNameInput).toBeVisible();
    await itemNameInput.fill('フィリピン産バナナ');

    // 必須フィールドを入力
    await page.getByRole('button', { name: '食べ物' }).click();
    await page.locator('#quantity').fill('1');
    await page.getByRole('button', { name: 'そのまま' }).click();

    // スケジュール設定
    await setScheduleForNew(page, getTomorrowString(), '朝食時');

    // バリデーションをトリガー
    const submitButton = page.getByRole('button', { name: '登録する' });
    await submitButton.click();
    await page.waitForTimeout(1000);

    // 既存品物への編集リンクをクリック
    const editLink = page.locator('a:has-text("既存品物を編集する")');
    await expect(editLink).toBeVisible({ timeout: 10000 });
    await editLink.click();
    await waitForSpaLoad(page);

    // 編集ページへ遷移
    await expect(page).toHaveURL(/\/demo\/family\/items\/[^/]+\/edit/);

    // 品物名が正しく表示される
    await expect(page.locator('#itemName')).toHaveValue('フィリピン産バナナ');
  });
});
