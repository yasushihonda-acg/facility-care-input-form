/**
 * スケジュール判定ユーティリティ（サーバーサイド）
 * Phase 36: 開始日対応・taskGenerator構造化スケジュール対応
 *
 * フロントエンドの scheduleUtils.ts から必要な関数を移植
 */

import type { ServingSchedule } from '../types';

/**
 * 日付を YYYY-MM-DD 形式でフォーマット
 */
export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 指定日がスケジュール対象日か判定
 * @param schedule スケジュール
 * @param targetDate 判定対象の日付
 */
export function isScheduledForDate(
  schedule: ServingSchedule | undefined,
  targetDate: Date
): boolean {
  if (!schedule) return false;

  const targetStr = formatDateString(targetDate);
  const targetWeekday = targetDate.getDay(); // 0-6 (日曜始まり)

  // 開始日チェック（daily/weeklyの場合のみ）
  if (schedule.startDate && (schedule.type === 'daily' || schedule.type === 'weekly')) {
    if (targetStr < schedule.startDate) {
      return false; // 開始日より前は対象外
    }
  }

  switch (schedule.type) {
    case 'once':
      return schedule.date === targetStr;

    case 'daily':
      return true;

    case 'weekly':
      return schedule.weekdays?.includes(targetWeekday) ?? false;

    case 'specific_dates':
      return schedule.dates?.includes(targetStr) ?? false;

    default:
      return false;
  }
}

/**
 * 今日がスケジュール対象日か判定
 * @param schedule スケジュール
 */
export function isScheduledForToday(schedule: ServingSchedule | undefined): boolean {
  return isScheduledForDate(schedule, new Date());
}
