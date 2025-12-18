/**
 * FoodMaster 食品マスタ カスタムフック (Phase 11)
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md セクション2.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  getFoodMasters,
  searchFoodMaster,
  createFoodMaster,
  updateFoodMaster,
  deleteFoodMaster,
} from '../api';
import type {
  FoodMaster,
  ItemCategory,
  GetFoodMastersRequest,
  FoodMasterInput,
  FoodMasterUpdateInput,
} from '../types/careItem';
import { DEMO_FOOD_MASTERS } from '../data/demo';

// クエリキー
const FOOD_MASTERS_KEY = 'foodMasters';

/**
 * デモモード判定
 */
function useIsDemoMode(): boolean {
  const location = useLocation();
  return location.pathname.startsWith('/demo');
}

/**
 * 食品マスタ一覧を取得するフック
 */
export function useFoodMasters(params?: {
  category?: ItemCategory;
  isActive?: boolean;
  limit?: number;
}) {
  const isDemoMode = useIsDemoMode();

  return useQuery({
    queryKey: [FOOD_MASTERS_KEY, 'list', params],
    queryFn: async () => {
      // デモモードはローカルデータを返す
      if (isDemoMode) {
        let items = DEMO_FOOD_MASTERS.filter((fm) => fm.isActive);

        if (params?.category) {
          items = items.filter((fm) => fm.category === params.category);
        }

        if (params?.isActive === false) {
          items = DEMO_FOOD_MASTERS;
        }

        if (params?.limit) {
          items = items.slice(0, params.limit);
        }

        return {
          items,
          total: items.length,
          hasMore: false,
        };
      }

      // 本番モードはAPIを呼び出し
      const response = await getFoodMasters(params as GetFoodMastersRequest);
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch food masters');
      }
      return response.data;
    },
  });
}

/**
 * 食品マスタを検索するフック（名前・別名でマッチ）
 */
export function useSearchFoodMaster(
  query: string,
  options?: { category?: ItemCategory; enabled?: boolean }
) {
  const isDemoMode = useIsDemoMode();

  return useQuery({
    queryKey: [FOOD_MASTERS_KEY, 'search', query, options?.category],
    queryFn: async () => {
      if (!query || query.trim().length === 0) {
        return { found: false, items: [] };
      }

      // デモモードはローカル検索
      if (isDemoMode) {
        const normalizedQuery = query.trim().toLowerCase();
        const matches = DEMO_FOOD_MASTERS.filter((fm) => {
          if (!fm.isActive) return false;
          if (options?.category && fm.category !== options.category) return false;

          // 名前でマッチ
          if (fm.name.toLowerCase().includes(normalizedQuery)) return true;
          // 別名でマッチ
          if (fm.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery)))
            return true;
          return false;
        });

        return {
          found: matches.length > 0,
          items: matches,
          bestMatch: matches[0],
        };
      }

      // 本番モードはAPIを呼び出し
      const response = await searchFoodMaster({
        query: query.trim(),
        category: options?.category,
        limit: 10,
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to search food masters');
      }

      return {
        found: response.data.found,
        items: response.data.items || [],
        bestMatch: response.data.items?.[0],
      };
    },
    enabled: options?.enabled !== false && query.trim().length > 0,
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
}

/**
 * 食品マスタを作成するミューテーションフック
 */
export function useCreateFoodMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FoodMasterInput) => {
      const response = await createFoodMaster({ foodMaster: input });
      if (!response.success || !response.data) {
        throw new Error('Failed to create food master');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOOD_MASTERS_KEY] });
    },
  });
}

/**
 * 食品マスタを更新するミューテーションフック
 */
export function useUpdateFoodMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { foodMasterId: string; updates: FoodMasterUpdateInput }) => {
      const response = await updateFoodMaster(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to update food master');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOOD_MASTERS_KEY] });
    },
  });
}

/**
 * 食品マスタを削除するミューテーションフック
 */
export function useDeleteFoodMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (foodMasterId: string) => {
      const response = await deleteFoodMaster({ foodMasterId });
      if (!response.success) {
        throw new Error('Failed to delete food master');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOOD_MASTERS_KEY] });
    },
  });
}

/**
 * 単一の食品マスタを取得するフック（ID指定）
 */
export function useFoodMaster(foodMasterId: string | undefined) {
  const isDemoMode = useIsDemoMode();

  return useQuery({
    queryKey: [FOOD_MASTERS_KEY, 'detail', foodMasterId],
    queryFn: async () => {
      if (!foodMasterId) {
        return null;
      }

      // デモモードはローカルデータを検索
      if (isDemoMode) {
        return DEMO_FOOD_MASTERS.find((fm) => fm.id === foodMasterId) || null;
      }

      // 本番モードは一覧から取得（専用APIがない場合）
      const response = await getFoodMasters({ limit: 500 });
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch food master');
      }
      return response.data.items.find((fm: FoodMaster) => fm.id === foodMasterId) || null;
    },
    enabled: !!foodMasterId,
  });
}
