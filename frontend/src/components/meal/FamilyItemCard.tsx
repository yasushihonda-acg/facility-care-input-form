/**
 * 品物カードコンポーネント
 * 家族からの品物を表示し、提供記録ボタンを提供
 *
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md セクション5.1
 */

import type { CareItem } from '../../types/careItem';
import { isQuantitySkipped } from '../../types/careItem';

interface FamilyItemCardProps {
  item: CareItem;
  onRecordClick: (item: CareItem) => void;
  isSelected?: boolean;
}

/**
 * 賞味期限までの日数を計算
 */
function getDaysUntilExpiration(expirationDate?: string): number | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 在庫ステータスのアイコンを取得
 */
function getStockIcon(currentQuantity: number, initialQuantity: number): string {
  const ratio = currentQuantity / initialQuantity;
  if (ratio > 0.5) return '🟢'; // 半分以上
  if (ratio > 0.2) return '🟡'; // 20-50%
  return '🔴'; // 20%未満
}

/**
 * 期限警告のスタイルを取得
 */
function getExpirationStyle(daysUntil: number | null): {
  className: string;
  text: string;
} | null {
  if (daysUntil === null) return null;
  if (daysUntil < 0) {
    return {
      className: 'text-red-600 font-bold',
      text: '期限切れ',
    };
  }
  if (daysUntil <= 2) {
    return {
      className: 'text-orange-500 font-medium',
      text: `あと${daysUntil}日`,
    };
  }
  if (daysUntil <= 7) {
    return {
      className: 'text-yellow-600',
      text: `あと${daysUntil}日`,
    };
  }
  return null;
}

export function FamilyItemCard({
  item,
  onRecordClick,
  isSelected = false,
}: FamilyItemCardProps) {
  const skipQuantity = isQuantitySkipped(item);
  const currentQty = skipQuantity ? undefined : (item.currentQuantity ?? item.quantity ?? 0);
  const initialQty = skipQuantity ? 1 : (item.initialQuantity ?? item.quantity ?? 1);
  const daysUntil = getDaysUntilExpiration(item.expirationDate);
  const expirationStyle = getExpirationStyle(daysUntil);
  const stockIcon = skipQuantity ? '📦' : getStockIcon(currentQty ?? 0, initialQty);

  // 消費済み・廃棄済みの場合は表示しない
  // 数量管理しない品物も、提供記録後は status が 'consumed' になるため非表示
  if (item.status === 'consumed' || item.status === 'discarded') return null;
  // 数量管理する品物で在庫なしの場合も非表示
  if (!skipQuantity && currentQty != null && currentQty <= 0) return null;

  return (
    <div
      className={`
        relative border rounded-lg p-3 transition-all
        ${isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      {/* ヘッダー行: アイテム名と在庫 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" role="img" aria-label="在庫状況">
            {stockIcon}
          </span>
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {item.itemName}
            </h4>
          </div>
        </div>
      </div>

      {/* 在庫・期限情報 */}
      <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
        {skipQuantity ? (
          // 数量管理なし品物: 提供記録がある場合は「提供済み」と表示
          // in_progress: 提供中、served: 旧ステータス（互換性のため）
          (item.status === 'in_progress' || item.status === 'served') ? (
            <span className="text-gray-500 font-medium">提供済み</span>
          ) : (
            <span className="text-green-600 font-medium">在庫あり</span>
          )
        ) : (
          <span>
            残り {currentQty}{item.unit}
          </span>
        )}
        {item.expirationDate && (
          <>
            <span className="text-gray-400">┃</span>
            <span>
              期限 {item.expirationDate.slice(5).replace('-', '/')}
              {expirationStyle && (
                <span className={`ml-1 ${expirationStyle.className}`}>
                  {expirationStyle.text}
                </span>
              )}
            </span>
          </>
        )}
      </div>

      {/* 家族からの指示 */}
      {item.noteToStaff && (
        <div className="mt-2 flex items-start gap-1.5 text-sm">
          <span className="text-gray-500 shrink-0">💬</span>
          <span className="text-gray-700 break-words">
            「{item.noteToStaff}」
          </span>
        </div>
      )}

      {/* 提供希望 */}
      {item.servingMethodDetail && (
        <div className="mt-1 flex items-start gap-1.5 text-sm">
          <span className="text-gray-500 shrink-0">📋</span>
          <span className="text-gray-600 break-words text-xs">
            {item.servingMethodDetail}
          </span>
        </div>
      )}

      {/* 提供記録ボタン */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => onRecordClick(item)}
          className={`
            px-3 py-1.5 text-sm rounded-lg transition-colors
            ${isSelected
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {isSelected ? '✓ 選択中' : '📝 提供記録'}
        </button>
      </div>
    </div>
  );
}
