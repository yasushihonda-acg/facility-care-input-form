/**
 * 残り対応記録 カスタムフック
 * Phase 42: 残り対応（破棄/保存）の履歴管理
 *
 * デモモード対応: /demo パス配下ではローカルで処理
 * @see docs/BUSINESS_RULES.md セクション6.4
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitRemainingHandling,
  type SubmitRemainingHandlingRequest,
} from '../api';
import { useDemoMode } from './useDemoMode';
import type { RemainingHandlingLog } from '../types/careItem';

// クエリキー（品物一覧のキャッシュ無効化用）
const CARE_ITEMS_KEY = 'careItems';

/**
 * 残り対応を記録するミューテーションフック
 * デモモードではAPIを呼び出さずにローカルで処理
 */
export function useSubmitRemainingHandling() {
  const queryClient = useQueryClient();
  const isDemo = useDemoMode();

  return useMutation({
    mutationFn: async (input: SubmitRemainingHandlingRequest): Promise<RemainingHandlingLog> => {
      // デモモードではAPIを呼び出さずにローカルで処理
      if (isDemo) {
        const demoLog: RemainingHandlingLog = {
          id: `RHL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          handling: input.handling,
          quantity: input.quantity,
          note: input.note,
          recordedBy: input.staffName,
          recordedAt: new Date().toISOString(),
        };
        // 少し遅延を入れてリアルな挙動を再現
        await new Promise(resolve => setTimeout(resolve, 500));
        return demoLog;
      }

      const response = await submitRemainingHandling(input);
      if (!response.success || !response.data?.log) {
        throw new Error(response.error?.message || 'Failed to record remaining handling');
      }
      return response.data.log;
    },
    onSuccess: () => {
      // 品物一覧のキャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: [CARE_ITEMS_KEY] });
    },
  });
}
