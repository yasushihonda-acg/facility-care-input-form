/**
 * プリセット候補取得フック
 * @see docs/AI_INTEGRATION_SPEC.md (セクション9)
 */

import { useState, useEffect, useCallback } from 'react';
import { getPresetSuggestions } from '../api';
import type { PresetSuggestion, ItemCategory } from '../types/careItem';

interface UsePresetSuggestionsOptions {
  /** 最小入力文字数（デフォルト: 2） */
  minLength?: number;
  /** デバウンス時間（デフォルト: 500ms） */
  debounceMs?: number;
}

interface UsePresetSuggestionsResult {
  /** プリセット候補リスト */
  suggestions: PresetSuggestion[] | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 手動で候補を取得 */
  fetchSuggestions: (itemName: string, category?: ItemCategory) => void;
  /** 状態をクリア */
  clear: () => void;
}

/**
 * プリセット候補取得フック
 *
 * 品物名・カテゴリからマッチする「いつもの指示」を検索します。
 * デバウンス処理により、連続入力時のAPI呼び出しを抑制します。
 *
 * @example
 * const { suggestions, isLoading, fetchSuggestions, clear } = usePresetSuggestions(residentId);
 *
 * useEffect(() => {
 *   if (itemName.length >= 2) {
 *     fetchSuggestions(itemName, category);
 *   } else {
 *     clear();
 *   }
 * }, [itemName, category]);
 */
export function usePresetSuggestions(
  residentId: string,
  options: UsePresetSuggestionsOptions = {}
): UsePresetSuggestionsResult {
  const { minLength = 2, debounceMs = 500 } = options;

  const [suggestions, setSuggestions] = useState<PresetSuggestion[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // デバウンス用の状態
  const [pendingRequest, setPendingRequest] = useState<{
    itemName: string;
    category?: ItemCategory;
  } | null>(null);

  // デバウンス処理
  useEffect(() => {
    if (!pendingRequest) return;

    const timer = setTimeout(() => {
      executeRequest(pendingRequest.itemName, pendingRequest.category);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [pendingRequest, debounceMs]);

  // API呼び出し実行
  const executeRequest = async (itemName: string, category?: ItemCategory) => {
    if (!residentId || itemName.length < minLength) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await getPresetSuggestions({
        residentId,
        itemName,
        category,
      });

      if (response.success && response.data) {
        setSuggestions(response.data.suggestions);
      } else {
        // エラー時は空配列（サイレント）
        setSuggestions([]);
        if (response.error) {
          console.warn('Preset suggestions error:', response.error);
        }
      }
    } catch (err) {
      console.error('Failed to fetch preset suggestions:', err);
      // エラー時は空配列（サイレント）
      setSuggestions([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // 候補取得（デバウンス付き）
  const fetchSuggestions = useCallback(
    (itemName: string, category?: ItemCategory) => {
      if (itemName.length < minLength) {
        setSuggestions(null);
        return;
      }

      setIsLoading(true);
      setPendingRequest({ itemName, category });
    },
    [minLength]
  );

  // 状態クリア
  const clear = useCallback(() => {
    setSuggestions(null);
    setIsLoading(false);
    setError(null);
    setPendingRequest(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    clear,
  };
}

export default usePresetSuggestions;
