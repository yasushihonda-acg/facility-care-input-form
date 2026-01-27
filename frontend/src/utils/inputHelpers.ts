/**
 * 数量入力用ヘルパー関数
 * 家族用品物登録・編集フォームで使用
 */

/**
 * 入力値を半角数字（小数点含む）に変換し、数値として返す
 * - 全角数字（０-９）を半角に変換
 * - 全角ピリオド（．）を半角に変換
 * - 半角数字と小数点以外を除去
 * - 空欄の場合はundefinedを返す（数量管理しない）
 */
export const parseNumericInput = (value: string): number | undefined => {
  // 全角数字を半角に変換
  const halfWidth = value
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/．/g, '.'); // 全角ピリオドも変換
  // 半角数字と小数点以外を除去
  const numericOnly = halfWidth.replace(/[^0-9.]/g, '');
  // 複数の小数点がある場合は最初のもののみ残す
  const parts = numericOnly.split('.');
  const normalized = parts.length > 1
    ? parts[0] + '.' + parts.slice(1).join('')
    : numericOnly;
  // 空欄の場合はundefined（数量管理しない）
  if (normalized === '' || normalized === '.') {
    return undefined;
  }
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? undefined : parsed;
};
