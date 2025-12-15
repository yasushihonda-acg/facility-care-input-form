/**
 * 統計データ取得カスタムフック (Phase 8.3)
 * @see docs/STATS_DASHBOARD_SPEC.md
 */

import { useState, useEffect, useCallback } from 'react';
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
 */
export function useStats(options: UseStatsOptions = {}): UseStatsReturn {
  const { residentId, include = ['items', 'alerts'], autoFetch = true } = options;

  const [itemStats, setItemStats] = useState<ItemStatsData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (params: Partial<GetStatsRequest> = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const today = getTodayString();
      const response = await getStats({
        residentId: params.residentId ?? residentId,
        startDate: params.startDate ?? today,
        endDate: params.endDate ?? today,
        include: params.include ?? include,
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
  }, [residentId, include]);

  const refetch = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  // 初回自動取得
  useEffect(() => {
    if (autoFetch) {
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
