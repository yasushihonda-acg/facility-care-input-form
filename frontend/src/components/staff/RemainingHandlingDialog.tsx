/**
 * RemainingHandlingDialog - 残り対応記録ダイアログ
 * Phase 42: 「破棄した」「保存した」を記録するダイアログ
 *
 * - 記録は消費ログとは独立
 * - 履歴として remainingHandlingLogs 配列に追加
 */

import { useState } from 'react';
import type { CareItem } from '../../types/careItem';
import { getCategoryIcon } from '../../types/careItem';
import { useSubmitRemainingHandling } from '../../hooks/useRemainingHandling';
import { useMealFormSettings } from '../../hooks/useMealFormSettings';

interface RemainingHandlingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: CareItem;
  onSuccess?: () => void;
  isDemo?: boolean;
}

/**
 * 残り対応記録ダイアログ
 */
export function RemainingHandlingDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
  isDemo = false,
}: RemainingHandlingDialogProps) {
  const { settings } = useMealFormSettings();
  const submitMutation = useSubmitRemainingHandling();

  // 対応種別（破棄/保存）
  const [handling, setHandling] = useState<'discarded' | 'stored' | null>(null);

  // 数量（デフォルト: 残量）
  const defaultQuantity = item.remainingQuantity ?? item.quantity ?? 1;
  const [quantity, setQuantity] = useState(defaultQuantity);

  // メモ
  const [note, setNote] = useState('');

  // スタッフ名
  const [staffName, setStaffName] = useState(settings?.defaultResidentName || '');

  // 送信中フラグ
  const [isSubmitting, setIsSubmitting] = useState(false);

  // リセット
  const resetForm = () => {
    setHandling(null);
    setQuantity(defaultQuantity);
    setNote('');
  };

  // 送信
  const handleSubmit = async () => {
    if (!handling || !staffName) return;

    setIsSubmitting(true);
    try {
      await submitMutation.mutateAsync({
        itemId: item.id,
        handling,
        quantity,
        note: note.trim() || undefined,
        staffName,
      });

      if (isDemo) {
        alert(`🎓 デモモード: ${handling === 'discarded' ? '破棄' : '保存'}記録をシミュレートしました`);
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to record remaining handling:', error);
      alert('記録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const categoryIcon = getCategoryIcon(item.category);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            <h2 className="text-lg font-bold">{item.itemName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* デモモードバナー */}
        {isDemo && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
            🎓 デモモード：入力をお試しいただけます。実際には記録は保存されません。
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* 残量表示 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">現在の残量</div>
            <div className="text-2xl font-bold">
              {item.remainingQuantity ?? item.quantity ?? 1} {item.unit}
            </div>
          </div>

          {/* 対応種別選択 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              どうしましたか？ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setHandling('discarded')}
                className={`p-4 rounded-lg border-2 transition ${
                  handling === 'discarded'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-red-300'
                }`}
                disabled={isSubmitting}
              >
                <div className="text-3xl mb-1">🗑️</div>
                <div className="font-bold">破棄した</div>
              </button>
              <button
                type="button"
                onClick={() => setHandling('stored')}
                className={`p-4 rounded-lg border-2 transition ${
                  handling === 'stored'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                disabled={isSubmitting}
              >
                <div className="text-3xl mb-1">📦</div>
                <div className="font-bold">保存した</div>
              </button>
            </div>
          </div>

          {/* 数量入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数量
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={0.1}
                step={0.1}
                className="flex-1 px-3 py-2 border rounded-lg"
                disabled={isSubmitting}
              />
              <span className="text-gray-600">{item.unit}</span>
            </div>
          </div>

          {/* スタッフ名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              記録者 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="あなたの名前"
              className="w-full px-3 py-2 border rounded-lg"
              disabled={isSubmitting}
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メモ（任意）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: 期限切れのため破棄"
              rows={2}
              className="w-full px-3 py-2 border rounded-lg resize-none"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={handleSubmit}
            disabled={!handling || !staffName || isSubmitting}
            className={`w-full py-4 rounded-lg font-bold text-white transition ${
              handling === 'discarded'
                ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
                : handling === 'stored'
                ? 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                : 'bg-gray-400'
            } disabled:cursor-not-allowed`}
          >
            {isSubmitting ? '記録中...' : (
              handling === 'discarded' ? '🗑️ 破棄を記録' :
              handling === 'stored' ? '📦 保存を記録' :
              '対応を選択してください'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
