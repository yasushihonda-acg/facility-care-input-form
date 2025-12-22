/**
 * 日付範囲タブコンポーネント
 * Phase 38.1: 品物管理の日付範囲 + スケジュールパターンフィルタ
 * 折りたたみ式に改修（デフォルト非表示）
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
  /** 折りたたみ状態 */
  isCollapsed?: boolean;
  /** 折りたたみトグルハンドラ */
  onToggleCollapse?: () => void;
}

const dateRangeOptions: DateRangeType[] = ['all', 'today', 'this_week', 'this_month'];
const patternOptions: SchedulePatternType[] = ['all', 'daily', 'weekly', 'monthly'];

export function DateRangeTabs({
  dateRange,
  schedulePattern,
  onDateRangeChange,
  onSchedulePatternChange,
  counts,
  isCollapsed = true,
  onToggleCollapse,
}: DateRangeTabsProps) {
  return (
    <div className="border-b bg-gray-50">
      {/* 折りたたみトグル */}
      <button
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
          <span>🔍</span>
          詳細フィルタ
          {dateRange !== 'all' && (
            <span className="px-2 py-0.5 text-xs bg-primary text-white rounded-full">
              {DATE_RANGE_LABELS[dateRange]}
            </span>
          )}
          {schedulePattern !== 'all' && (
            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {SCHEDULE_PATTERN_LABELS[schedulePattern]}
            </span>
          )}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* フィルタ内容（展開時のみ表示） */}
      {!isCollapsed && (
        <div className="space-y-2 px-4 py-3 border-t border-gray-200">
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

          {/* リセットボタン */}
          {(dateRange !== 'all' || schedulePattern !== 'all') && (
            <button
              onClick={() => {
                onDateRangeChange('all');
                onSchedulePatternChange('all');
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              フィルタをリセット
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default DateRangeTabs;
