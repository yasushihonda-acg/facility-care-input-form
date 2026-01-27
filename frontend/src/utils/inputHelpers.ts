/**
 * 数量入力用ヘルパー関数
 * 家族用品物登録・編集フォームで使用
 */

/**
 * 入力値を半角数字のみに変換し、整数として返す
 * - 全角数字（０-９）を半角に変換
 * - 半角数字以外を除去
 * - 空欄の場合は0を返す（バリデーションは呼び出し側で行う）
 */
export const parseNumericInput = (value: string): number => {
  // 全角数字を半角に変換
  const halfWidth = value.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );
  // 半角数字以外を除去
  const numericOnly = halfWidth.replace(/[^0-9]/g, '');
  return parseInt(numericOnly, 10) || 0;
};
