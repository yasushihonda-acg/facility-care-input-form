/**
 * 品物登録フォーム（家族用）
 * @see docs/ITEM_MANAGEMENT_SPEC.md
 * @see docs/AI_INTEGRATION_SPEC.md (セクション8: AI提案UI統合, セクション9: プリセット統合)
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { AISuggestion } from '../../components/family/AISuggestion';
import { SaveAISuggestionDialog } from '../../components/family/SaveAISuggestionDialog';
import { useSubmitCareItem } from '../../hooks/useCareItems';
import { useAISuggest } from '../../hooks/useAISuggest';
import {
  ITEM_CATEGORIES,
  STORAGE_METHODS,
  SERVING_METHODS,
  ITEM_UNITS,
} from '../../types/careItem';
import type {
  CareItemInput,
  ItemCategory,
  StorageMethod,
  ServingMethod,
  AISuggestResponse,
} from '../../types/careItem';
import { DEMO_PRESETS } from '../../data/demoFamilyData';
import type { CarePreset } from '../../types/family';

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

  // AI提案保存ダイアログ用state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingAISuggestion, setPendingAISuggestion] = useState<AISuggestResponse | null>(null);

  // AI提案フック（ボタン押下で発動）
  // @see docs/ITEM_MANAGEMENT_SPEC.md - 手入力 + AI提案フロー
  const {
    suggestion,
    isLoading: isAISuggesting,
    warning: aiWarning,
    fetchSuggestion,
    clear: clearSuggestion,
  } = useAISuggest({ minLength: 2, debounceMs: 0 }); // debounce不要（ボタン発動）

  // AI提案ボタンクリック時に提案を取得
  const handleRequestAISuggestion = useCallback(() => {
    if (formData.itemName.length >= 2) {
      fetchSuggestion(formData.itemName, formData.category);
    }
  }, [formData.itemName, formData.category, fetchSuggestion]);

  // AI提案をフォームに適用（内部ロジック）
  const applySuggestionToForm = useCallback((aiSuggestion: AISuggestResponse) => {
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

  // AI提案を適用（ダイアログを表示）
  const handleApplySuggestion = useCallback((aiSuggestion: AISuggestResponse) => {
    setPendingAISuggestion(aiSuggestion);
    setShowSaveDialog(true);
  }, []);

  // ダイアログで「今回だけ」を選択
  const handleSkipSave = useCallback(() => {
    if (pendingAISuggestion) {
      applySuggestionToForm(pendingAISuggestion);
    }
    setShowSaveDialog(false);
    setPendingAISuggestion(null);
  }, [pendingAISuggestion, applySuggestionToForm]);

  // ダイアログで「保存して適用」完了後
  const handleSavedAndApply = useCallback(() => {
    if (pendingAISuggestion) {
      applySuggestionToForm(pendingAISuggestion);
    }
    setShowSaveDialog(false);
    setPendingAISuggestion(null);
  }, [pendingAISuggestion, applySuggestionToForm]);

  // プリセット（いつもの指示）を適用
  // @see docs/ITEM_MANAGEMENT_SPEC.md - プリセット適用フロー（推奨パス）
  const handleApplyPreset = useCallback((preset: CarePreset) => {
    // プリセット名から品物名を抽出（カッコ前の部分）
    // 例: "キウイ（8等分・半月切り）" → "キウイ"
    // 例: "黒豆（煮汁を切って器へ）" → "黒豆"
    const extractItemName = (presetName: string): string => {
      const match = presetName.match(/^([^（(]+)/);
      return match ? match[1].trim() : presetName;
    };

    const itemName = extractItemName(preset.name);

    setFormData((prev) => ({
      ...prev,
      // 品物名（プリセット名からカッコ前を抽出）
      itemName,
      // 提供方法の詳細（processingDetailを設定）
      servingMethodDetail: preset.processingDetail,
      // 提供方法: カットがデフォルト（プリセットには通常カット指示が含まれる）
      servingMethod: 'cut',
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
          {/* いつもの指示（プリセット）- 品物名の上に配置 */}
          {/* @see docs/ITEM_MANAGEMENT_SPEC.md - フォーム順序の設計原則 */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <label className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-3">
              <span>⚡</span>
              <span>いつもの指示（プリセット）</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-100 transition-colors text-center"
                >
                  <span className="text-xl">{preset.icon}</span>
                  <span className="text-xs text-gray-700 line-clamp-2">
                    {preset.name.replace(/[（(].*/g, '')}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-2">
              ※ 選択すると品物名と提供方法詳細が自動入力されます
            </p>
          </div>

          {/* 品物名 */}
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
              品物名 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                id="itemName"
                type="text"
                value={formData.itemName}
                onChange={(e) => {
                  updateField('itemName', e.target.value);
                  clearSuggestion(); // 入力変更時はAI提案をクリア
                }}
                placeholder="例: ぶどう（プリセット以外は手入力）"
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.itemName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {/* AI提案ボタン（ボタン押下で発動） */}
              <button
                type="button"
                onClick={handleRequestAISuggestion}
                disabled={formData.itemName.length < 2 || isAISuggesting}
                className={`px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  formData.itemName.length < 2
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isAISuggesting
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                {isAISuggesting ? '🔄' : '🤖'} AI提案
              </button>
            </div>
            {errors.itemName && (
              <p className="mt-1 text-sm text-red-500">{errors.itemName}</p>
            )}
            {/* AI提案カード（ボタン押下後に表示） */}
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
              <label htmlFor="sentDate" className="block text-sm font-medium text-gray-700 mb-1">
                送付日 <span className="text-red-500">*</span>
              </label>
              <input
                id="sentDate"
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
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                数量 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => updateField('quantity', parseInt(e.target.value, 10) || 1)}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <select
                  id="unit"
                  aria-label="単位"
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

      {/* AI提案保存ダイアログ */}
      {pendingAISuggestion && (
        <SaveAISuggestionDialog
          isOpen={showSaveDialog}
          onClose={handleSkipSave}
          onSaved={handleSavedAndApply}
          residentId={DEMO_RESIDENT_ID}
          userId={DEMO_USER_ID}
          itemName={formData.itemName}
          category={formData.category}
          aiSuggestion={pendingAISuggestion}
        />
      )}
    </Layout>
  );
}

export default ItemForm;
