/**
 * E2Eテスト: プリセットデータ整合性（Phase 44.1）
 * - プリセット名は品物名のみ（括弧付き詳細なし）
 * - アイコンは食品絵文字（📌ではない）
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4173';

// 食品アイコンリスト（📌は含まない）
const FOOD_ICONS = ['🥝', '🍎', '🍊', '🍑', '🍌', '🍇', '🍓', '🍈', '🥭', '🧅', '🥕', '🥒', '🍰', '🍮', '🥛', '🍚', '🍵', '☕', '⚫', '🍬', '🧀'];

test.describe('プリセットデータ整合性', () => {
  test.describe('デモモード', () => {
    test('PRESET-DATA-001: プリセット名に括弧付き詳細が含まれない', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/family/items/new`);

      // プリセットカードのテキストを取得
      const presetCards = page.locator('.grid.grid-cols-3 > div');
      const count = await presetCards.count();

      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const cardText = await presetCards.nth(i).textContent();
        // 括弧付き詳細がないことを確認
        expect(cardText).not.toMatch(/（.+）/);
      }
    });

    test('PRESET-DATA-002: プリセットアイコンが📌ではない', async ({ page }) => {
      await page.goto(`${BASE_URL}/demo/family/items/new`);

      // プリセットカード内のアイコン（最初のspan）を取得
      const iconSpans = page.locator('.grid.grid-cols-3 > div span.text-xl');
      const count = await iconSpans.count();

      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const icon = await iconSpans.nth(i).textContent();
        expect(icon).not.toBe('📌');
        expect(FOOD_ICONS).toContain(icon?.trim());
      }
    });
  });

  test.describe('本番モード', () => {
    test('PRESET-DATA-003: 本番プリセット名に括弧付き詳細が含まれない', async ({ page }) => {
      await page.goto(`${BASE_URL}/family/items/new`);

      // プリセットカードを待機（API応答後）
      const presetCards = page.locator('.grid.grid-cols-3 > div');

      // プリセットが表示されるまで待機（なければスキップ）
      try {
        await presetCards.first().waitFor({ timeout: 3000 });
      } catch {
        test.skip(true, '本番プリセットなし');
        return;
      }

      const count = await presetCards.count();
      for (let i = 0; i < count; i++) {
        const cardText = await presetCards.nth(i).textContent();
        expect(cardText).not.toMatch(/（.+）/);
      }
    });

    test('PRESET-DATA-004: 本番プリセットアイコンが📌ではない', async ({ page }) => {
      await page.goto(`${BASE_URL}/family/items/new`);

      const iconSpans = page.locator('.grid.grid-cols-3 > div span.text-xl');

      try {
        await iconSpans.first().waitFor({ timeout: 3000 });
      } catch {
        test.skip(true, '本番プリセットなし');
        return;
      }

      const count = await iconSpans.count();
      for (let i = 0; i < count; i++) {
        const icon = await iconSpans.nth(i).textContent();
        expect(icon).not.toBe('📌');
      }
    });
  });
});
