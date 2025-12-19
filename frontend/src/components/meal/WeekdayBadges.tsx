/**
 * WeekdayBadges - 曜日バッジコンポーネント
 * Phase 13.2: スタッフ向けスケジュール表示強化
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション4.3
 *
 * 設計書より:
 * - ●: 提供予定日
 * - ◉: 提供予定日 かつ 今日（ハイライト）
 * - ○: 提供なし
 */

import { WEEKDAY_LABELS } from '../../types/careItem';

interface WeekdayBadgesProps {
  /** 提供予定の曜日配列 (0=日, 1=月, ..., 6=土) */
  weekdays: number[];
  /** サイズ: sm (デフォルト), lg */
  size?: 'sm' | 'lg';
}

export function WeekdayBadges({ weekdays, size = 'sm' }: WeekdayBadgesProps) {
  const today = new Date().getDay();

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  };

  return (
    <div className="flex items-center gap-1">
      {WEEKDAY_LABELS.map((label, index) => {
        const isScheduled = weekdays.includes(index);
        const isToday = index === today;

        // スタイル決定
        let bgClass = 'bg-gray-100 text-gray-400'; // 提供なし ○
        let borderClass = '';
        let fontClass = '';

        if (isScheduled && isToday) {
          // 提供予定日 かつ 今日 ◉
          bgClass = 'bg-amber-500 text-white';
          borderClass = 'ring-2 ring-amber-300';
          fontClass = 'font-bold';
        } else if (isScheduled) {
          // 提供予定日 ●
          bgClass = 'bg-blue-500 text-white';
          fontClass = 'font-medium';
        } else if (isToday) {
          // 今日（提供予定なし）
          borderClass = 'ring-1 ring-gray-300';
        }

        return (
          <div
            key={index}
            className={`
              ${sizeClasses[size]}
              ${bgClass}
              ${borderClass}
              ${fontClass}
              rounded-full flex items-center justify-center
              transition-colors
            `}
            title={`${label}曜日${isScheduled ? '（提供予定）' : ''}${isToday ? '（今日）' : ''}`}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
