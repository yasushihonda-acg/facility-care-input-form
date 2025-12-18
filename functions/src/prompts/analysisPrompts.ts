/**
 * 摂食傾向分析プロンプト (Phase 8.4 - aiAnalyze)
 * @see docs/AI_INTEGRATION_SPEC.md セクション3.2
 */

import {AIConsumptionRecord, AIMealRecord} from "../types";

/**
 * 摂食記録から傾向を分析するプロンプト
 */
export function buildConsumptionAnalysisPrompt(
  records: AIConsumptionRecord[],
  period: {startDate: string; endDate: string}
): string {
  // 最大100件に制限
  const limitedRecords = records.slice(0, 100);
  const recordsJson = JSON.stringify(limitedRecords, null, 2);

  return `あなたは介護施設の栄養管理アシスタントです。
以下の摂食記録を分析し、傾向と改善提案を提供してください。

分析期間: ${period.startDate} 〜 ${period.endDate}

摂食記録データ:
${recordsJson}

以下の情報をJSON形式で回答してください：

1. summary: 全体のサマリ（200文字以内）
2. findings: 発見事項の配列
   - type: "positive"（良い傾向）, "negative"（悪い傾向）, "neutral"（中立）
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - metric: 数値情報（current, previous, change）

3. suggestions: 改善提案の配列
   - priority: "high", "medium", "low"
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - relatedItemName: 関連する品物名（任意）

回答例:
{
  "summary": "摂食率は平均78%で安定しています。果物の摂食率が特に高く、リンゴのみ低下傾向が見られます。",
  "findings": [
    {
      "type": "positive",
      "title": "果物の摂食率が高い",
      "description": "バナナ、みかんなど柔らかい果物の摂食率が90%以上です",
      "metric": { "current": 92, "previous": 88, "change": 4 }
    },
    {
      "type": "negative",
      "title": "リンゴの摂食率が低下",
      "description": "先週60%から今週20%に急低下しています",
      "metric": { "current": 20, "previous": 60, "change": -40 }
    }
  ],
  "suggestions": [
    {
      "priority": "high",
      "title": "リンゴの提供方法を変更",
      "description": "硬さが原因の可能性があります。すりおろしや煮リンゴでの提供を検討してください",
      "relatedItemName": "リンゴ"
    }
  ]
}

JSONのみを出力してください。`;
}

/**
 * 食事記録から傾向を分析するプロンプト
 */
export function buildMealAnalysisPrompt(
  records: AIMealRecord[],
  period: {startDate: string; endDate: string}
): string {
  const limitedRecords = records.slice(0, 100);
  const recordsJson = JSON.stringify(limitedRecords, null, 2);

  return `あなたは介護施設の栄養管理アシスタントです。
以下の食事記録を分析し、傾向と改善提案を提供してください。

分析期間: ${period.startDate} 〜 ${period.endDate}

食事記録データ（各レコードは日付、食事時間帯、主食摂取率%、副食摂取率%を含む）:
${recordsJson}

以下の情報をJSON形式で回答してください：

1. summary: 全体のサマリ（200文字以内）
2. findings: 発見事項の配列
   - type: "positive"（良い傾向）, "negative"（悪い傾向）, "neutral"（中立）
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - metric: 数値情報（current, previous, change）

3. suggestions: 改善提案の配列
   - priority: "high", "medium", "low"
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - relatedItemName: 関連する品物名（任意）

特に以下の点に注目してください：
- 主食と副食の摂取バランス
- 食事時間帯による摂取率の違い
- 急激な変化や傾向
- 高齢者の栄養状態に影響する要因

JSONのみを出力してください。`;
}

/**
 * 複合データ（摂食＋食事）から総合分析するプロンプト
 */
export function buildComprehensiveAnalysisPrompt(
  consumptionRecords: AIConsumptionRecord[],
  mealRecords: AIMealRecord[],
  period: {startDate: string; endDate: string}
): string {
  const limitedConsumption = consumptionRecords.slice(0, 50);
  const limitedMeals = mealRecords.slice(0, 50);

  return `あなたは介護施設の栄養管理アシスタントです。
以下の間食（品物）記録と食事記録を総合的に分析し、傾向と改善提案を提供してください。

分析期間: ${period.startDate} 〜 ${period.endDate}

【間食（品物）記録】
${JSON.stringify(limitedConsumption, null, 2)}

【食事記録】
${JSON.stringify(limitedMeals, null, 2)}

以下の情報をJSON形式で回答してください：

1. summary: 全体のサマリ（200文字以内）
   - 全体的な栄養摂取状況
   - 間食と正規食事のバランス
   - 気になる点があれば記載

2. findings: 発見事項の配列
   - type: "positive", "negative", "neutral"
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - metric: { current, previous, change }

3. suggestions: 改善提案の配列
   - priority: "high", "medium", "low"
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - relatedItemName: 関連する品物名（任意）

JSONのみを出力してください。`;
}
