/**
 * 並列実行ユーティリティの単体テスト
 * p-limitを使用した並列実行の動作確認
 *
 * 実行方法: npx tsx src/utils/parallelImport.test.ts
 */

import pLimit from 'p-limit';

// テストケース定義
interface TestCase {
  name: string;
  test: () => Promise<void>;
}

// 同時実行数を追跡するためのカウンター
class ConcurrencyTracker {
  current = 0;
  max = 0;

  start(): void {
    this.current++;
    if (this.current > this.max) {
      this.max = this.current;
    }
  }

  end(): void {
    this.current--;
  }

  reset(): void {
    this.current = 0;
    this.max = 0;
  }
}

const testCases: TestCase[] = [
  {
    name: 'p-limit(5)で同時実行が5以下に制限される',
    test: async () => {
      const tracker = new ConcurrencyTracker();
      const limit = pLimit(5);
      const results: number[] = [];

      // 20件のタスクを並列実行
      const tasks = Array.from({ length: 20 }, (_, i) =>
        limit(async () => {
          tracker.start();
          // 少し待機して同時実行数を計測
          await new Promise(resolve => setTimeout(resolve, 50));
          results.push(i);
          tracker.end();
          return i;
        })
      );

      await Promise.all(tasks);

      // 最大同時実行数が5を超えていないこと
      if (tracker.max > 5) {
        throw new Error(`最大同時実行数が5を超えています: ${tracker.max}`);
      }

      // すべてのタスクが完了していること
      if (results.length !== 20) {
        throw new Error(`タスク数が不正: ${results.length} (expected: 20)`);
      }
    },
  },

  {
    name: 'p-limit(1)で直列実行になる',
    test: async () => {
      const tracker = new ConcurrencyTracker();
      const limit = pLimit(1);

      const tasks = Array.from({ length: 5 }, () =>
        limit(async () => {
          tracker.start();
          await new Promise(resolve => setTimeout(resolve, 10));
          tracker.end();
        })
      );

      await Promise.all(tasks);

      // 最大同時実行数が1であること（直列実行）
      if (tracker.max !== 1) {
        throw new Error(`直列実行になっていません: max=${tracker.max}`);
      }
    },
  },

  {
    name: 'エラーが発生しても他のタスクは継続する',
    test: async () => {
      const limit = pLimit(5);
      const results: Array<{ index: number; status: 'success' | 'failed' }> = [];

      const tasks = Array.from({ length: 10 }, (_, i) =>
        limit(async () => {
          // 3番目と7番目でエラーを発生させる
          if (i === 3 || i === 7) {
            throw new Error(`Task ${i} failed`);
          }
          return i;
        }).then(
          () => results.push({ index: i, status: 'success' }),
          () => results.push({ index: i, status: 'failed' })
        )
      );

      await Promise.all(tasks);

      // すべてのタスクが処理されたこと
      if (results.length !== 10) {
        throw new Error(`タスク数が不正: ${results.length}`);
      }

      // 成功8件、失敗2件
      const successCount = results.filter(r => r.status === 'success').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      if (successCount !== 8) {
        throw new Error(`成功数が不正: ${successCount} (expected: 8)`);
      }
      if (failedCount !== 2) {
        throw new Error(`失敗数が不正: ${failedCount} (expected: 2)`);
      }
    },
  },

  {
    name: 'useImageBulkImportと同じパターンで動作する',
    test: async () => {
      // useImageBulkImport.tsと同じ実装パターン
      const limit = pLimit(5);
      const tracker = new ConcurrencyTracker();

      interface MockItem {
        index: number;
        name: string;
      }

      interface MockResult {
        rowIndex: number;
        itemName: string;
        status: 'success' | 'failed';
        error?: string;
      }

      const items: MockItem[] = Array.from({ length: 15 }, (_, i) => ({
        index: i,
        name: `Item-${i}`,
      }));

      // useImageBulkImport.tsと同じパターン
      const taskPromises = items.map(item =>
        limit(async (): Promise<MockResult> => {
          tracker.start();
          try {
            // API呼び出しをシミュレート
            await new Promise(resolve => setTimeout(resolve, 30));

            // 5番目でエラー発生をシミュレート
            if (item.index === 5) {
              throw new Error('API Error');
            }

            return {
              rowIndex: item.index,
              itemName: item.name,
              status: 'success',
            };
          } catch (err) {
            return {
              rowIndex: item.index,
              itemName: item.name,
              status: 'failed',
              error: err instanceof Error ? err.message : 'Unknown error',
            };
          } finally {
            tracker.end();
          }
        })
      );

      const results = await Promise.all(taskPromises);

      // 同時実行数が5を超えていないこと
      if (tracker.max > 5) {
        throw new Error(`最大同時実行数が5を超えています: ${tracker.max}`);
      }

      // すべての結果が取得できていること
      if (results.length !== 15) {
        throw new Error(`結果数が不正: ${results.length}`);
      }

      // 成功14件、失敗1件
      const successCount = results.filter(r => r.status === 'success').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      if (successCount !== 14) {
        throw new Error(`成功数が不正: ${successCount} (expected: 14)`);
      }
      if (failedCount !== 1) {
        throw new Error(`失敗数が不正: ${failedCount} (expected: 1)`);
      }
    },
  },
];

// テスト実行
async function runTests(): Promise<void> {
  console.log('=== 並列実行ユーティリティ 単体テスト ===\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      await testCase.test();
      console.log(`✅ PASS: ${testCase.name}`);
      passed++;
    } catch (err) {
      console.log(`❌ FAIL: ${testCase.name}`);
      console.log(`   Error: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
