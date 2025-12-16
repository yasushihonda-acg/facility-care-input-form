/**
 * プリセット提案カードコンポーネント（品物登録フォーム用）
 * @see docs/AI_INTEGRATION_SPEC.md (セクション9)
 */

import { useState } from 'react';
import type { PresetSuggestion as PresetSuggestionType } from '../../types/careItem';

interface PresetSuggestionProps {
  /** プリセット候補データ */
  suggestions: PresetSuggestionType[] | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** 提案適用時のコールバック */
  onApply: (suggestion: PresetSuggestionType) => void;
}

/**
 * プリセット提案カード
 *
 * 品物名入力時にマッチする「いつもの指示」を表示します。
 * 「この指示を適用」ボタンでフォームに自動入力できます。
 */
export function PresetSuggestion({
  suggestions,
  isLoading,
  onApply,
}: PresetSuggestionProps) {
  // 適用済みプリセットIDを追跡
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  // ローディング中
  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-600">
          <span className="animate-pulse text-lg">📌</span>
          <span className="text-sm">いつもの指示を検索中...</span>
        </div>
      </div>
    );
  }

  // 提案がない場合は非表示
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  // 適用ボタンクリック処理
  const handleApply = (suggestion: PresetSuggestionType) => {
    onApply(suggestion);
    setAppliedIds((prev) => new Set([...prev, suggestion.presetId]));
  };

  // マッチタイプに応じたアイコン
  const getMatchIcon = (matchType: string): string => {
    switch (matchType) {
      case 'category':
        return '🏷️';
      case 'itemName':
        return '📝';
      case 'keyword':
        return '🔍';
      default:
        return '📌';
    }
  };

  return (
    <div className="mt-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <span className="text-sm font-medium text-amber-800">いつもの指示</span>
          <span className="text-xs text-amber-600 ml-auto">{suggestions.length}件</span>
        </div>
      </div>

      {/* プリセット一覧 */}
      <div className="divide-y divide-amber-100">
        {suggestions.map((suggestion) => {
          const isApplied = appliedIds.has(suggestion.presetId);

          return (
            <div key={suggestion.presetId} className="p-3">
              <div className="flex items-start gap-2">
                <span className="text-gray-500 mt-0.5">
                  {getMatchIcon(suggestion.matchType)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {suggestion.instruction.title}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {suggestion.matchReason}
                  </p>
                  {suggestion.instruction.content && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {suggestion.instruction.content}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleApply(suggestion)}
                disabled={isApplied}
                className={`mt-2 w-full py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                  isApplied
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
                }`}
              >
                {isApplied ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    適用済み
                  </span>
                ) : (
                  'この指示を適用'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PresetSuggestion;
