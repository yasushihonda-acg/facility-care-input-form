/**
 * PWA更新通知コンポーネント
 * 新しいバージョンが利用可能になった際にユーザーに通知し、リロードを促す
 */

import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      // Service Workerが登録されたら、定期的に更新をチェック
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000); // 1分ごとにチェック
      }
      console.log(`[PWA] Service Worker registered: ${swUrl}`);
    },
    onRegisterError(error: Error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">新しいバージョンがあります</p>
          <p className="text-xs text-blue-200">更新して最新版をご利用ください</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-sm text-blue-200 hover:text-white transition-colors"
          >
            後で
          </button>
          <button
            onClick={handleUpdate}
            className="px-3 py-1.5 bg-white text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
          >
            更新
          </button>
        </div>
      </div>
    </div>
  );
}
