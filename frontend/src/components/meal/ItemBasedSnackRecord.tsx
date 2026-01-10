/**
 * ItemBasedSnackRecord - 品物起点の間食記録タブ
 * 設計書: docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2
 *
 * Phase 13.0.2で品物リスト表示を実装
 * Phase 13.0.3で記録入力モーダルを実装
 * Phase 13.1で構造化スケジュール対応
 */

import { useMemo, useState } from 'react';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useCareItems, useDiscardItem } from '../../hooks/useCareItems';
import type { CareItem, ItemStatus } from '../../types/careItem';
import {
  getCategoryIcon,
  getServingMethodLabel,
  getStorageLabel,
  formatRemainingHandlingWithConditions,
  getServingTimeSlotOrder,
  isQuantitySkipped,
  migrateCategory,
} from '../../types/careItem';
import { StaffRecordDialog } from '../staff/StaffRecordDialog';
import { getConsumptionLogs } from '../../api';
import type { ConsumptionLog } from '../../types/consumptionLog';
import {
  isScheduledForToday as checkScheduledForToday,
  isScheduledForTomorrow as checkScheduledForTomorrow,
  getTodayString,
  formatDateString,
  isAfter16JST,
} from '../../utils/scheduleUtils';
import { ScheduleDisplay } from './ScheduleDisplay';
import { PastRecordsAccordion } from './PastRecordsAccordion';

// タブの種類
type TabType = 'today' | 'remaining';
// 残り対応サブタブの種類
type RemainingSubTab = 'discarded' | 'stored';

interface ItemBasedSnackRecordProps {
  residentId: string;
  onRecordComplete?: () => void;
}

// ソート優先度の判定ユーティリティ（Phase 13.1: servingSchedule対応）
function isScheduledForToday(item: CareItem): boolean {
  // 新しい構造化スケジュールを優先
  if (item.servingSchedule) {
    return checkScheduledForToday(item.servingSchedule);
  }
  // 後方互換: plannedServeDate のみの場合
  if (!item.plannedServeDate) return false;
  const today = getTodayString();
  return item.plannedServeDate === today;
}

function isScheduledForTomorrow(item: CareItem): boolean {
  // 新しい構造化スケジュールを優先
  if (item.servingSchedule) {
    return checkScheduledForTomorrow(item.servingSchedule);
  }
  // 後方互換: plannedServeDate のみの場合
  if (!item.plannedServeDate) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateString(tomorrow);
  return item.plannedServeDate === tomorrowStr;
}

function isExpired(item: CareItem): boolean {
  if (!item.expirationDate) return false;
  const days = getDaysUntilExpiration(item);
  return days !== null && days < 0;
}

function getDaysUntilExpiration(item: CareItem): number | null {
  if (!item.expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(item.expirationDate);
  expDate.setHours(0, 0, 0, 0);
  return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ローカル日付を YYYY-MM-DD 形式で取得（toISOStringはUTCなので使わない）
function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// 今日記録済みかどうかを判定
function isRecordedToday(item: CareItem): boolean {
  const lastServedDate = item.consumptionSummary?.lastServedDate;
  if (!lastServedDate) return false;
  return lastServedDate === getLocalDateString();
}

// 過去にスケジュールされていたが記録がない（提供漏れ）を判定
// 朝食/昼食/おやつは16時以降にチェック、夕食/いつでもは翌日にチェック
function isMissedSchedule(item: CareItem): boolean {
  if (!item.servingSchedule) return false;

  const schedule = item.servingSchedule;
  const timeSlot = schedule.timeSlot;

  // 今日記録済みなら提供漏れではない
  if (isRecordedToday(item)) return false;

  // 16時以降で朝食/昼食/おやつの場合、今日スケジュールされていれば提供漏れ
  const isEarlyTimeSlot = timeSlot === 'breakfast' || timeSlot === 'lunch' || timeSlot === 'snack';
  if (isAfter16JST() && isEarlyTimeSlot) {
    if (isScheduledForToday(item)) {
      return true;
    }
  } else {
    // 今日スケジュールされている場合は提供漏れではない（従来の動作）
    if (isScheduledForToday(item)) return false;
  }

  // スケジュールタイプ別に判定（過去の日付チェック）
  const todayStr = getLocalDateString();

  // once: 提供予定日が過去で、記録がない
  if (schedule.type === 'once') {
    if (!schedule.date) return false;
    if (schedule.date < todayStr) {
      // 最後の記録日が提供予定日以降でなければ提供漏れ
      const lastServed = item.consumptionSummary?.lastServedDate;
      if (!lastServed) return true;
      if (lastServed < schedule.date) return true;
    }
    return false;
  }

  // specific_dates: 過去の提供予定日に記録がない
  if (schedule.type === 'specific_dates') {
    if (!schedule.dates || schedule.dates.length === 0) return false;
    const pastDates = schedule.dates.filter(d => d < todayStr);
    if (pastDates.length === 0) return false;
    // 最後の記録日が最古の予定日以降でなければ提供漏れ
    const lastServed = item.consumptionSummary?.lastServedDate;
    if (!lastServed) return true;
    const oldestPastDate = pastDates.sort()[0];
    if (lastServed < oldestPastDate) return true;
    return false;
  }

  // daily/weekly: 開始日から3日以上経過して記録がない場合
  if (schedule.type === 'daily' || schedule.type === 'weekly') {
    if (!schedule.startDate) return false;
    const lastServed = item.consumptionSummary?.lastServedDate;
    if (!lastServed) {
      // 一度も記録がない場合、開始日が3日以上前なら提供漏れ
      const startDate = new Date(schedule.startDate);
      startDate.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      if (startDate < threeDaysAgo) {
        return true;
      }
    }
  }

  return false;
}

// 今日提供予定タブ用グループ
type TodayGroup = 'missedSchedule' | 'scheduledToday' | 'recordedToday' | 'other';

function classifyForTodayTab(item: CareItem): TodayGroup {
  // 提供漏れを最優先
  if (isMissedSchedule(item)) return 'missedSchedule';
  // 今日記録済み
  if (isRecordedToday(item)) return 'recordedToday';
  // 今日スケジュール
  if (isScheduledForToday(item)) return 'scheduledToday';
  return 'other';
}

export function ItemBasedSnackRecord({ residentId, onRecordComplete }: ItemBasedSnackRecordProps) {
  const isDemo = useDemoMode();

  // タブ状態（初期: 今日提供予定）
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [remainingSubTab, setRemainingSubTab] = useState<RemainingSubTab>('discarded');

  // モーダル状態
  const [selectedItem, setSelectedItem] = useState<CareItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 編集モード状態（水分記録編集用）
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSheetTimestamp, setEditSheetTimestamp] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<ConsumptionLog | null>(null);

  // 廃棄確認ダイアログ
  const [discardTarget, setDiscardTarget] = useState<CareItem | null>(null);
  const discardMutation = useDiscardItem();

  // 品物取得（pending/in_progress/consumed/discarded）
  // Phase 49: discardedも取得して「破棄済み」タブに表示
  // Phase 58: consumedも取得して今日記録済みのものを「入力済み」として表示
  const { data, isLoading, error, refetch } = useCareItems({
    residentId,
    status: ['pending', 'in_progress', 'consumed', 'discarded'] as ItemStatus[],
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- itemsはdata?.itemsから派生、useMemoで再ラップ不要
  const items = data?.items ?? [];

  // 共通ソート関数（提供タイミング → 期限 → 登録日）
  const sortByTimingAndExpiration = (a: CareItem, b: CareItem) => {
    // 1. 提供タイミング順（朝食時 → 昼食時 → おやつ時 → 夕食時 → いつでも → 未設定）
    const timingDiff = getServingTimeSlotOrder(a) - getServingTimeSlotOrder(b);
    if (timingDiff !== 0) return timingDiff;

    // 2. 期限ありを優先
    if (a.expirationDate && !b.expirationDate) return -1;
    if (!a.expirationDate && b.expirationDate) return 1;

    // 3. 期限順
    if (a.expirationDate && b.expirationDate) {
      const diff = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      if (diff !== 0) return diff;
    }

    // 4. 登録日順（古い順）
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  };

  // 今日提供予定タブ用グループ
  const todayGroups = useMemo(() => {
    const groups: Record<TodayGroup, CareItem[]> = {
      missedSchedule: [],
      scheduledToday: [],
      recordedToday: [],
      other: [],
    };

    items.forEach((item) => {
      // Phase 49: discardedは破棄済みタブにのみ表示
      if (item.status === 'discarded') return;

      // Phase 58: consumedは今日記録されたもののみ表示（過去のものは除外）
      if (item.status === 'consumed' && !isRecordedToday(item)) return;

      const group = classifyForTodayTab(item);
      groups[group].push(item);
    });

    // 全グループを提供タイミング順でソート
    groups.missedSchedule.sort(sortByTimingAndExpiration);
    groups.scheduledToday.sort(sortByTimingAndExpiration);
    groups.recordedToday.sort(sortByTimingAndExpiration);
    groups.other.sort(sortByTimingAndExpiration);

    return groups;
  }, [items]);

  // Phase 42: 残り対応タブ用 - 品物ベースでグループ化
  // 最新の残り対応ログに基づいて品物を分類
  // Phase 49: status === 'discarded' の品物も破棄済みタブに表示
  const remainingItems = useMemo(() => {
    const discarded: CareItem[] = [];
    const stored: CareItem[] = [];
    const discardedIds = new Set<string>(); // 重複防止用

    items.forEach((item) => {
      // Phase 49: status === 'discarded' の品物を追加（期限切れ廃棄など）
      if (item.status === 'discarded') {
        discarded.push(item);
        discardedIds.add(item.id);
        return; // statusがdiscardedならログは見ない
      }

      const logs = item.remainingHandlingLogs ?? [];
      if (logs.length === 0) return;

      // 最新ログを取得（recordedAt降順でソート）
      const sortedLogs = [...logs].sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      );
      const latestLog = sortedLogs[0];

      if (latestLog.handling === 'discarded' && !discardedIds.has(item.id)) {
        discarded.push(item);
      } else if (latestLog.handling === 'stored') {
        stored.push(item);
      }
    });

    // 破棄日時でソート（新しい順）
    discarded.sort((a, b) => {
      const dateA = a.discardedAt || a.updatedAt || '';
      const dateB = b.discardedAt || b.updatedAt || '';
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    return { discarded, stored };
  }, [items]);

  // 各サブタブの品物数
  const discardedCount = remainingItems.discarded.length;
  const storedCount = remainingItems.stored.length;

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        品物を読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="text-4xl mb-4">📦</div>
        <p className="font-medium">在庫のある品物がありません</p>
        <p className="text-sm mt-2">家族が品物を登録すると、ここに表示されます</p>
      </div>
    );
  }

  const handleRecordClick = (item: CareItem) => {
    setSelectedItem(item);
    setIsEditMode(false);
    setEditSheetTimestamp(null);
    setIsModalOpen(true);
  };

  // 編集ボタンクリック時のハンドラ（水分記録編集用）
  const handleEditClick = async (item: CareItem) => {
    try {
      // 最新のconsumption_logを取得
      const logsResponse = await getConsumptionLogs({ itemId: item.id, limit: 1 });
      const latestLog = logsResponse.data?.logs[0];

      if (!latestLog) {
        console.error('編集対象のログが見つかりません');
        return;
      }

      // Firestoreに保存されたsheetTimestampを使用（Sheet A検索用の正確なタイムスタンプ）
      const sheetTimestamp = latestLog.sheetTimestamp || null;

      setSelectedItem(item);
      setIsEditMode(true);
      setEditSheetTimestamp(sheetTimestamp);
      setEditingLog(latestLog);
      setIsModalOpen(true);
    } catch (error) {
      console.error('ログの取得に失敗しました:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setIsEditMode(false);
    setEditSheetTimestamp(null);
    setEditingLog(null);
  };

  const handleRecordSuccess = () => {
    refetch();
    onRecordComplete?.();
  };

  const handleDiscard = async (item: CareItem) => {
    try {
      await discardMutation.mutateAsync({
        itemId: item.id,
        reason: 'スタッフにより廃棄（期限切れ）',
      });
      setDiscardTarget(null);
      refetch();
    } catch (error) {
      console.error('廃棄処理に失敗しました:', error);
    }
  };

  // 過去記録の編集ハンドラ
  const handlePastRecordEdit = (log: ConsumptionLog, item: CareItem) => {
    // Firestoreに保存されたsheetTimestampを使用（Sheet A検索用の正確なタイムスタンプ）
    const sheetTimestamp = log.sheetTimestamp || null;

    setSelectedItem(item);
    setIsEditMode(true);
    setEditSheetTimestamp(sheetTimestamp);
    setEditingLog(log);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 space-y-4">
      {/* タブUI */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'today'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📅 今日提供予定
          {todayGroups.missedSchedule.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              📢{todayGroups.missedSchedule.length}
            </span>
          )}
          {todayGroups.scheduledToday.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              {todayGroups.scheduledToday.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('remaining')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'remaining'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📋 残り対応
          {(discardedCount + storedCount) > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {discardedCount + storedCount}
            </span>
          )}
        </button>
      </div>

      {/* 今日提供予定タブ */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* 提供漏れアラート */}
          {todayGroups.missedSchedule.length > 0 && (
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📢</span>
                <div className="flex-1">
                  <p className="font-bold text-purple-800">
                    提供漏れが {todayGroups.missedSchedule.length}件 あります
                  </p>
                  <p className="text-sm text-purple-600 mt-1">
                    スケジュール通りに提供されていません
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 提供漏れ */}
          {todayGroups.missedSchedule.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
                <span>📢</span>
                提供漏れ
              </h3>
              <div className="space-y-3">
                {todayGroups.missedSchedule.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    highlight={isExpired(item) ? 'expired' : 'missed'}
                    onRecordClick={() => handleRecordClick(item)}
                    onDiscardClick={isExpired(item) ? () => setDiscardTarget(item) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 今日提供予定 */}
          {todayGroups.scheduledToday.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
                <span>⭐</span>
                今日提供予定
              </h3>
              <div className="space-y-3">
                {todayGroups.scheduledToday.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    highlight="today"
                    onRecordClick={() => handleRecordClick(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 入力済み（当日のみ表示） */}
          {todayGroups.recordedToday.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2">
                <span>☑️</span>
                入力済み（本日）
              </h3>
              <div className="space-y-3">
                {todayGroups.recordedToday.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    highlight="recorded"
                    onRecordClick={() => handleRecordClick(item)}
                    // 水分カテゴリの品物のみ編集ボタンを表示
                    onEditClick={migrateCategory(item.category) === 'drink' ? () => handleEditClick(item) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 過去の記録（アコーディオン） */}
          <PastRecordsAccordion
            items={items}
            onEditClick={handlePastRecordEdit}
          />

          {/* その他の品物 */}
          {todayGroups.other.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span>🟢</span>
                その他の品物
              </h3>
              <div className="space-y-3">
                {todayGroups.other.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    highlight="none"
                    onRecordClick={() => handleRecordClick(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {todayGroups.missedSchedule.length === 0 &&
           todayGroups.scheduledToday.length === 0 &&
           todayGroups.recordedToday.length === 0 &&
           todayGroups.other.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-4">📦</div>
              <p className="font-medium">在庫のある品物がありません</p>
            </div>
          )}
        </div>
      )}

      {/* 残り対応タブ（Phase 42） */}
      {activeTab === 'remaining' && (
        <div className="space-y-4">
          {/* サブタブUI */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setRemainingSubTab('discarded')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                remainingSubTab === 'discarded'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🗑️ 破棄済み
              {discardedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {discardedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setRemainingSubTab('stored')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                remainingSubTab === 'stored'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📦 保存済み
              {storedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {storedCount}
                </span>
              )}
            </button>
          </div>

          {/* 破棄済みサブタブ（修正記録用ボタンあり） */}
          {remainingSubTab === 'discarded' && (
            <div className="space-y-3">
              {remainingItems.discarded.length > 0 ? (
                remainingItems.discarded.map((item) => (
                  <RemainingItemCard
                    key={item.id}
                    item={item}
                    type="discarded"
                    showButtons={true}
                    onRecordClick={() => handleRecordClick(item)}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">🗑️</div>
                  <p className="font-medium">破棄済みの品物はありません</p>
                </div>
              )}
            </div>
          )}

          {/* 保存済みサブタブ（提供記録ボタンあり） */}
          {remainingSubTab === 'stored' && (
            <div className="space-y-3">
              {remainingItems.stored.length > 0 ? (
                remainingItems.stored.map((item) => (
                  <RemainingItemCard
                    key={item.id}
                    item={item}
                    type="stored"
                    showButtons={true}
                    onRecordClick={() => handleRecordClick(item)}
                  />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="font-medium">保存済みの品物はありません</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 廃棄確認ダイアログ */}
      {discardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">廃棄確認</h3>
            <p className="text-gray-600 mb-4">
              「{discardTarget.itemName}」を廃棄しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDiscardTarget(null)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDiscard(discardTarget)}
                disabled={discardMutation.isPending}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
              >
                {discardMutation.isPending ? '処理中...' : '廃棄する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 15.3: 統一された提供・摂食記録ダイアログ */}
      {selectedItem && (
        <StaffRecordDialog
          isOpen={isModalOpen}
          onClose={handleModalClose}
          item={selectedItem}
          onSuccess={handleRecordSuccess}
          isDemo={isDemo}
          isEdit={isEditMode}
          existingLog={editingLog || undefined}
          sheetTimestamp={editSheetTimestamp || undefined}
        />
      )}
    </div>
  );
}

// 品物カードコンポーネント
interface ItemCardProps {
  item: CareItem;
  highlight: 'today' | 'expiring' | 'expired' | 'recorded' | 'missed' | 'none';
  onRecordClick: () => void;
  onDiscardClick?: () => void;
  /** 編集ボタンクリック時のハンドラ（水分記録編集用） */
  onEditClick?: () => void;
}

function ItemCard({ item, highlight, onRecordClick, onDiscardClick, onEditClick }: ItemCardProps) {
  const daysUntil = getDaysUntilExpiration(item);
  const skipQuantity = isQuantitySkipped(item);
  const remainingQty = skipQuantity ? undefined : (item.currentQuantity ?? item.remainingQuantity ?? item.quantity);
  const isRecorded = highlight === 'recorded';

  const borderColor = {
    today: 'border-amber-400 bg-amber-50',
    expiring: 'border-orange-400 bg-orange-50',
    expired: 'border-red-400 bg-red-50',
    recorded: 'border-gray-300 bg-gray-100',
    missed: 'border-purple-400 bg-purple-50',
    none: 'border-gray-200 bg-white',
  }[highlight];

  return (
    <div className={`rounded-lg border-2 p-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {highlight === 'today' && <span className="text-amber-500">⭐</span>}
            {highlight === 'expiring' && <span className="text-orange-500">⚠️</span>}
            {highlight === 'expired' && <span className="text-red-500">❌</span>}
            {highlight === 'recorded' && <span className="text-gray-400">☑️</span>}
            {highlight === 'missed' && <span className="text-purple-500">📢</span>}
            {highlight === 'none' && <span className="text-green-500">🟢</span>}
            <span className={`font-bold ${isRecorded ? 'text-gray-500' : 'text-gray-800'}`}>{item.itemName}</span>
            {isRecorded && <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">入力済み</span>}
            {highlight === 'missed' && <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded">提供漏れ</span>}
          </div>

          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              {skipQuantity ? (
                <span className="text-green-600 font-medium">在庫あり</span>
              ) : (
                <span>残り {remainingQty}{item.unit}</span>
              )}
              <span className="text-gray-300">┃</span>
              {item.expirationDate ? (
                <span className={
                  daysUntil !== null && daysUntil < 0
                    ? 'text-red-600 font-medium'
                    : daysUntil !== null && daysUntil <= 3
                      ? 'text-orange-600 font-medium'
                      : ''
                }>
                  期限 {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  {daysUntil !== null && daysUntil < 0 && ` (${Math.abs(daysUntil)}日超過)`}
                  {daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && ` (あと${daysUntil}日)`}
                </span>
              ) : (
                <span className="text-gray-400">期限なし</span>
              )}
            </div>

            {/* スケジュール表示（Phase 13.2: 強化版） */}
            {item.servingSchedule ? (
              // 新しい構造化スケジュール（Phase 13.2: ScheduleDisplayコンポーネント使用）
              <ScheduleDisplay schedule={item.servingSchedule} compact />
            ) : item.plannedServeDate ? (
              // 後方互換: 旧形式の単一日付
              <div className="flex items-center gap-1 text-blue-600">
                <span>📅</span>
                <span>
                  {new Date(item.plannedServeDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  {isScheduledForToday(item) && ' (今日)'}
                  {isScheduledForTomorrow(item) && ' (明日)'}
                </span>
              </div>
            ) : null}

            {/* 提供方法・保存方法・残り処置 */}
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

            {item.noteToStaff && (
              <div className="flex items-start gap-1 text-gray-600 mt-2">
                <span>💬</span>
                <span className="italic">「{item.noteToStaff}」</span>
              </div>
            )}

            {/* 入力済みの場合、記録者と時刻を表示 */}
            {isRecorded && item.consumptionSummary?.lastServedBy && (
              <div className="flex items-center gap-1 text-gray-500 mt-2">
                <span>📝</span>
                <span>{item.consumptionSummary.lastServedBy}</span>
                {item.consumptionSummary.lastRecordedAt && (
                  <span>
                    {new Date(item.consumptionSummary.lastRecordedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {!isRecorded && (
            <button
              onClick={onRecordClick}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1"
            >
              <span>🍪</span>
              <span>提供記録</span>
            </button>
          )}
          {/* 編集ボタン（入力済み・水分記録の場合のみ） */}
          {isRecorded && onEditClick && (
            <button
              onClick={onEditClick}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
            >
              <span>✏️</span>
              <span>編集</span>
            </button>
          )}
          {onDiscardClick && (
            <button
              onClick={onDiscardClick}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1"
            >
              <span>🗑️</span>
              <span>廃棄</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 残り対応品物カードコンポーネント（Phase 42）
// ItemCardと同様の形式で品物情報を表示
interface RemainingItemCardProps {
  item: CareItem;
  type: 'discarded' | 'stored';
  showButtons?: boolean;
  onRecordClick?: () => void;
}

function RemainingItemCard({ item, type, showButtons = true, onRecordClick }: RemainingItemCardProps) {
  const daysUntil = getDaysUntilExpiration(item);
  const skipQuantity = isQuantitySkipped(item);
  const remainingQty = skipQuantity ? undefined : (item.currentQuantity ?? item.remainingQuantity ?? item.quantity);

  const borderColor = type === 'discarded'
    ? 'border-red-300 bg-red-50'
    : 'border-blue-300 bg-blue-50';

  const statusBadge = type === 'discarded'
    ? { icon: '🗑️', text: '破棄済み', bgColor: 'bg-red-100 text-red-700' }
    : { icon: '📦', text: '保存済み', bgColor: 'bg-blue-100 text-blue-700' };

  return (
    <div className={`rounded-lg border-2 p-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800">
              {getCategoryIcon(item.category)} {item.itemName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${statusBadge.bgColor}`}>
              {statusBadge.icon} {statusBadge.text}
            </span>
          </div>

          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              {skipQuantity ? (
                <span className="text-green-600 font-medium">在庫あり</span>
              ) : (
                <span>残り {remainingQty}{item.unit}</span>
              )}
              <span className="text-gray-300">┃</span>
              {item.expirationDate ? (
                <span className={
                  daysUntil !== null && daysUntil < 0
                    ? 'text-red-600 font-medium'
                    : daysUntil !== null && daysUntil <= 3
                      ? 'text-orange-600 font-medium'
                      : ''
                }>
                  期限 {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  {daysUntil !== null && daysUntil < 0 && ` (${Math.abs(daysUntil)}日超過)`}
                  {daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && ` (あと${daysUntil}日)`}
                </span>
              ) : (
                <span className="text-gray-400">期限なし</span>
              )}
            </div>

            {/* スケジュール表示 */}
            {item.servingSchedule ? (
              <ScheduleDisplay schedule={item.servingSchedule} compact />
            ) : item.plannedServeDate ? (
              <div className="flex items-center gap-1 text-blue-600">
                <span>📅</span>
                <span>
                  {new Date(item.plannedServeDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  {isScheduledForToday(item) && ' (今日)'}
                  {isScheduledForTomorrow(item) && ' (明日)'}
                </span>
              </div>
            ) : null}

            {/* 提供方法・保存方法・残り処置 */}
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

            {item.noteToStaff && (
              <div className="flex items-start gap-1 text-gray-600 mt-2">
                <span>💬</span>
                <span className="italic">「{item.noteToStaff}」</span>
              </div>
            )}

            {/* Phase 49: 廃棄情報の表示（status='discarded'の場合） */}
            {item.status === 'discarded' && item.discardedAt && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-100 rounded px-2 py-1">
                <span>🗑️ 廃棄日時: {new Date(item.discardedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                {item.discardReason && <span className="ml-2">（{item.discardReason}）</span>}
              </div>
            )}
          </div>
        </div>

        {showButtons && onRecordClick && (
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={onRecordClick}
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1"
            >
              <span>{type === 'discarded' ? '🔄' : '🍪'}</span>
              <span>{type === 'discarded' ? '修正記録' : '提供記録'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
