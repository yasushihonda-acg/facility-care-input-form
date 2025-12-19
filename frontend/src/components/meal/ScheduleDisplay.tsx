/**
 * ScheduleDisplay - スタッフ向けスケジュール表示コンポーネント
 * Phase 13.2: スタッフ向けスケジュール表示強化
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション4
 */

import type { ServingSchedule } from '../../types/careItem';
import { WEEKDAY_LABELS } from '../../types/careItem';
import {
  formatScheduleDisplay,
  isScheduledForToday,
  getTodayScheduleMessage,
  getNextScheduledDateDisplay,
  getScheduleWeekdays,
  getTimeSlotLabel,
} from '../../utils/scheduleUtils';
import { WeekdayBadges } from './WeekdayBadges';

interface ScheduleDisplayProps {
  schedule: ServingSchedule | undefined;
  /** コンパクト表示（品物カード用） */
  compact?: boolean;
}

export function ScheduleDisplay({ schedule, compact = false }: ScheduleDisplayProps) {
  if (!schedule) return null;

  const isToday = isScheduledForToday(schedule);
  const todayMessage = getTodayScheduleMessage(schedule);
  const nextDateDisplay = getNextScheduledDateDisplay(schedule);
  const timeSlotLabel = getTimeSlotLabel(schedule);
  const weekdays = getScheduleWeekdays(schedule);

  // スケジュールタイプに応じた表示
  const scheduleLabel = getScheduleLabel(schedule);

  if (compact) {
    return (
      <div className="flex flex-col gap-1 text-sm">
        {/* メインスケジュール表示 */}
        <div className="flex items-center gap-2 text-blue-600">
          <span>📅</span>
          <span className="font-medium">
            {scheduleLabel}
            {timeSlotLabel && <span className="ml-1">{timeSlotLabel}</span>}
          </span>
        </div>

        {/* 曜日バッジ（weeklyの場合） */}
        {schedule.type === 'weekly' && weekdays.length > 0 && (
          <WeekdayBadges weekdays={weekdays} />
        )}

        {/* 今日/次回表示 */}
        {isToday && todayMessage && (
          <div className="flex items-center gap-1 text-amber-600 font-medium">
            <span>↳</span>
            <span>{todayMessage}</span>
          </div>
        )}
        {!isToday && nextDateDisplay && (
          <div className="flex items-center gap-1 text-gray-500">
            <span>↳</span>
            <span>次回: {nextDateDisplay}</span>
          </div>
        )}

        {/* 補足メモ */}
        {schedule.note && (
          <div className="flex items-center gap-1 text-gray-600 italic">
            <span>💬</span>
            <span>「{schedule.note}」</span>
          </div>
        )}
      </div>
    );
  }

  // 詳細表示（モーダル用など）
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-600">
        <span className="text-lg">📅</span>
        <span className="font-medium text-base">
          {formatScheduleDisplay(schedule)}
        </span>
      </div>

      {schedule.type === 'weekly' && weekdays.length > 0 && (
        <div className="ml-6">
          <WeekdayBadges weekdays={weekdays} size="lg" />
        </div>
      )}

      {isToday && todayMessage && (
        <div className="flex items-center gap-2 ml-6 text-amber-600 font-medium">
          <span>✓</span>
          <span>{todayMessage}</span>
        </div>
      )}

      {!isToday && nextDateDisplay && (
        <div className="flex items-center gap-2 ml-6 text-gray-600">
          <span>→</span>
          <span>次回提供予定: {nextDateDisplay}</span>
        </div>
      )}

      {schedule.note && (
        <div className="flex items-start gap-2 ml-6 text-gray-600 bg-gray-50 p-2 rounded">
          <span>💬</span>
          <span className="italic">「{schedule.note}」</span>
        </div>
      )}
    </div>
  );
}

/**
 * スケジュールタイプに応じたラベルを取得
 */
function getScheduleLabel(schedule: ServingSchedule): string {
  switch (schedule.type) {
    case 'once':
      if (schedule.date) {
        const date = new Date(schedule.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
      return '';

    case 'daily':
      return '毎日';

    case 'weekly':
      if (schedule.weekdays && schedule.weekdays.length > 0) {
        const sortedWeekdays = [...schedule.weekdays].sort((a, b) => a - b);
        return sortedWeekdays.map(w => WEEKDAY_LABELS[w]).join('・');
      }
      return '曜日指定';

    case 'specific_dates':
      if (schedule.dates && schedule.dates.length > 0) {
        if (schedule.dates.length <= 3) {
          return schedule.dates.map(d => {
            const date = new Date(d);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }).join(', ');
        }
        return `${schedule.dates.length}日間`;
      }
      return '複数日';

    default:
      return '';
  }
}
