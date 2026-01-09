/**
 * 家族からの品物リストコンポーネント
 * 在庫のある品物を一覧表示
 *
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md セクション5.1
 */

import type { CareItem } from '../../types/careItem';
import { isQuantitySkipped } from '../../types/careItem';
import { FamilyItemCard } from './FamilyItemCard';

interface FamilyItemListProps {
  items: CareItem[];
  selectedItemIds: string[];
  onItemSelect: (item: CareItem) => void;
  isLoading?: boolean;
  error?: Error | null;
}

export function FamilyItemList({
  items,
  selectedItemIds,
  onItemSelect,
  isLoading = false,
  error = null,
}: FamilyItemListProps) {
  // 在庫のある品物のみフィルタ（pending, in_progress）
  // 数量管理しない品物も、提供後は consumed になるためフィルタで除外される
  const availableItems = items.filter(
    (item) =>
      (item.status === 'pending' || item.status === 'in_progress') &&
      (isQuantitySkipped(item) || (item.currentQuantity ?? item.quantity ?? 0) > 0)
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mr-2" />
        品物を読み込み中...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p className="text-sm">品物の読み込みに失敗しました</p>
        <p className="text-xs mt-1">{error.message}</p>
      </div>
    );
  }

  if (availableItems.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg">
        <p className="text-sm">在庫のある品物はありません</p>
        <p className="text-xs mt-1">家族が登録した品物がここに表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {availableItems.map((item) => (
        <FamilyItemCard
          key={item.id}
          item={item}
          onRecordClick={onItemSelect}
          isSelected={selectedItemIds.includes(item.id)}
        />
      ))}
    </div>
  );
}
