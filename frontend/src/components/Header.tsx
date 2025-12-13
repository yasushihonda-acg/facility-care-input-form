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
      <header className="sticky top-0 z-20 bg-blue-500 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-blue-600 transition-colors"
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
            <h1 className="text-lg font-bold">{title}</h1>
          </div>

          <button
            onClick={sync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`}
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
            <span className="text-sm">{isSyncing ? '同期中...' : '同期'}</span>
          </button>
        </div>

        <div className="px-4 pb-2 text-xs text-blue-100">
          最終同期: {formatTime(lastSyncedAt)}
          {isSyncing && (
            <span className="ml-2 inline-flex items-center">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
              スプレッドシートから同期中...
            </span>
          )}
        </div>
      </header>

      {/* トースト通知 */}
      {showToast && (
        <div
          className={`
            fixed top-20 left-1/2 -translate-x-1/2 z-50
            px-4 py-2 rounded-lg shadow-lg
            transition-all duration-300
            ${toastType === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
          `}
        >
          <div className="flex items-center gap-2">
            {toastType === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
