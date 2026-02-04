/**
 * googleChatService 単体テスト
 * 純粋関数のテスト（外部APIモックなし）
 */

import {
  shouldSendNoRecordNotification,
  formatNoRecordNotification,
} from "./googleChatService";

// =============================================================================
// shouldSendNoRecordNotification テスト
// =============================================================================

interface NotificationTestCase {
  name: string;
  hasMealRecord: boolean;
  hasHydrationRecord: boolean;
  expected: boolean;
}

const notificationTestCases: NotificationTestCase[] = [
  {
    name: "両方なし → 通知する",
    hasMealRecord: false,
    hasHydrationRecord: false,
    expected: true,
  },
  {
    name: "食事のみあり → 通知しない",
    hasMealRecord: true,
    hasHydrationRecord: false,
    expected: false,
  },
  {
    name: "水分のみあり → 通知しない",
    hasMealRecord: false,
    hasHydrationRecord: true,
    expected: false,
  },
  {
    name: "両方あり → 通知しない",
    hasMealRecord: true,
    hasHydrationRecord: true,
    expected: false,
  },
];

console.log("=== shouldSendNoRecordNotification テスト ===\n");

let passed = 0;
let failed = 0;

for (const tc of notificationTestCases) {
  const result = shouldSendNoRecordNotification(tc.hasMealRecord, tc.hasHydrationRecord);
  const ok = result === tc.expected;

  if (ok) {
    console.log(`✅ ${tc.name}`);
    passed++;
  } else {
    console.log(`❌ ${tc.name}`);
    console.log(`   期待: ${tc.expected}, 実際: ${result}`);
    failed++;
  }
}

// =============================================================================
// formatNoRecordNotification テスト
// =============================================================================

interface FormatTestCase {
  name: string;
  hasMealRecord: boolean;
  hasHydrationRecord: boolean;
  shouldContain: string[];
  shouldNotContain: string[];
}

const formatTestCases: FormatTestCase[] = [
  {
    name: "両方未入力 → 両方表示",
    hasMealRecord: false,
    hasHydrationRecord: false,
    shouldContain: ["食事記録: 未入力", "水分記録: 未入力"],
    shouldNotContain: [],
  },
  {
    name: "食事のみ未入力 → 食事のみ表示",
    hasMealRecord: false,
    hasHydrationRecord: true,
    shouldContain: ["食事記録: 未入力"],
    shouldNotContain: ["水分記録: 未入力"],
  },
  {
    name: "水分のみ未入力 → 水分のみ表示",
    hasMealRecord: true,
    hasHydrationRecord: false,
    shouldContain: ["水分記録: 未入力"],
    shouldNotContain: ["食事記録: 未入力"],
  },
];

console.log("\n=== formatNoRecordNotification テスト ===\n");

for (const tc of formatTestCases) {
  const result = formatNoRecordNotification(
    "2026-02-04",
    tc.hasMealRecord,
    tc.hasHydrationRecord,
    16
  );

  let testPassed = true;

  for (const text of tc.shouldContain) {
    if (!result.includes(text)) {
      console.log(`❌ ${tc.name}`);
      console.log(`   「${text}」が含まれていません`);
      testPassed = false;
      failed++;
      break;
    }
  }

  if (testPassed) {
    for (const text of tc.shouldNotContain) {
      if (result.includes(text)) {
        console.log(`❌ ${tc.name}`);
        console.log(`   「${text}」が含まれてはいけません`);
        testPassed = false;
        failed++;
        break;
      }
    }
  }

  if (testPassed) {
    console.log(`✅ ${tc.name}`);
    passed++;
  }
}

// =============================================================================
// 結果サマリ
// =============================================================================

console.log("\n=== 結果 ===");
console.log(`✅ 成功: ${passed}`);
console.log(`❌ 失敗: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
