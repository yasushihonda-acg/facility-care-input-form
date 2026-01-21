/**
 * スタッフホーム
 * 今日のタスク・アラートを一覧表示
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション5.1
 */

import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
// Phase 21: チャット機能一時非表示
// import { NotificationSection } from '../../components/shared/NotificationSection';
import { useCareItems } from '../../hooks/useCareItems';
import {
  getCategoryIcon,
  getDaysUntilExpiration,
} from '../../types/careItem';
import type { CareItem } from '../../types/careItem';
import { getTodayString } from '../../utils/scheduleUtils';

// 入居者ID（単一入居者専用アプリのため固定値）
// @see docs/ARCHITECTURE.md - 設計前提: 単一入居者専用
const DEMO_RESIDENT_ID = 'resident-001';

/** 日付を表示用フォーマット */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日(${weekday})`;
}

export function StaffHome() {
  const today = getTodayString();

  // 品物一覧を取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
  });

  // 期限アラートのある品物を抽出
  const getExpiringItems = (items: CareItem[]): CareItem[] => {
    return items
      .filter((item) => {
        if (!item.expirationDate) return false;
        const days = getDaysUntilExpiration(item.expirationDate);
        return days <= 3 && item.status !== 'consumed';
      })
      .sort((a, b) => {
        const daysA = a.expirationDate ? getDaysUntilExpiration(a.expirationDate) : 999;
        const daysB = b.expirationDate ? getDaysUntilExpiration(b.expirationDate) : 999;
        return daysA - daysB;
      });
  };

  // 提供待ちの品物を抽出
  const getPendingItems = (items: CareItem[]): CareItem[] => {
    return items.filter((item) => item.status === 'pending');
  };

  const expiringItems = data?.items ? getExpiringItems(data.items) : [];
  const pendingItems = data?.items ? getPendingItems(data.items) : [];

  return (
    <Layout
      title="スタッフホーム"
      subtitle={formatDateDisplay(today)}
      showBackButton={false}
    >
      <div className="pb-4">
        {/* クイックアクション */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <Link
            to="/view"
            className="bg-white rounded-lg shadow-card p-3 hover:shadow-md transition flex flex-col items-center gap-1"
          >
            <div className="text-2xl">📋</div>
            <p className="font-medium text-xs text-center">記録閲覧</p>
          </Link>
          <Link
            to="/staff/input/meal"
            className="bg-white rounded-lg shadow-card p-3 hover:shadow-md transition flex flex-col items-center gap-1"
          >
            <div className="text-2xl">✏️</div>
            <p className="font-medium text-xs text-center">記録入力</p>
          </Link>
          <Link
            to="/staff/family-messages"
            className="relative bg-white rounded-lg shadow-card p-3 hover:shadow-md transition flex flex-col items-center gap-1"
          >
            <div className="text-2xl">👨‍👩‍👧</div>
            <p className="font-medium text-xs text-center">家族連絡</p>
            {pendingItems.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white bg-orange-500">
                {pendingItems.length}
              </span>
            )}
          </Link>
          <Link
            to="/stats"
            className="bg-white rounded-lg shadow-card p-3 hover:shadow-md transition flex flex-col items-center gap-1"
          >
            <div className="text-2xl">📊</div>
            <p className="font-medium text-xs text-center">統計</p>
          </Link>
        </div>

        {/* Phase 21: チャット機能一時非表示
        <NotificationSection userType="staff" maxItems={3} />
        */}

        {/* アラートセクション */}
        {expiringItems.length > 0 && (
          <div className="mb-4">
            <h2 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-1">
              <span>⚠️</span>
              賞味期限アラート
            </h2>
            <div className="space-y-2">
              {expiringItems.map((item) => {
                const days = item.expirationDate ? getDaysUntilExpiration(item.expirationDate) : null;
                const isExpired = days !== null && days < 0;
                const isToday = days === 0;
                return (
                  <Link
                    key={item.id}
                    to={`/staff/family-messages/${item.id}`}
                    className={`block bg-white rounded-lg shadow-card p-3 border-l-4 ${
                      isExpired
                        ? 'border-red-500 bg-red-50'
                        : isToday
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-yellow-500 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                      <div className="flex-1">
                        <p className="font-bold">{item.itemName}</p>
                        <p className={`text-sm ${
                          isExpired ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-yellow-700'
                        }`}>
                          {isExpired
                            ? '❌ 期限切れ'
                            : isToday
                              ? '⚠️ 今日が期限です'
                              : `⚠️ あと${days}日`}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 新着の家族連絡 */}
        <div className="mb-4">
          <h2 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-1">
            <span>📦</span>
            提供待ちの品物
            {pendingItems.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                {pendingItems.length}件
              </span>
            )}
          </h2>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-card p-6">
              <div className="flex flex-col items-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
                <p className="text-sm">読み込み中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              エラーが発生しました
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="bg-white rounded-lg shadow-card p-6 text-center text-gray-500">
              <p>提供待ちの品物はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to={`/staff/family-messages/${item.id}`}
                  className="block bg-white rounded-lg shadow-card p-3 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                    <div className="flex-1">
                      <p className="font-bold">{item.itemName}</p>
                      <p className="text-sm text-gray-500">
                        残: {item.remainingQuantity}{item.unit}
                      </p>
                      {item.noteToStaff && (
                        <p className="text-sm text-blue-600 mt-1 truncate">
                          💬 {item.noteToStaff}
                        </p>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}

              {pendingItems.length > 5 && (
                <Link
                  to="/staff/family-messages"
                  className="block text-center text-primary text-sm py-2"
                >
                  すべて見る（{pendingItems.length}件）→
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 家族連絡一覧へのリンク */}
        <Link
          to="/staff/family-messages"
          className="block bg-white rounded-lg shadow-card p-4 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍👩‍👧</span>
              <div>
                <p className="font-bold">家族連絡を見る</p>
                <p className="text-sm text-gray-500">品物・ケア指示の確認</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </Layout>
  );
}

export default StaffHome;
