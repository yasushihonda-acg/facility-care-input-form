/**
 * 同一品物アラートコンポーネント（品物詳細画面用）
 * @see docs/FIFO_DESIGN_SPEC.md セクション4.3
 *
 * 品物詳細画面で、同じ品物名の他の在庫のうち
 * 期限がより近いものがある場合にアラートを表示します。
 */

import type { CareItem } from '../../types/careItem';

interface SameItemAlertProps {
  /** 現在表示中のアイテム */
  currentItem: CareItem;
  /** 同じ品物名の他のCareItem一覧（FIFOソート済み、currentItemを除く） */
  otherItems: CareItem[];
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
 * 現在のアイテムより期限が近いアイテムがあるか判定
 */
function hasEarlierExpiration(
  currentItem: CareItem,
  otherItems: CareItem[]
): boolean {
  if (otherItems.length === 0) return false;

  // 現在のアイテムに期限がない場合、期限があるアイテムは全て優先
  if (!currentItem.expirationDate) {
    return otherItems.some((item) => item.expirationDate);
  }

  const currentExpDate = new Date(currentItem.expirationDate).getTime();

  return otherItems.some((item) => {
    if (!item.expirationDate) return false;
    return new Date(item.expirationDate).getTime() < currentExpDate;
  });
}

/**
 * 同一品物アラートコンポーネント
 *
 * 品物詳細画面で、同じ品物名の他の在庫があり、
 * かつその中に期限がより近いものがある場合に表示します。
 */
export function SameItemAlert({
  currentItem,
  otherItems,
}: SameItemAlertProps) {
  // 他のアイテムがない場合は表示しない
  if (otherItems.length === 0) {
    return null;
  }

  // 期限が近いアイテムがあるか判定
  const hasEarlier = hasEarlierExpiration(currentItem, otherItems);

  // 期限が近いアイテムを抽出（最大3件）
  const earlierItems = otherItems
    .filter((item) => {
      if (!currentItem.expirationDate) {
        return item.expirationDate !== undefined;
      }
      if (!item.expirationDate) return false;
      return (
        new Date(item.expirationDate).getTime() <
        new Date(currentItem.expirationDate).getTime()
      );
    })
    .slice(0, 3);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      {/* Phase 43.1: normalizedName があればそれを表示（ブランド名ではなく基準品目名） */}
      <div className="px-3 py-2 bg-blue-100 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">ℹ️</span>
          <span className="font-medium text-blue-800">
            同じ「{currentItem.normalizedName || currentItem.itemName}」の他の在庫
          </span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-3 space-y-2">
        {/* 期限が近いアイテムがある場合 */}
        {hasEarlier && earlierItems.length > 0 && (
          <>
            {earlierItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded"
              >
                <span className="text-base">📦</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">
                      {formatCreatedDate(item.createdAt)}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-amber-700 font-medium">
                      期限: {formatDate(item.expirationDate)}
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">
                      残り{item.currentQuantity ?? 0}{item.unit || '個'}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded whitespace-nowrap">
                  先に消費推奨
                </span>
              </div>
            ))}
          </>
        )}

        {/* 期限が近いアイテムがない場合（情報表示のみ） */}
        {!hasEarlier && (
          <div className="text-sm text-blue-700">
            この品物が最も期限が近いです。先に消費してください。
          </div>
        )}

        {/* 他にもある場合 */}
        {otherItems.length > earlierItems.length && hasEarlier && (
          <div className="text-xs text-gray-500 mt-1">
            他に{otherItems.length - earlierItems.length}件の在庫があります
          </div>
        )}
      </div>

      {/* ガイダンスメッセージ */}
      {hasEarlier && (
        <div className="px-3 pb-3">
          <div className="flex items-start gap-2 text-sm text-blue-700">
            <span>💡</span>
            <span>期限の近いものから先に使い切ることをお勧めします。</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SameItemAlert;
