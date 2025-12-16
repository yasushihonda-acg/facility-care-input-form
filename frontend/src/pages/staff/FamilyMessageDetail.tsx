/**
 * 家族連絡詳細（スタッフ用）
 * 品物の詳細表示 + 消費記録入力
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション5.3
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems, useUpdateCareItem } from '../../hooks/useCareItems';
import {
  getCategoryIcon,
  getStatusLabel,
  getStatusColorClass,
  formatDate,
  getDaysUntilExpiration,
  getStorageLabel,
  getServingMethodLabel,
} from '../../types/careItem';
import type { CareItem } from '../../types/careItem';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

export function FamilyMessageDetail() {
  const { id } = useParams<{ id: string }>();
  const [showRecordModal, setShowRecordModal] = useState(false);

  // 品物一覧から該当品物を取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
  });

  const item = data?.items.find((i) => i.id === id);

  if (isLoading) {
    return (
      <Layout title="家族連絡詳細" showBackButton>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout title="家族連絡詳細" showBackButton>
        <div className="p-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error ? 'エラーが発生しました' : '品物が見つかりません'}
          </div>
          <Link to="/staff/family-messages" className="block mt-4 text-primary text-center">
            ← 一覧に戻る
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
    <Layout title={item.itemName} showBackButton>
      <div className="pb-24">
        {/* ステータスバッジ */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-4xl">{categoryIcon}</span>
            <div>
              <h1 className="text-xl font-bold">{item.itemName}</h1>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor.bgColor} ${statusColor.color}`}>
                {getStatusLabel(item.status)}
              </span>
            </div>
          </div>
        </div>

        {/* 在庫状況カード */}
        <div className="px-4 mb-4">
          <div className={`bg-white rounded-lg shadow-card p-4 ${
            isExpired ? 'border-2 border-red-300' : isExpiringSoon ? 'border-2 border-orange-300' : ''
          }`}>
            <h2 className="font-bold text-sm text-gray-700 mb-3">在庫状況</h2>

            {/* 在庫バー */}
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">残量</span>
                <span className="font-bold">{remainingQty} / {initialQty}{item.unit}</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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

            {/* 期限表示 */}
            {hasExpiration && (
              <div className={`flex items-center gap-2 p-2 rounded ${
                isExpired ? 'bg-red-100 text-red-700' :
                isExpiringSoon ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                <span>📅</span>
                <span className="font-medium">
                  賞味期限: {formatDate(item.expirationDate!)}
                  {isExpired
                    ? ' (期限切れ)'
                    : daysUntilExpiration === 0
                      ? ' (今日)'
                      : daysUntilExpiration !== null && daysUntilExpiration <= 3
                        ? ` (あと${daysUntilExpiration}日)`
                        : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 家族からの指示カード */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-lg shadow-card p-4">
            <h2 className="font-bold text-sm text-gray-700 mb-3">家族からの指示</h2>

            <div className="space-y-2 text-sm">
              <div className="flex gap-4">
                <span className="text-gray-500 w-20">送付日</span>
                <span>{formatDate(item.sentDate)}</span>
              </div>

              {item.storageMethod && (
                <div className="flex gap-4">
                  <span className="text-gray-500 w-20">保存方法</span>
                  <span>{getStorageLabel(item.storageMethod)}</span>
                </div>
              )}

              {item.servingMethod && (
                <div className="flex gap-4">
                  <span className="text-gray-500 w-20">提供方法</span>
                  <span>
                    {getServingMethodLabel(item.servingMethod)}
                    {item.servingMethodDetail && ` (${item.servingMethodDetail})`}
                  </span>
                </div>
              )}

              {item.noteToStaff && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💬</span>
                    <p className="text-blue-800">{item.noteToStaff}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 消費履歴（モック） */}
        <div className="px-4 mb-4">
          <div className="bg-white rounded-lg shadow-card p-4">
            <h2 className="font-bold text-sm text-gray-700 mb-3">消費履歴</h2>

            {/* TODO: Phase 9.2 で ConsumptionLog APIと連携 */}
            <div className="space-y-3">
              {/* モックデータ表示 */}
              <div className="border-l-4 border-green-400 pl-3 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>🍽️</span>
                  <span>12/18 15:00</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">間食</span>
                </div>
                <p className="text-sm mt-1">
                  <span className="font-medium">佐藤</span>: 1{item.unit}提供 → 1{item.unit}消費 (100%)
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-3 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>🍽️</span>
                  <span>12/17 15:00</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">間食</span>
                </div>
                <p className="text-sm mt-1">
                  <span className="font-medium">山田</span>: 1{item.unit}提供 → 0.5{item.unit}消費 (50%)
                </p>
                <p className="text-xs text-gray-500 mt-1">💬 皮が硬かったようです</p>
              </div>

              <p className="text-xs text-gray-400 text-center mt-2">
                ※ 消費履歴機能は Phase 9.2 で実装予定
              </p>
            </div>
          </div>
        </div>

        {/* 品物タイムラインへのリンク */}
        <div className="px-4 mb-4">
          <Link
            to={`/items/${item.id}/timeline`}
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

        {/* 提供・摂食記録ボタン */}
        {item.status !== 'consumed' && (
          <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 to-transparent pt-6">
            <button
              onClick={() => setShowRecordModal(true)}
              className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg shadow-lg hover:bg-primary-dark transition"
            >
              提供・摂食を記録する
            </button>
          </div>
        )}

        {/* 消費記録モーダル（Phase 9.2で実装） */}
        {showRecordModal && (
          <ConsumptionRecordModal
            item={item}
            onClose={() => setShowRecordModal(false)}
          />
        )}
      </div>
    </Layout>
  );
}

/**
 * 消費記録モーダル（Phase 9.2 で完全実装予定）
 */
function ConsumptionRecordModal({
  item,
  onClose,
}: {
  item: CareItem;
  onClose: () => void;
}) {
  const [servedQty, setServedQty] = useState<string>('1');
  const [consumedQty, setConsumedQty] = useState<string>('1');
  const [mealTime, setMealTime] = useState<string>('snack');
  const [noteToFamily, setNoteToFamily] = useState<string>('');

  const updateItem = useUpdateCareItem();

  const handleSubmit = async () => {
    // Phase 9.2 で ConsumptionLog API を実装
    // 今はモックとしてステータス更新のみ
    const served = parseFloat(servedQty) || 0;
    const consumed = parseFloat(consumedQty) || 0;
    const newRemaining = Math.max(0, (item.remainingQuantity || 0) - served);

    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        updates: {
          remainingQuantity: newRemaining,
          status: newRemaining <= 0 ? 'consumed' : 'served',
          consumptionRate: served > 0 ? Math.round((consumed / served) * 100) : undefined,
          noteToFamily: noteToFamily || undefined,
        },
      });
      onClose();
    } catch (error) {
      console.error('Update failed:', error);
      alert('更新に失敗しました');
    }
  };

  const mealTimeOptions = [
    { value: 'breakfast', label: '朝食' },
    { value: 'lunch', label: '昼食' },
    { value: 'snack', label: '間食' },
    { value: 'dinner', label: '夕食' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="w-full bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">提供・摂食を記録</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 品物情報 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(item.category)}</span>
              <div>
                <p className="font-bold">{item.itemName}</p>
                <p className="text-sm text-gray-500">
                  残り: {item.remainingQuantity}{item.unit}
                </p>
              </div>
            </div>
          </div>

          {/* 提供タイミング */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提供タイミング
            </label>
            <div className="grid grid-cols-4 gap-2">
              {mealTimeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMealTime(opt.value)}
                  className={`py-2 rounded-lg text-sm font-medium transition ${
                    mealTime === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 提供量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提供量（{item.unit}）
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={item.remainingQuantity || 1}
              value={servedQty}
              onChange={(e) => setServedQty(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg text-lg"
            />
          </div>

          {/* 摂食量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              摂食量（{item.unit}）
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              max={parseFloat(servedQty) || 0}
              value={consumedQty}
              onChange={(e) => setConsumedQty(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg text-lg"
            />
            {parseFloat(servedQty) > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                摂食率: {Math.round((parseFloat(consumedQty) / parseFloat(servedQty)) * 100)}%
              </p>
            )}
          </div>

          {/* 家族への申し送り */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              家族への申し送り（任意）
            </label>
            <textarea
              value={noteToFamily}
              onChange={(e) => setNoteToFamily(e.target.value)}
              placeholder="例: 今日は完食されました！"
              className="w-full px-4 py-3 border rounded-lg resize-none"
              rows={2}
            />
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSubmit}
            disabled={updateItem.isPending}
            className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg disabled:opacity-50"
          >
            {updateItem.isPending ? '記録中...' : '記録する'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            ※ Phase 9.2 で ConsumptionLog API と連携予定
          </p>
        </div>
      </div>
    </div>
  );
}

export default FamilyMessageDetail;
