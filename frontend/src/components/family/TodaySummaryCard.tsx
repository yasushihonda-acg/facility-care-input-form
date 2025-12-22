/**
 * 今日のサマリーカード
 * Phase 38.1: 品物管理ページ上部に表示する確認優先UI
 *
 * 表示項目:
 * - 今日提供予定の品物数
 * - 確認待ち（提供済み・摂食結果未入力）
 * - 期限間近（3日以内）
 */

import { useMemo } from 'react';
import type { CareItem } from '../../types/careItem';
import { isScheduledForDate } from '../../utils/scheduleUtils';
import { getDaysUntilExpiration } from '../../types/careItem';

interface TodaySummaryCardProps {
  /** 全品物リスト */
  items: CareItem[];
  /** 今日フィルタクリック時 */
  onTodayClick?: () => void;
  /** 確認待ちフィルタクリック時 */
  onAwaitingClick?: () => void;
  /** 期限間近フィルタクリック時 */
  onExpiringSoonClick?: () => void;
}

export function TodaySummaryCard({
  items,
  onTodayClick,
  onAwaitingClick,
  onExpiringSoonClick,
}: TodaySummaryCardProps) {
  const today = useMemo(() => new Date(), []);

  // 今日提供予定の品物
  const todayItems = useMemo(() => {
    return items.filter((item) => {
      // アクティブな品物のみ
      if (item.status !== 'pending' && item.status !== 'in_progress') {
        return false;
      }
      return isScheduledForDate(item.servingSchedule, today);
    });
  }, [items, today]);

  // 確認待ち: 提供済みだが摂食結果未入力
  const awaitingItems = useMemo(() => {
    return items.filter((item) => {
      return item.status === 'served' && item.consumptionRate === undefined;
    });
  }, [items]);

  // 期限間近: 3日以内
  const expiringSoonItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.expirationDate) return false;
      if (item.status === 'consumed') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days !== null && days >= 0 && days <= 3;
    });
  }, [items]);

  // 期限切れ
  const expiredItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.expirationDate) return false;
      if (item.status === 'consumed') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days !== null && days < 0;
    });
  }, [items]);

  // 全て0件の場合は簡易表示
  const hasNotifications =
    todayItems.length > 0 ||
    awaitingItems.length > 0 ||
    expiringSoonItems.length > 0 ||
    expiredItems.length > 0;

  return (
    <div className="mx-4 mt-3 bg-white rounded-xl border shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span>📊</span>
        今日のステータス
      </h2>

      {!hasNotifications ? (
        <p className="text-sm text-gray-500 text-center py-2">
          現在確認が必要な項目はありません ✨
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* 今日の予定 */}
          <button
            onClick={onTodayClick}
            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
              {todayItems.length}
            </div>
            <div>
              <div className="text-sm font-medium text-blue-800">今日の予定</div>
              <div className="text-xs text-blue-600">提供予定品物</div>
            </div>
          </button>

          {/* 確認待ち */}
          <button
            onClick={onAwaitingClick}
            disabled={awaitingItems.length === 0}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              awaitingItems.length > 0
                ? 'bg-amber-50 hover:bg-amber-100'
                : 'bg-gray-50 opacity-60 cursor-default'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                awaitingItems.length > 0 ? 'bg-amber-500' : 'bg-gray-400'
              }`}
            >
              {awaitingItems.length}
            </div>
            <div>
              <div
                className={`text-sm font-medium ${
                  awaitingItems.length > 0 ? 'text-amber-800' : 'text-gray-600'
                }`}
              >
                確認待ち
              </div>
              <div
                className={`text-xs ${
                  awaitingItems.length > 0 ? 'text-amber-600' : 'text-gray-500'
                }`}
              >
                摂食結果未入力
              </div>
            </div>
          </button>

          {/* 期限間近 */}
          <button
            onClick={onExpiringSoonClick}
            disabled={expiringSoonItems.length === 0}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              expiringSoonItems.length > 0
                ? 'bg-orange-50 hover:bg-orange-100'
                : 'bg-gray-50 opacity-60 cursor-default'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                expiringSoonItems.length > 0 ? 'bg-orange-500' : 'bg-gray-400'
              }`}
            >
              {expiringSoonItems.length}
            </div>
            <div>
              <div
                className={`text-sm font-medium ${
                  expiringSoonItems.length > 0 ? 'text-orange-800' : 'text-gray-600'
                }`}
              >
                期限間近
              </div>
              <div
                className={`text-xs ${
                  expiringSoonItems.length > 0 ? 'text-orange-600' : 'text-gray-500'
                }`}
              >
                3日以内
              </div>
            </div>
          </button>

          {/* 期限切れ */}
          <button
            onClick={onExpiringSoonClick}
            disabled={expiredItems.length === 0}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
              expiredItems.length > 0
                ? 'bg-red-50 hover:bg-red-100'
                : 'bg-gray-50 opacity-60 cursor-default'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                expiredItems.length > 0 ? 'bg-red-500' : 'bg-gray-400'
              }`}
            >
              {expiredItems.length}
            </div>
            <div>
              <div
                className={`text-sm font-medium ${
                  expiredItems.length > 0 ? 'text-red-800' : 'text-gray-600'
                }`}
              >
                期限切れ
              </div>
              <div
                className={`text-xs ${
                  expiredItems.length > 0 ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                要対応
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default TodaySummaryCard;
