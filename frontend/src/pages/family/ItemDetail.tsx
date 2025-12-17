/**
 * 品物詳細ページ（家族用）
 * 品物の詳細情報 + 消費タイムライン
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション6.3
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md
 */

import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems, useDeleteCareItem } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useConsumptionLogs } from '../../hooks/useConsumptionLogs';
import {
  getCategoryIcon,
  getStatusLabel,
  getStatusColorClass,
  formatDate,
  getDaysUntilExpiration,
  getStorageLabel,
  getServingMethodLabel,
  CONSUMPTION_STATUSES,
} from '../../types/careItem';
import type { ConsumptionStatus } from '../../types/careItem';
import { useState } from 'react';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

/** 日時フォーマット */
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/** 摂食状況のラベルとスタイルを取得 */
function getConsumptionStatusDisplay(status: ConsumptionStatus): { label: string; emoji: string; color: string; bgColor: string } {
  const statusConfig = CONSUMPTION_STATUSES.find(s => s.value === status);
  const config = {
    full: { emoji: '🎉', color: 'text-green-600', bgColor: 'bg-green-100' },
    most: { emoji: '😊', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    half: { emoji: '😐', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    little: { emoji: '😟', color: 'text-orange-600', bgColor: 'bg-orange-100' },
    none: { emoji: '😢', color: 'text-red-600', bgColor: 'bg-red-100' },
  };
  const display = config[status] || config.half;
  return {
    label: statusConfig?.label || status,
    ...display,
  };
}

/** 摂食率に基づくボーダー色を取得 */
function getLogBorderColor(rate: number): string {
  if (rate >= 90) return 'border-green-400';
  if (rate >= 70) return 'border-blue-400';
  if (rate >= 50) return 'border-yellow-400';
  return 'border-orange-400';
}

export function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';

  // 品物一覧から該当品物を取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
  });

  const deleteItem = useDeleteCareItem();
  const item = data?.items.find((i) => i.id === id);

  // 消費ログを取得
  const { data: logsData, isLoading: logsLoading } = useConsumptionLogs({
    itemId: id || '',
    limit: 10,
  });
  const consumptionLogs = logsData?.logs || [];

  // 削除処理
  // @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作
  const handleDelete = async () => {
    if (!item) return;

    // デモモードの場合: APIを呼ばず、成功メッセージを表示してデモページにリダイレクト
    if (isDemo) {
      alert('削除しました（デモモード - 実際には削除されません）');
      window.location.href = '/demo/family/items';
      return;
    }

    // 本番モードの場合: 通常通りAPI呼び出し
    try {
      await deleteItem.mutateAsync(item.id);
      window.location.href = '/family/items';
    } catch (error) {
      console.error('Delete failed:', error);
      alert('削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <Layout title="品物詳細" showBackButton>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout title="品物詳細" showBackButton>
        <div className="p-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error ? 'エラーが発生しました' : '品物が見つかりません'}
          </div>
          <Link to={`${pathPrefix}/family/items`} className="block mt-4 text-primary text-center">
            ← 品物一覧に戻る
          </Link>
        </div>
      </Layout>
    );
  }

  const statusColor = getStatusColorClass(item.status);
  const categoryIcon = getCategoryIcon(item.category);
  const hasExpiration = !!item.expirationDate;
  const daysUntilExpiration = hasExpiration ? getDaysUntilExpiration(item.expirationDate!) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  // 在庫計算
  const initialQty = item.quantity || 1;
  const remainingQty = item.remainingQuantity || 0;
  const consumedPercent = ((initialQty - remainingQty) / initialQty) * 100;

  return (
    <Layout
      title={item.itemName}
      showBackButton
      rightElement={
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 text-gray-400 hover:text-red-500 transition"
          aria-label="削除"
        >
          🗑️
        </button>
      }
    >
      <div className="pb-24">
        {/* 在庫状況カード */}
        <div className="px-4 pt-4 mb-4">
          <div className={`bg-white rounded-lg shadow-card p-4 ${
            isExpired ? 'border-2 border-red-300' : isExpiringSoon ? 'border-2 border-orange-300' : ''
          }`}>
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{categoryIcon}</span>
              <div className="flex-1">
                <h1 className="text-xl font-bold">{item.itemName}</h1>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor.bgColor} ${statusColor.color}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
            </div>

            {/* 在庫バー */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">残量</span>
                <span className="font-bold">{remainingQty}{item.unit} / {initialQty}{item.unit}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    consumedPercent >= 80 ? 'bg-red-500' :
                    consumedPercent >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${100 - consumedPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>消費: {consumedPercent.toFixed(0)}%</span>
                <span>残り: {(100 - consumedPercent).toFixed(0)}%</span>
              </div>
            </div>

            {/* 基本情報 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-t">
                <span className="text-gray-500">送付日</span>
                <span>{formatDate(item.sentDate)}</span>
              </div>
              {hasExpiration && (
                <div className={`flex justify-between py-2 border-t ${
                  isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : ''
                }`}>
                  <span className={isExpired || isExpiringSoon ? '' : 'text-gray-500'}>賞味期限</span>
                  <span className="font-medium">
                    {formatDate(item.expirationDate!)}
                    {isExpired
                      ? ' (期限切れ) ❌'
                      : daysUntilExpiration === 0
                        ? ' (今日) ⚠️'
                        : daysUntilExpiration !== null && daysUntilExpiration <= 3
                          ? ` (あと${daysUntilExpiration}日) ⚠️`
                          : ''}
                  </span>
                </div>
              )}
              {item.storageMethod && (
                <div className="flex justify-between py-2 border-t">
                  <span className="text-gray-500">保存方法</span>
                  <span>{getStorageLabel(item.storageMethod)}</span>
                </div>
              )}
              {item.servingMethod && (
                <div className="flex justify-between py-2 border-t">
                  <span className="text-gray-500">提供方法</span>
                  <span>
                    {getServingMethodLabel(item.servingMethod)}
                    {item.servingMethodDetail && ` (${item.servingMethodDetail})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* スタッフへの申し送り */}
        {item.noteToStaff && (
          <div className="px-4 mb-4">
            <div className="bg-white rounded-lg shadow-card p-4">
              <h2 className="font-bold text-sm text-gray-700 mb-2">スタッフへの申し送り</h2>
              <p className="text-gray-700">{item.noteToStaff}</p>
            </div>
          </div>
        )}

        {/* スタッフからの申し送り */}
        {item.noteToFamily && (
          <div className="px-4 mb-4">
            <div className="bg-blue-50 rounded-lg shadow-card p-4 border border-blue-200">
              <h2 className="font-bold text-sm text-blue-700 mb-2">スタッフより</h2>
              <p className="text-blue-800">{item.noteToFamily}</p>
            </div>
          </div>
        )}

        {/* 提供・摂食の記録 */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-lg shadow-card p-4">
            <h2 className="font-bold text-sm text-gray-700 mb-3">提供・摂食の記録</h2>

            {logsLoading ? (
              <p className="text-gray-500 text-center py-4">読み込み中...</p>
            ) : consumptionLogs.length === 0 && item.status === 'pending' ? (
              <p className="text-gray-500 text-center py-4">
                まだ提供されていません
              </p>
            ) : consumptionLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                記録がありません
              </p>
            ) : (
              <div className="space-y-4">
                {/* 消費ログ表示 */}
                {consumptionLogs.map((log) => {
                  const statusDisplay = getConsumptionStatusDisplay(log.consumptionStatus);
                  const borderColor = getLogBorderColor(log.consumptionRate);

                  return (
                    <div key={log.id} className={`border-l-4 ${borderColor} pl-3 py-2`}>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>🍽️</span>
                        <span>{formatDateTime(log.recordedAt)}</span>
                        {log.mealTime && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                            {log.mealTime === 'breakfast' ? '朝食' :
                             log.mealTime === 'lunch' ? '昼食' :
                             log.mealTime === 'dinner' ? '夕食' : '間食'}
                          </span>
                        )}
                        {log.sourceType === 'meal_form' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            食事入力
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">
                        {log.servedBy}さんが提供: {log.servedQuantity}{item.unit}
                      </p>
                      <p className="text-sm">
                        摂食: {log.consumedQuantity}{item.unit} ({log.consumptionRate}%)
                        <span className={`ml-1 ${statusDisplay.color}`}>
                          {statusDisplay.emoji}{statusDisplay.label}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        → 残り {log.quantityAfter}{item.unit}
                      </p>

                      {/* 家族指示対応表示 */}
                      {log.followedInstruction && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <span className="text-blue-800">
                            ✅ 家族の指示に従いました
                            {log.instructionNote && ` - ${log.instructionNote}`}
                          </span>
                        </div>
                      )}

                      {/* 家族へのメモ */}
                      {log.noteToFamily && (
                        <div className={`mt-2 p-2 ${statusDisplay.bgColor} rounded text-sm`}>
                          <span className={statusDisplay.color}>💬 {log.noteToFamily}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 登録イベント */}
                <div className="border-l-4 border-gray-300 pl-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>📦</span>
                    <span>{formatDateTime(item.sentDate + 'T10:30:00')}</span>
                  </div>
                  <p className="text-sm mt-1">登録しました</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* タイムラインへのリンク */}
        <div className="px-4 mb-4">
          <Link
            to={`${pathPrefix}/items/${item.id}/timeline`}
            state={{ from: 'family' }}
            className="block bg-white rounded-lg shadow-card p-4 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📜</span>
                <div>
                  <p className="font-bold">タイムラインを見る</p>
                  <p className="text-sm text-gray-500">登録〜消費の完全履歴</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4">品物を削除しますか？</h3>
            <p className="text-gray-600 mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg"
                disabled={deleteItem.isPending}
              >
                {deleteItem.isPending ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default ItemDetail;
