import { useQuery } from '@tanstack/react-query';
import { getPlanData } from '../api';
import type { SheetSummary, PlanDataRecord } from '../types';

export function usePlanData(sheetName?: string) {
  return useQuery({
    queryKey: ['planData', sheetName],
    queryFn: () => getPlanData(sheetName),
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

export function useSheetRecords(sheetName: string): {
  records: PlanDataRecord[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
} {
  const { data, isLoading, error } = usePlanData(sheetName);

  return {
    records: data?.data?.records ?? [],
    totalCount: data?.data?.totalCount ?? 0,
    isLoading,
    error: error?.message ?? null,
  };
}
