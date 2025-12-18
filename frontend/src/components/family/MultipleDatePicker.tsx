/**
 * 複数日選択コンポーネント
 * Phase 13.1: スケジュール拡張
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.3
 */

import { useState } from 'react';
import { formatDateDisplay } from '../../utils/scheduleUtils';

interface MultipleDatePickerProps {
  /** 選択中の日付リスト (YYYY-MM-DD[]) */
  value: string[];
  /** 日付選択変更時のコールバック */
  onChange: (dates: string[]) => void;
  /** 無効状態 */
  disabled?: boolean;
  /** 最大選択可能日数 */
  maxDates?: number;
}

export function MultipleDatePicker({
  value,
  onChange,
  disabled = false,
  maxDates = 10,
}: MultipleDatePickerProps) {
  const [newDate, setNewDate] = useState('');

  // 今日の日付を取得（最小値として使用）
  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  const addDate = () => {
    if (!newDate || disabled) return;

    if (value.includes(newDate)) {
      // 既に選択済み
      return;
    }

    if (value.length >= maxDates) {
      alert(`最大${maxDates}日まで選択できます`);
      return;
    }

    // 日付を追加してソート
    const newDates = [...value, newDate].sort();
    onChange(newDates);
    setNewDate('');
  };

  const removeDate = (dateToRemove: string) => {
    if (disabled) return;
    onChange(value.filter((d) => d !== dateToRemove));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">日付を選択</label>

      {/* 日付追加フォーム */}
      <div className="flex gap-2">
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          min={minDate}
          disabled={disabled || value.length >= maxDates}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={addDate}
          disabled={disabled || !newDate || value.length >= maxDates}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          追加
        </button>
      </div>

      {/* 選択済み日付リスト */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((date) => (
            <span
              key={date}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
            >
              {formatDateDisplay(date)}
              <button
                type="button"
                onClick={() => removeDate(date)}
                disabled={disabled}
                className="ml-1 w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-200 transition-colors disabled:opacity-50"
                aria-label={`${formatDateDisplay(date)}を削除`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ヘルプテキスト */}
      <p className="text-sm text-gray-500">
        {value.length === 0
          ? '日付を追加してください'
          : `${value.length}/${maxDates}日選択中`}
      </p>
    </div>
  );
}
