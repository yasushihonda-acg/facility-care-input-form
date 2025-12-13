import { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { YearPaginator } from '../components/YearPaginator';
import { MonthFilter } from '../components/MonthFilter';
import { useSheetList, useSheetRecords } from '../hooks/usePlanData';
import { useSync } from '../hooks/useSync';

export function HomePage() {
  const { sheets, isLoading: sheetsLoading, error: sheetsError } = useSheetList();
  const { lastSyncedAt } = useSync();
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
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

  // 年の抽出
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    records.forEach(record => {
      if (record.timestamp) {
        const match = record.timestamp.match(/^(\d{4})/);
        if (match) {
          years.add(parseInt(match[1], 10));
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [records]);

  // 選択年が利用可能年にない場合、最新年に変更
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // 年でフィルタされたレコード
  const yearFilteredRecords = useMemo(() => {
    return records.filter(record => {
      if (!record.timestamp) return false;
      const match = record.timestamp.match(/^(\d{4})/);
      return match && parseInt(match[1], 10) === selectedYear;
    });
  }, [records, selectedYear]);

  // 月ごとの件数
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    yearFilteredRecords.forEach(record => {
      if (record.timestamp) {
        const match = record.timestamp.match(/^\d{4}\/(\d{1,2})/);
        if (match) {
          const month = parseInt(match[1], 10);
          counts[month] = (counts[month] || 0) + 1;
        }
      }
    });
    return counts;
  }, [yearFilteredRecords]);

  // 年+月でフィルタされたレコード
  const filteredRecords = useMemo(() => {
    if (selectedMonth === null) {
      return yearFilteredRecords;
    }
    return yearFilteredRecords.filter(record => {
      if (!record.timestamp) return false;
      const match = record.timestamp.match(/^\d{4}\/(\d{1,2})/);
      return match && parseInt(match[1], 10) === selectedMonth;
    });
  }, [yearFilteredRecords, selectedMonth]);

  const handleTabClick = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setSelectedMonth(null); // シート変更時は月フィルタをリセット
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
              {/* 年ページネーション */}
              {availableYears.length > 0 && (
                <YearPaginator
                  selectedYear={selectedYear}
                  availableYears={availableYears}
                  onYearChange={setSelectedYear}
                />
              )}

              {/* 月フィルタ */}
              <MonthFilter
                selectedMonth={selectedMonth}
                monthCounts={monthCounts}
                onMonthChange={setSelectedMonth}
              />

              {/* シートタブバー */}
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
                    records={filteredRecords}
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
