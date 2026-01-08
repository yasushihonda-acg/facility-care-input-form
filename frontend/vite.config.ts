import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// ビルドタイムスタンプ（PWAバージョン識別用）
const buildTimestamp = new Date().toISOString();

// ビルド時にversion.jsonを生成（強制更新チェック用）
const versionPlugin = () => ({
  name: 'version-plugin',
  writeBundle() {
    const versionInfo = {
      version: buildTimestamp,
      buildTime: buildTimestamp,
    };
    writeFileSync(
      resolve(__dirname, 'dist', 'version.json'),
      JSON.stringify(versionInfo)
    );
  },
});

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 大きなライブラリを分離
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.svg'],
      manifest: {
        name: '介護記録ビューア',
        short_name: '介護記録',
        description: '介護施設向け記録閲覧アプリ',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-192x192.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-192x192.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // 新しいService Workerを即座にアクティブ化
        skipWaiting: true,
        // 全クライアント（タブ）を即座に制御
        clientsClaim: true,
        // 静的アセットのプリキャッシュ（HTMLのみ - JS/CSSはruntimeCachingで管理）
        globPatterns: ['**/*.{html,ico,png,svg}'],
        // ナビゲーションリクエストのフォールバック
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /version\.json/],
        runtimeCaching: [
          // JS/CSSファイル: ネットワーク優先（キャッシュは1時間で無効化）
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1時間
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10 // 10秒でタイムアウト→キャッシュにフォールバック
            }
          },
          // API: ネットワーク優先
          {
            urlPattern: /^https:\/\/asia-northeast1-facility-care-input-form\.cloudfunctions\.net\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 15 // 15分
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // version.json: 常にネットワークから取得（キャッシュしない）
          {
            urlPattern: /version\.json$/,
            handler: 'NetworkOnly'
          }
        ]
      }
    }),
    versionPlugin(),
  ],
})
