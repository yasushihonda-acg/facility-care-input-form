/**
 * 日付ナビゲーションコンポーネント
 * Phase 38.2.1: UX改善版 - 大きなタッチターゲット + セグメントコントロール
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
        return { main: `${m}月${d}日 (${weekday})`, sub: isToday ? '今日' : null };
      }
      case 'week': {
        const start = getWeekStart(selectedDate);
        const end = getWeekEnd(selectedDate);
        const sm = start.getMonth() + 1;
        const sd = start.getDate();
        const em = end.getMonth() + 1;
        const ed = end.getDate();
        return { main: `${sm}/${sd} 〜 ${em}/${ed}`, sub: '週間表示' };
      }
      case 'month': {
        const y = selectedDate.getFullYear();
        const m = selectedDate.getMonth() + 1;
        return { main: `${y}年${m}月`, sub: '月間表示' };
      }
      default:
        return { main: '', sub: null };
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

  // 日付クリック → カレンダーを開く
  const handleDateClick = () => {
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
    <div className="bg-white border-b relative">
      {/* メインナビゲーション: 矢印 + 日付 */}
      <div className="flex items-center justify-between px-2 py-4">
        {/* 前へボタン */}
        <button
          onClick={handlePrev}
          className="w-14 h-14 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors"
          aria-label="前へ"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 日付表示（タップでカレンダー） */}
        <button
          onClick={handleDateClick}
          className="flex-1 mx-2 py-3 px-4 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-center"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">📅</span>
            <span className="text-xl font-bold text-gray-800">{displayText.main}</span>
          </div>
          {displayText.sub && (
            <div className="text-sm text-primary font-medium mt-1">{displayText.sub}</div>
          )}
        </button>

        {/* Hidden date input - 中央配置でカレンダーが画面内に表示される */}
        <input
          ref={dateInputRef}
          type="date"
          value={formatDateString(selectedDate)}
          onChange={handleCalendarChange}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />

        {/* 次へボタン */}
        <button
          onClick={handleNext}
          className="w-14 h-14 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors"
          aria-label="次へ"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* ビューモード選択 + 今日ボタン */}
      <div className="px-4 pb-4">
        {/* セグメントコントロール */}
        <div className="flex rounded-xl bg-gray-100 p-1">
          {viewModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={`flex-1 py-3 text-base font-semibold rounded-lg transition-all ${
                viewMode === mode.value
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* 今日に戻るボタン（今日以外の時のみ） */}
        {!isToday && (
          <button
            onClick={handleToday}
            className="w-full mt-3 py-3 text-base font-medium text-primary bg-primary/10 rounded-xl hover:bg-primary/20 active:bg-primary/30 transition-colors"
          >
            今日に戻る
          </button>
        )}
      </div>
    </div>
  );
}

export default DateNavigator;
