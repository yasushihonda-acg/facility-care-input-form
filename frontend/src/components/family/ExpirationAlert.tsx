/**
 * 期限切れアラートコンポーネント
 * Phase 38.2: 期限切れ品物を表示し、廃棄アクションを提供
 * Phase 49: 廃棄指示フロー対応（家族→スタッフ通知）
 *
 * 表示条件:
 * - status === 'pending' または 'in_progress' かつ 期限切れ → 廃棄ボタン
 * - status === 'pending_discard' → 通知中表示
 *
 * @see docs/ARCHITECTURE.md セクション「廃棄指示フロー」
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CareItem } from '../../types/careItem';
import { getCategoryIcon, formatDate } from '../../types/careItem';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useRequestDiscard, usePendingDiscardItems } from '../../hooks/useCareItems';

interface ExpirationAlertProps {
  /** 期限切れ品物リスト */
  expiredItems: CareItem[];
  /** 読み込み中フラグ */
  isLoading?: boolean;
}

export function ExpirationAlert({ expiredItems, isLoading }: ExpirationAlertProps) {
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';
  const requestDiscard = useRequestDiscard();
  const { pendingDiscardItems, isLoading: pendingLoading } = usePendingDiscardItems();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  // 読み込み中は非表示
  if (isLoading || pendingLoading) {
    return null;
  }

  // 期限切れの廃棄指示中品物のみをフィルタ
  const expiredPendingDiscardItems = pendingDiscardItems.filter((item) => {
    if (!item.expirationDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(item.expirationDate);
    expDate.setHours(0, 0, 0, 0);
    return expDate < today;
  });

  const totalCount = expiredItems.length + expiredPendingDiscardItems.length;

  // 0件の場合は緑色の「期限切れなし」バナーを表示
  if (totalCount === 0) {
    return (
      <div className="mx-4 mt-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-lg">✅</span>
            <span className="text-sm font-medium">期限切れなし</span>
          </div>
        </div>
      </div>
    );
  }

  // 廃棄指示を送信
  const handleRequestDiscard = async (item: CareItem) => {
    // デモモードの場合
    if (isDemo) {
      alert(`${item.itemName}の廃棄指示をスタッフに送信しました（デモモード - 実際には変更されません）`);
      setConfirmingId(null);
      return;
    }

    // 本番モードの場合
    setRequestingId(item.id);
    try {
      await requestDiscard.mutateAsync({
        itemId: item.id,
        reason: '期限切れのため廃棄',
      });
      setConfirmingId(null);
    } catch (error) {
      console.error('Request discard failed:', error);
      alert('廃棄指示の送信に失敗しました');
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="mx-4 mt-3">
      <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
        {/* ヘッダー */}
        <div className="px-4 py-2 bg-red-100 border-b border-red-200">
          <h2 className="text-sm font-semibold text-red-800 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            期限切れ（{totalCount}件）
          </h2>
        </div>

        {/* アイテムリスト */}
        <div className="divide-y divide-red-100">
          {/* 廃棄指示中の品物（通知中表示） */}
          {expiredPendingDiscardItems.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3 flex items-center justify-between gap-3 bg-gray-50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0 opacity-60">
                  {getCategoryIcon(item.category)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-gray-600 truncate">
                    {item.itemName}
                  </div>
                  <div className="text-xs text-gray-500">
                    期限: {formatDate(item.expirationDate!)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-100 rounded-lg">
                  <span className="animate-pulse">📤</span>
                  <span>スタッフに通知中...</span>
                </div>
              </div>
            </div>
          ))}

          {/* 未対応の期限切れ品物（廃棄ボタン表示） */}
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
                      disabled={requestingId === item.id}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleRequestDiscard(item)}
                      className="px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      disabled={requestingId === item.id}
                    >
                      {requestingId === item.id ? '送信中...' : '廃棄依頼'}
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
