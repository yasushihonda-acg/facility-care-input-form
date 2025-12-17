/**
 * 禁止ルール管理フック
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション8
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProhibitions,
  createProhibition,
  updateProhibition,
  deleteProhibition,
} from '../api';
import type {
  ProhibitionRule,
  ProhibitionRuleInput,
  CreateProhibitionRequest,
  UpdateProhibitionRequest,
} from '../types/careItem';
import { DEMO_PROHIBITIONS } from '../data/demoFamilyData';

// クエリキー
const PROHIBITIONS_QUERY_KEY = 'prohibitions';

/**
 * 禁止ルール一覧を取得
 * APIが空の場合はデモデータをフォールバック
 */
export function useProhibitions(residentId: string, activeOnly = true) {
  return useQuery({
    queryKey: [PROHIBITIONS_QUERY_KEY, residentId, activeOnly],
    queryFn: async () => {
      const response = await getProhibitions({ residentId, activeOnly });
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch prohibitions');
      }
      // APIからデータがない場合、デモデータをフォールバック
      if (response.data.prohibitions.length === 0) {
        return {
          prohibitions: DEMO_PROHIBITIONS.filter(
            (p) => p.residentId === residentId && (!activeOnly || p.isActive)
          ),
        };
      }
      return response.data;
    },
    enabled: !!residentId,
  });
}

/**
 * 禁止ルール作成ミューテーション
 */
export function useCreateProhibition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateProhibitionRequest) => {
      const response = await createProhibition(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to create prohibition');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({
        queryKey: [PROHIBITIONS_QUERY_KEY, variables.residentId],
      });
    },
  });
}

/**
 * 禁止ルール更新ミューテーション
 */
export function useUpdateProhibition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateProhibitionRequest) => {
      const response = await updateProhibition(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to update prohibition');
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({
        queryKey: [PROHIBITIONS_QUERY_KEY, variables.residentId],
      });
    },
  });
}

/**
 * 禁止ルール削除ミューテーション（論理削除）
 */
export function useDeleteProhibition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      residentId,
      prohibitionId,
    }: {
      residentId: string;
      prohibitionId: string;
    }) => {
      const response = await deleteProhibition(residentId, prohibitionId);
      if (!response.success) {
        throw new Error('Failed to delete prohibition');
      }
      return response;
    },
    onSuccess: (_, variables) => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({
        queryKey: [PROHIBITIONS_QUERY_KEY, variables.residentId],
      });
    },
  });
}

// 型エクスポート
export type { ProhibitionRule, ProhibitionRuleInput };
