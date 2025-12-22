import { useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
// Phase 21: チャット機能一時非表示
// import { useState } from 'react';
// import { getActiveChatItems } from '../api';
// import { DEMO_RESIDENT_ID } from '../hooks/useDemoMode';

interface FooterNavProps {
  className?: string;
}

const USER_ROLE_KEY = 'userRole';
const SHARED_PATHS = ['/view', '/stats', '/items'];
const DEMO_SHARED_PATHS = ['/demo/view', '/demo/stats', '/demo/items'];

/**
 * フッターナビゲーション
 *
 * ロール別に異なるタブ構成を表示
 * - スタッフ用: [記録閲覧] [記録入力] [チャット] [家族連絡] [統計]
 * - 家族用: [ホーム] [品物管理] [チャット] [記録閲覧] [統計]
 *
 * 共有ビュー（/view, /stats）にいる場合は、直前のロールを維持
 * デモモード（/demo/*）では、リンク先も /demo/* 内に留まる
 * チャットタブは未読数バッジを表示（Phase 18）
 *
 * @see docs/VIEW_ARCHITECTURE_SPEC.md - セクション3「フッターナビゲーション設計」
 * @see docs/FOOTER_NAVIGATION_SPEC.md
 * @see docs/DEMO_SHOWCASE_SPEC.md - デモモード対応
 * @see docs/CHAT_INTEGRATION_SPEC.md - チャット連携
 */
export function FooterNav({ className = '' }: FooterNavProps) {
  const location = useLocation();
  // Phase 21: チャット機能一時非表示
  // const [familyUnreadCount, setFamilyUnreadCount] = useState(0);
  // const [staffUnreadCount, setStaffUnreadCount] = useState(0);

  // デモモード判定
  // 明確にパスで判定し、共有ページはどちらでもない状態に
  const isDemoMode = location.pathname.startsWith('/demo');
  const isDemoStaffPath = location.pathname.startsWith('/demo/staff');
  const isDemoFamilyPath = location.pathname.startsWith('/demo/family');
  const isDemoSharedPath = isDemoMode && !isDemoStaffPath && !isDemoFamilyPath;

  // パスからロールを判定（デモモードも含む）
  const isFamilyPath = location.pathname.startsWith('/family') ||
                       location.pathname.startsWith('/demo/family');
  const isStaffPath = location.pathname.startsWith('/staff') ||
                      location.pathname.startsWith('/input') ||
                      location.pathname.startsWith('/demo/staff');
  const isSharedPath = SHARED_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/')) ||
                       DEMO_SHARED_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  // ロールを保存・取得
  useEffect(() => {
    if (isFamilyPath) {
      localStorage.setItem(USER_ROLE_KEY, 'family');
    } else if (isStaffPath) {
      localStorage.setItem(USER_ROLE_KEY, 'staff');
    }
    // 共有パスの場合は保存しない（既存のロールを維持）
  }, [isFamilyPath, isStaffPath]);

  // 表示するフッターを決定
  // デモ家族モードでは家族フッター、デモスタッフモードではスタッフフッターを表示
  // デモ共有ページ（/demo/stats, /demo/view）ではsavedRoleに基づく
  // @see docs/DEMO_STAFF_SPEC.md セクション3.4
  const savedRole = localStorage.getItem(USER_ROLE_KEY) || 'staff';

  // フッター表示ロジック:
  // 1. デモ家族パス（/demo/family/*）→ 家族フッター
  // 2. デモスタッフパス（/demo/staff/*）→ スタッフフッター
  // 3. デモ共有パス（/demo/view, /demo/stats）→ savedRoleに基づく
  // 4. 本番パスは従来通り
  const showFamilyFooter =
    isDemoFamilyPath ||
    (isDemoSharedPath && savedRole === 'family') ||
    (!isDemoMode && (isFamilyPath || (isSharedPath && savedRole === 'family')));

  // デモモード対応: リンク先を動的生成
  const paths = useMemo(() => ({
    familyHome: isDemoMode ? '/demo/family' : '/family',
    familyItems: isDemoMode ? '/demo/family/items' : '/family/items',
    // Phase 21: チャット機能一時非表示
    // familyChats: isDemoMode ? '/demo/family/chats' : '/family/chats',
    view: isDemoMode ? '/demo/view' : '/view',
    stats: isDemoMode ? '/demo/stats' : '/stats',
    staffInput: isDemoMode ? '/demo/staff/input/meal' : '/staff/input/meal',
    // Phase 21: チャット機能一時非表示
    // staffChats: isDemoMode ? '/demo/staff/chats' : '/staff/chats',
    staffFamilyMessages: isDemoMode ? '/demo/staff/family-messages' : '/staff/family-messages',
    staffStats: isDemoMode ? '/demo/staff/stats' : '/staff/stats',
  }), [isDemoMode]);

  // Phase 21: チャット機能一時非表示
  // 未読チャット数の取得（コメントアウト）
  // useEffect(() => {
  //   if (isDemoMode) {
  //     setFamilyUnreadCount(2);
  //     setStaffUnreadCount(1);
  //     return;
  //   }
  //   const fetchUnreadCounts = async () => {
  //     try {
  //       const familyResponse = await getActiveChatItems({
  //         residentId: DEMO_RESIDENT_ID,
  //         userType: 'family',
  //       });
  //       if (familyResponse.success && familyResponse.data) {
  //         const totalUnread = familyResponse.data.items.reduce(
  //           (sum, item) => sum + (item.unreadCountFamily || 0),
  //           0
  //         );
  //         setFamilyUnreadCount(totalUnread);
  //       }
  //       const staffResponse = await getActiveChatItems({
  //         residentId: DEMO_RESIDENT_ID,
  //         userType: 'staff',
  //       });
  //       if (staffResponse.success && staffResponse.data) {
  //         const totalUnread = staffResponse.data.items.reduce(
  //           (sum, item) => sum + (item.unreadCountStaff || 0),
  //           0
  //         );
  //         setStaffUnreadCount(totalUnread);
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch unread counts:', error);
  //     }
  //   };
  //   fetchUnreadCounts();
  //   const interval = setInterval(fetchUnreadCounts, 30000);
  //   return () => clearInterval(interval);
  // }, [isDemoMode]);

  // 家族用フッター
  if (showFamilyFooter) {
    return (
      <nav
        role="navigation"
        aria-label="家族用ナビゲーション"
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${className}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      >
        <div className="flex h-16">
          {/* ホームタブ */}
          <NavLink
            to={paths.familyHome}
            end
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                )}
                <svg
                  className="w-6 h-6"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isActive ? 0 : 1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  ホーム
                </span>
              </>
            )}
          </NavLink>

          {/* 品物管理タブ */}
          <NavLink
            to={paths.familyItems}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive || location.pathname.includes('/family/items') || location.pathname.includes('/demo/family/items')
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => {
              const isItemsActive = isActive || location.pathname.includes('/family/items') || location.pathname.includes('/demo/family/items');
              return (
                <>
                  {isItemsActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                  )}
                  <svg
                    className="w-6 h-6"
                    fill={isItemsActive ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={isItemsActive ? 0 : 1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                  </svg>
                  <span className={`text-xs font-bold ${isItemsActive ? 'text-white' : 'text-gray-600'}`}>
                    品物管理
                  </span>
                </>
              );
            }}
          </NavLink>

          {/* Phase 21: チャット機能一時非表示
          <NavLink
            to={paths.familyChats}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive || location.pathname.includes('/family/chat')
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => {
              const isChatsActive = isActive || location.pathname.includes('/family/chat');
              return (
                <>
                  {isChatsActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                  )}
                  <div className="relative">
                    <svg
                      className="w-6 h-6"
                      fill={isChatsActive ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={isChatsActive ? 0 : 1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                      />
                    </svg>
                    {familyUnreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                        {familyUnreadCount > 9 ? '9+' : familyUnreadCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${isChatsActive ? 'text-white' : 'text-gray-600'}`}>
                    チャット
                  </span>
                </>
              );
            }}
          </NavLink>
          */}

          {/* 記録閲覧タブ（共有ビュー） */}
          <NavLink
            to={paths.view}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                )}
                <svg
                  className="w-6 h-6"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isActive ? 0 : 1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  記録閲覧
                </span>
              </>
            )}
          </NavLink>

          {/* 統計タブ（共有ビュー） */}
          <NavLink
            to={paths.stats}
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                )}
                <svg
                  className="w-6 h-6"
                  fill={isActive ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isActive ? 0 : 1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                  統計
                </span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    );
  }

  // スタッフ用フッター（デフォルト）
  return (
    <nav
      role="navigation"
      aria-label="スタッフ用ナビゲーション"
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex h-16">
        {/* 記録閲覧タブ */}
        <NavLink
          to={paths.view}
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isActive
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
              )}
              <svg
                className="w-6 h-6"
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                記録閲覧
              </span>
            </>
          )}
        </NavLink>

        {/* 記録入力タブ */}
        <NavLink
          to={paths.staffInput}
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isActive
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
              )}
              <svg
                className="w-6 h-6"
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                記録入力
              </span>
            </>
          )}
        </NavLink>

        {/* Phase 21: チャット機能一時非表示
        <NavLink
          to={paths.staffChats}
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isActive || location.pathname.includes('/staff/chat')
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => {
            const isChatsActive = isActive || location.pathname.includes('/staff/chat');
            return (
              <>
                {isChatsActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                )}
                <div className="relative">
                  <svg
                    className="w-6 h-6"
                    fill={isChatsActive ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={isChatsActive ? 0 : 1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                    />
                  </svg>
                  {staffUnreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full">
                      {staffUnreadCount > 9 ? '9+' : staffUnreadCount}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-bold ${isChatsActive ? 'text-white' : 'text-gray-600'}`}>
                  チャット
                </span>
              </>
            );
          }}
        </NavLink>
        */}

        {/* 家族連絡タブ（スタッフ向け：閲覧用） */}
        <NavLink
          to={paths.staffFamilyMessages}
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isActive || location.pathname.includes('/staff/family-messages') || location.pathname.includes('/demo/staff/family-messages')
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => {
            const isMessagesActive = isActive || location.pathname.includes('/staff/family-messages') || location.pathname.includes('/demo/staff/family-messages');
            return (
              <>
                {isMessagesActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                )}
                <svg
                  className="w-6 h-6"
                  fill={isMessagesActive ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={isMessagesActive ? 0 : 1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                <span className={`text-xs font-bold ${isMessagesActive ? 'text-white' : 'text-gray-600'}`}>
                  家族連絡
                </span>
              </>
            );
          }}
        </NavLink>

        {/* 統計タブ */}
        <NavLink
          to={paths.staffStats}
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isActive
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
              )}
              <svg
                className="w-6 h-6"
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isActive ? 0 : 1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                統計
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
