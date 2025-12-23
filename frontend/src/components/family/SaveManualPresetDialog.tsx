/**
 * 手動登録時にプリセットとして保存するダイアログ
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import { useState } from 'react';
import { useCreatePreset } from '../../hooks/usePresets';
import type { CareItemInput, ItemCategory } from '../../types/careItem';

// カテゴリラベル（Phase 31: 2カテゴリに簡素化）
const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: '食べ物',
  drink: '飲み物',
};

// 提供方法ラベル
// Phase 28で整理: cooled/blended削除
const SERVING_METHOD_LABELS: Record<string, string> = {
  as_is: 'そのまま',
  cut: 'カット',
  peeled: '皮むき',
  heated: '温める',
  other: 'その他',
};

interface SaveManualPresetDialogProps {
  isOpen: boolean;
  onDismiss: () => void; // ×ボタン: ダイアログを閉じるだけ
  onSkip: () => void; // 「今回だけ」: スキップして一覧へ
  onSaved: () => void; // 「保存して完了」: 保存して一覧へ
  residentId: string;
  userId: string;
  formData: CareItemInput;
}

export function SaveManualPresetDialog({
  isOpen,
  onDismiss,
  onSkip,
  onSaved,
  residentId,
  userId,
  formData,
}: SaveManualPresetDialogProps) {
  // プリセット名のデフォルト値（品物名をそのまま使用）
  const defaultPresetName = formData.itemName;

  // ユーザーがプリセット名を編集したかどうか
  const [customPresetName, setCustomPresetName] = useState<string | null>(null);

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
          icon: '📌',
          // 品物登録フォームの値をそのままプリセットに保存
          itemCategory: formData.category,
          storageMethod: formData.storageMethod,
          servingMethod: formData.servingMethod,
          servingMethodDetail: formData.servingMethodDetail || undefined,
          noteToStaff: formData.noteToStaff || undefined,
          remainingHandlingInstruction: formData.remainingHandlingInstruction,
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

  // デバッグ用ログ
  console.log('[SaveManualPresetDialog] Rendering, isOpen:', isOpen);

  // ×ボタン: ダイアログを閉じるだけ（ナビゲーションなし）
  const handleDismissClick = (e: React.MouseEvent) => {
    console.log('[SaveManualPresetDialog] × clicked (dismiss)');
    e.preventDefault();
    e.stopPropagation();
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl max-w-md w-full shadow-xl"
        style={{ position: 'relative' }}
      >
        {/* ×ボタン - モーダル右上に絶対配置（インラインスタイルで強制） */}
        <button
          type="button"
          onClick={handleDismissClick}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 100,
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#e5e7eb',
            borderRadius: '50%',
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#4b5563',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="閉じる"
          data-testid="close-button"
        >
          ✕
        </button>

        {/* ヘッダー */}
        <div className="p-4 border-b" style={{ paddingRight: '56px' }}>
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
              {formData.noteToStaff && (
                <p>申し送り: {formData.noteToStaff}</p>
              )}
              {formData.remainingHandlingInstruction && formData.remainingHandlingInstruction !== 'none' && (
                <p>
                  残り処置:{' '}
                  {formData.remainingHandlingInstruction === 'stored'
                    ? '保存'
                    : '破棄'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* プリセット名入力 */}
        <div className="px-4 pb-4">
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

        {/* アクションボタン */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onSkip}
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
