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

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  STORAGE_METHOD_LABELS,
  formatRemainingHandlingWithConditions,
} from '../../types/careItem';
import type { CareItem } from '../../types/careItem';
import { ExpirationAlert } from '../../components/family/ExpirationAlert';
import { DateNavigator, type DateViewMode } from '../../components/family/DateNavigator';
import { UnscheduledDatesBanner } from '../../components/family/UnscheduledDatesBanner';
import { UnscheduledDatesModal } from '../../components/family/UnscheduledDatesModal';
import { getUnscheduledDates, isScheduledForDate, formatScheduleShort, type ScheduleTypeExclusion } from '../../utils/scheduleUtils';

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
  // URL同期用
  const [searchParams, setSearchParams] = useSearchParams();

  // URLから初期値を取得
  const initialPeriod = Number(searchParams.get('period')) || 2;
  const initialExD = searchParams.get('exD') === '1';
  const initialExW = searchParams.get('exW') === '1';
  const initialExp = searchParams.get('exp') === '1';

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<DateViewMode>('week');
  const [unscheduledPeriod, setUnscheduledPeriod] = useState(initialPeriod);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showUnscheduledModal, setShowUnscheduledModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CareItem | null>(null);
  // スケジュールタイプ除外トグル（URLから初期化）
  const [excludeDaily, setExcludeDaily] = useState(initialExD);
  const [excludeWeekly, setExcludeWeekly] = useState(initialExW);
  // 詳細展開状態（URLから初期化）
  const [isExpanded, setIsExpanded] = useState(initialExp);

  const isDemo = useDemoMode();
  const navigate = useNavigate();

  // URL更新ヘルパー（フィルター状態をURLに同期）
  const updateUrlParams = useCallback((updates: Record<string, string>) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      Object.entries(updates).forEach(([key, val]) => {
        if (val === '0' || val === '') {
          newParams.delete(key);  // デフォルト値は削除してURLを短く
        } else {
          newParams.set(key, val);
        }
      });
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  // 現在のフィルター状態を含むURL（returnUrl用）
  const currentFilterUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (unscheduledPeriod !== 2) params.set('period', String(unscheduledPeriod));
    if (excludeDaily) params.set('exD', '1');
    if (excludeWeekly) params.set('exW', '1');
    if (isExpanded) params.set('exp', '1');
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }, [unscheduledPeriod, excludeDaily, excludeWeekly, isExpanded]);

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

  // スケジュールタイプ除外オプション
  const scheduleExclusion: ScheduleTypeExclusion = useMemo(() => ({
    excludeDaily,
    excludeWeekly,
  }), [excludeDaily, excludeWeekly]);

  // 未設定日を算出（アクティブな品物のみ対象）
  const unscheduledDates = useMemo(() => {
    if (!data?.items) return [];
    const activeItems = data.items.filter(
      (item) => item.status === 'pending' || item.status === 'in_progress'
    );
    return getUnscheduledDates(activeItems, skipDateStrings, unscheduledPeriod, scheduleExclusion);
  }, [data?.items, skipDateStrings, unscheduledPeriod, scheduleExclusion]);

  // フィルター変更ハンドラー（URL同期付き）
  const handlePeriodChange = useCallback((period: number) => {
    setUnscheduledPeriod(period);
    updateUrlParams({ period: period === 2 ? '0' : String(period) });
  }, [updateUrlParams]);

  const handleExcludeDailyChange = useCallback((value: boolean) => {
    setExcludeDaily(value);
    updateUrlParams({ exD: value ? '1' : '0' });
  }, [updateUrlParams]);

  const handleExcludeWeeklyChange = useCallback((value: boolean) => {
    setExcludeWeekly(value);
    updateUrlParams({ exW: value ? '1' : '0' });
  }, [updateUrlParams]);

  const handleExpandChange = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
    updateUrlParams({ exp: expanded ? '1' : '0' });
  }, [updateUrlParams]);

  // 未設定日クリック → 品物登録画面へ（returnUrl付き）
  const handleUnscheduledDateClick = (date: string) => {
    const returnUrl = encodeURIComponent(`${pathPrefix}/family/items${currentFilterUrl}`);
    navigate(`${pathPrefix}/family/items/new?date=${date}&returnUrl=${returnUrl}`);
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
      <div className="bg-white border-b z-10">
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
              to={`${pathPrefix}/family/items/new?returnUrl=${encodeURIComponent(`${pathPrefix}/family/items${currentFilterUrl}`)}`}
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
        onPeriodChange={handlePeriodChange}
        currentPeriod={unscheduledPeriod}
        excludeDaily={excludeDaily}
        excludeWeekly={excludeWeekly}
        onExcludeDailyChange={handleExcludeDailyChange}
        onExcludeWeeklyChange={handleExcludeWeeklyChange}
        isExpanded={isExpanded}
        onExpandChange={handleExpandChange}
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
              to={`${pathPrefix}/family/items/new?returnUrl=${encodeURIComponent(`${pathPrefix}/family/items${currentFilterUrl}`)}`}
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
                onEdit={() => navigate(`${pathPrefix}/family/items/${item.id}/edit`)}
                onShowDetail={() => setSelectedItem(item)}
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

      {/* 品物詳細モーダル */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={() => {
            setSelectedItem(null);
            navigate(`${pathPrefix}/family/items/${selectedItem.id}/edit`);
          }}
          onDelete={() => {
            setSelectedItem(null);
            handleDeleteConfirm(selectedItem.id);
          }}
        />
      )}
    </Layout>
  );
}

/**
 * 品物カードコンポーネント
 * 表示優先順: 提供予定 → 賞味期限 → 残量・保存 → 詳細設定
 */
function ItemCard({ item, onDelete, onEdit, onShowDetail }: {
  item: CareItem;
  onDelete: () => void;
  onEdit: () => void;
  onShowDetail: () => void;
}) {
  const statusColor = getStatusColorClass(item.status);
  const categoryIcon = getCategoryIcon(item.category);
  const hasExpiration = !!item.expirationDate;
  const daysUntilExpiration = hasExpiration ? getDaysUntilExpiration(item.expirationDate!) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  // 提供スケジュールの短縮表示
  const scheduleDisplay = formatScheduleShort(item.servingSchedule);

  return (
    <div
      data-testid="item-card"
      onClick={onShowDetail}
      className="block bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
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
            {/* 提供予定（最優先）- 未設定時は警告表示 */}
            {scheduleDisplay ? (
              <div className="text-blue-600 font-medium">
                {scheduleDisplay}
              </div>
            ) : (
              <div className="text-orange-500 font-medium flex items-center gap-1">
                <span>📅 提供予定:</span>
                <span className="bg-orange-100 px-1.5 py-0.5 rounded text-xs">⚠️ 未設定</span>
              </div>
            )}

            {/* 賞味期限 - 未設定時は警告表示 */}
            {hasExpiration ? (
              <div className={`flex items-center gap-1 ${isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : ''}`}>
                <span>🗓️ 期限:</span>
                <span>{getExpirationDisplayText(item.expirationDate!)}</span>
                {isExpiringSoon && !isExpired && <span>⚠️</span>}
                {isExpired && <span>❌</span>}
              </div>
            ) : (
              <div className="text-orange-500 flex items-center gap-1">
                <span>🗓️ 賞味期限:</span>
                <span className="bg-orange-100 px-1.5 py-0.5 rounded text-xs">⚠️ 未設定</span>
              </div>
            )}

            {/* 残量・保存方法 */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-500">
              <span>残: {item.remainingQuantity}{item.unit}</span>
              {item.storageMethod && (
                <span>🧊 {STORAGE_METHOD_LABELS[item.storageMethod]}</span>
              )}
            </div>

            {/* 提供方法 */}
            {item.servingMethod && item.servingMethod !== 'as_is' && (
              <div className="text-gray-500">
                ✂️ {item.servingMethodDetail || item.servingMethod}
              </div>
            )}

            {/* スタッフへの申し送り（短縮表示） */}
            {item.noteToStaff && (
              <div className="text-gray-500 truncate">
                📝 {item.noteToStaff.length > 30 ? item.noteToStaff.slice(0, 30) + '...' : item.noteToStaff}
              </div>
            )}
          </div>

          {/* スタッフからの連絡 */}
          {item.noteToFamily && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-700">
              <span className="font-medium">スタッフより:</span> {item.noteToFamily}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
            aria-label="編集"
          >
            ✏️
          </button>
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
    </div>
  );
}

/**
 * 品物詳細モーダルコンポーネント
 * ページ遷移せずにSPA的に詳細を表示
 */
function ItemDetailModal({ item, onClose, onEdit, onDelete }: {
  item: CareItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusColor = getStatusColorClass(item.status);
  const categoryIcon = getCategoryIcon(item.category);
  const hasExpiration = !!item.expirationDate;
  const daysUntilExpiration = hasExpiration ? getDaysUntilExpiration(item.expirationDate!) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  // 提供スケジュールの表示
  const scheduleDisplay = formatScheduleShort(item.servingSchedule);

  // 在庫計算
  const initialQty = item.quantity || 1;
  const remainingQty = item.remainingQuantity || 0;
  const consumedPercent = ((initialQty - remainingQty) / initialQty) * 100;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        data-testid="item-detail-modal"
        className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{categoryIcon}</span>
            <div>
              <h2 className="font-bold text-lg">{item.itemName}</h2>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColor.bgColor} ${statusColor.color}`}>
                {getStatusLabel(item.status)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* 在庫バー */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">残量</span>
              <span className="font-bold">{remainingQty}{item.unit} / {initialQty}{item.unit}</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  consumedPercent >= 80 ? 'bg-red-500' :
                  consumedPercent >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${100 - consumedPercent}%` }}
              />
            </div>
          </div>

          {/* 主要情報 */}
          <div className="space-y-3">
            {/* 提供予定 - 未設定時は警告表示 */}
            {scheduleDisplay ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-xl">📅</span>
                <div>
                  <div className="text-sm text-gray-500">提供予定</div>
                  <div className="font-medium text-blue-700">{scheduleDisplay}</div>
                  {item.servingSchedule?.note && (
                    <div className="text-sm text-gray-600 mt-1">{item.servingSchedule.note}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-xl">📅</span>
                <div className="flex-1">
                  <div className="text-sm text-gray-500">提供予定</div>
                  <div className="font-medium text-orange-600 flex items-center gap-2">
                    <span>⚠️ 未設定</span>
                    <span className="text-xs text-gray-500">（編集から設定できます）</span>
                  </div>
                </div>
              </div>
            )}

            {/* 賞味期限 - 未設定時は警告表示 */}
            {hasExpiration ? (
              <div className={`flex items-start gap-3 p-3 rounded-lg ${
                isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <span className="text-xl">🗓️</span>
                <div>
                  <div className="text-sm text-gray-500">賞味期限</div>
                  <div className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : ''}`}>
                    {formatDate(item.expirationDate!)}
                    {isExpired ? ' (期限切れ) ❌' :
                     daysUntilExpiration === 0 ? ' (今日) ⚠️' :
                     isExpiringSoon ? ` (あと${daysUntilExpiration}日) ⚠️` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <span className="text-xl">🗓️</span>
                <div className="flex-1">
                  <div className="text-sm text-gray-500">賞味期限</div>
                  <div className="font-medium text-orange-600 flex items-center gap-2">
                    <span>⚠️ 未設定</span>
                    <span className="text-xs text-gray-500">（不明な場合は空欄でOK）</span>
                  </div>
                </div>
              </div>
            )}

            {/* 保存方法 */}
            {item.storageMethod && (
              <div className="flex items-center gap-3 py-2 border-b">
                <span className="text-lg">🧊</span>
                <span className="text-gray-500">保存方法</span>
                <span className="ml-auto font-medium">{STORAGE_METHOD_LABELS[item.storageMethod]}</span>
              </div>
            )}

            {/* 提供方法 */}
            {item.servingMethod && item.servingMethod !== 'as_is' && (
              <div className="flex items-start gap-3 py-2 border-b">
                <span className="text-lg">✂️</span>
                <div className="flex-1">
                  <span className="text-gray-500">提供方法</span>
                  <div className="font-medium">{item.servingMethodDetail || item.servingMethod}</div>
                </div>
              </div>
            )}

            {/* 送付日 */}
            <div className="flex items-center gap-3 py-2 border-b">
              <span className="text-lg">📦</span>
              <span className="text-gray-500">送付日</span>
              <span className="ml-auto">{formatDate(item.sentDate)}</span>
            </div>

            {/* スタッフへの申し送り */}
            {item.noteToStaff && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span>📝</span>
                  <span>スタッフへの申し送り</span>
                </div>
                <div className="text-sm">{item.noteToStaff}</div>
              </div>
            )}

            {/* スタッフからの連絡 */}
            {item.noteToFamily && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                  <span>💬</span>
                  <span>スタッフより</span>
                </div>
                <div className="text-sm text-blue-700">{item.noteToFamily}</div>
              </div>
            )}

            {/* 残った場合の処置 */}
            {item.remainingHandlingInstruction && (
              <div className="flex items-center gap-3 py-2 border-b">
                <span className="text-lg">🍽️</span>
                <span className="text-gray-500">残った場合</span>
                <span className="ml-auto font-medium">
                  {formatRemainingHandlingWithConditions(item.remainingHandlingInstruction, item.remainingHandlingConditions)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* フッター（アクションボタン） */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
          >
            ✏️ 編集
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export default ItemManagement;
