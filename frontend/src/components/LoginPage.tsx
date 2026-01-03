/**
 * LoginPage - ログインページ
 * Phase 52: Firebase Authentication
 */

import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { signInWithGoogle, isLoading, error, user, isAllowed, isCheckingPermission, signOut } = useAuth();

  // 認証済みだが許可されていない場合
  if (user && !isCheckingPermission && !isAllowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            アクセスが許可されていません
          </h1>
          <p className="text-gray-600 mb-4">
            このアカウント（{user.email}）はアクセスを許可されていません。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            アクセスが必要な場合は、管理者にお問い合わせください。
          </p>
          <button
            onClick={signOut}
            className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            別のアカウントでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏠</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            介護記録管理システム
          </h1>
          <p className="text-gray-600">
            Googleアカウントでログインしてください
          </p>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* ログインボタン */}
        <button
          onClick={signInWithGoogle}
          disabled={isLoading || isCheckingPermission}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading || isCheckingPermission ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <span>確認中...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Googleでログイン</span>
            </>
          )}
        </button>

        {/* 説明 */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            ログイン可能なアカウント
          </h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>@aozora-cg.com ドメインのアカウント</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>個別に許可されたアカウント</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
