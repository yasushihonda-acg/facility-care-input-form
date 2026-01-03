/**
 * ProtectedRoute - 認証ガードコンポーネント
 * Phase 52: Firebase Authentication
 *
 * 認証済み + 許可リストに含まれるユーザーのみアクセス可能
 *
 * E2Eテスト時は VITE_E2E_TEST=true で認証をバイパス可能
 */

import { type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
  children: ReactNode;
}

// E2Eテストモード判定
const isE2ETest = import.meta.env.VITE_E2E_TEST === 'true';

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isAllowed, isCheckingPermission } = useAuth();

  // E2Eテストモードの場合は認証をバイパス
  if (isE2ETest) {
    return <>{children}</>;
  }

  // 認証状態の読み込み中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証 → ログインページ表示
  if (!user) {
    return <LoginPage />;
  }

  // 許可チェック中
  if (isCheckingPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">アクセス権限を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証済みだが許可されていない → ログインページで拒否メッセージ表示
  if (!isAllowed) {
    return <LoginPage />;
  }

  // 認証済み + 許可済み → コンテンツ表示
  return <>{children}</>;
}
