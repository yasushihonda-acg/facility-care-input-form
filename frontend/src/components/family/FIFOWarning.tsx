/**
 * FIFOガイドコンポーネント（間食提供時）
 * @see docs/FIFO_DESIGN_SPEC.md セクション4.2
 *
 * 同じ品物名のアイテムが複数存在する場合に、期限の近いものから
 * 先に消費するようガイダンスを表示します。
 */

import type { CareItem } from '../../types/careItem';

interface FIFOWarningProps {
  /** 品物名 */
  itemName: string;
  /** 同じ品物名のCareItem一覧（FIFOソート済み） */
  items: CareItem[];
  /** 現在選択中のアイテムID（任意） */
  selectedItemId?: string;
  /** コンパクト表示（詳細画面用） */
  compact?: boolean;
}

/**
 * 日付をフォーマット
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '期限なし';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 登録日をフォーマット
 */
function formatCreatedDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}登録`;
}

/**
 * FIFOガイドコンポーネント
 *
 * 同じ品物が複数ある場合に、期限の近いものを優先的に
 * 使用するよう促すガイダンスを表示します。
 */
export function FIFOWarning({
  itemName,
  items,
  selectedItemId,
  compact = false,
}: FIFOWarningProps) {
  // アイテムがない、または1つ以下の場合は表示しない
  if (items.length <= 1) {
    return null;
  }

  // 推奨アイテム（最初のアイテム = 期限が最も近い）
  const recommendedItem = items[0];

  // 選択中のアイテムが推奨アイテムと同じか判定
  const isRecommendedSelected = selectedItemId === recommendedItem.id;

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg overflow-hidden ${compact ? 'text-sm' : ''}`}>
      {/* ヘッダー */}
      <div className="px-3 py-2 bg-amber-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚠️</span>
          <span className={`font-medium text-amber-800 ${compact ? 'text-sm' : ''}`}>
            「{itemName}」は複数の在庫があります
          </span>
        </div>
      </div>

      {/* アイテム一覧 */}
      <div className="p-3 space-y-2">
        {items.map((item, index) => {
          const isRecommended = index === 0;
          const isSelected = selectedItemId === item.id;

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 rounded ${
                isRecommended
                  ? 'bg-amber-100 border border-amber-300'
                  : 'bg-white border border-gray-200'
              } ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
            >
              <span className="text-base">📦</span>
              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                  <span className="text-gray-600">
                    {formatCreatedDate(item.createdAt)}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className={item.expirationDate ? 'text-gray-800' : 'text-gray-500'}>
                    期限: {formatDate(item.expirationDate)}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">
                    残り{item.currentQuantity ?? 0}{item.unit || '個'}
                  </span>
                </div>
              </div>
              {isRecommended && (
                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded">
                  推奨 ✨
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ガイダンスメッセージ */}
      <div className="px-3 pb-3">
        <div className={`flex items-start gap-2 text-amber-700 ${compact ? 'text-xs' : 'text-sm'}`}>
          <span>💡</span>
          <span>
            {isRecommendedSelected
              ? '期限の近いものから提供できています。'
              : '期限の近いものから先に提供することをお勧めします。'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FIFOWarning;
