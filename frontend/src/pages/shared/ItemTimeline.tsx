/**
 * 品物タイムライン（共有ビュー）
 * 1つの品物の登録〜消費完了までの履歴を時系列で表示
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション4.3
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md
 */

import { useParams, Link, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems } from '../../hooks/useCareItems';
import {
  formatDate,
  getDaysUntilExpiration,
  getStorageLabel,
  getServingMethodLabel,
} from '../../types/careItem';

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

export function ItemTimeline() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // デモモード判定
  const isDemo = location.pathname.startsWith('/demo');
  const pathPrefix = isDemo ? '/demo' : '';

  // 品物一覧から該当品物を取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
  });

  const item = data?.items.find((i) => i.id === id);

  // 戻り先を判定（スタッフ or 家族）
  const isFromFamily = location.state?.from === 'family' ||
    document.referrer.includes('/family/');

  if (isLoading) {
    return (
      <Layout title="タイムライン" showBackButton>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout title="タイムライン" showBackButton>
        <div className="p-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error ? 'エラーが発生しました' : '品物が見つかりません'}
          </div>
          <Link to={`${pathPrefix}/view`} className="block mt-4 text-primary text-center">
            ← 記録閲覧に戻る
          </Link>
        </div>
      </Layout>
    );
  }

  const hasExpiration = !!item.expirationDate;
  const daysUntilExpiration = hasExpiration ? getDaysUntilExpiration(item.expirationDate!) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;

  // 在庫計算
  const initialQty = item.quantity || 1;
  const remainingQty = item.remainingQuantity || 0;
  const consumedPercent = ((initialQty - remainingQty) / initialQty) * 100;

  // 平均摂食率（モック）
  const avgConsumptionRate = 75;

  return (
    <Layout title={item.itemName} showBackButton>
      <div className="pb-24">
        {/* 在庫状況サマリー */}
        <div className="px-4 pt-4 mb-4">
          <div className={`bg-white rounded-lg shadow-card p-4 ${
            isExpired ? 'border-2 border-red-300' : isExpiringSoon ? 'border-2 border-orange-300' : ''
          }`}>
            {/* 在庫バー */}
            <div className="mb-3">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    consumedPercent >= 80 ? 'bg-red-500' :
                    consumedPercent >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${100 - consumedPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-sm">
                <span className="font-bold">{remainingQty}/{initialQty}{item.unit}</span>
                <span className="text-gray-500">消費: {consumedPercent.toFixed(0)}%</span>
              </div>
            </div>

            {/* サマリー情報 */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-500 text-xs">平均摂食率</p>
                <p className="font-bold text-lg">{avgConsumptionRate}%</p>
              </div>
              <div className={`rounded p-2 ${
                isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-orange-50' : 'bg-gray-50'
              }`}>
                <p className="text-gray-500 text-xs">賞味期限</p>
                <p className={`font-bold text-lg ${
                  isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : ''
                }`}>
                  {hasExpiration
                    ? isExpired
                      ? '期限切れ'
                      : daysUntilExpiration === 0
                        ? '今日'
                        : `あと${daysUntilExpiration}日`
                    : '-'}
                  {isExpiringSoon && ' ⚠️'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* タイムラインセクション */}
        <div className="px-4">
          <h2 className="font-bold text-sm text-gray-700 mb-3">タイムライン</h2>

          <div className="relative pl-6">
            {/* 縦線 */}
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* 登録イベント */}
            <div className="relative mb-6">
              <div className="absolute -left-4 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow" />
              <div className="bg-white rounded-lg shadow-card p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <span>📦</span>
                  <span>{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="font-bold mb-2">家族が登録</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{item.itemName} {initialQty}{item.unit}</p>
                  {hasExpiration && <p>期限: {formatDate(item.expirationDate!)}</p>}
                  {item.storageMethod && <p>保存: {getStorageLabel(item.storageMethod)}</p>}
                  {item.servingMethod && <p>提供: {getServingMethodLabel(item.servingMethod)}</p>}
                </div>
                {item.noteToStaff && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                    <p className="text-gray-500 text-xs mb-1">スタッフへ</p>
                    <p className="text-blue-800">{item.noteToStaff}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 消費イベント（モック） */}
            {item.status !== 'pending' && (
              <>
                <div className="relative mb-6">
                  <div className="absolute -left-4 w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
                  <div className="bg-white rounded-lg shadow-card p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>🍽️</span>
                      <span>12/18 15:00</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">間食</span>
                    </div>
                    <p className="font-bold mb-1">佐藤さんが提供</p>
                    <div className="text-sm">
                      <p>提供: 1{item.unit} → 摂食: 1{item.unit} (100%) <span className="text-green-600">🎉完食</span></p>
                      <p className="text-gray-500">残量: 3.5{item.unit} → 2.5{item.unit}</p>
                    </div>
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <p className="text-gray-500 text-xs mb-1">家族へ</p>
                      <p className="text-green-800">今日は完食されました！</p>
                    </div>
                  </div>
                </div>

                <div className="relative mb-6">
                  <div className="absolute -left-4 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow" />
                  <div className="bg-white rounded-lg shadow-card p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>🍽️</span>
                      <span>12/17 15:00</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">間食</span>
                    </div>
                    <p className="font-bold mb-1">山田さんが提供</p>
                    <div className="text-sm">
                      <p>提供: 1{item.unit} → 摂食: 0.5{item.unit} (50%)</p>
                      <p className="text-gray-500">残量: 4{item.unit} → 3.5{item.unit}</p>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                      <p className="text-gray-500 text-xs mb-1">家族へ</p>
                      <p className="text-yellow-800">皮が硬かったようで半分残されました</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 終端 */}
            <div className="absolute -left-4 bottom-0 w-4 h-4 rounded-full bg-gray-300 border-2 border-white shadow" />
          </div>
        </div>

        {/* スタッフ用アクションボタン */}
        {!isFromFamily && item.status !== 'consumed' && (
          <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 to-transparent pt-6">
            <Link
              to={`${pathPrefix}/staff/family-messages/${item.id}`}
              className="block w-full py-4 bg-primary text-white rounded-lg font-bold text-lg text-center shadow-lg hover:bg-primary-dark transition"
            >
              提供・摂食を記録する
            </Link>
          </div>
        )}

        {/* 注意書き */}
        <div className="px-4 mt-4">
          <p className="text-xs text-gray-400 text-center">
            ※ タイムラインの消費履歴は Phase 9.2 で ConsumptionLog API と連携予定
          </p>
        </div>
      </div>
    </Layout>
  );
}

export default ItemTimeline;
