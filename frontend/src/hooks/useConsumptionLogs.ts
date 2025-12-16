/**
 * 消費ログ カスタムフック
 * docs/INVENTORY_CONSUMPTION_SPEC.md に基づく
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConsumptionLogs,
  recordConsumptionLog,
} from '../api';
import type { GetConsumptionLogsParams } from '../api';
import type { RecordConsumptionLogRequest, ConsumptionLog, GetConsumptionLogsResponse } from '../types/consumptionLog';

// クエリキー
const CONSUMPTION_LOGS_KEY = 'consumptionLogs';
const CARE_ITEMS_KEY = 'careItems';

/**
 * 消費ログ一覧を取得するフック
 */
export function useConsumptionLogs(params: GetConsumptionLogsParams) {
  return useQuery<GetConsumptionLogsResponse>({
    queryKey: [CONSUMPTION_LOGS_KEY, params.itemId, params],
    queryFn: async (): Promise<GetConsumptionLogsResponse> => {
      const response = await getConsumptionLogs(params);
      if (!response.success || !response.data) {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'Failed to fetch consumption logs';
        throw new Error(errorMsg);
      }
      return response.data;
    },
    enabled: !!params.itemId,
  });
}

/**
 * 消費ログを記録するミューテーションフック
 */
export function useRecordConsumptionLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordConsumptionLogRequest) => {
      const response = await recordConsumptionLog(params);
      if (!response.success || !response.data) {
        const errorMsg = typeof response.error === 'string'
          ? response.error
          : response.error?.message || 'Failed to record consumption';
        throw new Error(errorMsg);
      }
      return { ...response.data, requestItemId: params.itemId };
    },
    onSuccess: (data) => {
      // 消費ログのキャッシュを無効化
      queryClient.invalidateQueries({
        queryKey: [CONSUMPTION_LOGS_KEY, data.requestItemId],
      });
      // 品物データのキャッシュも無効化（currentQuantity, statusが更新されるため）
      queryClient.invalidateQueries({
        queryKey: [CARE_ITEMS_KEY],
      });
    },
  });
}

/**
 * 消費ログから摂食傾向を計算
 */
export interface ConsumptionTrend {
  avgConsumptionRate: number;
  totalServed: number;
  totalConsumed: number;
  preferredMealTime?: string;
  lastServedDate?: string;
}

export function useConsumptionTrend(itemId: string) {
  const { data, isLoading, error } = useConsumptionLogs({ itemId, limit: 100 });

  const trend: ConsumptionTrend = {
    avgConsumptionRate: 0,
    totalServed: 0,
    totalConsumed: 0,
  };

  if (data && data.logs && data.logs.length > 0) {
    const logs: ConsumptionLog[] = data.logs;

    // 合計を計算
    let totalRate = 0;
    const mealTimeCounts: Record<string, number> = {};

    logs.forEach((log: ConsumptionLog) => {
      trend.totalServed += log.servedQuantity;
      trend.totalConsumed += log.consumedQuantity;
      totalRate += log.consumptionRate;

      if (log.mealTime) {
        mealTimeCounts[log.mealTime] = (mealTimeCounts[log.mealTime] || 0) + 1;
      }
    });

    // 平均摂食率
    trend.avgConsumptionRate = Math.round(totalRate / logs.length);

    // 最も多い食事時間
    const sortedMealTimes = Object.entries(mealTimeCounts)
      .sort((a, b) => b[1] - a[1]);
    if (sortedMealTimes.length > 0) {
      trend.preferredMealTime = sortedMealTimes[0][0];
    }

    // 最終提供日
    trend.lastServedDate = logs[0]?.servedDate;
  }

  return { trend, isLoading, error };
}

/**
 * タイムライン用に消費ログを整形
 */
export interface TimelineEntry {
  id: string;
  type: 'registration' | 'consumption';
  date: string;
  time?: string;
  title: string;
  description: string;
  details?: {
    servedQuantity?: number;
    consumedQuantity?: number;
    consumptionRate?: number;
    mealTime?: string;
    servedBy?: string;
    noteToFamily?: string;
  };
}

export function useItemTimeline(itemId: string, registrationDate?: string) {
  const { data: logsData, isLoading, error } = useConsumptionLogs({
    itemId,
    limit: 100,
  });

  const timeline: TimelineEntry[] = [];

  // 登録エントリを追加
  if (registrationDate) {
    timeline.push({
      id: 'registration',
      type: 'registration',
      date: registrationDate,
      title: '品物を登録',
      description: '家族が品物を登録しました',
    });
  }

  // 消費ログをタイムラインに追加
  if (logsData && logsData.logs) {
    logsData.logs.forEach((log: ConsumptionLog) => {
      const rateText = log.consumptionRate >= 100 ? '完食' : `${log.consumptionRate}%`;
      timeline.push({
        id: log.id,
        type: 'consumption',
        date: log.servedDate,
        time: log.servedTime,
        title: `${log.servedBy}さんが提供`,
        description: `${log.servedQuantity}提供 → ${log.consumedQuantity}消費 (${rateText})`,
        details: {
          servedQuantity: log.servedQuantity,
          consumedQuantity: log.consumedQuantity,
          consumptionRate: log.consumptionRate,
          mealTime: log.mealTime,
          servedBy: log.servedBy,
          noteToFamily: log.noteToFamily,
        },
      });
    });
  }

  // 日付でソート（新しい順）
  timeline.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateB.getTime() - dateA.getTime();
  });

  return { timeline, isLoading, error };
}
