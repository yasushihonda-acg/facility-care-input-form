/**
 * StaffRecordDialog - 統一された提供・摂食記録ダイアログ
 * Phase 15.3: 家族連絡詳細からのダイアログ表示
 * 設計書: docs/STAFF_RECORD_FORM_SPEC.md セクション4.2
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CareItem } from '../../types/careItem';
import type { RemainingHandling } from '../../types/consumptionLog';
import { getCategoryIcon } from '../../types/careItem';
import { determineConsumptionStatus, REMAINING_HANDLING_OPTIONS } from '../../types/consumptionLog';
import { useRecordConsumptionLog } from '../../hooks/useConsumptionLogs';
import { submitMealRecord } from '../../api';
import { useMealFormSettings } from '../../hooks/useMealFormSettings';
import { DAY_SERVICE_OPTIONS } from '../../types/mealForm';
import type { SnackRecord } from '../../types/mealForm';
import { calculateConsumptionAmounts } from '../../utils/consumptionCalc';

interface StaffRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: CareItem;
  onSuccess?: () => void;
}

/**
 * 統一された提供・摂食記録ダイアログ
 */
export function StaffRecordDialog({
  isOpen,
  onClose,
  item,
  onSuccess,
}: StaffRecordDialogProps) {
  const { settings } = useMealFormSettings();
  const recordMutation = useRecordConsumptionLog();

  // 現在の残量
  const currentQuantity = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;

  // フォーム状態
  const [formData, setFormData] = useState({
    // 共通項目
    staffName: '',
    dayServiceUsage: '利用中ではない' as '利用中' | '利用中ではない',
    dayServiceName: '',
    // 品物記録
    servedQuantity: 1,
    // Phase 15.6: 数値入力（0-10）
    consumptionRateInput: 10,  // 0-10の入力値
    consumptionNote: '',
    noteToFamily: '',
    followedFamilyInstructions: true,
    // Phase 15.6: 残った分への対応
    remainingHandling: '' as RemainingHandling | '',
    remainingHandlingOther: '',
    // 共通項目（下部）
    snack: '',
    note: '',
    isImportant: '重要ではない' as '重要' | '重要ではない',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // モーダルが開いた時にフォームをリセット
  useEffect(() => {
    if (isOpen) {
      // 家族の指示から推奨提供数を計算
      const suggestedQuantity = getSuggestedQuantity(item);

      setFormData({
        staffName: '',
        dayServiceUsage: '利用中ではない',
        dayServiceName: '',
        servedQuantity: Math.min(suggestedQuantity, currentQuantity),
        consumptionRateInput: 10,  // Phase 15.6: デフォルト完食
        consumptionNote: '',
        noteToFamily: '',
        followedFamilyInstructions: true,
        remainingHandling: '',
        remainingHandlingOther: '',
        snack: '',
        note: '',
        isImportant: '重要ではない',
      });
      setErrors({});
    }
  }, [isOpen, item, currentQuantity]);

  // Phase 15.6: 摂食割合が10になったら残り対応をリセット
  useEffect(() => {
    if (formData.consumptionRateInput === 10) {
      setFormData(prev => ({
        ...prev,
        remainingHandling: '',
        remainingHandlingOther: '',
      }));
    }
  }, [formData.consumptionRateInput]);

  // バリデーション
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.staffName.trim()) {
      newErrors.staffName = '入力者名を入力してください。';
    }
    if (formData.dayServiceUsage === '利用中' && !formData.dayServiceName) {
      newErrors.dayServiceName = 'デイサービスを選択してください。';
    }
    if (formData.servedQuantity <= 0) {
      newErrors.servedQuantity = '提供数量を入力してください。';
    }
    if (formData.servedQuantity > currentQuantity) {
      newErrors.servedQuantity = `提供数量が残量(${currentQuantity}${item.unit})を超えています`;
    }
    // Phase 15.6: 残った分がある場合は対応を必須に
    if (formData.consumptionRateInput < 10 && !formData.remainingHandling) {
      newErrors.remainingHandling = '残った分への対応を選択してください。';
    }
    // Phase 15.6: その他を選択した場合は詳細を必須に
    if (formData.remainingHandling === 'other' && !formData.remainingHandlingOther.trim()) {
      newErrors.remainingHandlingOther = '対応の詳細を入力してください。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, currentQuantity, item.unit]);

  // 送信ハンドラ
  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    // Phase 15.6: 0-10入力 → 0-100スケール変換
    const consumptionRate = formData.consumptionRateInput * 10;
    const consumedQuantity = (consumptionRate / 100) * formData.servedQuantity;
    const consumptionStatus = determineConsumptionStatus(consumptionRate);

    try {
      // 1. consumption_log に記録
      await recordMutation.mutateAsync({
        itemId: item.id,
        servedDate: new Date().toISOString().split('T')[0],
        servedTime: new Date().toTimeString().slice(0, 5),
        mealTime: 'snack',
        servedQuantity: formData.servedQuantity,
        servedBy: formData.staffName,
        consumedQuantity: consumedQuantity,
        consumptionStatus: consumptionStatus,
        consumptionNote: formData.consumptionNote || undefined,
        noteToFamily: formData.noteToFamily || undefined,
        recordedBy: formData.staffName,
      });

      // 2. Sheet B に記録
      const snackRecord: SnackRecord = {
        itemId: item.id,
        itemName: item.itemName,
        servedQuantity: formData.servedQuantity,
        unit: item.unit,
        consumptionStatus: consumptionStatus,
        consumptionRate: consumptionRate,
        followedInstruction: formData.followedFamilyInstructions,
        instructionNote: item.noteToStaff || undefined,
        note: formData.consumptionNote || undefined,
        noteToFamily: formData.noteToFamily || undefined,
        // Phase 15.6: 残り対応
        ...(formData.remainingHandling && { remainingHandling: formData.remainingHandling as RemainingHandling }),
        ...(formData.remainingHandlingOther && { remainingHandlingOther: formData.remainingHandlingOther }),
      };

      await submitMealRecord({
        recordMode: 'snack_only',
        staffName: formData.staffName,
        facility: settings.defaultFacility || '',
        residentName: settings.defaultResidentName || '',
        dayServiceUsage: formData.dayServiceUsage,
        isImportant: formData.isImportant,
        ...(formData.dayServiceName && { dayServiceName: formData.dayServiceName }),
        ...(formData.snack && { snack: formData.snack }),
        ...(formData.note && { note: formData.note }),
        snackRecords: [snackRecord],
        residentId: item.residentId,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : '記録に失敗しました' });
    }
  }, [formData, item, settings, recordMutation, validate, onSuccess, onClose]);

  // Phase 15.7: 残り対応に基づいて消費量・残量を計算
  const consumptionAmounts = useMemo(() => {
    const rate = formData.consumptionRateInput * 10; // 0-10 → 0-100
    const handling = formData.remainingHandling || undefined;
    return calculateConsumptionAmounts(formData.servedQuantity, rate, handling);
  }, [formData.servedQuantity, formData.consumptionRateInput, formData.remainingHandling]);

  const quantityAfter = currentQuantity - consumptionAmounts.inventoryDeducted;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white px-4 py-3 border-b flex items-center justify-between z-10">
          <h2 className="font-bold text-lg">提供・摂食を記録</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 品物情報 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(item.category)}</span>
              <div>
                <p className="font-bold">{item.itemName}</p>
                <p className="text-sm text-gray-500">
                  残り: {currentQuantity}{item.unit}
                  {item.expirationDate && (
                    <span className="ml-2">
                      期限: {new Date(item.expirationDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {item.noteToStaff && (
              <div className="mt-2 text-sm text-blue-700 bg-blue-50 rounded p-2">
                💬 {item.noteToStaff}
              </div>
            )}
          </div>

          {/* エラー表示 */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {errors.submit}
            </div>
          )}

          {/* 入力者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              入力者（あなた）は？ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.staffName}
              onChange={(e) => setFormData(prev => ({ ...prev, staffName: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.staffName ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="お名前を入力"
            />
            {errors.staffName && (
              <p className="mt-1 text-sm text-red-500">{errors.staffName}</p>
            )}
          </div>

          {/* デイサービス利用 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              デイサービスの利用中ですか？ <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {(['利用中', '利用中ではない'] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dayServiceUsage"
                    value={option}
                    checked={formData.dayServiceUsage === option}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        dayServiceUsage: e.target.value as typeof option,
                        dayServiceName: e.target.value === '利用中ではない' ? '' : prev.dayServiceName,
                      }));
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* デイサービス名（条件付き） */}
          {formData.dayServiceUsage === '利用中' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                どこのデイサービスですか？ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.dayServiceName}
                onChange={(e) => setFormData(prev => ({ ...prev, dayServiceName: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg ${errors.dayServiceName ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">選んでください</option>
                {DAY_SERVICE_OPTIONS.map((ds) => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
              </select>
              {errors.dayServiceName && (
                <p className="mt-1 text-sm text-red-500">{errors.dayServiceName}</p>
              )}
            </div>
          )}

          {/* 提供数量 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供数 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                max={currentQuantity}
                step="0.5"
                value={formData.servedQuantity}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({
                    ...prev,
                    servedQuantity: value,
                  }));
                }}
                className={`w-24 border rounded-lg px-3 py-2 text-sm ${errors.servedQuantity ? 'border-red-500' : 'border-gray-300'}`}
              />
              <span className="text-gray-600">{item.unit}</span>
            </div>
            {errors.servedQuantity && (
              <p className="mt-1 text-sm text-red-500">{errors.servedQuantity}</p>
            )}
          </div>

          {/* Phase 15.6: 摂食した割合（0-10数値入力） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              摂食した割合 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="10"
                step="1"
                value={formData.consumptionRateInput}
                onChange={(e) => {
                  const value = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
                  setFormData(prev => ({ ...prev, consumptionRateInput: value }));
                }}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-center text-lg font-semibold"
              />
              <span className="text-gray-600 font-medium">/ 10</span>
              <span className="text-sm text-gray-500 ml-2">
                （{formData.consumptionRateInput * 10}%）
              </span>
            </div>
            {/* スライダー補助（視覚的なフィードバック） */}
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={formData.consumptionRateInput}
              onChange={(e) => setFormData(prev => ({ ...prev, consumptionRateInput: parseInt(e.target.value) }))}
              className="w-full mt-2 accent-primary"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0（食べず）</span>
              <span>5（半分）</span>
              <span>10（完食）</span>
            </div>
          </div>

          {/* Phase 15.6: 残った分への対応（摂食割合 < 10の場合のみ） */}
          {formData.consumptionRateInput < 10 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                残った分への対応 <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {REMAINING_HANDLING_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      formData.remainingHandling === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="remainingHandling"
                      value={option.value}
                      checked={formData.remainingHandling === option.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, remainingHandling: e.target.value as RemainingHandling }))}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {errors.remainingHandling && (
                <p className="mt-1 text-sm text-red-500">{errors.remainingHandling}</p>
              )}

              {/* その他の詳細入力 */}
              {formData.remainingHandling === 'other' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={formData.remainingHandlingOther}
                    onChange={(e) => setFormData(prev => ({ ...prev, remainingHandlingOther: e.target.value }))}
                    placeholder="対応の詳細を入力"
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      errors.remainingHandlingOther ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.remainingHandlingOther && (
                    <p className="mt-1 text-sm text-red-500">{errors.remainingHandlingOther}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ（任意）</label>
            <textarea
              value={formData.consumptionNote}
              onChange={(e) => setFormData(prev => ({ ...prev, consumptionNote: e.target.value }))}
              placeholder="おいしそうに召し上がりました"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* 間食について補足 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              間食について補足（自由記入）
            </label>
            <textarea
              value={formData.snack}
              onChange={(e) => setFormData(prev => ({ ...prev, snack: e.target.value }))}
              placeholder="施設のおやつも召し上がりました など"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* 特記事項 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">特記事項</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
              placeholder="【ケアに関すること】&#10;&#10;【ACPiece】"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* 重要特記事項 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              重要特記事項集計表に反映させますか？ <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {(['重要', '重要ではない'] as const).map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isImportant"
                    value={option}
                    checked={formData.isImportant === option}
                    onChange={(e) => setFormData(prev => ({ ...prev, isImportant: e.target.value as typeof option }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 記録後の残量プレビュー (Phase 15.7対応) */}
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600">記録後の残量: </span>
            <span className="text-lg font-semibold text-blue-700">
              {quantityAfter.toFixed(1)}{item.unit}
            </span>
            {consumptionAmounts.wastedQuantity > 0 && (
              <span className="text-xs text-orange-600 block mt-1">
                🗑️ 廃棄: {consumptionAmounts.wastedQuantity.toFixed(1)}{item.unit}
              </span>
            )}
            {quantityAfter <= 0 && (
              <span className="text-xs text-orange-600 block mt-1">
                ※ 在庫がなくなります（品物は「消費完了」になります）
              </span>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="sticky bottom-0 bg-white flex justify-end gap-2 p-4 border-t">
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
            {recordMutation.isPending ? '記録中...' : '記録を保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 家族の指示から推奨提供数を計算
 */
function getSuggestedQuantity(item: CareItem): number {
  if (!item.noteToStaff) return 1;

  const match = item.noteToStaff.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const suggested = parseFloat(match[1]);
    if (suggested > 0 && suggested <= 10) {
      return suggested;
    }
  }

  return 1;
}
