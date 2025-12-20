/**
 * 品物イベント（編集履歴）カスタムフック
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション9.4 - 編集履歴タイムライン
 *
 * デモモード対応: /demo パス配下ではローカルデモデータを返却
 * @see docs/DEMO_SHOWCASE_SPEC.md
 */

import { useQuery } from '@tanstack/react-query';
import { useDemoMode } from './useDemoMode';
import { getDemoItemEventsForItem, getDemoEditEventsForItem } from '../data/demo';
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

      // 本番モード: 現時点ではitem_eventsコレクションは未実装なので空を返す
      // 将来: APIからイベントを取得
      return {
        events: [],
        total: 0,
      };
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

      // 本番モード: 現時点では未実装なので空を返す
      return {
        events: [],
        total: 0,
      };
    },
    enabled: !!itemId,
  });
}
