import { useQuery } from '@tanstack/react-query';
import { getPlanData } from '../api';

export function usePlanData(sheetName?: string) {
  return useQuery({
    queryKey: ['planData', sheetName],
    queryFn: () => getPlanData(sheetName),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes (formerly cacheTime)
  });
}

export function useSheetList() {
  const { data, isLoading, error } = usePlanData();

  return {
    sheets: data?.data?.sheets ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}

export function useSheetRecords(sheetName: string) {
  const { data, isLoading, error } = usePlanData(sheetName);

  return {
    records: data?.data?.records ?? [],
    totalRecords: data?.data?.totalRecords ?? 0,
    isLoading,
    error: error?.message ?? null,
  };
}
