import { useSync } from '../hooks/useSync';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Header({ title, showBack, onBack }: HeaderProps) {
  const { sync, isSyncing, lastSyncedAt } = useSync();

  const formatTime = (date: Date | null) => {
    if (!date) return '未同期';
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header className="sticky top-0 z-10 bg-blue-500 text-white shadow-md">
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
            同期中...
          </span>
        )}
      </div>
    </header>
  );
}
