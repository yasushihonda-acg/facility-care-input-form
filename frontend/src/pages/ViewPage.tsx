import { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { YearPaginator } from '../components/YearPaginator';
import { MonthFilter } from '../components/MonthFilter';
import { Layout } from '../components/Layout';
import { ChatFloatingButton, ChatDrawer } from '../components/chat';
import { useSheetList, useSheetRecords } from '../hooks/usePlanData';
import { useSync } from '../hooks/useSync';
import { useChatWithRecords } from '../hooks/useChatWithRecords';
import { useDemoMode } from '../hooks/useDemoMode';

export function ViewPage() {
  const { sheets, isLoading: sheetsLoading, error: sheetsError } = useSheetList();
  const { lastSyncedAt } = useSync();
  const isDemo = useDemoMode();
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // AIチャットボット
  const {
    messages,
    suggestedQuestions,
    sendMessage,
    clearMessages,
    isLoading: chatLoading,
  } = useChatWithRecords({
    context: {
      sheetName: selectedSheet || undefined,
      year: selectedYear,
      month: selectedMonth,
    },
  });

  // 最初のシートを選択（初期値設定パターン：未選択時のみ発火）
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

  // 選択年が利用可能年にない場合、最新年に変更（無効な選択の補正パターン）
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

  // シート別アイコン定義（DESIGN_GUIDELINES.md準拠）
  const getSheetIcon = (sheetName: string) => {
    const icons: Record<string, string> = {
      '食事': '🍽️',
      '水分摂取量': '💧',
      '排便・排尿': '🚻',
      'バイタル': '❤️',
      '口腔ケア': '🦷',
      '内服': '💊',
      '特記事項': '📝',
      '血糖値インスリン投与': '💉',
      '往診録': '🩺',
      '体重': '⚖️',
      'カンファレンス録': '👥',
    };
    return icons[sheetName] || '📋';
  };

  // 次回同期までの分数を計算（Cloud Schedulerは毎時0分 = 60分間隔）
  const [nextSyncMinutes, setNextSyncMinutes] = useState(60);

  useEffect(() => {
    const updateSyncMinutes = () => {
      // Cloud Schedulerは毎時0分に実行されるため、次の00分までの残り時間を計算
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const remaining = nextHour.getTime() - now.getTime();
      setNextSyncMinutes(Math.ceil(remaining / 60000));
    };

    updateSyncMinutes();
    const interval = setInterval(updateSyncMinutes, 60000); // 1分ごとに更新
    return () => clearInterval(interval);
  }, []);

  const selectedSheetInfo = sheets.find(s => s.sheetName === selectedSheet);

  return (
    <Layout>
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
                className="bg-white border-b border-gray-200 overflow-x-auto flex-shrink-0 shadow-sm"
              >
                <div className="flex min-w-max gap-1 p-2">
                  {sheets.map((sheet) => (
                    <button
                      key={sheet.sheetName}
                      onClick={() => handleTabClick(sheet.sheetName)}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all
                        ${selectedSheet === sheet.sheetName
                          ? 'bg-primary text-white shadow-card'
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      <span className="text-base">{getSheetIcon(sheet.sheetName)}</span>
                      <span className="hidden sm:inline">{sheet.sheetName}</span>
                      <span className={`
                        ml-1 px-1.5 py-0.5 text-xs rounded-full
                        ${selectedSheet === sheet.sheetName
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-500'
                        }
                      `}>
                        {sheet.recordCount}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* テーブルエリア */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

              {/* 同期情報（フッターナビ上のバー） */}
              <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
                {lastSyncedAt && (
                  <span>最終同期: {lastSyncedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} / </span>
                )}
                次回自動同期: 毎時00分（約{nextSyncMinutes}分後）
              </div>
            </div>
          )}
        </>
      )}

      {/* AIチャットボット（Phase 45） */}
      <ChatFloatingButton onClick={() => setIsChatOpen(true)} />
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        suggestedQuestions={suggestedQuestions}
        onSendMessage={sendMessage}
        onClearMessages={clearMessages}
        isLoading={chatLoading}
        isDemo={isDemo}
      />
    </Layout>
  );
}
