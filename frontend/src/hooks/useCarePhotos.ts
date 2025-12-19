/**
 * Phase 17: Firebase Storage 写真取得フック
 *
 * care_photosコレクションから写真を取得するReact Queryフック
 */

import { useQuery } from '@tanstack/react-query';
import { getCarePhotos } from '../api';
import type { CarePhoto, GetCarePhotosRequest } from '../types';

export interface UseCarePhotosParams extends GetCarePhotosRequest {
  enabled?: boolean;
}

/**
 * 写真取得フック
 *
 * @param params - 取得パラメータ
 * @returns React Query結果
 */
export function useCarePhotos({
  residentId,
  date,
  mealTime,
  enabled = true,
}: UseCarePhotosParams) {
  return useQuery({
    queryKey: ['carePhotos', residentId, date, mealTime],
    queryFn: () =>
      getCarePhotos({
        residentId,
        date,
        mealTime,
      }),
    enabled: enabled && !!residentId && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * 写真一覧取得用の便利フック
 *
 * @returns 写真配列とローディング状態
 */
export function useCarePhotoList(params: UseCarePhotosParams): {
  photos: CarePhoto[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { data, isLoading, error, refetch } = useCarePhotos(params);

  return {
    photos: data?.data?.photos ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
