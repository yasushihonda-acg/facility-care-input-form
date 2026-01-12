/**
 * 楽観的送信フック（Optimistic Submit Hook）
 *
 * フォーム送信時の二重送信防止とUX改善を提供します。
 *
 * ## 設計思想
 * - **即時フィードバック**: ボタン押下で即座にダイアログを閉じる
 * - **確実な二重送信防止**: useRefで同期的にブロック（useStateは非同期なので不採用）
 * - **トースト通知**: 処理状況をユーザーに表示
 *
 * ## 使用方法
 * ```tsx
 * function MyModal({ onClose, onSuccess }) {
 *   const { submit, isSubmitting } = useOptimisticSubmit({
 *     onClose,
 *     onSuccess,
 *     loadingMessage: '保存中...',
 *     successMessage: '保存しました',
 *   });
 *
 *   const handleSubmit = async () => {
 *     if (!validate()) return; // バリデーション失敗時は閉じない
 *     await submit(async () => {
 *       await api.save(data);
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSubmit} disabled={isSubmitting}>
 *       保存
 *     </button>
 *   );
 * }
 * ```
 *
 * @see /Users/yyyhhh/.claude/plans/frolicking-sleeping-peach.md
 */

import { useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * エラーメッセージを抽出するヘルパー
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // ネットワークエラー判定
    if (message.includes('fetch') || message.includes('network')) {
      return '通信エラーが発生しました。ネットワーク接続を確認してください。';
    }
    // タイムアウト判定
    if (error.name === 'AbortError' || message.includes('timeout')) {
      return '処理に時間がかかっています。しばらくしてから再度お試しください。';
    }
    // APIエラー（メッセージがある場合）
    if (error.message && error.message !== 'Unknown error') {
      return error.message;
    }
  }
  return '処理に失敗しました。もう一度お試しください。';
}

/**
 * useOptimisticSubmitのオプション
 */
export interface UseOptimisticSubmitOptions {
  /** ダイアログを閉じるコールバック（即座に呼ばれる） */
  onClose: () => void;
  /** 成功時のコールバック（API完了後に呼ばれる） */
  onSuccess?: () => void;
  /** 処理中に表示するメッセージ */
  loadingMessage?: string;
  /** 成功時に表示するメッセージ */
  successMessage?: string;
  /** エラー時に表示するメッセージ（指定しない場合はエラー内容から自動生成） */
  errorMessage?: string;
  /** デモモードの場合はtrueを渡す（APIを呼ばずにシミュレーション） */
  isDemo?: boolean;
  /** デモモード時の遅延時間（ms） */
  demoDelay?: number;
}

/**
 * useOptimisticSubmitの戻り値
 */
export interface UseOptimisticSubmitReturn {
  /**
   * 送信を実行する関数
   * @param asyncFn 実行する非同期関数
   * @returns 成功時は戻り値、二重送信の場合はnull
   */
  submit: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
  /** 現在送信中かどうか（UIのdisabled用、メインのブロックはuseRefで行う） */
  isSubmitting: boolean;
}

/**
 * 楽観的送信フック
 *
 * 二重送信を防止しつつ、即座にダイアログを閉じてUXを改善します。
 *
 * @param options オプション
 * @returns submit関数とisSubmitting状態
 *
 * @example
 * ```tsx
 * const { submit, isSubmitting } = useOptimisticSubmit({
 *   onClose,
 *   loadingMessage: '記録中...',
 *   successMessage: '記録しました',
 * });
 *
 * const handleSave = async () => {
 *   if (!formData.name) {
 *     setError('名前を入力してください');
 *     return; // バリデーション失敗時は閉じない
 *   }
 *
 *   await submit(async () => {
 *     await saveData(formData);
 *   });
 * };
 * ```
 */
export function useOptimisticSubmit(
  options: UseOptimisticSubmitOptions
): UseOptimisticSubmitReturn {
  const {
    onClose,
    onSuccess,
    loadingMessage = '処理中...',
    successMessage = '完了しました',
    errorMessage,
    isDemo = false,
    demoDelay = 500,
  } = options;

  // useRefで同期的にブロック（useStateは非同期なので二重送信を防げない）
  const isSubmittingRef = useRef(false);

  // UI用のstate（disabledの補助的表示用）
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
      // 既に送信中の場合は即座にブロック
      if (isSubmittingRef.current) {
        console.warn('[useOptimisticSubmit] 二重送信をブロックしました');
        return null;
      }

      // 同期的にブロックを設定
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      // 即座にダイアログを閉じる（UX改善の核心）
      onClose();

      // トースト通知を表示
      const toastId = toast.loading(loadingMessage);

      try {
        let result: T;

        if (isDemo) {
          // デモモード: 実際のAPIは呼ばずにシミュレーション
          await new Promise((resolve) => setTimeout(resolve, demoDelay));
          result = undefined as T; // デモでは戻り値は使わない
        } else {
          // 本番モード: 実際のAPIを呼び出し
          result = await asyncFn();
        }

        // 成功通知
        toast.success(successMessage, { id: toastId });

        // 成功コールバック
        onSuccess?.();

        return result;
      } catch (error) {
        // エラー通知
        const message = errorMessage || extractErrorMessage(error);
        toast.error(message, {
          id: toastId,
          duration: 6000, // エラーは長めに表示
        });

        console.error('[useOptimisticSubmit] 送信エラー:', error);
        return null;
      } finally {
        // ブロックを解除
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [onClose, onSuccess, loadingMessage, successMessage, errorMessage, isDemo, demoDelay]
  );

  return { submit, isSubmitting };
}
