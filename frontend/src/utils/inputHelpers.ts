/**
 * 数量入力用ヘルパー関数
 * 家族用品物登録・編集フォームで使用
 */

/**
 * 入力値を半角数字のみに変換し、整数として返す
 * - 全角数字（０-９）を半角に変換
 * - 半角数字以外を除去
 * - 0以下の場合はminValueを返す
 */
export const parseNumericInput = (value: string, minValue = 1): number => {
  // 全角数字を半角に変換
  const halfWidth = value.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );
  // 半角数字以外を除去
  const numericOnly = halfWidth.replace(/[^0-9]/g, '');
  const numValue = parseInt(numericOnly, 10) || 0;
  return numValue > 0 ? numValue : minValue;
};
