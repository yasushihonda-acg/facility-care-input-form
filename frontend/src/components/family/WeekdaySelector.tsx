/**
 * 曜日選択コンポーネント
 * Phase 13.1: スケジュール拡張
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.3
 */

import { WEEKDAY_LABELS } from '../../types/careItem';

interface WeekdaySelectorProps {
  /** 選択中の曜日リスト (0=日, 1=月, ... 6=土) */
  value: number[];
  /** 曜日選択変更時のコールバック */
  onChange: (weekdays: number[]) => void;
  /** 無効状態 */
  disabled?: boolean;
}

export function WeekdaySelector({ value, onChange, disabled = false }: WeekdaySelectorProps) {
  const toggleWeekday = (day: number) => {
    if (disabled) return;

    if (value.includes(day)) {
      // 既に選択されている場合は削除
      onChange(value.filter((d) => d !== day));
    } else {
      // 選択されていない場合は追加（ソート順を維持）
      onChange([...value, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">曜日を選択</label>
      <div className="flex gap-1">
        {WEEKDAY_LABELS.map((label, index) => {
          const isSelected = value.includes(index);
          const isWeekend = index === 0 || index === 6;

          return (
            <button
              key={index}
              type="button"
              onClick={() => toggleWeekday(index)}
              disabled={disabled}
              className={`
                w-10 h-10 rounded-lg font-medium text-sm transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${
                  isSelected
                    ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                    : isWeekend
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`${label}曜日${isSelected ? '選択中' : ''}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {value.length === 0 && (
        <p className="text-sm text-gray-500">1つ以上の曜日を選択してください</p>
      )}
    </div>
  );
}
