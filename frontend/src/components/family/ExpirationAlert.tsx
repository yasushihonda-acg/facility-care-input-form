/**
 * 期限切れアラートコンポーネント
 * Phase 38.2: 期限切れ品物を表示し、廃棄アクションを提供
 *
 * 表示条件:
 * - status === 'pending' または 'in_progress' かつ 期限切れ
 * - 提供済み・消費済み・廃棄済みは非表示
 *
 * @see docs/archive/PHASE_38_2_ITEM_MANAGEMENT_REDESIGN.md
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CareItem } from '../../types/careItem';
import { getCategoryIcon, formatDate } from '../../types/careItem';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useDiscardItem } from '../../hooks/useCareItems';

interface ExpirationAlertProps {
  /** 期限切れ品物リスト */
  expiredItems: CareItem[];
  /** 読み込み中フラグ */
  isLoading?: boolean;
}

export function ExpirationAlert({ expiredItems, isLoading }: ExpirationAlertProps) {
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';
  const discardItem = useDiscardItem();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);

  // 読み込み中または期限切れ品物がない場合は非表示
  if (isLoading || expiredItems.length === 0) {
    return null;
  }

  // 廃棄処理
  const handleDiscard = async (item: CareItem) => {
    // デモモードの場合
    if (isDemo) {
      alert(`${item.itemName}を廃棄しました（デモモード - 実際には変更されません）`);
      setConfirmingId(null);
      return;
    }

    // 本番モードの場合
    setDiscardingId(item.id);
    try {
      await discardItem.mutateAsync({
        itemId: item.id,
        reason: '期限切れのため廃棄',
      });
      setConfirmingId(null);
    } catch (error) {
      console.error('Discard failed:', error);
      alert('廃棄処理に失敗しました');
    } finally {
      setDiscardingId(null);
    }
  };

  return (
    <div className="mx-4 mt-3">
      <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="px-4 py-2 bg-red-100 border-b border-red-200">
          <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            期限切れ（{expiredItems.length}件）
          </h2>
        </div>

        {/* アイテムリスト */}
        <div className="divide-y divide-red-100">
          {expiredItems.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {getCategoryIcon(item.category)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-red-900 truncate">
                    {item.itemName}
                  </div>
                  <div className="text-xs text-red-600">
                    期限: {formatDate(item.expirationDate!)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* 確認ダイアログ表示中 */}
                {confirmingId === item.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={discardingId === item.id}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleDiscard(item)}
                      className="px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      disabled={discardingId === item.id}
                    >
                      {discardingId === item.id ? '処理中...' : '廃棄する'}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmingId(item.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      廃棄
                    </button>
                    <Link
                      to={`${pathPrefix}/family/items/${item.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      詳細
                    </Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExpirationAlert;
