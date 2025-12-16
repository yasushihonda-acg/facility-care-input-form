/**
 * 統計データ取得カスタムフック (Phase 8.3)
 * @see docs/STATS_DASHBOARD_SPEC.md
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getStats } from '../api';
import type {
  GetStatsRequest,
  ItemStatsData,
  Alert,
} from '../types/stats';

interface UseStatsOptions {
  residentId?: string;
  include?: GetStatsRequest['include'];
  autoFetch?: boolean;
}

/** デフォルトのincludeオプション */
const DEFAULT_INCLUDE: GetStatsRequest['include'] = ['items', 'alerts'];

interface UseStatsReturn {
  // データ
  itemStats: ItemStatsData | null;
  alerts: Alert[];
  period: { start: string; end: string } | null;

  // 状態
  isLoading: boolean;
  error: string | null;

  // 操作
  refetch: () => Promise<void>;
  fetchStats: (params?: Partial<GetStatsRequest>) => Promise<void>;
}

/**
 * 今日の日付をYYYY-MM-DD形式で取得
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * 統計データ取得フック
 *
 * 注意: include配列は参照が変わると無限ループが発生するため、
 * useRefで初回の値を固定している
 */
export function useStats(options: UseStatsOptions = {}): UseStatsReturn {
  const { residentId, include, autoFetch = true } = options;

  // include配列をuseRefで初回の値に固定（参照の変化を無視）
  const includeRef = useRef<GetStatsRequest['include']>(include ?? DEFAULT_INCLUDE);

  const [itemStats, setItemStats] = useState<ItemStatsData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 初回フェッチ完了フラグ
  const hasFetchedRef = useRef(false);

  const fetchStats = useCallback(async (params: Partial<GetStatsRequest> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const today = getTodayString();
      const response = await getStats({
        residentId: params.residentId ?? residentId,
        startDate: params.startDate ?? today,
        endDate: params.endDate ?? today,
        include: params.include ?? includeRef.current,
      });

      if (response.success && response.data) {
        setItemStats(response.data.itemStats ?? null);
        setAlerts(response.data.alerts ?? []);
        setPeriod(response.data.period);
      } else {
        throw new Error('Failed to fetch stats');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('useStats error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [residentId]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // 初回自動取得（1回だけ実行）
  useEffect(() => {
    if (autoFetch && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchStats();
    }
  }, [autoFetch, fetchStats]);

  return {
    itemStats,
    alerts,
    period,
    isLoading,
    error,
    refetch,
    fetchStats,
  };
}

/**
 * アラートのみを取得するシンプルなフック
 */
export function useAlerts(residentId?: string): {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { alerts, isLoading, error, refetch } = useStats({
    residentId,
    include: ['alerts'],
    autoFetch: true,
  });

  return { alerts, isLoading, error, refetch };
}

/**
 * 重要度でフィルタリングされたアラート数を取得
 */
export function useAlertCounts(residentId?: string): {
  urgentCount: number;
  warningCount: number;
  infoCount: number;
  totalCount: number;
  isLoading: boolean;
} {
  const { alerts, isLoading } = useAlerts(residentId);

  const urgentCount = alerts.filter(a => a.severity === 'urgent').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  return {
    urgentCount,
    warningCount,
    infoCount,
    totalCount: alerts.length,
    isLoading,
  };
}
