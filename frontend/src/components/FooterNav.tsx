import { NavLink, useLocation } from 'react-router-dom';

interface FooterNavProps {
  className?: string;
}

/**
 * フッターナビゲーション
 *
 * ロール別に異なるタブ構成を表示
 * - スタッフ用: [記録閲覧] [記録入力] [家族連絡] [統計]
 * - 家族用: [ホーム] [品物管理] [ケア指示] [統計]
 *
 * @see docs/USER_ROLE_SPEC.md - セクション3「ページ構成」
 * @see docs/FOOTER_NAVIGATION_SPEC.md
 */
export function FooterNav({ className = '' }: FooterNavProps) {
  const location = useLocation();

  // /family パス配下かどうかを判定
  const isFamilyPath = location.pathname.startsWith('/family');

  // 家族用フッター
  if (isFamilyPath) {
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
            to="/family"
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
            to="/family/items"
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive || location.pathname.startsWith('/family/items')
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => {
              const isItemsActive = isActive || location.pathname.startsWith('/family/items');
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

          {/* ケア指示タブ */}
          <NavLink
            to="/family/request"
            className={({ isActive }) => `
              flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
              ${isActive || location.pathname.startsWith('/family/request')
                ? 'bg-primary text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            {({ isActive }) => {
              const isRequestActive = isActive || location.pathname.startsWith('/family/request');
              return (
                <>
                  {isRequestActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
                  )}
                  <svg
                    className="w-6 h-6"
                    fill={isRequestActive ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth={isRequestActive ? 0 : 1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                    />
                  </svg>
                  <span className={`text-xs font-bold ${isRequestActive ? 'text-white' : 'text-gray-600'}`}>
                    ケア指示
                  </span>
                </>
              );
            }}
          </NavLink>

          {/* 統計タブ */}
          <NavLink
            to="/family/stats"
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
          to="/view"
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
          to="/input/meal"
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

        {/* 家族連絡タブ（スタッフ向け：閲覧用） */}
        <NavLink
          to="/staff/family-messages"
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isActive || location.pathname.startsWith('/staff/family-messages')
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => {
            const isMessagesActive = isActive || location.pathname.startsWith('/staff/family-messages');
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
          to="/staff/stats"
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
