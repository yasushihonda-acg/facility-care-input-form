/**
 * AI提案カードコンポーネント（品物登録フォーム用）
 * @see docs/AI_INTEGRATION_SPEC.md (セクション8)
 */

import type { AISuggestResponse, StorageMethod, ServingMethod } from '../../types/careItem';
import { STORAGE_METHOD_LABELS, SERVING_METHOD_LABELS } from '../../types/careItem';

interface AISuggestionProps {
  /** AI提案データ */
  suggestion: AISuggestResponse | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** 警告メッセージ（フォールバック使用時） */
  warning?: string | null;
  /** 提案適用時のコールバック */
  onApply: (suggestion: AISuggestResponse) => void;
}

/**
 * AI提案カード
 *
 * 品物名入力時にAIが提案する賞味期限・保存方法・提供方法を表示します。
 * 「この提案を適用」ボタンでフォームに自動入力できます。
 */
export function AISuggestion({
  suggestion,
  isLoading,
  warning,
  onApply,
}: AISuggestionProps) {
  // ローディング中
  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-blue-600">
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm">AI が提案を生成中...</span>
        </div>
      </div>
    );
  }

  // 提案がない場合は非表示
  if (!suggestion) {
    return null;
  }

  // 保存方法のラベル取得
  const getStorageLabel = (method: StorageMethod): string => {
    return STORAGE_METHOD_LABELS[method] || method;
  };

  // 提供方法のラベル取得
  const getServingLabel = (method: ServingMethod): string => {
    return SERVING_METHOD_LABELS[method] || method;
  };

  return (
    <div className="mt-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="px-3 py-2 bg-gradient-to-r from-purple-100 to-blue-100 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-sm font-medium text-purple-800">AIの提案</span>
          {warning && (
            <span className="text-xs text-orange-600 ml-auto">⚠️ デフォルト値</span>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-3 space-y-2">
        {/* 賞味期限目安 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">📅</span>
          <span className="text-gray-600">賞味期限目安:</span>
          <span className="font-medium text-gray-800">
            {suggestion.expirationDays}日
          </span>
        </div>

        {/* 保存方法 */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">🧊</span>
          <span className="text-gray-600">保存方法:</span>
          <span className="font-medium text-gray-800">
            {getStorageLabel(suggestion.storageMethod)}
          </span>
        </div>

        {/* 提供方法 */}
        <div className="flex items-start gap-2 text-sm">
          <span className="text-gray-500">🍴</span>
          <span className="text-gray-600 shrink-0">おすすめ:</span>
          <span className="font-medium text-gray-800">
            {suggestion.servingMethods.map(getServingLabel).join('、')}
          </span>
        </div>

        {/* 注意事項 */}
        {suggestion.notes && (
          <div className="flex items-start gap-2 text-sm mt-2 pt-2 border-t border-purple-100">
            <span className="text-gray-500">💡</span>
            <span className="text-gray-700">{suggestion.notes}</span>
          </div>
        )}
      </div>

      {/* 適用ボタン */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => onApply(suggestion)}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          この提案を適用
        </button>
      </div>
    </div>
  );
}

export default AISuggestion;
