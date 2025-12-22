/**
 * 品物管理ページ（家族用）
 * @see docs/ITEM_MANAGEMENT_SPEC.md
 * Phase 38: 日付範囲タブ・未設定日通知追加
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems, useDeleteCareItem } from '../../hooks/useCareItems';
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
import type { CareItem, ItemStatus } from '../../types/careItem';
import type { DateRangeType, SchedulePatternType } from '../../types/skipDate';
import { DateRangeTabs } from '../../components/family/DateRangeTabs';
import { UnscheduledDatesBanner } from '../../components/family/UnscheduledDatesBanner';
import { UnscheduledDatesModal } from '../../components/family/UnscheduledDatesModal';
import {
  getUnscheduledDates,
  filterItemsByDateRangeAndPattern,
} from '../../utils/scheduleUtils';

// デモ用の入居者ID・ユーザーID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

export function ItemManagement() {
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [schedulePattern, setSchedulePattern] = useState<SchedulePatternType>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showUnscheduledModal, setShowUnscheduledModal] = useState(false);
  const isDemo = useDemoMode();
  const navigate = useNavigate();

  // デモモード対応: リンク先プレフィックス
  const pathPrefix = isDemo ? '/demo' : '';

  // 品物一覧を取得（ステータスフィルタはAPI側で処理）
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // スキップ日管理
  const {
    skipDateStrings,
    addSkipDate,
    isAdding: isSkipDateAdding,
  } = useSkipDateManager(DEMO_RESIDENT_ID);

  const deleteItem = useDeleteCareItem();

  // 日付範囲・パターンでフィルタリング
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return filterItemsByDateRangeAndPattern(data.items, dateRange, schedulePattern);
  }, [data?.items, dateRange, schedulePattern]);

  // 未設定日を算出（アクティブな品物のみ対象）
  const unscheduledDates = useMemo(() => {
    if (!data?.items) return [];
    const activeItems = data.items.filter(
      (item) => item.status === 'pending' || item.status === 'in_progress'
    );
    return getUnscheduledDates(activeItems, skipDateStrings, 2);
  }, [data?.items, skipDateStrings]);

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
  // @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作
  const handleDelete = async (itemId: string) => {
    // デモモードの場合: APIを呼ばず、成功メッセージを表示
    if (isDemo) {
      alert('削除しました（デモモード - 実際には削除されません）');
      setShowDeleteConfirm(null);
      return;
    }

    // 本番モードの場合: 通常通りAPI呼び出し
    try {
      await deleteItem.mutateAsync(itemId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('削除に失敗しました');
    }
  };

  // フィルタタブ
  const filterTabs: { value: ItemStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全て' },
    { value: 'pending', label: '未提供' },
    { value: 'served', label: '提供済み' },
    { value: 'consumed', label: '消費済み' },
  ];

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
            {/* いつもの指示ボタン: モバイルではアイコンのみ */}
            <Link
              to={`${pathPrefix}/family/presets`}
              className="px-3 py-2 border border-primary text-primary rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-primary/5 transition-colors"
            >
              <span>⭐</span>
              <span className="hidden sm:inline">いつもの指示</span>
            </Link>
            {/* 新規登録ボタン */}
            <Link
              to={`${pathPrefix}/family/items/new`}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm"
            >
              + 新規登録
            </Link>
          </div>
        </div>

        {/* ステータスフィルタタブ */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 日付範囲 + パターン フィルタ */}
      <DateRangeTabs
        dateRange={dateRange}
        schedulePattern={schedulePattern}
        onDateRangeChange={setDateRange}
        onSchedulePatternChange={setSchedulePattern}
      />

      {/* 未設定日サジェスト通知 */}
      <UnscheduledDatesBanner
        unscheduledDates={unscheduledDates}
        onDateClick={handleUnscheduledDateClick}
        onMarkAsSkip={handleMarkAsSkip}
        onShowAll={() => setShowUnscheduledModal(true)}
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
              {dateRange !== 'all' || schedulePattern !== 'all'
                ? '該当する品物はありません'
                : statusFilter === 'all'
                  ? '登録された品物はありません'
                  : `${filterTabs.find(t => t.value === statusFilter)?.label}の品物はありません`}
            </p>
            {dateRange !== 'all' || schedulePattern !== 'all' ? (
              <button
                onClick={() => {
                  setDateRange('all');
                  setSchedulePattern('all');
                }}
                className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                フィルタをリセット
              </button>
            ) : (
              <Link
                to={`${pathPrefix}/family/items/new`}
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-medium"
              >
                品物を登録する
              </Link>
            )}
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
        {/* カテゴリアイコン */}
        <div className="text-3xl flex-shrink-0">{categoryIcon}</div>

        {/* メイン情報 */}
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

          {/* 申し送り表示 */}
          {item.noteToFamily && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
              <span className="font-medium">スタッフより:</span> {item.noteToFamily}
            </div>
          )}
        </div>

        {/* 削除ボタン */}
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

      {/* 摂食結果（消費済みの場合） */}
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
