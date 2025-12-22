/**
 * 品物管理ページ（家族用）
 * Phase 38.2: 日付ナビゲーション中心UIリデザイン
 *
 * 構造:
 * 1. 期限切れアラート（常時表示・廃棄アクション付き）
 * 2. 未設定日通知（期間変更・除外フィルタ付き）
 * 3. 日付ナビゲーション（日/週/月 + カレンダー）
 * 4. 品物リスト
 *
 * ※ ステータスフィルタタブは削除
 *
 * @see docs/archive/PHASE_38_2_ITEM_MANAGEMENT_REDESIGN.md
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems, useDeleteCareItem, useExpiredItems } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useSkipDateManager } from '../../hooks/useSkipDates';
import {
  getCategoryIcon,
  getStatusLabel,
  getStatusColorClass,
  formatDate,
  getExpirationDisplayText,
  getDaysUntilExpiration,
} from '../../types/careItem';
import type { CareItem } from '../../types/careItem';
import { ExpirationAlert } from '../../components/family/ExpirationAlert';
import { DateNavigator, type DateViewMode } from '../../components/family/DateNavigator';
import { UnscheduledDatesBanner } from '../../components/family/UnscheduledDatesBanner';
import { UnscheduledDatesModal } from '../../components/family/UnscheduledDatesModal';
import { getUnscheduledDates, isScheduledForDate } from '../../utils/scheduleUtils';

// デモ用の入居者ID・ユーザーID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

/**
 * 日付範囲に基づいてアイテムをフィルタリング
 */
function filterItemsByDateRange(
  items: CareItem[],
  selectedDate: Date,
  viewMode: DateViewMode
): CareItem[] {
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);

  // 週・月の範囲を設定
  if (viewMode === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else if (viewMode === 'month') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  return items.filter((item) => {
    // スケジュールがある場合はスケジュールでチェック
    if (item.servingSchedule) {
      // 範囲内の日付をチェック
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (isScheduledForDate(item.servingSchedule, d)) {
          return true;
        }
      }
      return false;
    }

    // スケジュールがない場合は送付日でチェック
    const sentDate = new Date(item.sentDate);
    sentDate.setHours(0, 0, 0, 0);
    return sentDate >= start && sentDate <= end;
  });
}

export function ItemManagement() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<DateViewMode>('day');
  const [unscheduledPeriod, setUnscheduledPeriod] = useState(2);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showUnscheduledModal, setShowUnscheduledModal] = useState(false);
  const isDemo = useDemoMode();
  const navigate = useNavigate();

  // デモモード対応: リンク先プレフィックス
  const pathPrefix = isDemo ? '/demo' : '';

  // 品物一覧を取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
  });

  // 期限切れ品物を取得
  const { expiredItems, isLoading: isExpiredLoading } = useExpiredItems(DEMO_RESIDENT_ID);

  // スキップ日管理
  const {
    skipDateStrings,
    addSkipDate,
    isAdding: isSkipDateAdding,
  } = useSkipDateManager(DEMO_RESIDENT_ID);

  const deleteItem = useDeleteCareItem();

  // 日付範囲でフィルタリング
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return filterItemsByDateRange(data.items, selectedDate, viewMode);
  }, [data?.items, selectedDate, viewMode]);

  // 未設定日を算出（アクティブな品物のみ対象）
  const unscheduledDates = useMemo(() => {
    if (!data?.items) return [];
    const activeItems = data.items.filter(
      (item) => item.status === 'pending' || item.status === 'in_progress'
    );
    return getUnscheduledDates(activeItems, skipDateStrings, unscheduledPeriod);
  }, [data?.items, skipDateStrings, unscheduledPeriod]);

  // 未設定日クリック → 品物登録画面へ
  const handleUnscheduledDateClick = (date: string) => {
    navigate(`${pathPrefix}/family/items/new?date=${date}`);
    setShowUnscheduledModal(false);
  };

  // 「提供なし」設定
  const handleMarkAsSkip = async (date: string) => {
    await addSkipDate(date, '家族により提供なしに設定');
  };

  // 削除確認
  const handleDeleteConfirm = (itemId: string) => {
    setShowDeleteConfirm(itemId);
  };

  // 削除処理
  const handleDelete = async (itemId: string) => {
    if (isDemo) {
      alert('削除しました（デモモード - 実際には削除されません）');
      setShowDeleteConfirm(null);
      return;
    }

    try {
      await deleteItem.mutateAsync(itemId);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('削除に失敗しました');
    }
  };

  return (
    <Layout title="品物管理" showBackButton>
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>📦</span>
            品物管理
          </h1>
          <div className="flex items-center gap-2">
            <Link
              to={`${pathPrefix}/family/presets`}
              className="px-3 py-2 border border-primary text-primary rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-primary/5 transition-colors"
            >
              <span>⭐</span>
              <span className="hidden sm:inline">いつもの指示</span>
            </Link>
            <Link
              to={`${pathPrefix}/family/items/new`}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm"
            >
              + 新規登録
            </Link>
          </div>
        </div>
      </div>

      {/* 期限切れアラート */}
      <ExpirationAlert
        expiredItems={expiredItems}
        isLoading={isExpiredLoading}
      />

      {/* 未設定日サジェスト通知 */}
      <UnscheduledDatesBanner
        unscheduledDates={unscheduledDates}
        onDateClick={handleUnscheduledDateClick}
        onMarkAsSkip={handleMarkAsSkip}
        onShowAll={() => setShowUnscheduledModal(true)}
        onPeriodChange={setUnscheduledPeriod}
        currentPeriod={unscheduledPeriod}
      />

      {/* 日付ナビゲーション */}
      <DateNavigator
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            エラーが発生しました: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-500 mb-4">
              この期間に該当する品物はありません
            </p>
            <Link
              to={`${pathPrefix}/family/items/new`}
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium"
            >
              品物を登録する
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onDelete={() => handleDeleteConfirm(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">品物を削除しますか？</h3>
            <p className="text-gray-600 mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg"
                disabled={deleteItem.isPending}
              >
                {deleteItem.isPending ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未設定日一覧モーダル */}
      <UnscheduledDatesModal
        isOpen={showUnscheduledModal}
        onClose={() => setShowUnscheduledModal(false)}
        unscheduledDates={unscheduledDates}
        onDateClick={handleUnscheduledDateClick}
        onMarkAsSkip={handleMarkAsSkip}
        isSkipping={isSkipDateAdding}
      />
    </Layout>
  );
}

/**
 * 品物カードコンポーネント
 */
function ItemCard({ item, onDelete }: { item: CareItem; onDelete: () => void }) {
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';
  const statusColor = getStatusColorClass(item.status);
  const categoryIcon = getCategoryIcon(item.category);
  const hasExpiration = !!item.expirationDate;
  const daysUntilExpiration = hasExpiration ? getDaysUntilExpiration(item.expirationDate!) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  return (
    <Link
      to={`${pathPrefix}/family/items/${item.id}`}
      className="block bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{categoryIcon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-base truncate">{item.itemName}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor.bgColor} ${statusColor.color}`}>
              {getStatusLabel(item.status)}
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-0.5">
            <div className="flex gap-4">
              <span>送付: {formatDate(item.sentDate)}</span>
              <span>残: {item.remainingQuantity}{item.unit}</span>
            </div>

            {hasExpiration && (
              <div className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : ''}`}>
                <span>期限:</span>
                <span className="font-medium">{getExpirationDisplayText(item.expirationDate!)}</span>
                {isExpiringSoon && !isExpired && <span>⚠️</span>}
                {isExpired && <span>❌</span>}
              </div>
            )}

            {item.servingMethod && item.servingMethod !== 'as_is' && (
              <div className="text-gray-500">
                提供方法: {item.servingMethodDetail || item.servingMethod}
              </div>
            )}
          </div>

          {item.noteToFamily && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
              <span className="font-medium">スタッフより:</span> {item.noteToFamily}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          aria-label="削除"
        >
          🗑️
        </button>
      </div>

      {item.status === 'consumed' && item.consumptionRate !== undefined && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">摂食:</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${item.consumptionRate}%` }}
              />
            </div>
            <span className="text-sm font-medium">{item.consumptionRate}%</span>
          </div>
        </div>
      )}
    </Link>
  );
}

export default ItemManagement;
