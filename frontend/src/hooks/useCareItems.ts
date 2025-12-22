/**
 * 品物管理 カスタムフック
 * docs/ITEM_MANAGEMENT_SPEC.md に基づく
 * docs/FIFO_DESIGN_SPEC.md に基づくFIFOソート対応
 *
 * デモモード対応: /demo パス配下ではローカルデモデータを返却
 * @see docs/DEMO_SHOWCASE_SPEC.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCareItems,
  submitCareItem,
  updateCareItem,
  deleteCareItem,
} from '../api';
import type { GetCareItemsParams } from '../api';
import type { CareItem, CareItemInput, ItemStatus } from '../types/careItem';
import { useDemoMode } from './useDemoMode';
import { DEMO_CARE_ITEMS } from '../data/demo';

// クエリキー
const CARE_ITEMS_KEY = 'careItems';

/**
 * FIFOソート: 賞味期限が近い順 → 送付日が古い順
 * docs/FIFO_DESIGN_SPEC.md セクション3.2に基づく
 */
function sortByExpirationFirst(items: CareItem[]): CareItem[] {
  return [...items].sort((a, b) => {
    // 期限なしは末尾に
    if (!a.expirationDate && !b.expirationDate) {
      return new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime();
    }
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;

    // 期限が近い順
    const expA = new Date(a.expirationDate).getTime();
    const expB = new Date(b.expirationDate).getTime();
    if (expA !== expB) return expA - expB;

    // 同じ期限なら送付日が古い順
    return new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime();
  });
}

/**
 * デモデータをAPI形式にフィルタリング
 */
function filterDemoCareItems(params: GetCareItemsParams): { items: CareItem[]; total: number } {
  let items = [...DEMO_CARE_ITEMS];

  // 入居者IDでフィルタ
  if (params.residentId) {
    items = items.filter(item => item.residentId === params.residentId);
  }

  // ステータスでフィルタ
  if (params.status) {
    const statuses = Array.isArray(params.status) ? params.status : [params.status];
    items = items.filter(item => statuses.includes(item.status));
  }

  // カテゴリでフィルタ
  if (params.category) {
    items = items.filter(item => item.category === params.category);
  }

  // 日付でフィルタ
  if (params.startDate) {
    items = items.filter(item => item.sentDate >= params.startDate!);
  }
  if (params.endDate) {
    items = items.filter(item => item.sentDate <= params.endDate!);
  }

  // FIFOソート適用
  items = sortByExpirationFirst(items);

  const total = items.length;

  // ページネーション
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  items = items.slice(offset, offset + limit);

  return { items, total };
}

/**
 * 品物一覧を取得するフック
 */
export function useCareItems(params: GetCareItemsParams = {}) {
  const isDemo = useDemoMode();

  return useQuery({
    queryKey: [CARE_ITEMS_KEY, params, isDemo],
    queryFn: async () => {
      // デモモードではローカルデータを返却
      if (isDemo) {
        return filterDemoCareItems(params);
      }

      const response = await getCareItems(params);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch care items');
      }
      // FIFOソート適用（クライアント側でソート）
      return {
        ...response.data,
        items: sortByExpirationFirst(response.data.items),
      };
    },
  });
}

/**
 * 品物を登録するミューテーションフック
 */
export function useSubmitCareItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      residentId,
      userId,
      item,
    }: {
      residentId: string;
      userId: string;
      item: CareItemInput;
    }) => {
      const response = await submitCareItem(residentId, userId, item);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to submit care item');
      }
      return response.data;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: [CARE_ITEMS_KEY] });
    },
  });
}

/**
 * 品物を更新するミューテーションフック
 */
export function useUpdateCareItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: Partial<CareItem>;
    }) => {
      const response = await updateCareItem(itemId, updates);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update care item');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CARE_ITEMS_KEY] });
    },
  });
}

/**
 * 品物を削除するミューテーションフック
 */
export function useDeleteCareItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await deleteCareItem(itemId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete care item');
      }
      return itemId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CARE_ITEMS_KEY] });
    },
  });
}

/**
 * ステータス別の品物数を取得するフック
 */
export function useCareItemCounts(residentId?: string) {
  const { data, isLoading, error } = useCareItems({ residentId, limit: 1000 });

  const counts = {
    pending: 0,
    served: 0,
    consumed: 0,
    expired: 0,
    discarded: 0,
    total: 0,
  };

  if (data?.items) {
    data.items.forEach((item) => {
      counts[item.status as keyof typeof counts]++;
      counts.total++;
    });
  }

  return { counts, isLoading, error };
}

/**
 * 同じ品物名のアイテム一覧を取得するフック（FIFOガイド用）
 * docs/FIFO_DESIGN_SPEC.md セクション4.2-4.3に基づく
 */
export function useSameNameItems(residentId: string, itemName: string, excludeItemId?: string) {
  const { data, isLoading, error } = useCareItems({
    residentId,
    status: ['pending', 'served'] as ItemStatus[],
    limit: 100,
  });

  // 同じ品物名のアイテムをフィルタリング
  const sameNameItems = data?.items?.filter((item) => {
    if (item.itemName !== itemName) return false;
    if (excludeItemId && item.id === excludeItemId) return false;
    if ((item.currentQuantity ?? 0) <= 0) return false;
    return true;
  }) ?? [];

  // 推奨アイテム（期限が最も近いもの）を特定
  const recommendedItem = sameNameItems.length > 0 ? sameNameItems[0] : null;

  return {
    sameNameItems,
    recommendedItem,
    hasDuplicates: sameNameItems.length > 0,
    isLoading,
    error,
  };
}

/**
 * 賞味期限が近い品物を取得するフック
 */
export function useExpiringItems(residentId?: string, daysThreshold = 3) {
  const { data, isLoading, error } = useCareItems({
    residentId,
    status: ['pending', 'in_progress'] as ItemStatus[],
    limit: 100,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringItems = data?.items?.filter((item) => {
    if (!item.expirationDate) return false;
    const expDate = new Date(item.expirationDate);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= daysThreshold;
  }) ?? [];

  return { expiringItems, isLoading, error };
}

/**
 * 期限切れ品物を取得するフック（Phase 38.2）
 * 未提供・提供中のみ対象（提供済み・消費済み・廃棄済みは除外）
 */
export function useExpiredItems(residentId?: string) {
  const { data, isLoading, error } = useCareItems({
    residentId,
    status: ['pending', 'in_progress'] as ItemStatus[],
    limit: 100,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredItems = data?.items?.filter((item) => {
    if (!item.expirationDate) return false;
    const expDate = new Date(item.expirationDate);
    expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  }) ?? [];

  return { expiredItems, isLoading, error };
}

/**
 * 品物を廃棄するミューテーションフック（Phase 38.2）
 * @see docs/archive/PHASE_38_2_ITEM_MANAGEMENT_REDESIGN.md
 */
export function useDiscardItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      reason,
    }: {
      itemId: string;
      reason?: string;
    }) => {
      const response = await updateCareItem(itemId, {
        status: 'discarded',
        discardedAt: new Date().toISOString(),
        discardedBy: 'family_user',
        discardReason: reason || '家族により廃棄',
      } as Partial<CareItem>);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to discard care item');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CARE_ITEMS_KEY] });
    },
  });
}
