/**
 * スタッフ用記録入力ページ
 * Phase 15.8: ベースページ簡素化
 *
 * 品物リスト表示のみ。入力は各品物のダイアログで完結。
 * 設計書: docs/STAFF_RECORD_FORM_SPEC.md セクション11
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useMealFormSettings } from '../hooks/useMealFormSettings';
import { MealSettingsModal } from '../components/MealSettingsModal';
import { ItemBasedSnackRecord } from '../components/meal';
import { useDemoMode } from '../hooks/useDemoMode';

export function MealInputPage() {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';
  const isDemo = useDemoMode();
  const backPath = isDemo ? '/demo/view' : '/view';

  const { settings, isLoading: isSettingsLoading, saveSettings } = useMealFormSettings();
  // showSuccess削除: useOptimisticSubmitのトースト通知に統一
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <Layout>
      {/* ヘッダー */}
      <header className="z-20 bg-gradient-to-r from-primary to-primary-dark text-white shadow-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to={backPath}
              className="p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="記録閲覧に戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold">
                記録入力
                {isAdminMode && (
                  <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                    管理者モード
                  </span>
                )}
              </h1>
              <p className="text-xs text-white/70">品物の提供・摂食を記録</p>
            </div>
          </div>
          {/* 設定ボタン（adminモードのみ表示） */}
          {isAdminMode && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="初期値設定"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* 設定モーダル（adminモードのみ） */}
      {isAdminMode && (
        <MealSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={saveSettings}
        />
      )}

      {/* 成功トースト: useOptimisticSubmitのsonner通知に統一 */}

      {/* ローディング */}
      {isSettingsLoading && (
        <div className="p-4 text-center text-gray-500">
          設定を読み込み中...
        </div>
      )}

      {/* メインコンテンツ: 品物リストのみ */}
      {!isSettingsLoading && (
        <div className="pb-16">
          {/* Phase 15.8: 品物から記録（メインエリア） */}
          {/* 入力は各品物のダイアログで完結 */}
          {/* onRecordComplete削除: useOptimisticSubmitのトースト通知に統一 */}
          <ItemBasedSnackRecord
            residentId="resident-001"
          />
        </div>
      )}
    </Layout>
  );
}
