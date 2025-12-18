/**
 * 手動登録時にプリセットとして保存するダイアログ
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import { useState, useMemo } from 'react';
import { useCreatePreset, PRESET_CATEGORY_LABELS, PRESET_CATEGORY_ICONS } from '../../hooks/usePresets';
import type { CareItemInput, PresetCategory, ItemCategory } from '../../types/careItem';

// カテゴリラベル
const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  fruit: '果物',
  snack: 'お菓子・間食',
  drink: '飲み物',
  dairy: '乳製品',
  prepared: '調理済み食品',
  supplement: '栄養補助食品',
  other: 'その他',
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

interface SaveManualPresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  residentId: string;
  userId: string;
  formData: CareItemInput;
}

export function SaveManualPresetDialog({
  isOpen,
  onClose,
  onSaved,
  residentId,
  userId,
  formData,
}: SaveManualPresetDialogProps) {
  // プリセット名のデフォルト値を生成
  const defaultPresetName = useMemo(() => {
    const servingLabel = SERVING_METHOD_LABELS[formData.servingMethod] || formData.servingMethod;
    if (formData.servingMethod === 'as_is') {
      return formData.itemName;
    }
    return `${formData.itemName}（${servingLabel}）`;
  }, [formData.itemName, formData.servingMethod]);

  // ユーザーがプリセット名を編集したかどうか
  const [customPresetName, setCustomPresetName] = useState<string | null>(null);
  const [presetCategory, setPresetCategory] = useState<PresetCategory>('cut');

  // 表示用のプリセット名（カスタム入力があればそれを優先）
  const presetName = customPresetName ?? defaultPresetName;

  const createPresetMutation = useCreatePreset();

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await createPresetMutation.mutateAsync({
        residentId,
        userId,
        preset: {
          name: presetName,
          category: presetCategory,
          icon: '📌',
          instruction: {
            content: formData.servingMethodDetail || '',
            servingMethod: formData.servingMethod,
            servingDetail: formData.servingMethodDetail,
          },
          matchConfig: {
            keywords: [formData.itemName],
            categories: [formData.category],
          },
        },
        source: 'manual',
      });
      onSaved();
    } catch {
      alert('プリセットの保存に失敗しました');
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

        {/* 入力内容サマリー */}
        <div className="p-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📌</span>
              <span className="font-bold text-amber-900">{formData.itemName}</span>
            </div>
            <div className="text-sm text-amber-800 space-y-1">
              <p>カテゴリ: {ITEM_CATEGORY_LABELS[formData.category]}</p>
              <p>提供方法: {SERVING_METHOD_LABELS[formData.servingMethod]}</p>
              {formData.servingMethodDetail && (
                <p>詳細: {formData.servingMethodDetail}</p>
              )}
              {formData.storageMethod && (
                <p>
                  保存方法:{' '}
                  {formData.storageMethod === 'room_temp'
                    ? '常温'
                    : formData.storageMethod === 'refrigerated'
                      ? '冷蔵'
                      : '冷凍'}
                </p>
              )}
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
              onChange={(e) => setCustomPresetName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-sm"
              placeholder="例: キウイ（カット）"
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
            disabled={createPresetMutation.isPending || !presetName.trim()}
            className="flex-1 py-3 px-4 bg-primary text-white rounded-lg font-bold disabled:opacity-50"
          >
            {createPresetMutation.isPending ? '保存中...' : '保存して完了'}
          </button>
        </div>
      </div>
    </div>
  );
}
