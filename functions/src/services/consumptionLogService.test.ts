/**
 * consumptionLogService 単体テスト
 * 純粋関数のテスト（Firestoreモックなし）
 */

import {generateSnackTextFromRecords} from "./consumptionLogService";
import {SnackRecord} from "../types";

// テストケース定義
interface TestCase {
  name: string;
  input: SnackRecord[];
  expected: string;
}

const testCases: TestCase[] = [
  {
    name: "空配列",
    input: [],
    expected: "",
  },
  {
    name: "単一レコード - 完食",
    input: [
      {
        itemName: "羊羹",
        servedQuantity: 1,
        unit: "切れ",
        consumptionStatus: "full",
      },
    ],
    expected: "羊羹 1切れ（完食）",
  },
  {
    name: "単一レコード - 半分",
    input: [
      {
        itemName: "チーズ",
        servedQuantity: 2,
        unit: "個",
        consumptionStatus: "half",
      },
    ],
    expected: "チーズ 2個（半分）",
  },
  {
    name: "複数レコード",
    input: [
      {
        itemName: "羊羹",
        servedQuantity: 1,
        unit: "切れ",
        consumptionStatus: "half",
      },
      {
        itemName: "チーズ",
        servedQuantity: 1,
        unit: "個",
        consumptionStatus: "full",
      },
    ],
    expected: "羊羹 1切れ（半分）、チーズ 1個（完食）",
  },
  {
    name: "unit省略時はデフォルト「個」",
    input: [
      {
        itemName: "クッキー",
        servedQuantity: 3,
        consumptionStatus: "most",
      },
    ],
    expected: "クッキー 3個（ほぼ完食）",
  },
  {
    name: "全ステータス確認",
    input: [
      {itemName: "A", servedQuantity: 1, consumptionStatus: "full"},
      {itemName: "B", servedQuantity: 1, consumptionStatus: "most"},
      {itemName: "C", servedQuantity: 1, consumptionStatus: "half"},
      {itemName: "D", servedQuantity: 1, consumptionStatus: "little"},
      {itemName: "E", servedQuantity: 1, consumptionStatus: "none"},
    ],
    expected: "A 1個（完食）、B 1個（ほぼ完食）、C 1個（半分）、D 1個（少量）、E 1個（食べず）",
  },
];

// テスト実行
function runTests(): void {
  console.log("=== consumptionLogService 単体テスト ===\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = generateSnackTextFromRecords(testCase.input);
    const success = result === testCase.expected;

    if (success) {
      console.log(`✅ PASS: ${testCase.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${testCase.name}`);
      console.log(`   Expected: "${testCase.expected}"`);
      console.log(`   Got:      "${result}"`);
      failed++;
    }
  }

  console.log(`\n=== 結果: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
