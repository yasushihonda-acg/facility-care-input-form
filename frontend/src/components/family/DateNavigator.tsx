/**
 * 日付ナビゲーションコンポーネント
 * Phase 38.2: 今日/今週/今月の矢印ナビゲーション + カレンダー選択
 *
 * @see docs/archive/PHASE_38_2_ITEM_MANAGEMENT_REDESIGN.md
 */

import { useMemo, useRef } from 'react';
import { WEEKDAY_LABELS } from '../../types/careItem';

export type DateViewMode = 'day' | 'week' | 'month';

interface DateNavigatorProps {
  /** 選択中の日付 */
  selectedDate: Date;
  /** 日付変更ハンドラ */
  onDateChange: (date: Date) => void;
  /** 表示モード */
  viewMode: DateViewMode;
  /** 表示モード変更ハンドラ */
  onViewModeChange: (mode: DateViewMode) => void;
}

/**
 * 日付をYYYY-MM-DD形式にフォーマット
 */
function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 週の開始日（月曜日）を取得
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 月曜日を週の開始に
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * 週の終了日（日曜日）を取得
 */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function DateNavigator({
  selectedDate,
  onDateChange,
  viewMode,
  onViewModeChange,
}: DateNavigatorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 今日かどうか
  const isToday = useMemo(() => {
    const today = new Date();
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  }, [selectedDate]);

  // 表示テキスト
  const displayText = useMemo(() => {
    switch (viewMode) {
      case 'day': {
        const m = selectedDate.getMonth() + 1;
        const d = selectedDate.getDate();
        const weekday = WEEKDAY_LABELS[selectedDate.getDay()];
        return isToday ? `今日 (${m}/${d} ${weekday})` : `${m}/${d} (${weekday})`;
      }
      case 'week': {
        const start = getWeekStart(selectedDate);
        const end = getWeekEnd(selectedDate);
        const sm = start.getMonth() + 1;
        const sd = start.getDate();
        const em = end.getMonth() + 1;
        const ed = end.getDate();
        return `${sm}/${sd} - ${em}/${ed}`;
      }
      case 'month': {
        const y = selectedDate.getFullYear();
        const m = selectedDate.getMonth() + 1;
        return `${y}年${m}月`;
      }
      default:
        return '';
    }
  }, [selectedDate, viewMode, isToday]);

  // 前へ移動
  const handlePrev = () => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    onDateChange(newDate);
  };

  // 次へ移動
  const handleNext = () => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    onDateChange(newDate);
  };

  // 今日に戻る
  const handleToday = () => {
    onDateChange(new Date());
  };

  // カレンダーから選択
  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onDateChange(new Date(value));
    }
  };

  // カレンダーアイコンクリック
  const handleCalendarClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
    }
  };

  // ビューモードボタン
  const viewModes: { value: DateViewMode; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '週' },
    { value: 'month', label: '月' },
  ];

  return (
    <div className="bg-white border-b px-4 py-3">
      {/* ビューモード選択 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                viewMode === mode.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
            >
              今日
            </button>
          )}
          <button
            onClick={handleCalendarClick}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="カレンダーで選択"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
          {/* Hidden date input for calendar picker */}
          <input
            ref={dateInputRef}
            type="date"
            value={formatDateString(selectedDate)}
            onChange={handleCalendarChange}
            className="absolute opacity-0 pointer-events-none"
            tabIndex={-1}
          />
        </div>
      </div>

      {/* 日付ナビゲーション */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="前へ"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center min-w-[160px]">
          <span className="text-lg font-semibold text-gray-800">{displayText}</span>
        </div>

        <button
          onClick={handleNext}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="次へ"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default DateNavigator;
