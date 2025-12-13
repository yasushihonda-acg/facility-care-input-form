import { useState, useRef, useEffect } from 'react';
import { Header } from '../components/Header';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useSheetList, useSheetRecords } from '../hooks/usePlanData';
import { useSync } from '../hooks/useSync';

export function HomePage() {
  const { sheets, isLoading: sheetsLoading, error: sheetsError } = useSheetList();
  const { lastSyncedAt } = useSync();
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const tabsRef = useRef<HTMLDivElement>(null);

  // 最初のシートを選択
  useEffect(() => {
    if (sheets.length > 0 && !selectedSheet) {
      setSelectedSheet(sheets[0].sheetName);
    }
  }, [sheets, selectedSheet]);

  // 選択中のシートのレコードを取得
  const {
    records,
    isLoading: recordsLoading,
    error: recordsError
  } = useSheetRecords(selectedSheet);

  const handleTabClick = (sheetName: string) => {
    setSelectedSheet(sheetName);
  };

  const getNextSyncMinutes = () => {
    if (!lastSyncedAt) return 15;
    const elapsed = Date.now() - lastSyncedAt.getTime();
    const remaining = Math.max(0, 15 * 60 * 1000 - elapsed);
    return Math.ceil(remaining / 60000);
  };

  const selectedSheetInfo = sheets.find(s => s.sheetName === selectedSheet);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="介護記録ビューア" />

      {/* エラー表示 */}
      {sheetsError && (
        <div className="p-4">
          <ErrorMessage
            message={sheetsError}
            onRetry={() => window.location.reload()}
          />
        </div>
      )}

      {/* シート読み込み中 */}
      {sheetsLoading && (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="シート一覧を読み込み中..." />
        </div>
      )}

      {/* メインコンテンツ */}
      {!sheetsLoading && !sheetsError && (
        <>
          {sheets.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p>データがありません</p>
                <p className="text-sm mt-2">同期ボタンを押してデータを取得してください</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* タブバー */}
              <div
                ref={tabsRef}
                className="bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0"
              >
                <div className="flex min-w-max">
                  {sheets.map((sheet) => (
                    <button
                      key={sheet.sheetName}
                      onClick={() => handleTabClick(sheet.sheetName)}
                      className={`
                        px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                        ${selectedSheet === sheet.sheetName
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      {sheet.sheetName}
                      <span className="ml-1 text-xs text-gray-400">
                        ({sheet.recordCount})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* テーブルエリア */}
              <div className="flex-1 flex flex-col min-h-0 pb-12">
                {recordsLoading && (
                  <div className="flex-1 flex items-center justify-center">
                    <LoadingSpinner message="レコードを読み込み中..." />
                  </div>
                )}

                {recordsError && (
                  <div className="p-4">
                    <ErrorMessage
                      message={recordsError}
                      onRetry={() => window.location.reload()}
                    />
                  </div>
                )}

                {!recordsLoading && !recordsError && selectedSheetInfo && (
                  <DataTable
                    records={records}
                    headers={selectedSheetInfo.headers}
                    sheetName={selectedSheet}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* フッター */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 text-center text-xs text-gray-400">
        次回自動同期: {getNextSyncMinutes()}分後
      </footer>
    </div>
  );
}
