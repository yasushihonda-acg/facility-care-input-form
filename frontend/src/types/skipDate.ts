/**
 * スキップ日（提供なし日）型定義
 *
 * 居住者レベルで「この日は提供なし」を設定するための型。
 * 品物ごとではなく、全品物に対する共通スキップ日として機能。
 */

export interface SkipDateConfig {
  id: string;
  residentId: string;
  date: string;           // YYYY-MM-DD
  reason?: string;        // 任意のメモ（例: "お正月のため"）
  createdAt: string;
  createdBy: string;
}

/**
 * 未設定日（スケジュールもスキップも設定されていない日）
 */
export interface UnscheduledDate {
  date: string;           // YYYY-MM-DD
  dayOfWeek: number;      // 0=日, 1=月, ..., 6=土
  isWeekend: boolean;
}

/**
 * 日付範囲フィルタのタイプ
 */
export type DateRangeType = 'today' | 'this_week' | 'this_month' | 'all';

/**
 * スケジュールパターンフィルタのタイプ
 */
export type SchedulePatternType = 'daily' | 'weekly' | 'monthly' | 'all';

/**
 * 日付範囲タブのラベル定義
 */
export const DATE_RANGE_LABELS: Record<DateRangeType, string> = {
  today: '今日',
  this_week: '今週',
  this_month: '今月',
  all: '全て',
};

/**
 * スケジュールパターンタブのラベル定義
 */
export const SCHEDULE_PATTERN_LABELS: Record<SchedulePatternType, string> = {
  daily: '日',
  weekly: '週',
  monthly: '月',
  all: '全て',
};
