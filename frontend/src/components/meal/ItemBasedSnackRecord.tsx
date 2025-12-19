/**
 * ItemBasedSnackRecord - 品物起点の間食記録タブ
 * 設計書: docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2
 *
 * Phase 13.0.2で品物リスト表示を実装
 * Phase 13.0.3で記録入力モーダルを実装
 * Phase 13.1で構造化スケジュール対応
 */

import { useMemo, useState } from 'react';
import { useCareItems } from '../../hooks/useCareItems';
import type { CareItem, ItemStatus } from '../../types/careItem';
import { SnackRecordModal } from './SnackRecordModal';
import {
  isScheduledForToday as checkScheduledForToday,
  isScheduledForTomorrow as checkScheduledForTomorrow,
} from '../../utils/scheduleUtils';
import { ScheduleDisplay } from './ScheduleDisplay';

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

function isExpiringSoon(item: CareItem): boolean {
  if (!item.expirationDate) return false;
  const today = new Date();
  const expDate = new Date(item.expirationDate);
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 3 && diffDays >= 0;
}

function getDaysUntilExpiration(item: CareItem): number | null {
  if (!item.expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(item.expirationDate);
  expDate.setHours(0, 0, 0, 0);
  return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// グループ分類
type ItemGroup = 'today' | 'expiring' | 'other';

function classifyItem(item: CareItem): ItemGroup {
  if (isScheduledForToday(item)) return 'today';
  if (isExpiringSoon(item)) return 'expiring';
  return 'other';
}

export function ItemBasedSnackRecord({ residentId, onRecordComplete }: ItemBasedSnackRecordProps) {
  // モーダル状態
  const [selectedItem, setSelectedItem] = useState<CareItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 在庫あり品物のみ取得（pending/in_progress のみ）
  const { data, isLoading, error, refetch } = useCareItems({
    residentId,
    status: ['pending', 'in_progress'] as ItemStatus[],
  });
  const items = data?.items ?? [];

  // グループ分けとソート
  const groupedItems = useMemo(() => {
    const groups: Record<ItemGroup, CareItem[]> = {
      today: [],
      expiring: [],
      other: [],
    };

    items.forEach((item) => {
      const group = classifyItem(item);
      groups[group].push(item);
    });

    // 各グループ内でソート（期限順 → 送付日順）
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

    Object.keys(groups).forEach((key) => {
      groups[key as ItemGroup].sort(sortByExpirationAndSentDate);
    });

    return groups;
  }, [items]);

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

  return (
    <div className="p-4 space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-800">📦 品物から間食記録</h2>
        <p className="text-sm text-gray-500 mt-1">品物を選んで提供記録を入力</p>
      </div>

      {/* 今日提供予定 */}
      {groupedItems.today.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
            <span>⭐</span>
            今日提供予定
          </h3>
          <div className="space-y-3">
            {groupedItems.today.map((item) => (
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

      {/* 期限が近い */}
      {groupedItems.expiring.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-orange-700 mb-2 flex items-center gap-2">
            <span>⚠️</span>
            期限が近い
          </h3>
          <div className="space-y-3">
            {groupedItems.expiring.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                highlight="expiring"
                onRecordClick={() => handleRecordClick(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* その他の品物 */}
      {groupedItems.other.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <span>🟢</span>
            その他の品物
          </h3>
          <div className="space-y-3">
            {groupedItems.other.map((item) => (
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

      {/* 間食記録モーダル */}
      {selectedItem && (
        <SnackRecordModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          item={selectedItem}
          onSuccess={handleRecordSuccess}
        />
      )}
    </div>
  );
}

// 品物カードコンポーネント
interface ItemCardProps {
  item: CareItem;
  highlight: 'today' | 'expiring' | 'none';
  onRecordClick: () => void;
}

function ItemCard({ item, highlight, onRecordClick }: ItemCardProps) {
  const daysUntil = getDaysUntilExpiration(item);
  const remainingQty = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;

  const borderColor = {
    today: 'border-amber-400 bg-amber-50',
    expiring: 'border-orange-400 bg-orange-50',
    none: 'border-gray-200 bg-white',
  }[highlight];

  return (
    <div className={`rounded-lg border-2 p-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {highlight === 'today' && <span className="text-amber-500">⭐</span>}
            {highlight === 'expiring' && <span className="text-orange-500">⚠️</span>}
            {highlight === 'none' && <span className="text-green-500">🟢</span>}
            <span className="font-bold text-gray-800">{item.itemName}</span>
          </div>

          <div className="mt-2 text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-2">
              <span>残り {remainingQty}{item.unit}</span>
              <span className="text-gray-300">┃</span>
              {item.expirationDate ? (
                <span className={daysUntil !== null && daysUntil <= 3 ? 'text-orange-600 font-medium' : ''}>
                  期限 {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                  {daysUntil !== null && daysUntil <= 3 && ` (あと${daysUntil}日)`}
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

            {item.noteToStaff && (
              <div className="flex items-start gap-1 text-gray-600 mt-2">
                <span>💬</span>
                <span className="italic">「{item.noteToStaff}」</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onRecordClick}
          className="ml-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1"
        >
          <span>🍪</span>
          <span>提供記録</span>
        </button>
      </div>
    </div>
  );
}
