import { useQuery } from '@tanstack/react-query';
import { getPlanData } from '../api';
import type { SheetSummary, PlanDataRecord } from '../types';

interface UsePlanDataOptions {
  sheetName?: string;
  year?: number;
  month?: number | null;
}

export function usePlanData(options?: UsePlanDataOptions | string) {
  // 後方互換性: 文字列の場合はsheetNameとして扱う
  const normalizedOptions: UsePlanDataOptions | undefined =
    typeof options === 'string' ? { sheetName: options } : options;

  // year/month指定時はsheetNameが必須（Firestoreインデックス制約）
  // sheetNameが空の場合はAPI呼び出しをスキップ
  const hasYearFilter = normalizedOptions?.year !== undefined;
  const hasSheetName = !!normalizedOptions?.sheetName;
  const shouldFetch = !hasYearFilter || hasSheetName;

  return useQuery({
    queryKey: ['planData', normalizedOptions?.sheetName, normalizedOptions?.year, normalizedOptions?.month],
    queryFn: () => getPlanData({
      sheetName: normalizedOptions?.sheetName,
      year: normalizedOptions?.year,
      month: normalizedOptions?.month ?? undefined,
    }),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
  });
}

export function useSheetList(): {
  sheets: SheetSummary[];
  isLoading: boolean;
  error: string | null;
  lastSyncedAt: string | null;
} {
  const { data, isLoading, error } = usePlanData();

  return {
    sheets: data?.data?.sheets ?? [],
    isLoading,
    error: error?.message ?? null,
    lastSyncedAt: data?.data?.lastSyncedAt ?? null,
  };
}

interface UseSheetRecordsOptions {
  sheetName: string;
  year?: number;
  month?: number | null;
}

export function useSheetRecords(options: UseSheetRecordsOptions | string): {
  records: PlanDataRecord[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
} {
  // 後方互換性: 文字列の場合はsheetNameとして扱う
  const normalizedOptions: UseSheetRecordsOptions =
    typeof options === 'string' ? { sheetName: options } : options;

  const { data, isLoading, error } = usePlanData(normalizedOptions);

  return {
    records: data?.data?.records ?? [],
    totalCount: data?.data?.totalCount ?? 0,
    isLoading,
    error: error?.message ?? null,
  };
}
