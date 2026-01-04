/**
 * 家族連絡一覧（スタッフ用）
 * 家族から届いた品物・ケア指示の一覧
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション5.2
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ProhibitionBadge } from '../../components/staff/ProhibitionBadge';
import { useCareItems } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import {
  getCategoryIcon,
  getStatusLabel,
  getStatusColorClass,
  formatDate,
  getDaysUntilExpiration,
} from '../../types/careItem';
import type { CareItem, ItemStatus } from '../../types/careItem';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

/** フィルタタブ定義 */
type FilterValue = ItemStatus | 'all';
const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'pending', label: '未提供' },
  { value: 'served', label: '提供済み' },
  { value: 'consumed', label: '消費済み' },
];

export function FamilyMessages() {
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');

  // 品物一覧を取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  // 期限でソート（期限が近い順）
  const sortedItems = data?.items ? [...data.items].sort((a, b) => {
    // 期限がある品物を優先
    if (!a.expirationDate && !b.expirationDate) return 0;
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;

    const daysA = getDaysUntilExpiration(a.expirationDate);
    const daysB = getDaysUntilExpiration(b.expirationDate);
    return daysA - daysB;
  }) : [];

  return (
    <Layout title="家族連絡" showBackButton>
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>👨‍👩‍👧</span>
            家族連絡
          </h1>
        </div>

        {/* フィルタタブ */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            エラーが発生しました: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all'
                ? '家族からの連絡はありません'
                : `${FILTER_TABS.find(t => t.value === statusFilter)?.label}の品物はありません`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item) => (
              <FamilyMessageCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

/**
 * 家族連絡カードコンポーネント
 */
function FamilyMessageCard({ item }: { item: CareItem }) {
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';
  const statusColor = getStatusColorClass(item.status);
  const categoryIcon = getCategoryIcon(item.category);
  const hasExpiration = !!item.expirationDate;
  const daysUntilExpiration = hasExpiration ? getDaysUntilExpiration(item.expirationDate!) : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 3 && daysUntilExpiration >= 0;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const isToday = daysUntilExpiration === 0;

  // 在庫バー計算
  const initialQty = item.quantity || 1;
  const remainingQty = item.remainingQuantity || 0;
  const consumedPercent = ((initialQty - remainingQty) / initialQty) * 100;

  return (
    <Link
      to={`${pathPrefix}/staff/family-messages/${item.id}`}
      className={`block bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
        isExpired
          ? 'border-l-4 border-l-red-500'
          : isToday
            ? 'border-l-4 border-l-orange-500'
            : isExpiringSoon
              ? 'border-l-4 border-l-yellow-500'
              : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* カテゴリアイコン */}
        <div className="text-3xl flex-shrink-0">{categoryIcon}</div>

        {/* メイン情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-base truncate">{item.itemName}</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor.bgColor} ${statusColor.color}`}>
              {isExpired ? '⚠️期限切れ' : isToday ? '⚠️今日期限' : getStatusLabel(item.status)}
            </span>
            <ProhibitionBadge item={item} residentId={DEMO_RESIDENT_ID} />
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            {/* 期限 */}
            {hasExpiration && (
              <div className="flex gap-4 flex-wrap">
                <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                  期限: {formatDate(item.expirationDate!)}
                  {isExpiringSoon && !isExpired && ` (あと${daysUntilExpiration}日)`}
                </span>
              </div>
            )}

            {/* 在庫バー */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${100 - consumedPercent}%` }}
                />
              </div>
              <span className="text-xs font-medium whitespace-nowrap">
                {remainingQty}/{initialQty}{item.unit}
              </span>
            </div>

            {/* 家族からの申し送り */}
            {item.noteToStaff && (
              <div className="mt-1 text-gray-700 truncate">
                💬 「{item.noteToStaff}」
              </div>
            )}
          </div>
        </div>

        {/* 矢印 */}
        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default FamilyMessages;
