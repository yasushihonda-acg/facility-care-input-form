/**
 * 日付範囲タブコンポーネント
 * Phase 38: 品物管理の日付範囲 + スケジュールパターンフィルタ
 */

import type { DateRangeType, SchedulePatternType } from '../../types/skipDate';
import { DATE_RANGE_LABELS, SCHEDULE_PATTERN_LABELS } from '../../types/skipDate';

interface DateRangeTabsProps {
  /** 選択中の日付範囲 */
  dateRange: DateRangeType;
  /** 選択中のスケジュールパターン */
  schedulePattern: SchedulePatternType;
  /** 日付範囲変更ハンドラ */
  onDateRangeChange: (range: DateRangeType) => void;
  /** スケジュールパターン変更ハンドラ */
  onSchedulePatternChange: (pattern: SchedulePatternType) => void;
  /** 各範囲の品物数（オプション） */
  counts?: {
    today: number;
    this_week: number;
    this_month: number;
    all: number;
  };
}

const dateRangeOptions: DateRangeType[] = ['all', 'today', 'this_week', 'this_month'];
const patternOptions: SchedulePatternType[] = ['all', 'daily', 'weekly', 'monthly'];

export function DateRangeTabs({
  dateRange,
  schedulePattern,
  onDateRangeChange,
  onSchedulePatternChange,
  counts,
}: DateRangeTabsProps) {
  return (
    <div className="space-y-2 px-4 py-2 bg-gray-50 border-b">
      {/* 日付範囲タブ */}
      <div className="flex gap-2 overflow-x-auto">
        {dateRangeOptions.map((range) => (
          <button
            key={range}
            onClick={() => onDateRangeChange(range)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              dateRange === range
                ? 'bg-primary text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {DATE_RANGE_LABELS[range]}
            {counts && counts[range] !== undefined && (
              <span className="ml-1 text-xs opacity-75">({counts[range]})</span>
            )}
          </button>
        ))}
      </div>

      {/* スケジュールパターンタブ（日付範囲が「全て」以外の場合のみ表示） */}
      {dateRange !== 'all' && (
        <div className="flex gap-2 overflow-x-auto">
          <span className="text-xs text-gray-500 self-center mr-1">パターン:</span>
          {patternOptions.map((pattern) => (
            <button
              key={pattern}
              onClick={() => onSchedulePatternChange(pattern)}
              className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                schedulePattern === pattern
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {SCHEDULE_PATTERN_LABELS[pattern]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DateRangeTabs;
