/**
 * SnackRecordModal - 品物からの間食記録モーダル
 * 設計書: docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2
 *
 * Phase 13.0.3: モーダルUI実装
 * Phase 13.0.4: Sheet B連携（submitMealRecord拡張）
 */

import { useState, useEffect, useCallback } from 'react';
import type { CareItem } from '../../types/careItem';
import type { MealTime, RecordConsumptionLogRequest, ConsumptionStatus } from '../../types/consumptionLog';
import { determineConsumptionStatus, calculateConsumptionRate } from '../../types/consumptionLog';
import { CONSUMPTION_STATUSES } from '../../types/careItem';
import { useRecordConsumptionLog } from '../../hooks/useConsumptionLogs';
import { submitMealRecord } from '../../api';
import type { SnackRecord } from '../../types/mealForm';

// 摂食状況の絵文字マッピング
const CONSUMPTION_EMOJIS: Record<ConsumptionStatus, string> = {
  full: '😋',
  most: '😊',
  half: '😐',
  little: '😕',
  none: '😞',
};

interface SnackRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CareItem;
  staffName?: string;
  onSuccess?: () => void;
}

/**
 * 品物起点の間食記録モーダル
 * 設計書のUI案に基づいて実装
 */
export function SnackRecordModal({
  isOpen,
  onClose,
  item,
  staffName = '',
  onSuccess,
}: SnackRecordModalProps) {
  // 現在の残量
  const currentQuantity = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;

  // フォーム状態
  const [formData, setFormData] = useState({
    servedDate: new Date().toISOString().split('T')[0],
    servedTime: '',
    mealTime: 'snack' as MealTime | '',
    servedQuantity: 1,
    servedBy: staffName,
    consumedQuantity: 1,
    consumptionStatus: 'full' as ConsumptionStatus,
    consumptionNote: '',
    noteToFamily: '',
    followedFamilyInstructions: true,
  });

  const [error, setError] = useState<string | null>(null);
  const recordMutation = useRecordConsumptionLog();

  // 提供数量の上限
  const maxServeQuantity = currentQuantity;

  // モーダルが開いた時にフォームをリセット
  useEffect(() => {
    if (isOpen) {
      // 家族の指示から推奨提供数を計算
      const suggestedQuantity = getSuggestedQuantity(item);

      setFormData({
        servedDate: new Date().toISOString().split('T')[0],
        servedTime: new Date().toTimeString().slice(0, 5),
        mealTime: 'snack',
        servedQuantity: Math.min(suggestedQuantity, maxServeQuantity),
        servedBy: staffName,
        consumedQuantity: Math.min(suggestedQuantity, maxServeQuantity),
        consumptionStatus: 'full',
        consumptionNote: '',
        noteToFamily: '',
        followedFamilyInstructions: true,
      });
      setError(null);
    }
  }, [isOpen, staffName, maxServeQuantity, item]);

  // 消費数量が変わったら摂食状況を自動更新
  useEffect(() => {
    if (formData.servedQuantity > 0) {
      const rate = calculateConsumptionRate(formData.consumedQuantity, formData.servedQuantity);
      const status = determineConsumptionStatus(rate);
      setFormData(prev => ({ ...prev, consumptionStatus: status }));
    }
  }, [formData.consumedQuantity, formData.servedQuantity]);

  // 提供数量の変更ハンドラ
  const handleServedQuantityChange = useCallback((value: number) => {
    const newValue = Math.max(0.5, Math.min(value, maxServeQuantity));
    setFormData(prev => ({
      ...prev,
      servedQuantity: newValue,
      consumedQuantity: Math.min(prev.consumedQuantity, newValue),
    }));
  }, [maxServeQuantity]);

  // 送信ハンドラ
  const handleSubmit = useCallback(async () => {
    setError(null);

    // バリデーション
    if (!formData.servedBy.trim()) {
      setError('提供者名を入力してください');
      return;
    }

    if (formData.servedQuantity <= 0) {
      setError('提供数量を入力してください');
      return;
    }

    if (formData.servedQuantity > currentQuantity) {
      setError(`提供数量が残量(${currentQuantity}${item.unit})を超えています`);
      return;
    }

    // Phase 13.0.3: consumption_log への記録
    const consumptionRequest: RecordConsumptionLogRequest = {
      itemId: item.id,
      servedDate: formData.servedDate,
      servedTime: formData.servedTime || undefined,
      mealTime: formData.mealTime || undefined,
      servedQuantity: formData.servedQuantity,
      servedBy: formData.servedBy,
      consumedQuantity: formData.consumedQuantity,
      consumptionStatus: formData.consumptionStatus,
      consumptionNote: formData.consumptionNote || undefined,
      noteToFamily: formData.noteToFamily || undefined,
      recordedBy: formData.servedBy,
    };

    // Phase 13.0.4: Sheet B 連携用 SnackRecord
    const snackRecord: SnackRecord = {
      itemId: item.id,
      itemName: item.itemName,
      servedQuantity: formData.servedQuantity,
      unit: item.unit,
      consumptionStatus: formData.consumptionStatus,
      consumptionRate: calculateConsumptionRate(formData.consumedQuantity, formData.servedQuantity),
      followedInstruction: formData.followedFamilyInstructions,
      instructionNote: item.noteToStaff || undefined,
      note: formData.consumptionNote || undefined,
      noteToFamily: formData.noteToFamily || undefined,
    };

    try {
      // 1. consumption_log に記録
      await recordMutation.mutateAsync(consumptionRequest);

      // 2. Phase 13.0.4: Sheet B に記録（snack_onlyモード）
      await submitMealRecord({
        recordMode: 'snack_only',
        staffName: formData.servedBy,
        snackRecords: [snackRecord],
        residentId: item.residentId,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '記録に失敗しました');
    }
  }, [formData, item, currentQuantity, recordMutation, onSuccess, onClose]);

  // 記録後の残量を計算
  const quantityAfter = currentQuantity - formData.consumedQuantity;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b bg-amber-50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span>🍪</span>
            <span>間食記録: {item.itemName}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* 品物情報 */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span>📦</span>
              <span className="font-medium">残り: {currentQuantity}{item.unit}</span>
              <span className="text-gray-300">┃</span>
              {item.expirationDate ? (
                <span>
                  期限: {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </span>
              ) : (
                <span className="text-gray-400">期限なし</span>
              )}
            </div>
            {item.noteToStaff && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span>💬</span>
                <span className="italic">「{item.noteToStaff}」</span>
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* 提供情報セクション */}
          <div className="space-y-3">
            {/* 提供数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                提供数 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0.5"
                  max={maxServeQuantity}
                  step="0.5"
                  value={formData.servedQuantity}
                  onChange={(e) => handleServedQuantityChange(parseFloat(e.target.value) || 0)}
                  className="w-24 border rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-600">{item.unit}</span>
                {item.noteToStaff && (
                  <span className="text-xs text-amber-600 ml-2">
                    ← 家族指示から自動サジェスト
                  </span>
                )}
              </div>
            </div>

            {/* 摂食状況 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">摂食状況</label>
              <div className="flex flex-wrap gap-2">
                {CONSUMPTION_STATUSES.map(status => (
                  <label
                    key={status.value}
                    className={`
                      flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors
                      ${formData.consumptionStatus === status.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                    `}
                  >
                    <input
                      type="radio"
                      name="consumptionStatus"
                      value={status.value}
                      checked={formData.consumptionStatus === status.value}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          consumptionStatus: e.target.value as ConsumptionStatus,
                          consumedQuantity: (status.rate / 100) * prev.servedQuantity,
                        }));
                      }}
                      className="sr-only"
                    />
                    <span>{CONSUMPTION_EMOJIS[status.value]}</span>
                    <span>{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* メモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
              <textarea
                value={formData.consumptionNote}
                onChange={(e) => setFormData(prev => ({ ...prev, consumptionNote: e.target.value }))}
                placeholder="おいしそうに召し上がりました"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* 家族へのメモ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">家族へのメモ（任意）</label>
              <textarea
                value={formData.noteToFamily}
                onChange={(e) => setFormData(prev => ({ ...prev, noteToFamily: e.target.value }))}
                placeholder="次回は○○がお好みかもしれません"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* 家族指示に従ったかどうか */}
            {item.noteToStaff && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <input
                  type="checkbox"
                  id="followedInstructions"
                  checked={formData.followedFamilyInstructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, followedFamilyInstructions: e.target.checked }))}
                  className="w-4 h-4 text-primary rounded"
                />
                <label htmlFor="followedInstructions" className="text-sm text-gray-700">
                  家族指示「{item.noteToStaff.slice(0, 20)}{item.noteToStaff.length > 20 ? '...' : ''}」に従いました
                </label>
              </div>
            )}
          </div>

          {/* 記録後の残量プレビュー */}
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600">記録後の残量: </span>
            <span className="text-lg font-semibold text-blue-700">
              {quantityAfter.toFixed(1)}{item.unit}
            </span>
            {quantityAfter <= 0 && (
              <span className="text-xs text-orange-600 block mt-1">
                ※ 在庫がなくなります（品物は「消費完了」になります）
              </span>
            )}
          </div>

          {/* Sheet B反映の説明 */}
          <div className="text-xs text-gray-500 text-center">
            ※ この記録は食事記録（Sheet B）にも反映されます
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={recordMutation.isPending}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={recordMutation.isPending}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
          >
            {recordMutation.isPending ? '記録中...' : '🍪 記録を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 家族の指示から推奨提供数を計算
 * 例: 「1日1切れまで」→ 1
 */
function getSuggestedQuantity(item: CareItem): number {
  if (!item.noteToStaff) return 1;

  // 数字を抽出して推奨数量を返す
  const match = item.noteToStaff.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const suggested = parseFloat(match[1]);
    if (suggested > 0 && suggested <= 10) {
      return suggested;
    }
  }

  return 1;
}
