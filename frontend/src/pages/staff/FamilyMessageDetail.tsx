/**
 * 家族連絡詳細（スタッフ用）
 * 品物の詳細表示 + 消費記録入力
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション5.3
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Layout } from '../../components/Layout';
import { ProhibitionWarning } from '../../components/staff/ProhibitionWarning';
import { StaffRecordDialog } from '../../components/staff/StaffRecordDialog';
import { useCareItems } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { getCareItem } from '../../api';
import type { CareItem } from '../../types/careItem';
import {
  getCategoryIcon,
  getStatusLabel,
  getStatusColorClass,
  formatDate,
  getDaysUntilExpiration,
  getStorageLabel,
  getServingMethodLabel,
  isQuantitySkipped,
} from '../../types/careItem';

// 入居者ID（単一入居者専用アプリのため固定値）
const DEMO_RESIDENT_ID = 'resident-001';

export function FamilyMessageDetail() {
  const { id } = useParams<{ id: string }>();
  const [showRecordModal, setShowRecordModal] = useState(false);
  // Phase 67: ダイアログ用の最新品物データ
  const [latestItem, setLatestItem] = useState<CareItem | null>(null);
  // Phase 67: ボタンのローディング状態
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';

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
          <Link to={`${pathPrefix}/staff/family-messages`} className="block mt-4 text-primary text-center">
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

  // Phase 67: 提供記録ボタンクリック時のハンドラ（最新データ取得 + 在庫チェック）
  const handleRecordClick = async () => {
    // デモモードではキャッシュデータをそのまま使用
    if (isDemo) {
      setLatestItem(item);
      setShowRecordModal(true);
      return;
    }

    setIsRecordLoading(true);
    try {
      // 最新の品物データを取得
      const response = await getCareItem(item.id);
      const fetchedItem = response.data;

      if (!fetchedItem) {
        toast.error('品物が見つかりません。画面を更新してください。');
        return;
      }

      // 在庫チェック（数量管理しない品物はスキップ）
      const skipQty = isQuantitySkipped(fetchedItem);
      const currentQty = fetchedItem.currentQuantity ?? fetchedItem.remainingQuantity ?? fetchedItem.quantity ?? 0;
      if (!skipQty && currentQty <= 0) {
        toast.error('在庫がありません。他のスタッフが記録済みの可能性があります。');
        return;
      }

      // 最新データでダイアログを開く
      setLatestItem(fetchedItem);
      setShowRecordModal(true);
    } catch (error) {
      console.error('品物データの取得に失敗しました:', error);
      toast.error('データの取得に失敗しました。再度お試しください。');
    } finally {
      setIsRecordLoading(false);
    }
  };

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

          {/* 禁止品目警告 */}
          <ProhibitionWarning item={item} residentId={DEMO_RESIDENT_ID} />
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
            to={`${pathPrefix}/items/${item.id}/timeline`}
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

        {/* Phase 21: チャット機能一時非表示
        <div className="px-4 mb-4">
          <Link
            to={`${pathPrefix}/staff/chat/${item.id}`}
            className="block bg-white rounded-lg shadow-card p-4 hover:shadow-md transition border-2 border-green-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="font-bold text-green-700">家族とチャット</p>
                  <p className="text-sm text-gray-500">この品物について家族と連絡</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
        */}

        {/* 提供・摂食記録ボタン */}
        {item.status !== 'consumed' && (
          <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 to-transparent pt-6">
            <button
              onClick={handleRecordClick}
              disabled={isRecordLoading}
              className="w-full py-4 bg-primary text-white rounded-lg font-bold text-lg shadow-lg hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isRecordLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  確認中...
                </>
              ) : (
                '提供・摂食を記録する'
              )}
            </button>
          </div>
        )}

        {/* Phase 15.3: 統一された提供・摂食記録ダイアログ */}
        {/* Phase 67: 最新データ(latestItem)でダイアログを開く */}
        {latestItem && (
          <StaffRecordDialog
            isOpen={showRecordModal}
            onClose={() => {
              setShowRecordModal(false);
              setLatestItem(null);
            }}
            item={latestItem}
            onSuccess={() => {
              setShowRecordModal(false);
              setLatestItem(null);
            }}
            isDemo={isDemo}
          />
        )}
      </div>
    </Layout>
  );
}

export default FamilyMessageDetail;
