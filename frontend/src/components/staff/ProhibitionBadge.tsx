/**
 * 禁止品目バッジ（一覧用）
 * 品物が禁止品目に該当する可能性がある場合に表示
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション8
 */

import { useProhibitions } from '../../hooks/useProhibitions';
import type { CareItem } from '../../types/careItem';

interface ProhibitionBadgeProps {
  item: CareItem;
  residentId: string;
}

/**
 * 品物が禁止品目に該当するかチェックし、バッジを表示
 */
export function ProhibitionBadge({ item, residentId }: ProhibitionBadgeProps) {
  const { data, isLoading } = useProhibitions(residentId);

  if (isLoading || !data?.prohibitions) {
    return null;
  }

  // 禁止品目との照合
  const isProhibited = data.prohibitions.some((p) => {
    const nameMatch =
      item.itemName.toLowerCase().includes(p.itemName.toLowerCase()) ||
      p.itemName.toLowerCase().includes(item.itemName.toLowerCase());
    const categoryMatch = p.category && p.category === item.category;
    return nameMatch || categoryMatch;
  });

  if (!isProhibited) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
      title="禁止品目の可能性"
    >
      🚫 禁止注意
    </span>
  );
}

export default ProhibitionBadge;
