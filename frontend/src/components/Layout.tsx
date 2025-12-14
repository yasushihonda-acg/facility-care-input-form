import type { ReactNode } from 'react';
import { FooterNav } from './FooterNav';

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function Layout({ children, showFooter = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {children}
      {showFooter && <FooterNav />}
      {/* フッターナビの高さ分のパディング（Safe Area対応） */}
      {showFooter && (
        <div
          className="flex-shrink-0"
          style={{
            height: 'calc(56px + env(safe-area-inset-bottom, 0))'
          }}
        />
      )}
    </div>
  );
}
