/**
 * 品物登録フォーム（家族用）
 * @see docs/ITEM_MANAGEMENT_SPEC.md
 * @see docs/AI_INTEGRATION_SPEC.md (セクション8: AI提案UI統合, セクション9: プリセット統合)
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { AISuggestion } from '../../components/family/AISuggestion';
import { SaveAISuggestionDialog } from '../../components/family/SaveAISuggestionDialog';
import { SaveManualPresetDialog } from '../../components/family/SaveManualPresetDialog';
import { ServingScheduleInput } from '../../components/family/ServingScheduleInput';
import { useSubmitCareItem } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useAISuggest } from '../../hooks/useAISuggest';
import {
  ITEM_CATEGORIES,
  STORAGE_METHODS,
  SERVING_METHODS,
  ITEM_UNITS,
  REMAINING_HANDLING_INSTRUCTION_OPTIONS,
} from '../../types/careItem';
import type { RemainingHandlingInstruction } from '../../types/careItem';
import type {
  CareItemInput,
  ItemCategory,
  StorageMethod,
  ServingMethod,
  ServingSchedule,
  AISuggestResponse,
} from '../../types/careItem';
import { scheduleToPlannedDate } from '../../utils/scheduleUtils';
import { DEMO_PRESETS } from '../../data/demoFamilyData';
import { normalizeItemName } from '../../api';
import type { CarePreset } from '../../types/family';

// デモ用の入居者ID・ユーザーID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';
const DEMO_USER_ID = 'family-001';

// AI提案機能は一時的に非表示（Phase 41）
const ENABLE_AI_SUGGESTION = false;

// 今日の日付（YYYY-MM-DD形式）
const getTodayString = () => new Date().toISOString().split('T')[0];

export function ItemForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = useDemoMode();
  const submitItem = useSubmitCareItem();

  // URL永続化: returnUrlがあればそれを使用、なければデフォルトの品物管理画面へ
  const returnUrl = searchParams.get('returnUrl') || (isDemo ? '/demo/family/items' : '/family/items');

  // フォーム状態（Phase 31: デフォルトカテゴリを food に変更）
  const [formData, setFormData] = useState<CareItemInput>({
    itemName: '',
    category: 'food',
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

  // 手動登録後のプリセット保存ダイアログ用state
  const [showManualPresetDialog, setShowManualPresetDialog] = useState(false);
  const [registeredFormData, setRegisteredFormData] = useState<CareItemInput | null>(null);

  // Phase 43.1: 品物名正規化の状態
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizedSuggestion, setNormalizedSuggestion] = useState<string | null>(null);
  const lastNormalizedItemName = useRef<string>(''); // 重複呼び出し防止

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

  // Phase 43.1: 品物名正規化（onBlurで呼び出し）
  const handleNormalizeItemName = useCallback(async () => {
    const itemName = formData.itemName.trim();

    // 既に正規化済み、または短すぎる場合はスキップ
    if (itemName.length < 3 || itemName === lastNormalizedItemName.current) {
      return;
    }

    // ユーザーが既に手動で入力している場合はスキップ
    if (formData.normalizedName && formData.normalizedName !== lastNormalizedItemName.current) {
      return;
    }

    // デモモードでもAPIを呼び出す（将来的にはデモ用のモックに切り替え可能）
    setIsNormalizing(true);
    setNormalizedSuggestion(null);

    try {
      const response = await normalizeItemName(itemName);
      if (response.success && response.data) {
        const { normalizedName, confidence } = response.data;
        // 品物名と異なる場合のみ提案を表示
        if (normalizedName !== itemName && confidence !== 'low') {
          setNormalizedSuggestion(normalizedName);
          lastNormalizedItemName.current = itemName;
        }
      }
    } catch (error) {
      console.error('品物名正規化エラー:', error);
      // エラー時は静かに失敗（UXを損なわない）
    } finally {
      setIsNormalizing(false);
    }
  }, [formData.itemName, formData.normalizedName]);

  // 正規化提案を適用
  const handleApplyNormalizedName = useCallback(() => {
    if (normalizedSuggestion) {
      setFormData((prev) => ({ ...prev, normalizedName: normalizedSuggestion }));
      setNormalizedSuggestion(null);
    }
  }, [normalizedSuggestion]);

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
      // 統計用の表示名（品物名と同じ）
      normalizedName: itemName,
      // カテゴリ（食べ物/飲み物）
      ...(preset.itemCategory && { category: preset.itemCategory }),
      // 保存方法
      ...(preset.storageMethod && { storageMethod: preset.storageMethod }),
      // 提供方法（プリセットに指定があればそれを使用、なければ'as_is'）
      servingMethod: preset.servingMethod || 'as_is',
      // 提供方法の詳細（新形式優先、旧形式フォールバック）
      servingMethodDetail: preset.servingMethodDetail || preset.processingDetail || '',
      // スタッフへの申し送り
      ...(preset.noteToStaff && { noteToStaff: preset.noteToStaff }),
      // 残った場合の処置指示
      ...(preset.remainingHandlingInstruction && { remainingHandlingInstruction: preset.remainingHandlingInstruction }),
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
  // @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // デモモードの場合: APIを呼ばず、プリセット保存ダイアログを表示
    if (isDemo) {
      // デモでも同じUXを提供（プリセット保存は実際には行われない）
      setRegisteredFormData({ ...formData });
      setShowManualPresetDialog(true);
      return;
    }

    // 本番モードの場合: 通常通りAPI呼び出し
    setIsSubmitting(true);
    try {
      await submitItem.mutateAsync({
        residentId: DEMO_RESIDENT_ID,
        userId: DEMO_USER_ID,
        item: formData,
      });

      // 成功時はプリセット保存ダイアログを表示
      setRegisteredFormData({ ...formData });
      setShowManualPresetDialog(true);
    } catch (error) {
      console.error('Submit error:', error);
      alert('登録に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 手動登録後のダイアログ: ×ボタン（ダイアログを閉じるだけ）
  const handleDialogDismiss = useCallback(() => {
    setShowManualPresetDialog(false);
    // registeredFormDataはクリアしない（再度ダイアログを開ける可能性を残す）
  }, []);

  // 手動登録後のダイアログ: 「今回だけ」を選択
  const handleManualPresetSkip = useCallback(() => {
    setShowManualPresetDialog(false);
    setRegisteredFormData(null);
    // デモモードの場合はアラート表示
    if (isDemo) {
      alert('登録しました（デモモード - 実際には保存されません）');
    }
    // returnUrl（フィルター状態保持）へ遷移
    navigate(returnUrl);
  }, [isDemo, navigate, returnUrl]);

  // 手動登録後のダイアログ: 「保存して完了」後
  const handleManualPresetSaved = useCallback(() => {
    setShowManualPresetDialog(false);
    setRegisteredFormData(null);
    // デモモードの場合はアラート表示
    if (isDemo) {
      alert('登録しました（デモモード - プリセット保存も実際には行われません）');
    }
    // returnUrl（フィルター状態保持）へ遷移
    navigate(returnUrl);
  }, [isDemo, navigate, returnUrl]);

  return (
    <Layout title="品物を登録" showBackButton>
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-4 space-y-6 pb-8">
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
                  setNormalizedSuggestion(null); // 正規化提案もクリア
                }}
                onBlur={handleNormalizeItemName}
                placeholder="例: ぶどう（プリセット以外は手入力）"
                className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.itemName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {/* AI提案ボタン（ボタン押下で発動） - Phase 41で一時的に非表示 */}
              {ENABLE_AI_SUGGESTION && (
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
              )}
            </div>
            {errors.itemName && (
              <p className="mt-1 text-sm text-red-500">{errors.itemName}</p>
            )}
            {/* AI提案カード（ボタン押下後に表示） - Phase 41で一時的に非表示 */}
            {ENABLE_AI_SUGGESTION && (
              <AISuggestion
                suggestion={suggestion}
                isLoading={isAISuggesting}
                warning={aiWarning}
                onApply={handleApplySuggestion}
              />
            )}
          </div>

          {/* 統計用の表示名（Phase 43: 品物名の正規化） */}
          <div>
            <label htmlFor="normalizedName" className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-1">
                <span>📊</span>
                <span>統計での表示名</span>
                <span className="text-xs text-gray-400 font-normal">（任意）</span>
                {isNormalizing && (
                  <span className="text-xs text-blue-500 animate-pulse">🔄 AI分析中...</span>
                )}
              </span>
            </label>
            <div className="flex gap-2">
              <input
                id="normalizedName"
                type="text"
                value={formData.normalizedName || ''}
                onChange={(e) => {
                  updateField('normalizedName', e.target.value || undefined);
                  setNormalizedSuggestion(null); // 手動入力時は提案をクリア
                }}
                placeholder={formData.itemName || '品物名と同じ（変更可能）'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              />
              {/* AI提案ボタン（Phase 43.1） */}
              {normalizedSuggestion && !formData.normalizedName && (
                <button
                  type="button"
                  onClick={handleApplyNormalizedName}
                  className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm whitespace-nowrap"
                >
                  「{normalizedSuggestion}」を使う
                </button>
              )}
            </div>
            {/* AI提案のヒント表示 */}
            {normalizedSuggestion && formData.normalizedName && normalizedSuggestion !== formData.normalizedName && (
              <p className="mt-1 text-xs text-blue-500">
                💡 AI提案: 「{normalizedSuggestion}」
                <button
                  type="button"
                  onClick={handleApplyNormalizedName}
                  className="ml-2 underline hover:no-underline"
                >
                  適用
                </button>
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              例: 「森永プリン」→「プリン」。同じ種類の品物を同じ名前にすると統計がまとまります。
            </p>
          </div>

          {/* カテゴリ（Phase 31: 2カテゴリに簡素化） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ITEM_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => updateField('category', cat.value as ItemCategory)}
                  className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    formData.category === cat.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-base font-medium">{cat.label}</span>
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
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          )}

          {/* 提供スケジュール（Phase 13.1） */}
          <ServingScheduleInput
            value={formData.servingSchedule}
            onChange={(schedule: ServingSchedule | undefined) => {
              // servingScheduleを更新
              updateField('servingSchedule', schedule);
              // 後方互換: once タイプの場合は plannedServeDate も更新
              const plannedDate = scheduleToPlannedDate(schedule);
              if (plannedDate !== formData.plannedServeDate) {
                setFormData((prev) => ({
                  ...prev,
                  servingSchedule: schedule,
                  plannedServeDate: plannedDate,
                }));
              }
            }}
            disabled={isSubmitting}
          />

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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary resize-y"
            />
            <p className="mt-1 text-xs text-gray-500">
              ※ 特別な条件（体調不良時は除外など）もここに記載してください
            </p>
          </div>

          {/* Phase 33: 残った場合の処置指示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              残った場合の処置指示
            </label>
            <div className="space-y-2">
              {REMAINING_HANDLING_INSTRUCTION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    (formData.remainingHandlingInstruction ?? 'none') === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="remainingHandlingInstruction"
                    value={option.value}
                    checked={(formData.remainingHandlingInstruction ?? 'none') === option.value}
                    onChange={(e) => updateField('remainingHandlingInstruction', e.target.value as RemainingHandlingInstruction)}
                    className="mt-1 w-4 h-4"
                  />
                  <div>
                    <span className="font-medium text-sm">{option.label}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              ※ 指示がある場合、スタッフは指示通りの対応のみ選択可能になります
            </p>
          </div>

          {/* 送信ボタン（フォーム最下部に通常配置） */}
          {/* 必須項目未入力時はdisabled */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting || !formData.itemName.trim()}
              className="w-full py-4 bg-primary text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
            {!formData.itemName.trim() && (
              <p className="mt-2 text-sm text-gray-500 text-center">
                ※ 品物名を入力すると登録できます
              </p>
            )}
          </div>
        </form>
      </div>

      {/* AI提案保存ダイアログ - Phase 41で一時的に非表示 */}
      {ENABLE_AI_SUGGESTION && pendingAISuggestion && (
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

      {/* 手動登録後のプリセット保存ダイアログ */}
      {registeredFormData && (
        <SaveManualPresetDialog
          isOpen={showManualPresetDialog}
          onDismiss={handleDialogDismiss}
          onSkip={handleManualPresetSkip}
          onSaved={handleManualPresetSaved}
          residentId={DEMO_RESIDENT_ID}
          userId={DEMO_USER_ID}
          formData={registeredFormData}
        />
      )}
    </Layout>
  );
}

export default ItemForm;
