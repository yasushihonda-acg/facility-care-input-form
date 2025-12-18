/**
 * 間食提供サジェストフック
 * 家族指示と摂食傾向から提供量・注意事項を提案
 *
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md - Phase 5
 */

import { useMemo } from 'react';
import type { CareItem } from '../types/careItem';
import { useConsumptionTrend } from './useConsumptionLogs';

// === 型定義 ===

export interface SnackSuggestion {
  /** 推奨提供数 */
  suggestedQuantity: number;
  /** 推奨理由 */
  reason: string;
  /** 推奨ソース（指示/傾向/デフォルト） */
  source: 'instruction' | 'trend' | 'default';
  /** 警告リスト */
  warnings: SnackWarning[];
  /** 摂食傾向情報 */
  trend?: {
    avgConsumptionRate: number;
    totalServed: number;
    preferredMealTime?: string;
  };
}

export interface SnackWarning {
  type: 'low_stock' | 'expiring_soon' | 'expired' | 'low_consumption' | 'daily_limit';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// === ヘルパー関数 ===

/**
 * 家族指示から提供数を抽出
 * 例: "1日1切れまで" → 1, "2個まで" → 2
 */
function extractQuantityFromInstruction(instruction: string): number | null {
  // パターン: "1日1切れ", "1個まで", "2枚", "3本" など
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:切れ|個|枚|本|パック|袋|g|ml)/i,
    /(\d+(?:\.\d+)?)\s*(?:まで|以下)/i,
    /1日\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = instruction.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

/**
 * 賞味期限までの日数を計算
 */
function getDaysUntilExpiration(expirationDate?: string): number | null {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// === メインフック ===

/**
 * 間食提供サジェストフック
 *
 * @param item 品物情報
 * @returns サジェスト情報
 *
 * @example
 * ```tsx
 * const { suggestion, isLoading } = useSnackSuggestion(item);
 *
 * // 提供数の初期値として使用
 * const [quantity, setQuantity] = useState(suggestion?.suggestedQuantity ?? 1);
 *
 * // 警告表示
 * {suggestion?.warnings.map(w => (
 *   <Alert severity={w.severity}>{w.message}</Alert>
 * ))}
 * ```
 */
export function useSnackSuggestion(item: CareItem | null) {
  // 摂食傾向を取得
  const { trend, isLoading, error } = useConsumptionTrend(item?.id || '');

  // サジェストを計算
  const suggestion = useMemo<SnackSuggestion | null>(() => {
    if (!item) return null;

    const warnings: SnackWarning[] = [];
    let suggestedQuantity = 1; // デフォルト
    let reason = 'デフォルトの提供数';
    let source: SnackSuggestion['source'] = 'default';

    // 1. 家族指示から提供数を抽出
    if (item.noteToStaff) {
      const instructionQty = extractQuantityFromInstruction(item.noteToStaff);
      if (instructionQty !== null) {
        suggestedQuantity = instructionQty;
        reason = `家族指示「${item.noteToStaff}」より`;
        source = 'instruction';
      }
    }

    // 2. 摂食傾向から調整（指示がない場合のみ）
    if (source === 'default' && trend && trend.totalServed > 0) {
      // 平均消費率が低い場合、提供数を減らす提案
      if (trend.avgConsumptionRate < 50 && trend.totalServed >= 3) {
        suggestedQuantity = Math.max(0.5, suggestedQuantity * 0.5);
        reason = `摂食率 ${trend.avgConsumptionRate}% のため少量を推奨`;
        source = 'trend';

        warnings.push({
          type: 'low_consumption',
          message: `過去の平均摂食率は ${trend.avgConsumptionRate}% です`,
          severity: 'info',
        });
      }
    }

    // 3. 在庫チェック
    const currentQty = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;
    if (currentQty !== undefined) {
      // 在庫が少ない場合
      if (currentQty <= 2) {
        warnings.push({
          type: 'low_stock',
          message: `残り ${currentQty}${item.unit} です`,
          severity: 'warning',
        });
      }

      // 提供数が在庫を超える場合は調整
      if (suggestedQuantity > currentQty) {
        suggestedQuantity = currentQty;
        reason = `在庫残量（${currentQty}${item.unit}）に合わせて調整`;
      }
    }

    // 4. 賞味期限チェック
    const daysUntilExp = getDaysUntilExpiration(item.expirationDate);
    if (daysUntilExp !== null) {
      if (daysUntilExp < 0) {
        warnings.push({
          type: 'expired',
          message: `賞味期限が ${Math.abs(daysUntilExp)} 日過ぎています`,
          severity: 'error',
        });
      } else if (daysUntilExp <= 3) {
        warnings.push({
          type: 'expiring_soon',
          message: daysUntilExp === 0
            ? '本日が賞味期限です'
            : `賞味期限まであと ${daysUntilExp} 日です`,
          severity: 'warning',
        });
      }
    }

    return {
      suggestedQuantity,
      reason,
      source,
      warnings,
      trend: trend && trend.totalServed > 0 ? {
        avgConsumptionRate: trend.avgConsumptionRate,
        totalServed: trend.totalServed,
        preferredMealTime: trend.preferredMealTime,
      } : undefined,
    };
  }, [item, trend]);

  return {
    suggestion,
    isLoading,
    error,
  };
}

export default useSnackSuggestion;
