/**
 * AI提案をプリセットとして保存するダイアログ
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import { useState } from 'react';
import { useSaveAISuggestionAsPreset, PRESET_CATEGORY_LABELS, PRESET_CATEGORY_ICONS } from '../../hooks/usePresets';
import type { AISuggestResponse, PresetCategory, ItemCategory } from '../../types/careItem';

// 保存方法ラベル
const STORAGE_METHOD_LABELS: Record<string, string> = {
  room_temp: '常温',
  refrigerated: '冷蔵',
  frozen: '冷凍',
};

// 提供方法ラベル
const SERVING_METHOD_LABELS: Record<string, string> = {
  as_is: 'そのまま',
  cut: 'カット',
  peeled: '皮むき',
  heated: '温める',
  cooled: '冷やす',
  blended: 'ミキサー',
  other: 'その他',
};

interface SaveAISuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  residentId: string;
  userId: string;
  itemName: string;
  category?: ItemCategory;
  aiSuggestion: AISuggestResponse;
}

export function SaveAISuggestionDialog({
  isOpen,
  onClose,
  onSaved,
  residentId,
  userId,
  itemName,
  category,
  aiSuggestion,
}: SaveAISuggestionDialogProps) {
  const [presetName, setPresetName] = useState(
    `${itemName}（${aiSuggestion.servingMethods?.map((m) => SERVING_METHOD_LABELS[m] || m).join('・') || 'そのまま'}）`
  );
  const [presetCategory, setPresetCategory] = useState<PresetCategory>('cut');

  const saveMutation = useSaveAISuggestionAsPreset();

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        residentId,
        userId,
        itemName,
        presetName,
        category: presetCategory,
        icon: '🤖',
        aiSuggestion,
        keywords: [itemName],
        itemCategories: category ? [category] : undefined,
      });
      onSaved();
      onClose();
    } catch {
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
        {/* ヘッダー */}
        <div className="p-4 border-b">
          <h3 className="text-lg font-bold text-center">
            この設定を「いつもの指示」として保存しますか？
          </h3>
        </div>

        {/* 説明 */}
        <div className="p-4 bg-gray-50 text-sm text-gray-600">
          保存すると、次回から同じ品物を登録する際に自動的に候補として表示されます。
        </div>

        {/* AI提案サマリー */}
        <div className="p-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🤖</span>
              <span className="font-bold text-purple-900">{itemName}</span>
            </div>
            <div className="text-sm text-purple-800 space-y-1">
              <p>賞味期限: {aiSuggestion.expirationDays}日</p>
              <p>保存方法: {STORAGE_METHOD_LABELS[aiSuggestion.storageMethod] || aiSuggestion.storageMethod}</p>
              {aiSuggestion.servingMethods && aiSuggestion.servingMethods.length > 0 && (
                <p>
                  提供方法: {aiSuggestion.servingMethods.map((m) => SERVING_METHOD_LABELS[m] || m).join(', ')}
                </p>
              )}
              {aiSuggestion.notes && <p>注意: {aiSuggestion.notes}</p>}
            </div>
          </div>
        </div>

        {/* プリセット名入力 */}
        <div className="px-4 pb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プリセット名
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="例: りんご（カット・皮むき）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ
            </label>
            <select
              value={presetCategory}
              onChange={(e) => setPresetCategory(e.target.value as PresetCategory)}
              className="w-full px-4 py-2 border rounded-lg text-sm"
            >
              {Object.entries(PRESET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {PRESET_CATEGORY_ICONS[value as PresetCategory]} {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border rounded-lg font-medium text-gray-700 hover:bg-gray-50"
          >
            今回だけ
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending || !presetName.trim()}
            className="flex-1 py-3 px-4 bg-primary text-white rounded-lg font-bold disabled:opacity-50"
          >
            {saveMutation.isPending ? '保存中...' : '保存して適用'}
          </button>
        </div>
      </div>
    </div>
  );
}
