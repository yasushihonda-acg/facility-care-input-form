import { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { DataTable } from '../components/DataTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { YearPaginator } from '../components/YearPaginator';
import { MonthFilter } from '../components/MonthFilter';
import { Layout } from '../components/Layout';
import { ChatFloatingButton, ChatDrawer } from '../components/chat';
import { ViewTabNavigation, ChartsTab, CorrelationTab, type ViewTabType } from '../components/view';
import { useSheetList, useSheetRecords } from '../hooks/usePlanData';
import { useChatWithRecords } from '../hooks/useChatWithRecords';
import { useDemoMode } from '../hooks/useDemoMode';
import { useMealFormSettings } from '../hooks/useMealFormSettings';

export function ViewPage() {
  const { sheets: allSheets, isLoading: sheetsLoading, error: sheetsError, lastSyncedAt: apiLastSyncedAt } = useSheetList();
  const { settings } = useMealFormSettings();
  const isDemo = useDemoMode();
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<ViewTabType>('data');
  const tabsRef = useRef<HTMLDivElement>(null);

  // 非表示シートをフィルタリング
  const sheets = useMemo(() => {
    const hiddenSheets = settings?.hiddenSheets ?? [];
    return allSheets.filter((sheet) => !hiddenSheets.includes(sheet.sheetName));
  }, [allSheets, settings?.hiddenSheets]);

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

  // 選択中のシートのレコードを取得（年月フィルタ付き）
  // 月が選択されている場合のみ月フィルタを適用
  const {
    records,
    isLoading: recordsLoading,
    error: recordsError
  } = useSheetRecords({
    sheetName: selectedSheet,
    year: selectedYear,
    month: selectedMonth,
  });

  // 年リスト（2024年〜現在年の固定値）
  // データは2024年9月から存在するため、2024年を最古として固定
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y >= 2024; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // 月カウント用（選択年の全データを取得 - 月フィルタなし）
  const {
    records: yearRecords,
    isLoading: yearRecordsLoading,
  } = useSheetRecords({
    sheetName: selectedSheet,
    year: selectedYear,
    // month undefined → 選択年の全データ取得
  });

  // 初期表示時のみ最新データ年を選択（その後はデータなしの年も選択可能）
  useEffect(() => {
    if (availableYears.length > 0 && selectedYear === new Date().getFullYear() && !availableYears.includes(selectedYear)) {
      // 初期値（今年）にデータがない場合のみ、最新データ年に変更
      setSelectedYear(availableYears[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableYears.length]); // 初期ロード時のみ実行

  // ローディング状態の統合
  const isRecordsLoading = recordsLoading || yearRecordsLoading;

  // 月ごとの件数（選択年の全データから計算 - 月フィルタの影響を受けない）
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    yearRecords.forEach(record => {
      if (record.timestamp) {
        const monthMatch = record.timestamp.match(/^\d{4}\/(\d{1,2})/);
        if (monthMatch) {
          const month = parseInt(monthMatch[1], 10);
          counts[month] = (counts[month] || 0) + 1;
        }
      }
    });
    return counts;
  }, [yearRecords]);

  // サーバーサイドでフィルタ済みのレコードを使用
  const filteredRecords = records;

  const handleTabClick = (sheetName: string) => {
    setSelectedSheet(sheetName);
    setSelectedMonth(null); // シート変更時は月フィルタをリセット
  };

  // 年変更時は月フィルタをリセット
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth(null);
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
    <Layout stickyHeader>
      <Header title="介護記録ビューア" sticky />

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
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* 年・月フィルタ + ビュータブ（sticky固定） */}
              <div className="sticky top-0 z-20 bg-white shadow-sm">
                {availableYears.length > 0 && (
                  <YearPaginator
                    selectedYear={selectedYear}
                    availableYears={availableYears}
                    onYearChange={handleYearChange}
                  />
                )}
                <MonthFilter
                  selectedMonth={selectedMonth}
                  monthCounts={monthCounts}
                  onMonthChange={setSelectedMonth}
                />
                <ViewTabNavigation
                  activeTab={activeViewTab}
                  onTabChange={setActiveViewTab}
                />
              </div>

              {/* 相関分析タブ */}
              {activeViewTab === 'correlation' && (
                <CorrelationTab />
              )}

              {/* グラフタブ */}
              {activeViewTab === 'charts' && (
                <ChartsTab year={selectedYear} month={selectedMonth} />
              )}

              {/* データタブ - シートタブバー */}
              {activeViewTab === 'data' && (
                <>
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
                {isRecordsLoading && (
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

                {!isRecordsLoading && !recordsError && selectedSheetInfo && (
                  <DataTable
                    records={filteredRecords}
                    headers={selectedSheetInfo.headers}
                    sheetName={selectedSheet}
                  />
                )}
              </div>
              </>
              )}

              {/* 同期情報（フッターナビ上のバー） */}
              <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
                {apiLastSyncedAt && (
                  <span>最終同期: {new Date(apiLastSyncedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} / </span>
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
