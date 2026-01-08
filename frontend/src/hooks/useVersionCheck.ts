import { useEffect } from 'react';

// ビルド時に埋め込まれるタイムスタンプ
declare const __BUILD_TIMESTAMP__: string;

const VERSION_CHECK_KEY = 'app_version';
const LAST_CHECK_KEY = 'last_version_check';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5分ごとにチェック

/**
 * 起動時にバージョンをチェックし、古ければ自動リロード
 *
 * 動作:
 * 1. サーバーの version.json を取得
 * 2. ローカルのビルドタイムスタンプと比較
 * 3. 異なれば強制リロード（キャッシュ無視）
 *
 * これにより、ユーザーが手動でキャッシュクリアしなくても
 * 新しいバージョンがデプロイされたら自動的に更新される
 */
export function useVersionCheck() {
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // 前回チェックから5分以内なら再チェックしない（リロードループ防止）
        const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
        const now = Date.now();
        if (lastCheck && now - parseInt(lastCheck, 10) < CHECK_INTERVAL) {
          return;
        }
        localStorage.setItem(LAST_CHECK_KEY, now.toString());

        // サーバーから最新バージョンを取得（キャッシュ無視）
        const response = await fetch('/version.json', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) {
          console.warn('[PWA] version.json not found, skipping version check');
          return;
        }

        const serverVersion = await response.json();
        const currentVersion = __BUILD_TIMESTAMP__;

        console.log('[PWA] Version check:', {
          current: currentVersion,
          server: serverVersion.version
        });

        // バージョンが異なる場合
        if (serverVersion.version !== currentVersion) {
          console.log('[PWA] New version detected, reloading...');

          // ローカルストレージに新しいバージョンを保存
          localStorage.setItem(VERSION_CHECK_KEY, serverVersion.version);

          // Service Workerのキャッシュをクリア
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('[PWA] All caches cleared');
          }

          // 強制リロード（キャッシュ無視）
          window.location.reload();
        }
      } catch (error) {
        console.warn('[PWA] Version check failed:', error);
      }
    };

    // 初回チェック
    checkVersion();

    // バックグラウンドでも定期チェック（visibilitychange時）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
