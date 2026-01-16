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
import { useConsumptionLogs } from '../../hooks/useConsumptionLogs';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useSkipDateManager } from '../../hooks/useSkipDates';
import {
  getStatusLabel,
  getStatusColorClass,
  getDaysUntilExpiration,
  getServingMethodLabel,
  getStorageLabel,
  formatRemainingHandlingWithConditions,
  getServingTimeSlotOrder,
} from '../../types/careItem';
import type { CareItem } from '../../types/careItem';
import { isQuantitySkipped } from '../../types/careItem';
import { ExpirationAlert } from '../../components/family/ExpirationAlert';
import { DateNavigator, type DateViewMode } from '../../components/family/DateNavigator';
import { UnscheduledDatesBanner } from '../../components/family/UnscheduledDatesBanner';
import { UnscheduledDatesModal } from '../../components/family/UnscheduledDatesModal';
import { ScheduleDisplay } from '../../components/meal/ScheduleDisplay';
import { getUnscheduledDates, isScheduledForDate, getMissedScheduleItems, type ScheduleTypeExclusion } from '../../utils/scheduleUtils';

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

  let end = new Date(selectedDate);
  end.setHours(23, 59, 59, 999);

  // 週・月の範囲を設定
  if (viewMode === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    // endもstartをベースに計算（月をまたぐ場合の誤計算を防止）
    end = new Date(start);
    end.setDate(end.getDate() + 6);
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

    // 後方互換: plannedServeDate がある場合はそれでチェック
    if (item.plannedServeDate) {
      const plannedDate = new Date(item.plannedServeDate);
      plannedDate.setHours(0, 0, 0, 0);
      return plannedDate >= start && plannedDate <= end;
    }

    // スケジュールがない場合は登録日でチェック
    const createdDate = new Date(item.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    return createdDate >= start && createdDate <= end;
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

  // 提供漏れ品物を算出
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- React Compiler最適化スキップ許容
  const missedScheduleItems = useMemo(() => {
    if (!data?.items) return [];
    return getMissedScheduleItems(data.items);
  }, [data?.items]);

  // スキップ日管理
  const {
    skipDateStrings,
    addSkipDate,
    isAdding: isSkipDateAdding,
  } = useSkipDateManager(DEMO_RESIDENT_ID);

  const deleteItem = useDeleteCareItem();

  // 日付範囲でフィルタリング + 提供タイミング順でソート
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- React Compiler最適化スキップ許容
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const filtered = filterItemsByDateRange(data.items, selectedDate, viewMode);
    // 提供タイミング順でソート（朝食時 → 昼食時 → おやつ時 → 夕食時 → いつでも）
    return filtered.sort((a, b) => {
      const timingDiff = getServingTimeSlotOrder(a) - getServingTimeSlotOrder(b);
      if (timingDiff !== 0) return timingDiff;
      // 同じタイミングなら期限順
      if (a.expirationDate && b.expirationDate) {
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      }
      if (a.expirationDate) return -1;
      if (b.expirationDate) return 1;
      return 0;
    });
  }, [data?.items, selectedDate, viewMode]);

  // スケジュールタイプ除外オプション
  const scheduleExclusion: ScheduleTypeExclusion = useMemo(() => ({
    excludeDaily,
    excludeWeekly,
  }), [excludeDaily, excludeWeekly]);

  // 未設定日を算出（アクティブな品物のみ対象）
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- React Compiler最適化スキップ許容
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
              to={`${pathPrefix}/family/items/bulk-import`}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm flex items-center gap-1 hover:bg-gray-50 transition-colors"
            >
              <span>📥</span>
              <span className="hidden sm:inline">一括登録</span>
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

      {/* 提供漏れアラート */}
      <MissedScheduleAlert
        missedItems={missedScheduleItems}
        onEdit={(itemId) => navigate(`${pathPrefix}/family/items/${itemId}/edit`)}
        onShowDetail={(item) => setSelectedItem(item)}
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
          selectedDate={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
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
 * スタッフ用カード（ItemBasedSnackRecord.tsx）と同じ表示形式
 */
function ItemCard({ item, onDelete, onEdit, onShowDetail }: {
  item: CareItem;
  onDelete: () => void;
  onEdit: () => void;
  onShowDetail: () => void;
}) {
  const statusColor = getStatusColorClass(item.status);
  const daysUntilExpiration = item.expirationDate ? getDaysUntilExpiration(item.expirationDate) : null;
  const skipQuantity = isQuantitySkipped(item);
  const currentQty = skipQuantity ? undefined : (item.remainingQuantity ?? item.quantity ?? 0);

  return (
    <div
      data-testid="item-card"
      onClick={onShowDetail}
      className="block bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* ヘッダー行: 品物名・ステータス */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800">{item.itemName}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor.bgColor} ${statusColor.color}`}>
              {getStatusLabel(item.status)}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600 space-y-1">
            {/* 残量・期限情報（スタッフ用カードと同じ形式） */}
            <div className="flex items-center gap-2">
              {skipQuantity ? (
                // 数量管理なし品物: 提供記録がある場合は「提供済み」と表示
                // consumptionSummary.totalServed > 0 で判定（statusに依存しない）
                (item.consumptionSummary?.totalServed ?? 0) > 0 ? (
                  <span className="text-gray-500 font-medium">提供済み</span>
                ) : (
                  <span className="text-green-600 font-medium">在庫あり</span>
                )
              ) : (
                <span>残り {currentQty}{item.unit}</span>
              )}
              <span className="text-gray-300">┃</span>
              {item.expirationDate ? (
                <span className={
                  daysUntilExpiration !== null && daysUntilExpiration < 0
                    ? 'text-red-600 font-medium'
                    : daysUntilExpiration !== null && daysUntilExpiration <= 3
                      ? 'text-orange-600 font-medium'
                      : ''
                }>
                  期限 {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  {daysUntilExpiration !== null && daysUntilExpiration < 0 && ` (${Math.abs(daysUntilExpiration)}日超過)`}
                  {daysUntilExpiration !== null && daysUntilExpiration >= 0 && daysUntilExpiration <= 3 && ` (あと${daysUntilExpiration}日)`}
                </span>
              ) : (
                <span className="text-gray-400">期限なし</span>
              )}
            </div>

            {/* スケジュール表示（スタッフ用カードと同じScheduleDisplayコンポーネント使用） */}
            {item.servingSchedule ? (
              <ScheduleDisplay schedule={item.servingSchedule} compact />
            ) : item.plannedServeDate ? (
              <div className="flex items-center gap-1 text-blue-600">
                <span>📅</span>
                <span>
                  {new Date(item.plannedServeDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </span>
              </div>
            ) : null}

            {/* 提供方法・保存方法・残り処置（スタッフ用カードと同じタグバッジ形式） */}
            <div className="flex flex-wrap gap-2 mt-2">
              {item.servingMethod && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  🍽️ {getServingMethodLabel(item.servingMethod)}
                  {item.servingMethodDetail && `: ${item.servingMethodDetail}`}
                </span>
              )}
              {item.storageMethod && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  📦 {getStorageLabel(item.storageMethod)}
                </span>
              )}
              {item.remainingHandlingInstruction && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                  🔄 残り: {formatRemainingHandlingWithConditions(item.remainingHandlingInstruction, item.remainingHandlingConditions)}
                </span>
              )}
            </div>

            {/* 家族指示（スタッフ用カードと同じ形式） */}
            {item.noteToStaff && (
              <div className="flex items-start gap-1 text-gray-600 mt-2">
                <span>💬</span>
                <span className="italic">「{item.noteToStaff}」</span>
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

        {/* 編集・削除ボタン */}
        <div className="flex flex-col gap-1 ml-4">
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

      {/* 摂食状況バー（消費済みの場合） */}
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
 * スタッフ用カード（ItemBasedSnackRecord.tsx）と同じ表示形式
 */
function ItemDetailModal({ item, onClose, onEdit, onDelete, selectedDate }: {
  item: CareItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  selectedDate: string; // YYYY-MM-DD形式
}) {
  const statusColor = getStatusColorClass(item.status);
  const daysUntilExpiration = item.expirationDate ? getDaysUntilExpiration(item.expirationDate) : null;
  const skipQuantity = isQuantitySkipped(item);
  const currentQty = skipQuantity ? undefined : (item.remainingQuantity ?? item.quantity ?? 0);
  const initialQty = skipQuantity ? 1 : (item.quantity ?? 1);

  // 選択日の消費ログを取得
  const { data: logsData, isLoading: isLogsLoading } = useConsumptionLogs({
    itemId: item.id,
    startDate: selectedDate,
    endDate: selectedDate,
  });

  // 選択日の摂食率を計算（加重平均：総消費量/総提供量）
  const dateConsumptionRate = useMemo(() => {
    if (!logsData?.logs || logsData.logs.length === 0) return null;
    // 加重平均: sum(consumedQuantity) / sum(servedQuantity) * 100
    const totalServed = logsData.logs.reduce((sum, log) => sum + log.servedQuantity, 0);
    const totalConsumed = logsData.logs.reduce((sum, log) => sum + log.consumedQuantity, 0);
    if (totalServed === 0) return 0;
    return Math.round((totalConsumed / totalServed) * 100);
  }, [logsData]);

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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-lg">{item.itemName}</h2>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor.bgColor} ${statusColor.color}`}>
              {getStatusLabel(item.status)}
            </span>
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
          {/* 残量・期限（スタッフ用カードと同じ形式） */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {skipQuantity ? (
              // 数量管理なし品物: 提供記録がある場合は「提供済み」と表示
              // consumptionSummary.totalServed > 0 で判定（statusに依存しない）
              (item.consumptionSummary?.totalServed ?? 0) > 0 ? (
                <span className="text-gray-500 font-medium">提供済み</span>
              ) : (
                <span className="text-green-600 font-medium">在庫あり</span>
              )
            ) : (
              <span className="font-medium">残り {currentQty}{item.unit}</span>
            )}
            <span className="text-gray-300">┃</span>
            {item.expirationDate ? (
              <span className={
                daysUntilExpiration !== null && daysUntilExpiration < 0
                  ? 'text-red-600 font-medium'
                  : daysUntilExpiration !== null && daysUntilExpiration <= 3
                    ? 'text-orange-600 font-medium'
                    : ''
              }>
                期限 {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                {daysUntilExpiration !== null && daysUntilExpiration < 0 && ` (${Math.abs(daysUntilExpiration)}日超過)`}
                {daysUntilExpiration !== null && daysUntilExpiration >= 0 && daysUntilExpiration <= 3 && ` (あと${daysUntilExpiration}日)`}
              </span>
            ) : (
              <span className="text-gray-400">期限なし</span>
            )}
          </div>

          {/* 在庫バー（数量管理する品物のみ表示） */}
          {!skipQuantity && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>消費</span>
                <span>{currentQty}{item.unit} / {initialQty}{item.unit}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${((currentQty ?? 0) / initialQty) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* スケジュール表示（スタッフ用カードと同じScheduleDisplayコンポーネント使用） */}
          {item.servingSchedule ? (
            <div className="p-3 bg-blue-50 rounded-lg">
              <ScheduleDisplay schedule={item.servingSchedule} />
              {item.servingSchedule.note && (
                <div className="text-sm text-gray-600 mt-2">{item.servingSchedule.note}</div>
              )}
            </div>
          ) : item.plannedServeDate ? (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-1 text-blue-600">
                <span>📅</span>
                <span className="font-medium">
                  {new Date(item.plannedServeDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </span>
              </div>
            </div>
          ) : null}

          {/* 提供方法・保存方法・残り処置（スタッフ用カードと同じタグバッジ形式） */}
          <div className="flex flex-wrap gap-2">
            {item.servingMethod && (
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">
                🍽️ {getServingMethodLabel(item.servingMethod)}
                {item.servingMethodDetail && `: ${item.servingMethodDetail}`}
              </span>
            )}
            {item.storageMethod && (
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-lg">
                📦 {getStorageLabel(item.storageMethod)}
              </span>
            )}
            {item.remainingHandlingInstruction && (
              <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-lg">
                🔄 残り: {formatRemainingHandlingWithConditions(item.remainingHandlingInstruction, item.remainingHandlingConditions)}
              </span>
            )}
          </div>

          {/* 家族指示（スタッフ用カードと同じ形式） */}
          {item.noteToStaff && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-start gap-2">
                <span>💬</span>
                <span className="italic text-gray-700">「{item.noteToStaff}」</span>
              </div>
            </div>
          )}

          {/* スタッフからの連絡 */}
          {item.noteToFamily && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-600 mb-1">
                <span>📨</span>
                <span className="font-medium">スタッフより</span>
              </div>
              <div className="text-sm text-blue-700">{item.noteToFamily}</div>
            </div>
          )}

          {/* 摂食状況（選択日の記録を表示） */}
          {isLogsLoading ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-sm">
                  {new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の摂食:
                </span>
                <span className="text-sm">読み込み中...</span>
              </div>
            </div>
          ) : dateConsumptionRate !== null ? (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の摂食:
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${dateConsumptionRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{dateConsumptionRate}%</span>
              </div>
            </div>
          ) : item.status === 'consumed' || item.status === 'in_progress' ? (
            <div className="p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500">
                <span className="text-sm">
                  {new Date(selectedDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}の摂食:
                </span>
                <span className="text-sm">未記録</span>
              </div>
            </div>
          ) : null}
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

/**
 * 提供漏れアラートコンポーネント
 * スケジュール通りに提供されていない品物を表示
 */
function MissedScheduleAlert({ missedItems, onEdit, onShowDetail }: {
  missedItems: CareItem[];
  onEdit: (itemId: string) => void;
  onShowDetail: (item: CareItem) => void;
}) {
  // 0件の場合は非表示
  if (missedItems.length === 0) {
    return null;
  }

  return (
    <div className="mx-4 mt-3">
      <div className="bg-purple-50 border border-purple-200 rounded-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="px-4 py-2 bg-purple-100 border-b border-purple-200">
          <h2 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
            <span className="text-lg">📢</span>
            提供漏れ（{missedItems.length}件）
          </h2>
          <p className="text-xs text-purple-600 mt-0.5">
            スケジュール通りに提供されていません
          </p>
        </div>

        {/* アイテムリスト */}
        <div className="divide-y divide-purple-100">
          {missedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onShowDetail(item)}
              className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-purple-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {item.category === 'food' ? '🍪' : item.category === 'drink' ? '🧃' : '📦'}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-purple-900 truncate">
                    {item.itemName}
                  </div>
                  <div className="text-xs text-purple-600">
                    {item.servingSchedule && (
                      <ScheduleDisplay schedule={item.servingSchedule} compact />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item.id);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  ✏️ 編集
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowDetail(item);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  詳細
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ItemManagement;
