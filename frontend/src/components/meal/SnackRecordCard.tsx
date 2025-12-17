/**
 * 間食記録カードコンポーネント
 * 選択された品物の提供詳細を入力
 *
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md セクション5.1
 */

import type { SnackRecord } from '../../types/mealForm';
import type { ConsumptionStatus } from '../../types/careItem';

interface SnackRecordCardProps {
  record: SnackRecord;
  index: number;
  familyInstruction?: string; // 家族からの指示（noteToStaff）
  onChange: (index: number, updates: Partial<SnackRecord>) => void;
  onRemove: (index: number) => void;
}

// 摂食状況の選択肢
const CONSUMPTION_STATUS_OPTIONS: {
  value: ConsumptionStatus;
  label: string;
  emoji: string;
}[] = [
  { value: 'full', label: '完食', emoji: '😋' },
  { value: 'most', label: 'ほぼ完食', emoji: '😊' },
  { value: 'half', label: '半分', emoji: '😐' },
  { value: 'little', label: '少量', emoji: '😟' },
  { value: 'none', label: '食べず', emoji: '😢' },
];

export function SnackRecordCard({
  record,
  index,
  familyInstruction,
  onChange,
  onRemove,
}: SnackRecordCardProps) {
  const handleQuantityChange = (value: string) => {
    const qty = parseFloat(value);
    if (!isNaN(qty) && qty >= 0) {
      onChange(index, { servedQuantity: qty });
    }
  };

  const handleStatusChange = (status: ConsumptionStatus) => {
    onChange(index, { consumptionStatus: status });
  };

  const handleNoteChange = (note: string) => {
    onChange(index, { noteToFamily: note });
  };

  const handleInstructionCheck = (checked: boolean) => {
    onChange(index, { followedInstruction: checked });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      {/* ヘッダー: 品物名と削除ボタン */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📦</span>
          <h4 className="font-medium text-gray-900">{record.itemName}</h4>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          aria-label={`${record.itemName}を削除`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 提供数入力 */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 whitespace-nowrap">提供数:</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.5"
            value={record.servedQuantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <span className="text-sm text-gray-600">{record.unit || '個'}</span>
        </div>
      </div>

      {/* 摂食状況選択 */}
      <div>
        <label className="text-sm text-gray-600 block mb-2">摂食状況:</label>
        <div className="flex flex-wrap gap-2">
          {CONSUMPTION_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleStatusChange(option.value)}
              className={`
                px-3 py-1.5 rounded-full text-sm transition-all
                ${record.consumptionStatus === option.value
                  ? 'bg-primary text-white ring-2 ring-primary/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {option.emoji} {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 家族指示対応チェック */}
      {familyInstruction && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id={`instruction-${index}`}
              checked={record.followedInstruction ?? false}
              onChange={(e) => handleInstructionCheck(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary rounded focus:ring-primary"
            />
            <label htmlFor={`instruction-${index}`} className="text-sm">
              <span className="text-gray-600">家族指示「</span>
              <span className="font-medium text-gray-800">{familyInstruction}</span>
              <span className="text-gray-600">」に従いました</span>
            </label>
          </div>
        </div>
      )}

      {/* 家族へのメモ */}
      <div>
        <label className="text-sm text-gray-600 block mb-1">
          家族へのメモ（任意）:
        </label>
        <input
          type="text"
          value={record.noteToFamily || ''}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="おいしそうに召し上がっていました"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
  );
}
