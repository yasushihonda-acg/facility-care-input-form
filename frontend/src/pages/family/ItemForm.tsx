/**
 * 品物登録フォーム（家族用）
 * @see docs/ITEM_MANAGEMENT_SPEC.md
 * @see docs/AI_INTEGRATION_SPEC.md (セクション8: AI提案UI統合)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { AISuggestion } from '../../components/family/AISuggestion';
import { useSubmitCareItem } from '../../hooks/useCareItems';
import { useAISuggest } from '../../hooks/useAISuggest';
import {
  ITEM_CATEGORIES,
  STORAGE_METHODS,
  SERVING_METHODS,
  ITEM_UNITS,
} from '../../types/careItem';
import type { CareItemInput, ItemCategory, StorageMethod, ServingMethod, AISuggestResponse } from '../../types/careItem';

// デモ用の入居者ID・ユーザーID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';
const DEMO_USER_ID = 'family-001';

// 今日の日付（YYYY-MM-DD形式）
const getTodayString = () => new Date().toISOString().split('T')[0];

export function ItemForm() {
  const navigate = useNavigate();
  const submitItem = useSubmitCareItem();

  // フォーム状態
  const [formData, setFormData] = useState<CareItemInput>({
    itemName: '',
    category: 'fruit',
    sentDate: getTodayString(),
    quantity: 1,
    unit: '個',
    servingMethod: 'as_is',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI提案フック
  const {
    suggestion,
    isLoading: isAISuggesting,
    warning: aiWarning,
    fetchSuggestion,
    clear: clearSuggestion,
  } = useAISuggest({ minLength: 2, debounceMs: 500 });

  // 品物名変更時にAI提案を取得
  useEffect(() => {
    if (formData.itemName.length >= 2) {
      fetchSuggestion(formData.itemName, formData.category);
    } else {
      clearSuggestion();
    }
  }, [formData.itemName, formData.category, fetchSuggestion, clearSuggestion]);

  // AI提案を適用
  const handleApplySuggestion = useCallback((aiSuggestion: AISuggestResponse) => {
    // 賞味期限: 今日 + expirationDays
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + aiSuggestion.expirationDays);
    const expirationDateStr = expirationDate.toISOString().split('T')[0];

    setFormData((prev) => ({
      ...prev,
      expirationDate: expirationDateStr,
      storageMethod: aiSuggestion.storageMethod,
      servingMethod: aiSuggestion.servingMethods?.[0] || prev.servingMethod,
      servingMethodDetail: aiSuggestion.notes || prev.servingMethodDetail,
    }));
  }, []);

  // フィールド更新
  const updateField = <K extends keyof CareItemInput>(
    field: K,
    value: CareItemInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // バリデーション
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = '品物名を入力してください';
    }

    if (!formData.sentDate) {
      newErrors.sentDate = '送付日を入力してください';
    }

    if (formData.quantity < 1) {
      newErrors.quantity = '1以上の数を入力してください';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = '単位を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await submitItem.mutateAsync({
        residentId: DEMO_RESIDENT_ID,
        userId: DEMO_USER_ID,
        item: formData,
      });

      // 成功時は一覧に戻る
      navigate('/family/items');
    } catch (error) {
      console.error('Submit error:', error);
      alert('登録に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="品物を登録" showBackButton>
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-32">
          {/* 品物名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              品物名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => updateField('itemName', e.target.value)}
              placeholder="例: キウイ"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                errors.itemName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.itemName && (
              <p className="mt-1 text-sm text-red-500">{errors.itemName}</p>
            )}
            {/* AI提案カード */}
            <AISuggestion
              suggestion={suggestion}
              isLoading={isAISuggesting}
              warning={aiWarning}
              onApply={handleApplySuggestion}
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ITEM_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => updateField('category', cat.value as ItemCategory)}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                    formData.category === cat.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-sm">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 送付日・個数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                送付日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.sentDate}
                onChange={(e) => updateField('sentDate', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary ${
                  errors.sentDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.sentDate && (
                <p className="mt-1 text-sm text-red-500">{errors.sentDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                個数 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => updateField('quantity', parseInt(e.target.value, 10) || 1)}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <select
                  value={formData.unit}
                  onChange={(e) => updateField('unit', e.target.value)}
                  className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  {ITEM_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* 賞味期限 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              賞味期限
            </label>
            <input
              type="date"
              value={formData.expirationDate || ''}
              onChange={(e) => updateField('expirationDate', e.target.value || undefined)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              賞味期限が近づくとスタッフに通知されます
            </p>
          </div>

          {/* 保存方法 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              保存方法
            </label>
            <div className="flex gap-2">
              {STORAGE_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => updateField('storageMethod', method.value as StorageMethod)}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                    formData.storageMethod === method.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* 提供方法 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              提供方法 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVING_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => updateField('servingMethod', method.value as ServingMethod)}
                  className={`py-2 px-4 rounded-lg border transition-colors text-sm ${
                    formData.servingMethod === method.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* 提供方法の詳細 */}
          {formData.servingMethod !== 'as_is' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                提供方法の詳細
              </label>
              <textarea
                value={formData.servingMethodDetail || ''}
                onChange={(e) => updateField('servingMethodDetail', e.target.value || undefined)}
                placeholder="例: 食べやすい大きさにカットしてください"
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          )}

          {/* 提供予定日 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              提供予定日
            </label>
            <input
              type="date"
              value={formData.plannedServeDate || ''}
              onChange={(e) => updateField('plannedServeDate', e.target.value || undefined)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-gray-500">
              指定日にスタッフへリマインダーが届きます
            </p>
          </div>

          {/* スタッフへの申し送り */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              スタッフへの申し送り
            </label>
            <textarea
              value={formData.noteToStaff || ''}
              onChange={(e) => updateField('noteToStaff', e.target.value || undefined)}
              placeholder="例: 好物なのでぜひ食べさせてあげてください"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* 送信ボタン（固定） */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

export default ItemForm;
