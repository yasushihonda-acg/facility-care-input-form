/**
 * スケジュール入力コンポーネント
 * Phase 13.1: スケジュール拡張
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.3
 */

import type { ServingSchedule, ScheduleType, ServingTimeSlot } from '../../types/careItem';
import { SCHEDULE_TYPE_LABELS, SERVING_TIME_SLOT_LABELS } from '../../types/careItem';
import { WeekdaySelector } from './WeekdaySelector';
import { MultipleDatePicker } from './MultipleDatePicker';
import { formatScheduleDisplay } from '../../utils/scheduleUtils';

interface ServingScheduleInputProps {
  /** 現在のスケジュール値 */
  value: ServingSchedule | undefined;
  /** スケジュール変更時のコールバック */
  onChange: (schedule: ServingSchedule | undefined) => void;
  /** 無効状態 */
  disabled?: boolean;
}

export function ServingScheduleInput({
  value,
  onChange,
  disabled = false,
}: ServingScheduleInputProps) {
  // スケジュールタイプの配列
  const scheduleTypes: ScheduleType[] = ['once', 'daily', 'weekly', 'specific_dates'];

  // タイムスロットの配列
  const timeSlots: ServingTimeSlot[] = ['breakfast', 'lunch', 'dinner', 'snack', 'anytime'];

  // 今日の日付を取得
  const today = new Date().toISOString().split('T')[0];

  // スケジュールタイプ変更
  const handleTypeChange = (type: ScheduleType) => {
    const newSchedule: ServingSchedule = {
      type,
      timeSlot: value?.timeSlot || 'snack',
      note: value?.note,
    };

    // タイプに応じて初期値を設定
    switch (type) {
      case 'once':
        newSchedule.date = value?.date || today;
        break;
      case 'weekly':
        newSchedule.weekdays = value?.weekdays || [];
        break;
      case 'specific_dates':
        newSchedule.dates = value?.dates || [];
        break;
    }

    onChange(newSchedule);
  };

  // 日付変更（once用）
  const handleDateChange = (date: string) => {
    if (!value) return;
    onChange({ ...value, date });
  };

  // 曜日変更（weekly用）
  const handleWeekdaysChange = (weekdays: number[]) => {
    if (!value) return;
    onChange({ ...value, weekdays });
  };

  // 複数日付変更（specific_dates用）
  const handleDatesChange = (dates: string[]) => {
    if (!value) return;
    onChange({ ...value, dates });
  };

  // タイムスロット変更
  const handleTimeSlotChange = (timeSlot: ServingTimeSlot) => {
    if (!value) return;
    onChange({ ...value, timeSlot });
  };

  // 補足メモ変更
  const handleNoteChange = (note: string) => {
    if (!value) return;
    onChange({ ...value, note: note || undefined });
  };

  // スケジュールをクリア
  const handleClear = () => {
    onChange(undefined);
  };

  // 初期状態（スケジュール未設定）
  if (!value) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">提供スケジュール</label>
          <span className="text-sm text-gray-500">（任意）</span>
        </div>
        <button
          type="button"
          onClick={() => handleTypeChange('once')}
          disabled={disabled}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50"
        >
          + スケジュールを設定
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">提供スケジュール</label>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          クリア
        </button>
      </div>

      {/* スケジュールタイプ選択 */}
      <div className="space-y-2">
        <span className="text-sm text-gray-600">タイプ</span>
        <div className="grid grid-cols-2 gap-2">
          {scheduleTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${
                  value.type === type
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {SCHEDULE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* タイプ別の入力フィールド */}
      <div className="space-y-3">
        {/* 特定の日 */}
        {value.type === 'once' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">日付</label>
            <input
              type="date"
              value={value.date || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              min={today}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            />
          </div>
        )}

        {/* 毎日 - 追加入力なし */}
        {value.type === 'daily' && (
          <p className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
            毎日、選択したタイミングで提供します
          </p>
        )}

        {/* 曜日指定 */}
        {value.type === 'weekly' && (
          <WeekdaySelector
            value={value.weekdays || []}
            onChange={handleWeekdaysChange}
            disabled={disabled}
          />
        )}

        {/* 複数日指定 */}
        {value.type === 'specific_dates' && (
          <MultipleDatePicker
            value={value.dates || []}
            onChange={handleDatesChange}
            disabled={disabled}
          />
        )}
      </div>

      {/* 提供タイミング */}
      <div className="space-y-2">
        <span className="text-sm text-gray-600">提供タイミング</span>
        <div className="flex flex-wrap gap-2">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => handleTimeSlotChange(slot)}
              disabled={disabled}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${
                  value.timeSlot === slot
                    ? 'bg-green-500 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {SERVING_TIME_SLOT_LABELS[slot]}
            </button>
          ))}
        </div>
      </div>

      {/* 補足メモ */}
      <div className="space-y-2">
        <label className="block text-sm text-gray-600">補足（任意）</label>
        <input
          type="text"
          value={value.note || ''}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="例: 15時頃が望ましい"
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-sm"
        />
      </div>

      {/* プレビュー */}
      {formatScheduleDisplay(value) && (
        <div className="pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">表示:</span>{' '}
            <span className="text-blue-600">{formatScheduleDisplay(value)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
