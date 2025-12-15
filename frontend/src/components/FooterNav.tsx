import { NavLink, useLocation } from 'react-router-dom';

interface FooterNavProps {
  className?: string;
}

export function FooterNav({ className = '' }: FooterNavProps) {
  const location = useLocation();

  // /family パス配下かどうかを判定
  const isFamilyPath = location.pathname.startsWith('/family');

  return (
    <nav
      role="navigation"
      aria-label="メインナビゲーション"
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
              {/* 上部インジケーター */}
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
              {/* 上部インジケーター */}
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

        {/* 家族タブ */}
        <NavLink
          to="/family"
          className={() => `
            flex-1 flex flex-col items-center justify-center gap-1 relative transition-all duration-200
            ${isFamilyPath
              ? 'bg-primary text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
            }
          `}
        >
          <>
            {/* 上部インジケーター */}
            {isFamilyPath && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/30" />
            )}
            {/* 家族アイコン（SVG） */}
            <svg
              className="w-6 h-6"
              fill={isFamilyPath ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={isFamilyPath ? 0 : 1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            <span className={`text-xs font-bold ${isFamilyPath ? 'text-white' : 'text-gray-600'}`}>
              家族
            </span>
          </>
        </NavLink>
      </div>
    </nav>
  );
}
