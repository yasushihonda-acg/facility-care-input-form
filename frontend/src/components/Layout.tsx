import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FooterNav } from './FooterNav';
import { DemoHeaderButton } from './demo/DemoHeaderButton';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  /** ヘッダータイトル（設定するとヘッダーが表示される） */
  title?: string;
  /** ヘッダーサブタイトル */
  subtitle?: string;
  /** 戻るボタンを表示するか */
  showBackButton?: boolean;
  /** ヘッダー右側の要素 */
  rightElement?: ReactNode;
}

export function Layout({
  children,
  showFooter = true,
  title,
  subtitle,
  showBackButton = false,
  rightElement,
}: LayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー（titleが設定されている場合のみ表示） */}
      {title && (
        <header className="bg-gradient-to-r from-primary to-primary-dark text-white sticky top-0 z-50 shadow-header">
          <div className="px-4 py-3 flex items-center justify-between">
            {/* 左側: 戻るボタン or スペーサー */}
            <div className="w-10 flex-shrink-0">
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 rounded-lg hover:bg-white/20 transition"
                  aria-label="戻る"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* 中央: タイトル */}
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold">{title}</h1>
              {subtitle && (
                <p className="text-xs text-white/80">{subtitle}</p>
              )}
            </div>

            {/* 右側: デモボタン + カスタム要素 */}
            <div className="w-auto flex-shrink-0 flex justify-end items-center gap-2">
              <DemoHeaderButton />
              {rightElement}
            </div>
          </div>
        </header>
      )}


      {/* メインコンテンツ */}
      <main className={`flex-1 flex flex-col overflow-x-hidden px-4 ${title ? 'py-4' : ''}`}>
        {children}
      </main>

      {/* フッターナビ */}
      {showFooter && <FooterNav />}

      {/* フッターナビの高さ分のパディング（Safe Area対応） */}
      {showFooter && (
        <div
          className="flex-shrink-0"
          style={{
            height: 'calc(64px + env(safe-area-inset-bottom, 0))'
          }}
        />
      )}
    </div>
  );
}
