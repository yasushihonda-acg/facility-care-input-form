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
import type { CareItem, ItemStatus, RemainingHandlingLog } from '../../types/careItem';
import {
  getCategoryIcon,
  getServingMethodLabel,
  getStorageLabel,
  getRemainingHandlingInstructionLabel,
} from '../../types/careItem';
import { StaffRecordDialog } from '../staff/StaffRecordDialog';
import { RemainingHandlingDialog } from '../staff/RemainingHandlingDialog';
import {
  isScheduledForToday as checkScheduledForToday,
  isScheduledForTomorrow as checkScheduledForTomorrow,
} from '../../utils/scheduleUtils';
import { ScheduleDisplay } from './ScheduleDisplay';

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
  const today = new Date().toISOString().split('T')[0];
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
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
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

// 今日記録済みかどうかを判定
function isRecordedToday(item: CareItem): boolean {
  const lastServedDate = item.consumptionSummary?.lastServedDate;
  if (!lastServedDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return lastServedDate === today;
}

// 過去にスケジュールされていたが記録がない（提供漏れ）を判定
function isMissedSchedule(item: CareItem): boolean {
  if (!item.servingSchedule) return false;
  // 今日スケジュールされている場合は提供漏れではない
  if (isScheduledForToday(item)) return false;
  // 今日記録済みなら提供漏れではない
  if (isRecordedToday(item)) return false;

  // スケジュールタイプ別に判定
  const schedule = item.servingSchedule;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // startDateがない場合は判定不可
  if (!schedule.startDate) return false;

  // once/specific_dates: 開始日が過去で、記録がない
  if (schedule.type === 'once' || schedule.type === 'specific_dates') {
    const startDate = new Date(schedule.startDate);
    startDate.setHours(0, 0, 0, 0);
    if (startDate < today) {
      // 最後の記録日が開始日以降でなければ提供漏れ
      const lastServed = item.consumptionSummary?.lastServedDate;
      if (!lastServed) return true;
      const lastServedDate = new Date(lastServed);
      lastServedDate.setHours(0, 0, 0, 0);
      if (lastServedDate < startDate) {
        return true;
      }
    }
  }

  // daily/weekly: 昨日以前にスケジュールされていたが記録がない場合
  // （簡易的に、lastServedDateが3日以上前なら提供漏れとする）
  if (schedule.type === 'daily' || schedule.type === 'weekly') {
    const lastServed = item.consumptionSummary?.lastServedDate;
    if (!lastServed) {
      // 一度も記録がない場合、開始日が3日以上前なら提供漏れ
      const startDate = new Date(schedule.startDate);
      startDate.setHours(0, 0, 0, 0);
      const threeDaysAgo = new Date(today);
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

  // 廃棄確認ダイアログ
  const [discardTarget, setDiscardTarget] = useState<CareItem | null>(null);
  const discardMutation = useDiscardItem();

  // 残り対応記録ダイアログ（Phase 42）
  const [remainingHandlingTarget, setRemainingHandlingTarget] = useState<CareItem | null>(null);

  // 在庫あり品物のみ取得（pending/in_progress のみ）
  const { data, isLoading, error, refetch } = useCareItems({
    residentId,
    status: ['pending', 'in_progress'] as ItemStatus[],
  });
  const items = data?.items ?? [];

  // 共通ソート関数
  const sortByExpirationAndSentDate = (a: CareItem, b: CareItem) => {
    // 期限ありを優先
    if (a.expirationDate && !b.expirationDate) return -1;
    if (!a.expirationDate && b.expirationDate) return 1;
    // 期限順
    if (a.expirationDate && b.expirationDate) {
      const diff = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      if (diff !== 0) return diff;
    }
    // 送付日順（古い順）
    return new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime();
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
      const group = classifyForTodayTab(item);
      groups[group].push(item);
    });

    // 提供漏れは期限切れを優先ソート
    groups.missedSchedule.sort((a, b) => {
      const daysA = getDaysUntilExpiration(a) ?? 999;
      const daysB = getDaysUntilExpiration(b) ?? 999;
      return daysA - daysB;
    });

    // その他は通常ソート
    groups.scheduledToday.sort(sortByExpirationAndSentDate);
    groups.recordedToday.sort(sortByExpirationAndSentDate);
    groups.other.sort(sortByExpirationAndSentDate);

    return groups;
  }, [items]);

  // Phase 42: 残り対応タブ用ログ履歴グループ
  // 全品物の remainingHandlingLogs を収集して日時順にソート
  type LogWithItem = RemainingHandlingLog & { item: CareItem };

  const remainingLogs = useMemo(() => {
    const discarded: LogWithItem[] = [];
    const stored: LogWithItem[] = [];

    items.forEach((item) => {
      const logs = item.remainingHandlingLogs ?? [];
      logs.forEach((log) => {
        const logWithItem = { ...log, item };
        if (log.handling === 'discarded') {
          discarded.push(logWithItem);
        } else if (log.handling === 'stored') {
          stored.push(logWithItem);
        }
      });
    });

    // 日時降順（新しい順）でソート
    const sortByDate = (a: LogWithItem, b: LogWithItem) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime();

    discarded.sort(sortByDate);
    stored.sort(sortByDate);

    return { discarded, stored };
  }, [items]);

  // 各サブタブの総数
  const discardedCount = remainingLogs.discarded.length;
  const storedCount = remainingLogs.stored.length;

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
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
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
                  />
                ))}
              </div>
            </div>
          )}

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

      {/* 残り対応タブ（Phase 42: 履歴ベース） */}
      {activeTab === 'remaining' && (
        <div className="space-y-4">
          {/* 記録ボタン */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 mb-3">
              品物を選んで「破棄した」「保存した」を記録できます
            </p>
            <select
              onChange={(e) => {
                const item = items.find(i => i.id === e.target.value);
                if (item) setRemainingHandlingTarget(item);
                e.target.value = '';
              }}
              className="w-full p-3 border border-blue-300 rounded-lg bg-white text-gray-700"
              defaultValue=""
            >
              <option value="" disabled>品物を選択して記録する...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {getCategoryIcon(item.category)} {item.itemName}（残 {item.remainingQuantity ?? item.quantity}{item.unit}）
                </option>
              ))}
            </select>
          </div>

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
              🗑️ 破棄履歴
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
              📦 保存履歴
              {storedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {storedCount}
                </span>
              )}
            </button>
          </div>

          {/* 破棄履歴サブタブ */}
          {remainingSubTab === 'discarded' && (
            <div className="space-y-3">
              {remainingLogs.discarded.length > 0 ? (
                remainingLogs.discarded.map((log) => (
                  <LogCard key={log.id} log={log} type="discarded" />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">🗑️</div>
                  <p className="font-medium">破棄履歴はありません</p>
                  <p className="text-sm mt-2">品物を選択して破棄を記録してください</p>
                </div>
              )}
            </div>
          )}

          {/* 保存履歴サブタブ */}
          {remainingSubTab === 'stored' && (
            <div className="space-y-3">
              {remainingLogs.stored.length > 0 ? (
                remainingLogs.stored.map((log) => (
                  <LogCard key={log.id} log={log} type="stored" />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="font-medium">保存履歴はありません</p>
                  <p className="text-sm mt-2">品物を選択して保存を記録してください</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 残り対応記録ダイアログ（Phase 42） */}
      {remainingHandlingTarget && (
        <RemainingHandlingDialog
          isOpen={!!remainingHandlingTarget}
          onClose={() => setRemainingHandlingTarget(null)}
          item={remainingHandlingTarget}
          onSuccess={() => {
            refetch();
            setRemainingHandlingTarget(null);
          }}
          isDemo={isDemo}
        />
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
}

function ItemCard({ item, highlight, onRecordClick, onDiscardClick }: ItemCardProps) {
  const daysUntil = getDaysUntilExpiration(item);
  const remainingQty = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;
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
              <span>残り {remainingQty}{item.unit}</span>
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
                  🔄 残り: {getRemainingHandlingInstructionLabel(item.remainingHandlingInstruction)}
                </span>
              )}
            </div>

            {item.noteToStaff && (
              <div className="flex items-start gap-1 text-gray-600 mt-2">
                <span>💬</span>
                <span className="italic">「{item.noteToStaff}」</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={onRecordClick}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1"
          >
            <span>🍪</span>
            <span>提供記録</span>
          </button>
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

// 履歴ログカードコンポーネント（Phase 42）
interface LogCardProps {
  log: RemainingHandlingLog & { item: CareItem };
  type: 'discarded' | 'stored';
}

function LogCard({ log, type }: LogCardProps) {
  const icon = type === 'discarded' ? '🗑️' : '📦';
  const bgColor = type === 'discarded' ? 'bg-red-50' : 'bg-blue-50';
  const borderColor = type === 'discarded' ? 'border-red-200' : 'border-blue-200';
  const iconColor = type === 'discarded' ? 'text-red-600' : 'text-blue-600';

  // 日時フォーマット
  const date = new Date(log.recordedAt);
  const dateStr = date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <span className={`text-2xl ${iconColor}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-800">
              {getCategoryIcon(log.item.category)} {log.item.itemName}
            </span>
            <span className="text-sm text-gray-500">
              {log.quantity}{log.item.unit}
            </span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            <span>📅 {dateStr} {timeStr}</span>
            <span className="mx-2">•</span>
            <span>👤 {log.recordedBy}</span>
          </div>
          {log.note && (
            <div className="text-sm text-gray-600 mt-2 italic">
              💬 {log.note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
