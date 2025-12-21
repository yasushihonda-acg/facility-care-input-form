/**
 * スケジュール拡張ユーティリティ
 * Phase 13.1: 提供スケジュール判定・表示
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.5
 */

import type { ServingSchedule, ServingTimeSlot } from '../types/careItem';
import { SERVING_TIME_SLOT_LABELS, WEEKDAY_LABELS } from '../types/careItem';

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
 * 日付を M/D 形式でフォーマット（表示用）
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 今日が提供予定日かどうかを判定
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.5
 */
export function isScheduledForToday(schedule: ServingSchedule | undefined): boolean {
  if (!schedule) return false;

  const today = new Date();
  const todayStr = formatDateString(today);
  const todayWeekday = today.getDay(); // 0-6 (日曜始まり)

  // 開始日チェック（daily/weeklyの場合のみ）
  if (schedule.startDate && (schedule.type === 'daily' || schedule.type === 'weekly')) {
    if (todayStr < schedule.startDate) {
      return false; // 開始日より前は対象外
    }
  }

  switch (schedule.type) {
    case 'once':
      return schedule.date === todayStr;

    case 'daily':
      return true;

    case 'weekly':
      return schedule.weekdays?.includes(todayWeekday) ?? false;

    case 'specific_dates':
      return schedule.dates?.includes(todayStr) ?? false;

    default:
      return false;
  }
}

/**
 * 明日が提供予定日かどうかを判定
 */
export function isScheduledForTomorrow(schedule: ServingSchedule | undefined): boolean {
  if (!schedule) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDateString(tomorrow);
  const tomorrowWeekday = tomorrow.getDay();

  // 開始日チェック（daily/weeklyの場合のみ）
  if (schedule.startDate && (schedule.type === 'daily' || schedule.type === 'weekly')) {
    if (tomorrowStr < schedule.startDate) {
      return false; // 開始日より前は対象外
    }
  }

  switch (schedule.type) {
    case 'once':
      return schedule.date === tomorrowStr;

    case 'daily':
      return true;

    case 'weekly':
      return schedule.weekdays?.includes(tomorrowWeekday) ?? false;

    case 'specific_dates':
      return schedule.dates?.includes(tomorrowStr) ?? false;

    default:
      return false;
  }
}

/**
 * 次回の提供予定日を取得（最大30日先まで検索）
 */
export function getNextScheduledDate(schedule: ServingSchedule | undefined): Date | null {
  if (!schedule) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDateString(today);

  // 開始日が未来の場合は開始日から探索（daily/weeklyの場合のみ）
  let startFrom = today;
  if (schedule.startDate && (schedule.type === 'daily' || schedule.type === 'weekly')) {
    const startDate = new Date(schedule.startDate);
    startDate.setHours(0, 0, 0, 0);
    if (startDate > today) {
      startFrom = startDate;
    }
  }

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(startFrom);
    checkDate.setDate(checkDate.getDate() + i);
    const checkDateStr = formatDateString(checkDate);
    const checkWeekday = checkDate.getDay();

    switch (schedule.type) {
      case 'once':
        if (schedule.date && schedule.date >= todayStr) {
          return new Date(schedule.date);
        }
        return null;

      case 'daily':
        return checkDate;

      case 'weekly':
        if (schedule.weekdays?.includes(checkWeekday)) {
          return checkDate;
        }
        break;

      case 'specific_dates': {
        if (schedule.dates?.includes(checkDateStr)) {
          return checkDate;
        }
        // 最も近い日付を探す
        const futureDates = schedule.dates
          ?.filter(d => d >= todayStr)
          .sort();
        if (futureDates && futureDates.length > 0) {
          return new Date(futureDates[0]);
        }
        return null;
      }
    }
  }

  return null;
}

/**
 * スケジュールを表示用文字列にフォーマット
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.4
 */
export function formatScheduleDisplay(schedule: ServingSchedule | undefined): string {
  if (!schedule) return '';

  const timeSlotLabel = schedule.timeSlot
    ? SERVING_TIME_SLOT_LABELS[schedule.timeSlot]
    : '';

  let scheduleText = '';

  switch (schedule.type) {
    case 'once':
      scheduleText = schedule.date ? formatDateDisplay(schedule.date) : '';
      break;

    case 'daily':
      scheduleText = '毎日';
      // 開始日があれば追加
      if (schedule.startDate) {
        scheduleText += `（${formatDateDisplay(schedule.startDate)}〜）`;
      }
      break;

    case 'weekly':
      if (schedule.weekdays && schedule.weekdays.length > 0) {
        // 曜日を日曜始まりでソート
        const sortedWeekdays = [...schedule.weekdays].sort((a, b) => a - b);
        scheduleText = sortedWeekdays.map(w => WEEKDAY_LABELS[w]).join('・');
        // 開始日があれば追加
        if (schedule.startDate) {
          scheduleText += `（${formatDateDisplay(schedule.startDate)}〜）`;
        }
      }
      break;

    case 'specific_dates':
      if (schedule.dates && schedule.dates.length > 0) {
        const sortedDates = [...schedule.dates].sort();
        scheduleText = sortedDates.map(d => formatDateDisplay(d)).join(', ');
      }
      break;
  }

  // タイミングを結合
  if (scheduleText && timeSlotLabel) {
    return `${scheduleText} ${timeSlotLabel}`;
  }

  return scheduleText || timeSlotLabel || '';
}

/**
 * スケジュールを短い表示形式にフォーマット（カード用）
 */
export function formatScheduleShort(schedule: ServingSchedule | undefined): string {
  if (!schedule) return '';

  // 開始日が未来の場合のサフィックス
  const today = formatDateString(new Date());
  const startSuffix = (schedule.startDate && schedule.startDate > today &&
    (schedule.type === 'daily' || schedule.type === 'weekly'))
    ? ` (${formatDateDisplay(schedule.startDate)}〜)`
    : '';

  switch (schedule.type) {
    case 'once':
      return schedule.date ? `📅 ${formatDateDisplay(schedule.date)}` : '';

    case 'daily':
      return `📅 毎日${startSuffix}`;

    case 'weekly':
      if (schedule.weekdays && schedule.weekdays.length > 0) {
        const sortedWeekdays = [...schedule.weekdays].sort((a, b) => a - b);
        return `📅 ${sortedWeekdays.map(w => WEEKDAY_LABELS[w]).join('・')}${startSuffix}`;
      }
      return '';

    case 'specific_dates':
      if (schedule.dates && schedule.dates.length > 0) {
        if (schedule.dates.length <= 3) {
          return `📅 ${schedule.dates.map(d => formatDateDisplay(d)).join(', ')}`;
        }
        return `📅 ${schedule.dates.length}日間`;
      }
      return '';

    default:
      return '';
  }
}

/**
 * 後方互換: ServingSchedule → plannedServeDate への変換
 */
export function scheduleToPlannedDate(schedule: ServingSchedule | undefined): string | undefined {
  if (!schedule) return undefined;

  if (schedule.type === 'once' && schedule.date) {
    return schedule.date;
  }

  // once以外のタイプは単一日付に変換できない
  return undefined;
}

/**
 * 後方互換: plannedServeDate → ServingSchedule への変換
 */
export function plannedDateToSchedule(plannedDate: string | undefined): ServingSchedule | undefined {
  if (!plannedDate) return undefined;

  return {
    type: 'once',
    date: plannedDate,
    timeSlot: 'anytime',
  };
}

/**
 * 後方互換: preferredServingSchedule (テキスト) → ServingSchedule への変換を試みる
 * テキストからスケジュールを推測（完全ではない）
 */
export function parseScheduleFromText(text: string | undefined): ServingSchedule | undefined {
  if (!text) return undefined;

  const normalizedText = text.toLowerCase();

  // 「毎日」パターン
  if (normalizedText.includes('毎日')) {
    let timeSlot: ServingTimeSlot = 'anytime';
    if (normalizedText.includes('朝')) timeSlot = 'breakfast';
    else if (normalizedText.includes('昼')) timeSlot = 'lunch';
    else if (normalizedText.includes('夕') || normalizedText.includes('夜')) timeSlot = 'dinner';
    else if (normalizedText.includes('おやつ')) timeSlot = 'snack';

    return {
      type: 'daily',
      timeSlot,
      note: text,
    };
  }

  // 曜日パターン（例: 「月・水・金」「月曜」）
  const weekdayMatches: number[] = [];
  const weekdayPatterns = [
    { pattern: /日(?:曜)?/g, day: 0 },
    { pattern: /月(?:曜)?/g, day: 1 },
    { pattern: /火(?:曜)?/g, day: 2 },
    { pattern: /水(?:曜)?/g, day: 3 },
    { pattern: /木(?:曜)?/g, day: 4 },
    { pattern: /金(?:曜)?/g, day: 5 },
    { pattern: /土(?:曜)?/g, day: 6 },
  ];

  for (const { pattern, day } of weekdayPatterns) {
    if (pattern.test(text)) {
      if (!weekdayMatches.includes(day)) {
        weekdayMatches.push(day);
      }
    }
  }

  if (weekdayMatches.length > 0) {
    let timeSlot: ServingTimeSlot = 'anytime';
    if (normalizedText.includes('朝')) timeSlot = 'breakfast';
    else if (normalizedText.includes('昼')) timeSlot = 'lunch';
    else if (normalizedText.includes('夕') || normalizedText.includes('夜')) timeSlot = 'dinner';
    else if (normalizedText.includes('おやつ')) timeSlot = 'snack';

    return {
      type: 'weekly',
      weekdays: weekdayMatches.sort((a, b) => a - b),
      timeSlot,
      note: text,
    };
  }

  // 解析できない場合は undefined（手動設定を促す）
  return undefined;
}

/**
 * スケジュールのバリデーション
 */
export function isValidSchedule(schedule: ServingSchedule | undefined): boolean {
  if (!schedule) return true; // undefined は有効（未設定）

  switch (schedule.type) {
    case 'once':
      return !!schedule.date;

    case 'daily':
      return true;

    case 'weekly':
      return !!schedule.weekdays && schedule.weekdays.length > 0;

    case 'specific_dates':
      return !!schedule.dates && schedule.dates.length > 0;

    default:
      return false;
  }
}

/**
 * 空のスケジュールを作成（デフォルト値）
 */
export function createEmptySchedule(type: ServingSchedule['type'] = 'once'): ServingSchedule {
  return {
    type,
    timeSlot: 'snack', // デフォルトはおやつ時
  };
}

// ===== Phase 13.2: スタッフ向けスケジュール表示強化 =====

/**
 * 次回の提供予定日を表示用文字列でフォーマット
 * @returns "12/23（月）" 形式、または null
 */
export function getNextScheduledDateDisplay(schedule: ServingSchedule | undefined): string | null {
  const nextDate = getNextScheduledDate(schedule);
  if (!nextDate) return null;

  const month = nextDate.getMonth() + 1;
  const day = nextDate.getDate();
  const weekday = WEEKDAY_LABELS[nextDate.getDay()];

  return `${month}/${day}（${weekday}）`;
}

/**
 * 今日がスケジュールに該当する場合のメッセージを取得
 * @returns "今日は金曜日 ✓" 形式、または null
 */
export function getTodayScheduleMessage(schedule: ServingSchedule | undefined): string | null {
  if (!schedule || !isScheduledForToday(schedule)) return null;

  const today = new Date();
  const weekday = WEEKDAY_LABELS[today.getDay()];

  switch (schedule.type) {
    case 'daily':
      return '今日も提供予定 ✓';

    case 'weekly':
      return `今日は${weekday}曜日 ✓`;

    case 'once':
    case 'specific_dates':
      return '今日が提供予定日 ✓';

    default:
      return null;
  }
}

/**
 * スケジュールの曜日配列を取得（weeklyタイプのみ）
 */
export function getScheduleWeekdays(schedule: ServingSchedule | undefined): number[] {
  if (!schedule || schedule.type !== 'weekly') return [];
  return schedule.weekdays ?? [];
}

/**
 * タイムスロットのラベルを取得
 */
export function getTimeSlotLabel(schedule: ServingSchedule | undefined): string {
  if (!schedule || !schedule.timeSlot) return '';
  return SERVING_TIME_SLOT_LABELS[schedule.timeSlot];
}
