/**
 * 未設定日一覧モーダル
 * Phase 38: 全ての未設定日を表示し、登録/スキップを選択
 */

import { useState, useMemo } from 'react';
import { WEEKDAY_LABELS } from '../../types/careItem';
import type { UnscheduledDate } from '../../types/skipDate';
import { formatDateDisplay } from '../../utils/scheduleUtils';

interface UnscheduledDatesModalProps {
  /** モーダル表示状態 */
  isOpen: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** 未設定日リスト */
  unscheduledDates: UnscheduledDate[];
  /** 日付クリック時（品物登録へ遷移） */
  onDateClick: (date: string) => void;
  /** 「提供なし」設定時 */
  onMarkAsSkip: (date: string) => void;
  /** スキップ処理中のフラグ */
  isSkipping?: boolean;
}

type ViewMode = 'all' | 'weekday' | 'weekend';

export function UnscheduledDatesModal({
  isOpen,
  onClose,
  unscheduledDates,
  onDateClick,
  onMarkAsSkip,
  isSkipping = false,
}: UnscheduledDatesModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  // フィルタリングされた日付
  const filteredDates = useMemo(() => {
    switch (viewMode) {
      case 'weekday':
        return unscheduledDates.filter((ud) => !ud.isWeekend);
      case 'weekend':
        return unscheduledDates.filter((ud) => ud.isWeekend);
      default:
        return unscheduledDates;
    }
  }, [unscheduledDates, viewMode]);

  // 月ごとにグループ化
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, UnscheduledDate[]> = {};

    filteredDates.forEach((ud) => {
      const [year, month] = ud.date.split('-');
      const key = `${year}-${month}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(ud);
    });

    return Object.entries(groups).map(([key, dates]) => {
      const [year, month] = key.split('-');
      return {
        label: `${parseInt(month)}月`,
        year,
        dates,
      };
    });
  }, [filteredDates]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              📅 未設定日一覧
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* フィルタータブ */}
          <div className="flex gap-2 mt-3">
            {[
              { value: 'all', label: `全て (${unscheduledDates.length})` },
              { value: 'weekday', label: `平日 (${unscheduledDates.filter(d => !d.isWeekend).length})` },
              { value: 'weekend', label: `週末 (${unscheduledDates.filter(d => d.isWeekend).length})` },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setViewMode(tab.value as ViewMode)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  viewMode === tab.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredDates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              該当する日付がありません
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByMonth.map((group) => (
                <div key={`${group.year}-${group.label}`}>
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">
                    {group.label}
                  </h3>
                  <div className="space-y-2">
                    {group.dates.map((ud) => (
                      <div
                        key={ud.date}
                        className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              ud.isWeekend
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {new Date(ud.date).getDate()}
                          </div>
                          <div>
                            <div className={`font-medium ${ud.isWeekend ? 'text-red-600' : 'text-gray-800'}`}>
                              {formatDateDisplay(ud.date)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {WEEKDAY_LABELS[ud.dayOfWeek]}曜日
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onDateClick(ud.date)}
                            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            品物を登録
                          </button>
                          <button
                            onClick={() => onMarkAsSkip(ud.date)}
                            disabled={isSkipping}
                            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                          >
                            提供なし
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white border-t px-4 py-3">
          <p className="text-xs text-gray-500 text-center">
            「提供なし」を設定すると、この通知から除外されます
          </p>
        </div>
      </div>
    </div>
  );
}

export default UnscheduledDatesModal;
