/**
 * 消費記録モーダル（スタッフ用）
 * docs/INVENTORY_CONSUMPTION_SPEC.md セクション5.1 に基づく
 */

import { useState, useEffect, useCallback } from 'react';
import type { CareItem } from '../../types/careItem';
import type { MealTime, RecordConsumptionLogRequest, ConsumptionStatus } from '../../types/consumptionLog';
import { MEAL_TIMES, determineConsumptionStatus, calculateConsumptionRate } from '../../types/consumptionLog';
import { CONSUMPTION_STATUSES } from '../../types/careItem';
import { useRecordConsumptionLog } from '../../hooks/useConsumptionLogs';
import { getTodayString } from '../../utils/scheduleUtils';

interface ConsumptionRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CareItem;
  staffName?: string;
  onSuccess?: () => void;
}

export function ConsumptionRecordModal({
  isOpen,
  onClose,
  item,
  staffName = '',
  onSuccess,
}: ConsumptionRecordModalProps) {
  // 現在の残量（currentQuantityがなければremainingQuantityを使用）
  const currentQuantity = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;

  // フォーム状態
  const [formData, setFormData] = useState({
    servedDate: getTodayString(),
    servedTime: '',
    mealTime: '' as MealTime | '',
    servedQuantity: 1,
    servedBy: staffName,
    consumedQuantity: 1,
    consumptionStatus: 'full' as ConsumptionStatus,
    consumptionNote: '',
    noteToFamily: '',
  });

  const [error, setError] = useState<string | null>(null);
  const recordMutation = useRecordConsumptionLog();

  // 提供数量の上限
  const maxServeQuantity = currentQuantity;

  // モーダルが開いた時にフォームをリセット（モーダル初期化パターン：isOpenがtrueになった時のみ発火）
  useEffect(() => {
    if (isOpen) {
      setFormData({
        servedDate: getTodayString(),
        servedTime: new Date().toTimeString().slice(0, 5),
        mealTime: '',
        servedQuantity: Math.min(1, maxServeQuantity),
        servedBy: staffName,
        consumedQuantity: Math.min(1, maxServeQuantity),
        consumptionStatus: 'full',
        consumptionNote: '',
        noteToFamily: '',
      });
      setError(null);
    }
  }, [isOpen, staffName, maxServeQuantity]);

  // 消費数量が変わったら摂食状況を自動更新（派生状態の自動計算パターン）
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
      // 消費数量も提供数量を超えないように調整
      consumedQuantity: Math.min(prev.consumedQuantity, newValue),
    }));
  }, [maxServeQuantity]);

  // 消費数量の変更ハンドラ
  const handleConsumedQuantityChange = useCallback((value: number) => {
    const newValue = Math.max(0, Math.min(value, formData.servedQuantity));
    setFormData(prev => ({ ...prev, consumedQuantity: newValue }));
  }, [formData.servedQuantity]);

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

    const request: RecordConsumptionLogRequest = {
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

    try {
      await recordMutation.mutateAsync(request);
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
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">提供・摂食を記録</h2>
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
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium">{item.itemName}</p>
            <p className="text-sm text-gray-600">
              残量: {currentQuantity}{item.unit} / {item.initialQuantity ?? item.quantity}{item.unit}
            </p>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* 提供情報セクション */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 border-b pb-1">提供情報</h3>

            {/* 提供日・時間帯 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  提供日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.servedDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, servedDate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">時間帯</label>
                <select
                  value={formData.mealTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, mealTime: e.target.value as MealTime | '' }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {MEAL_TIMES.map(mt => (
                    <option key={mt.value} value={mt.value}>{mt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 提供数量 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                提供数量 <span className="text-red-500">*</span>
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
                <span className="text-sm text-gray-500">
                  （残り {currentQuantity}{item.unit} から）
                </span>
              </div>
            </div>

            {/* 提供者 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                提供者 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.servedBy}
                onChange={(e) => setFormData(prev => ({ ...prev, servedBy: e.target.value }))}
                placeholder="スタッフ名"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* 摂食情報セクション */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 border-b pb-1">摂食情報</h3>

            {/* 消費数量 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">実際に食べた量</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max={formData.servedQuantity}
                  step="0.5"
                  value={formData.consumedQuantity}
                  onChange={(e) => handleConsumedQuantityChange(parseFloat(e.target.value) || 0)}
                  className="w-24 border rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-600">{item.unit}</span>
                <span className="text-sm text-gray-500">
                  （提供した {formData.servedQuantity}{item.unit} のうち）
                </span>
              </div>
              {formData.consumedQuantity < formData.servedQuantity && (
                <p className="text-xs text-amber-600 mt-1">
                  ※ 残り{(formData.servedQuantity - formData.consumedQuantity).toFixed(1)}{item.unit}は廃棄扱いになります
                </p>
              )}
            </div>

            {/* 摂食状況 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">摂食状況</label>
              <div className="space-y-1">
                {CONSUMPTION_STATUSES.map(status => (
                  <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="consumptionStatus"
                      value={status.value}
                      checked={formData.consumptionStatus === status.value}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        consumptionStatus: e.target.value as ConsumptionStatus,
                      }))}
                      className="text-blue-600"
                    />
                    <span className="text-sm">
                      {status.label} ({status.rate}%)
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 特記事項セクション */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-700 border-b pb-1">特記事項</h3>

            {/* 摂食時の特記事項 */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">摂食時の様子</label>
              <textarea
                value={formData.consumptionNote}
                onChange={(e) => setFormData(prev => ({ ...prev, consumptionNote: e.target.value }))}
                placeholder="例: 皮が硬かったようです"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>

            {/* 家族への申し送り */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">ご家族への申し送り</label>
              <textarea
                value={formData.noteToFamily}
                onChange={(e) => setFormData(prev => ({ ...prev, noteToFamily: e.target.value }))}
                placeholder="例: 半分召し上がりました。次回は柔らかめのバナナをお願いします。"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>

          {/* 記録後の残量プレビュー */}
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600">記録後の残量: </span>
            <span className="text-lg font-semibold text-blue-700">
              {quantityAfter.toFixed(1)}{item.unit}
            </span>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            disabled={recordMutation.isPending}
            className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={recordMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {recordMutation.isPending ? '記録中...' : '記録する'}
          </button>
        </div>
      </div>
    </div>
  );
}
