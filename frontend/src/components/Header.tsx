import { useEffect, useState } from 'react';
import { useSync } from '../hooks/useSync';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Header({ title, showBack, onBack }: HeaderProps) {
  const { sync, isSyncing, lastSyncedAt, syncResult, error } = useSync();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // 同期完了時のトースト表示
  useEffect(() => {
    if (syncResult && !isSyncing) {
      const data = syncResult.data;
      if (data) {
        setToastMessage(`${data.syncedSheets.length}シート ${data.totalRecords.toLocaleString()}件を同期しました`);
        setToastType('success');
        setShowToast(true);
      }
    }
  }, [syncResult, isSyncing]);

  // エラー時のトースト表示
  useEffect(() => {
    if (error) {
      setToastMessage(`同期エラー: ${error}`);
      setToastType('error');
      setShowToast(true);
    }
  }, [error]);

  // トースト自動非表示
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const formatTime = (date: Date | null) => {
    if (!date) return '未同期';
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-gradient-to-r from-primary to-primary-dark text-white shadow-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
                aria-label="戻る"
              >
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            {/* アイコン */}
            <div className="flex items-center justify-center w-9 h-9 bg-white/20 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{title}</h1>
              <p className="text-xs text-white/70">Care Record Viewer</p>
            </div>
          </div>

          <button
            onClick={sync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 disabled:opacity-50 transition-all shadow-sm"
          >
            <svg
              className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`}
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
            <span className="text-sm font-medium">{isSyncing ? '同期中...' : '同期'}</span>
          </button>
        </div>

        {/* 同期ステータスバッジ */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 rounded-full text-xs">
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isSyncing ? '同期中...' : `最終同期: ${formatTime(lastSyncedAt)}`}
          </span>
          {isSyncing && (
            <span className="text-xs text-white/60">
              スプレッドシートから取得中
            </span>
          )}
        </div>
      </header>

      {/* トースト通知 */}
      {showToast && (
        <div
          className={`
            fixed top-24 left-1/2 -translate-x-1/2 z-50
            px-4 py-3 rounded-xl shadow-card-hover
            transition-all duration-300 max-w-sm
            ${toastType === 'success' ? 'bg-secondary text-white' : 'bg-error text-white'}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${toastType === 'success' ? 'bg-white/20' : 'bg-white/20'}`}>
              {toastType === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
