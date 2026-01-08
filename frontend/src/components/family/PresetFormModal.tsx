/**
 * プリセット作成/編集モーダル（共通コンポーネント）
 * PresetManagement.tsx と ItemForm.tsx で共有
 */

import { useState } from 'react';
import type {
  CarePreset,
  CarePresetInput,
  ItemCategory,
  StorageMethod,
  ServingMethod,
  ServingTimeSlot,
  RemainingHandlingInstruction,
} from '../../types/careItem';
import {
  STORAGE_METHODS,
  SERVING_METHODS,
  SERVING_TIME_SLOT_LABELS,
  REMAINING_HANDLING_INSTRUCTION_OPTIONS,
} from '../../types/careItem';

// アイコン選択肢（食品関連のみ）
const ICON_OPTIONS = ['🥝', '🍎', '🍊', '🍑', '🍌', '🍇', '🍓', '🍈', '🥭', '🧅', '🥕', '🥒', '🍰', '🍮', '🥛', '🍚', '🍵', '☕'];

// カテゴリラベル
const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: '食べ物',
  drink: '飲み物',
};

interface PresetFormModalProps {
  preset: CarePreset | null;
  onClose: () => void;
  onSave: (input: CarePresetInput) => Promise<void>;
  isSaving: boolean;
}

export function PresetFormModal({
  preset,
  onClose,
  onSave,
  isSaving,
}: PresetFormModalProps) {
  // 基本情報
  const [name, setName] = useState(preset?.name || '');
  const [icon, setIcon] = useState(preset?.icon || '📋');

  // 品物フォームフィールド
  const [itemCategory, setItemCategory] = useState<ItemCategory | undefined>(preset?.itemCategory);
  const [storageMethod, setStorageMethod] = useState<StorageMethod | undefined>(preset?.storageMethod);
  const [servingMethod, setServingMethod] = useState<ServingMethod | undefined>(preset?.servingMethod);
  const [servingMethodDetail, setServingMethodDetail] = useState(
    preset?.servingMethodDetail || preset?.processingDetail || preset?.instruction?.content || ''
  );
  const [servingTimeSlot, setServingTimeSlot] = useState<ServingTimeSlot | undefined>(preset?.servingTimeSlot);
  const [noteToStaff, setNoteToStaff] = useState(preset?.noteToStaff || '');
  const [remainingHandlingInstruction, setRemainingHandlingInstruction] = useState<RemainingHandlingInstruction | undefined>(
    preset?.remainingHandlingInstruction
  );

  // マッチング
  const [keywords, setKeywords] = useState(preset?.matchConfig?.keywords?.join(', ') || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('プリセット名は必須です');
      return;
    }

    const input: CarePresetInput = {
      name: name.trim(),
      icon,
      // 品物フォームフィールド
      itemCategory,
      storageMethod,
      servingMethod,
      servingMethodDetail: servingMethodDetail.trim() || undefined,
      servingTimeSlot,
      noteToStaff: noteToStaff.trim() || undefined,
      remainingHandlingInstruction,
      // マッチング設定
      matchConfig: {
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k),
      },
    };

    try {
      await onSave(input);
    } catch {
      alert('保存に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {preset ? 'プリセットを編集' : 'プリセットを追加'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* プリセット名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プリセット名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: キウイ"
              className="w-full px-4 py-2 border rounded-lg"
              required
            />
          </div>

          {/* アイコン */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              アイコン
            </label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    icon === emoji
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* カテゴリ（食べ物/飲み物） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              カテゴリ
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ITEM_CATEGORY_LABELS) as [ItemCategory, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setItemCategory(itemCategory === value ? undefined : value)}
                  className={`py-2 px-4 border rounded-lg transition-colors ${
                    itemCategory === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {value === 'food' ? '🍽️' : '🥤'} {label}
                </button>
              ))}
            </div>
          </div>

          {/* 保存方法 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保存方法
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STORAGE_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStorageMethod(storageMethod === value ? undefined : value)}
                  className={`py-2 px-3 border rounded-lg text-sm transition-colors ${
                    storageMethod === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 提供方法 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供方法
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVING_METHODS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setServingMethod(servingMethod === value ? undefined : value)}
                  className={`py-2 px-3 border rounded-lg text-sm transition-colors ${
                    servingMethod === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 提供タイミング */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供タイミング
            </label>
            <div className="flex flex-wrap gap-2">
              {(['breakfast', 'lunch', 'dinner', 'snack', 'anytime'] as ServingTimeSlot[]).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setServingTimeSlot(servingTimeSlot === slot ? undefined : slot)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    servingTimeSlot === slot
                      ? 'bg-green-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {SERVING_TIME_SLOT_LABELS[slot]}
                </button>
              ))}
            </div>
          </div>

          {/* 提供方法の詳細 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供方法の詳細
            </label>
            <textarea
              value={servingMethodDetail}
              onChange={(e) => setServingMethodDetail(e.target.value)}
              placeholder="例: 食べやすい大きさにカットしてください"
              rows={3}
              className="w-full px-4 py-2 border rounded-lg resize-none"
            />
          </div>

          {/* スタッフへの申し送り */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スタッフへの申し送り
            </label>
            <textarea
              value={noteToStaff}
              onChange={(e) => setNoteToStaff(e.target.value)}
              placeholder="例: 好物なのでぜひ食べさせてあげてください"
              rows={2}
              className="w-full px-4 py-2 border rounded-lg resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              ※ 特別な条件（体調不良時は除外など）もここに記載してください
            </p>
          </div>

          {/* 残った場合の処置指示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              残った場合の処置指示
            </label>
            <div className="space-y-2">
              {REMAINING_HANDLING_INSTRUCTION_OPTIONS.map(({ value, label, description }) => (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    remainingHandlingInstruction === value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="remainingHandling"
                    checked={remainingHandlingInstruction === value}
                    onChange={() => setRemainingHandlingInstruction(value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* キーワード */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード（カンマ区切り）
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例: キウイ, kiwi, 果物"
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              ※ 品物登録時にこれらのキーワードでマッチします
            </p>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-primary text-white rounded-lg font-bold disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default PresetFormModal;
