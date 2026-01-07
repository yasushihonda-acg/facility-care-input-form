/**
 * 品物イベント（編集履歴）カスタムフック
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション9.4 - 編集履歴タイムライン
 *
 * デモモード対応: /demo パス配下ではローカルデモデータを返却
 * 本番モード: Firestore item_events コレクションから取得（Phase 58）
 */

import { useQuery } from '@tanstack/react-query';
import { useDemoMode } from './useDemoMode';
import {
  getDemoItemEventsForItem,
  getDemoEditEventsForItem,
  getRecentFamilyActionNotifications,
} from '../data/demo';
import { getItemEvents as getItemEventsApi } from '../api';
import type { ItemEvent } from '../types/itemEvent';

// クエリキー
const ITEM_EVENTS_KEY = 'itemEvents';

/**
 * 品物イベントレスポンス型
 */
export interface GetItemEventsResponse {
  events: ItemEvent[];
  total: number;
}

/**
 * 品物イベントパラメータ型
 */
export interface GetItemEventsParams {
  itemId: string;
  limit?: number;
  eventType?: 'created' | 'updated' | 'served' | 'status_changed';
}

/**
 * 品物イベント一覧を取得するフック
 */
export function useItemEvents(params: GetItemEventsParams) {
  const isDemo = useDemoMode();

  return useQuery<GetItemEventsResponse>({
    queryKey: [ITEM_EVENTS_KEY, params.itemId, params, isDemo],
    queryFn: async (): Promise<GetItemEventsResponse> => {
      // デモモードではローカルデータを返却
      if (isDemo) {
        let events = getDemoItemEventsForItem(params.itemId);

        // イベントタイプでフィルタ
        if (params.eventType) {
          events = events.filter(e => e.eventType === params.eventType);
        }

        const limit = params.limit ?? 50;
        const paginatedEvents = events.slice(0, limit);
        return {
          events: paginatedEvents,
          total: events.length,
        };
      }

      // 本番モード: APIからイベントを取得（Phase 58）
      const result = await getItemEventsApi({
        itemId: params.itemId,
        hoursAgo: 24 * 30, // 30日分
        eventTypes: params.eventType ? [params.eventType] : undefined,
        limit: params.limit ?? 50,
      });
      return result;
    },
    enabled: !!params.itemId,
  });
}

/**
 * 編集イベントのみを取得するフック
 */
export function useEditEvents(itemId: string, limit?: number) {
  const isDemo = useDemoMode();

  return useQuery<GetItemEventsResponse>({
    queryKey: [ITEM_EVENTS_KEY, 'edit', itemId, limit, isDemo],
    queryFn: async (): Promise<GetItemEventsResponse> => {
      // デモモードではローカルデータを返却
      if (isDemo) {
        const events = getDemoEditEventsForItem(itemId);
        const paginatedEvents = events.slice(0, limit ?? 10);
        return {
          events: paginatedEvents,
          total: events.length,
        };
      }

      // 本番モード: APIからイベントを取得（Phase 58）
      const result = await getItemEventsApi({
        itemId,
        hoursAgo: 24 * 30, // 30日分
        eventTypes: ['updated'],
        limit: limit ?? 10,
      });
      return result;
    },
    enabled: !!itemId,
  });
}

/**
 * 家族操作通知（24時間以内の新規・編集・削除イベント）を取得するフック
 * スタッフ注意事項ページの「家族依頼」タブで使用
 */
export function useFamilyActionNotifications() {
  const isDemo = useDemoMode();

  return useQuery<GetItemEventsResponse>({
    queryKey: [ITEM_EVENTS_KEY, 'familyNotifications', isDemo],
    queryFn: async (): Promise<GetItemEventsResponse> => {
      // デモモードではローカルデータを返却
      if (isDemo) {
        const events = getRecentFamilyActionNotifications();
        return {
          events,
          total: events.length,
        };
      }

      // 本番モード: APIから24時間以内のイベントを取得（Phase 58）
      const result = await getItemEventsApi({
        hoursAgo: 24,
        eventTypes: ['created', 'updated', 'deleted'],
        limit: 50,
      });
      return result;
    },
    // 30秒ごとにリフレッシュ
    refetchInterval: 30000,
  });
}
