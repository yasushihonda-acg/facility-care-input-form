import { NavLink } from 'react-router-dom';

interface FooterNavProps {
  className?: string;
}

export function FooterNav({ className = '' }: FooterNavProps) {
  return (
    <nav
      role="navigation"
      aria-label="メインナビゲーション"
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex h-14">
        <NavLink
          to="/view"
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
            ${isActive
              ? 'text-primary bg-primary/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => (
            <>
              <svg
                className="w-6 h-6"
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isActive ? 0 : 2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="text-xs font-medium">記録閲覧</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/input"
          className={({ isActive }) => `
            flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
            ${isActive
              ? 'text-primary bg-primary/5'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {({ isActive }) => (
            <>
              <svg
                className="w-6 h-6"
                fill={isActive ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isActive ? 0 : 2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span className="text-xs font-medium">記録入力</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
