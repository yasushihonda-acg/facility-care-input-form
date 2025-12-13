import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { SheetCard } from '../components/SheetCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useSheetList } from '../hooks/usePlanData';
import { useSync } from '../hooks/useSync';

export function HomePage() {
  const navigate = useNavigate();
  const { sheets, isLoading, error } = useSheetList();
  const { lastSyncedAt } = useSync();

  const handleSheetClick = (sheetName: string) => {
    navigate(`/sheet/${encodeURIComponent(sheetName)}`);
  };

  const getNextSyncMinutes = () => {
    if (!lastSyncedAt) return 15;
    const elapsed = Date.now() - lastSyncedAt.getTime();
    const remaining = Math.max(0, 15 * 60 * 1000 - elapsed);
    return Math.ceil(remaining / 60000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="介護記録ビューア" />

      <main className="p-4">
        {isLoading && <LoadingSpinner message="データを読み込み中..." />}

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && (
          <>
            {sheets.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>データがありません</p>
                <p className="text-sm mt-2">同期ボタンを押してデータを取得してください</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sheets.map((sheet) => (
                  <SheetCard
                    key={sheet.sheetName}
                    sheet={sheet}
                    onClick={() => handleSheetClick(sheet.sheetName)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 text-center text-xs text-gray-400">
        次回自動同期: {getNextSyncMinutes()}分後
      </footer>
    </div>
  );
}
