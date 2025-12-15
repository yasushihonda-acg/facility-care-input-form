/**
 * AI品物入力補助フック (Phase 8.4)
 * @see docs/AI_INTEGRATION_SPEC.md
 */

import { useState, useCallback, useRef } from 'react';
import { aiSuggest } from '../api';
import type {
  AISuggestResponse,
  ItemCategory,
} from '../types/careItem';

interface UseAISuggestOptions {
  /** 最小入力文字数（これ未満では提案しない） */
  minLength?: number;
  /** デバウンス遅延（ミリ秒） */
  debounceMs?: number;
}

interface UseAISuggestReturn {
  /** AI提案データ */
  suggestion: AISuggestResponse | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 警告メッセージ（フォールバック使用時） */
  warning: string | null;
  /** 提案を取得 */
  fetchSuggestion: (itemName: string, category?: ItemCategory) => Promise<void>;
  /** 状態をクリア */
  clear: () => void;
}

/**
 * AI品物入力補助フック
 *
 * 品物名を入力すると、AIが賞味期限の目安、保存方法、提供方法を提案します。
 *
 * @example
 * ```tsx
 * const { suggestion, isLoading, fetchSuggestion } = useAISuggest();
 *
 * // 品物名変更時に提案を取得
 * useEffect(() => {
 *   if (itemName.length >= 2) {
 *     fetchSuggestion(itemName, category);
 *   }
 * }, [itemName, category, fetchSuggestion]);
 *
 * // 提案を適用
 * if (suggestion) {
 *   setExpirationDays(suggestion.expirationDays);
 *   setStorageMethod(suggestion.storageMethod);
 * }
 * ```
 */
export function useAISuggest(options: UseAISuggestOptions = {}): UseAISuggestReturn {
  const { minLength = 2, debounceMs = 500 } = options;

  const [suggestion, setSuggestion] = useState<AISuggestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // デバウンス用タイマー
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 最後のリクエストID（古いリクエストの結果を無視するため）
  const lastRequestIdRef = useRef(0);

  const fetchSuggestion = useCallback(async (itemName: string, category?: ItemCategory) => {
    // 最小文字数チェック
    if (itemName.length < minLength) {
      setSuggestion(null);
      setError(null);
      setWarning(null);
      return;
    }

    // 既存のデバウンスタイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // デバウンス
    debounceTimerRef.current = setTimeout(async () => {
      const requestId = ++lastRequestIdRef.current;

      setIsLoading(true);
      setError(null);
      setWarning(null);

      try {
        const response = await aiSuggest({ itemName, category });

        // 古いリクエストの結果は無視
        if (requestId !== lastRequestIdRef.current) {
          return;
        }

        if (response.success && response.data) {
          setSuggestion(response.data);

          // フォールバック使用時の警告
          if ((response as { warning?: string }).warning) {
            setWarning((response as { warning?: string }).warning ?? null);
          }
        } else {
          setError('AI提案の取得に失敗しました');
        }
      } catch (err) {
        // 古いリクエストの結果は無視
        if (requestId !== lastRequestIdRef.current) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(`AI提案エラー: ${message}`);
        setSuggestion(null);
      } finally {
        // 古いリクエストの結果は無視
        if (requestId === lastRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, debounceMs);
  }, [minLength, debounceMs]);

  const clear = useCallback(() => {
    // タイマーをクリア
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 状態をリセット
    setSuggestion(null);
    setIsLoading(false);
    setError(null);
    setWarning(null);
  }, []);

  return {
    suggestion,
    isLoading,
    error,
    warning,
    fetchSuggestion,
    clear,
  };
}
