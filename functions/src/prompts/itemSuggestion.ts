/**
 * 品物入力補助プロンプト (Phase 8.4)
 * @see docs/AI_INTEGRATION_SPEC.md
 */

/**
 * 品物名から賞味期限・保存方法を提案するプロンプト
 */
export function buildItemSuggestionPrompt(
  itemName: string,
  category?: string
): string {
  return `あなたは介護施設の栄養管理アシスタントです。
以下の食品について、高齢者向けの情報を提供してください。

食品名: ${itemName}
${category ? `カテゴリ: ${category}` : ""}

以下の情報をJSON形式で回答してください：
1. expirationDays: 賞味期限の目安（日数、整数）
2. storageMethod: 保存方法（"room_temp", "refrigerated", "frozen" のいずれか）
3. servingMethods: 高齢者に適した提供方法の配列（"as_is", "cut", "peeled", "heated", "other" から選択）
4. notes: 高齢者が食べる際の注意点（任意、50文字以内）

回答例:
{
  "expirationDays": 5,
  "storageMethod": "refrigerated",
  "servingMethods": ["cut", "peeled"],
  "notes": "種を取り除き、食べやすい大きさにカットしてください"
}

JSONのみを出力し、説明文は不要です。`;
}
