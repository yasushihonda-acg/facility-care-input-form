/**
 * 品物編集ページ（家族用）
 * Phase 22.1: 品物編集機能
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション9.2
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { PresetFormModal } from '../../components/family/PresetFormModal';
import { useCareItems, useUpdateCareItem } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import { usePresets, useCreatePreset, useUpdatePreset } from '../../hooks/usePresets';
import { normalizeItemName } from '../../api';
import {
  ITEM_CATEGORIES,
  STORAGE_METHODS,
  SERVING_METHODS,
  ITEM_UNITS,
  REMAINING_HANDLING_INSTRUCTION_OPTIONS,
  DISCARD_CONDITION_SUGGESTIONS,
  STORE_CONDITION_SUGGESTIONS,
  SERVING_TIME_SLOT_LABELS,
  migrateCategory,
} from '../../types/careItem';
import type {
  ItemCategory,
  StorageMethod,
  ServingMethod,
  ServingTimeSlot,
  RemainingHandlingInstruction,
  RemainingHandlingCondition,
  ServingSchedule,
} from '../../types/careItem';
import type { CarePreset } from '../../types/family';
import { ServingScheduleInput } from '../../components/family/ServingScheduleInput';
import { scheduleToPlannedDate, plannedDateToSchedule } from '../../utils/scheduleUtils';
import { parseNumericInput } from '../../utils/inputHelpers';
import { DEMO_PRESETS } from '../../data/demoFamilyData';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

// デモ用のユーザーID
const DEMO_USER_ID = 'family-001';

interface EditFormData {
  itemName: string;
  // Phase 43: 統計用の表示名
  normalizedName: string;
  category: ItemCategory;
  quantity?: number; // 数量（undefined = 数量管理しない）
  unit: string;
  expirationDate: string;
  storageMethod: StorageMethod | '';
  servingMethod: ServingMethod;
  servingMethodDetail: string;
  plannedServeDate: string;
  noteToStaff: string;
  // Phase 33: 残った場合の処置指示
  remainingHandlingInstruction: RemainingHandlingInstruction;
  /** Phase 54: 処置指示の条件 */
  remainingHandlingConditions: RemainingHandlingCondition[] | undefined;
  // Phase 36: 構造化スケジュール
  servingSchedule: ServingSchedule | undefined;
}

export function ItemEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';

  // 品物データを取得
  const { data, isLoading, error } = useCareItems({
    residentId: DEMO_RESIDENT_ID,
  });

  const updateItem = useUpdateCareItem();
  const item = data?.items.find((i) => i.id === id);

  // プリセット一覧を取得（本番モードのみAPIを使用）
  const { data: presetsData } = usePresets({
    residentId: DEMO_RESIDENT_ID,
    enabled: !isDemo,
  });
  const createPresetMutation = useCreatePreset();
  const updatePresetMutation = useUpdatePreset();
  const presets = isDemo ? DEMO_PRESETS : (presetsData?.presets || DEMO_PRESETS);

  // プリセット検索・ソート・グループ化用state
  const [presetSearch, setPresetSearch] = useState('');
  const [presetSortBy, setPresetSortBy] = useState<'name' | 'usage'>('usage');
  const [groupByTimeSlot, setGroupByTimeSlot] = useState(false);

  // プリセットのフィルタリング・ソート・グループ化
  const processedPresets = useMemo(() => {
    // 検索フィルター
    let filtered = presets.filter((p) =>
      p.name.toLowerCase().includes(presetSearch.toLowerCase())
    );

    // ソート
    filtered = [...filtered].sort((a, b) => {
      if (presetSortBy === 'name') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return (b.usageCount || 0) - (a.usageCount || 0);
    });

    // グループ化
    if (!groupByTimeSlot) {
      return { all: filtered };
    }

    const grouped: Record<string, CarePreset[]> = {
      breakfast: [],
      lunch: [],
      snack: [],
      dinner: [],
      anytime: [],
      unset: [],
    };
    filtered.forEach((p) => {
      const slot = p.servingTimeSlot || 'unset';
      grouped[slot].push(p);
    });
    return grouped;
  }, [presets, presetSearch, presetSortBy, groupByTimeSlot]);

  // フォーム状態（Phase 31: デフォルトカテゴリを food に変更）
  const [formData, setFormData] = useState<EditFormData>({
    itemName: '',
    normalizedName: '',
    category: 'food',
    quantity: undefined, // 数量（undefined = 数量管理しない）
    unit: '個',
    expirationDate: '',
    storageMethod: '',
    servingMethod: 'as_is',
    servingMethodDetail: '',
    plannedServeDate: '',
    noteToStaff: '',
    remainingHandlingInstruction: 'none',
    remainingHandlingConditions: undefined,
    servingSchedule: undefined,
  });

  // 数量管理をスキップするかどうか
  const [skipQuantity, setSkipQuantity] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // プリセット編集・新規追加用state
  const [editingPreset, setEditingPreset] = useState<CarePreset | null>(null);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);

  // 品物名正規化の状態
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizedSuggestion, setNormalizedSuggestion] = useState<string | null>(null);
  const lastNormalizedItemName = useRef<string>('');

  // 品物データが取得できたらフォームにセット（旧カテゴリは自動変換）
  useEffect(() => {
    if (item) {
      // 数量管理しない品物かどうかを判定
      const isQuantitySkipped = item.quantity == null;
      setSkipQuantity(isQuantitySkipped);

      setFormData({
        itemName: item.itemName || '',
        normalizedName: item.normalizedName || '',
        category: migrateCategory(item.category || 'food'),
        quantity: isQuantitySkipped ? undefined : (item.quantity || 1),
        unit: item.unit || '個',
        expirationDate: item.expirationDate || '',
        storageMethod: item.storageMethod || '',
        servingMethod: item.servingMethod || 'as_is',
        servingMethodDetail: item.servingMethodDetail || '',
        plannedServeDate: item.plannedServeDate || '',
        noteToStaff: item.noteToStaff || '',
        remainingHandlingInstruction: item.remainingHandlingInstruction || 'none',
        remainingHandlingConditions: item.remainingHandlingConditions,
        // Phase 36: 構造化スケジュール読み込み（後方互換: plannedServeDateから変換）
        servingSchedule: item.servingSchedule || plannedDateToSchedule(item.plannedServeDate),
      });
    }
  }, [item]);

  // 入力変更ハンドラ
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) : value,
    }));
    // エラーをクリア
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // 数量入力用ハンドラ（半角数字のみ許可）
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      quantity: parseNumericInput(e.target.value),
    }));
    // エラーをクリア
    if (errors.quantity) {
      setErrors((prev) => ({ ...prev, quantity: '' }));
    }
  };

  // Phase 36: スケジュール変更ハンドラ
  const handleScheduleChange = (schedule: ServingSchedule | undefined) => {
    setFormData((prev) => ({
      ...prev,
      servingSchedule: schedule,
      // 構造化スケジュールからplannedServeDateへの後方互換変換
      plannedServeDate: scheduleToPlannedDate(schedule) || prev.plannedServeDate,
    }));
    // エラーをクリア
    if (errors.servingSchedule) {
      setErrors((prev) => ({ ...prev, servingSchedule: '' }));
    }
  };

  // 品物名正規化（onBlurで呼び出し）
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

    setIsNormalizing(true);
    setNormalizedSuggestion(null);

    try {
      const response = await normalizeItemName(itemName);
      if (response.success && response.data) {
        const { normalizedName, confidence } = response.data;
        if (normalizedName !== itemName && confidence !== 'low') {
          setNormalizedSuggestion(normalizedName);
          lastNormalizedItemName.current = itemName;
        }
      }
    } catch (error) {
      console.error('品物名正規化エラー:', error);
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

  // プリセット（いつもの指示）を適用
  const handleApplyPreset = useCallback((preset: CarePreset) => {
    // プリセット名から品物名を抽出（カッコ前の部分）
    const extractItemName = (presetName: string): string => {
      const match = presetName.match(/^([^（(]+)/);
      return match ? match[1].trim() : presetName;
    };

    const itemName = extractItemName(preset.name);

    setFormData((prev) => ({
      ...prev,
      itemName,
      normalizedName: itemName,
      ...(preset.itemCategory && { category: preset.itemCategory }),
      ...(preset.storageMethod && { storageMethod: preset.storageMethod }),
      servingMethod: preset.servingMethod || 'as_is',
      servingMethodDetail: preset.servingMethodDetail || preset.processingDetail || '',
      ...(preset.noteToStaff && { noteToStaff: preset.noteToStaff }),
      ...(preset.remainingHandlingInstruction && { remainingHandlingInstruction: preset.remainingHandlingInstruction }),
    }));
  }, []);

  // バリデーション
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = '品物名を入力してください';
    }
    // 数量管理する場合のみバリデーション
    if (!skipQuantity && (formData.quantity == null || formData.quantity < 1)) {
      newErrors.quantity = '1以上を入力してください';
    }
    if (!formData.servingSchedule) {
      newErrors.servingSchedule = '提供スケジュールを設定してください';
    } else {
      // スケジュールタイプに応じた詳細バリデーション
      const schedule = formData.servingSchedule;
      switch (schedule.type) {
        case 'once':
          if (!schedule.date) {
            newErrors.servingSchedule = '日付を入力してください';
          }
          break;
        case 'daily':
          if (!schedule.startDate) {
            newErrors.servingSchedule = '開始日を入力してください';
          }
          break;
        case 'weekly':
          if (!schedule.startDate) {
            newErrors.servingSchedule = '開始日を入力してください';
          } else if (!schedule.weekdays || schedule.weekdays.length === 0) {
            newErrors.servingSchedule = '曜日を1つ以上選択してください';
          }
          break;
        case 'specific_dates':
          if (!schedule.dates || schedule.dates.length === 0) {
            newErrors.servingSchedule = '日付を1つ以上選択してください';
          }
          break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信ハンドラ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    if (!item) return;

    setIsSubmitting(true);

    // デモモードの場合: APIを呼ばず、成功メッセージを表示
    if (isDemo) {
      alert('更新しました（デモモード - 実際には更新されません）');
      navigate(`/demo/family/items`);
      setIsSubmitting(false);
      return;
    }

    // 本番モードの場合: API呼び出し
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        updates: {
          itemName: formData.itemName,
          normalizedName: formData.normalizedName || undefined,
          category: formData.category,
          quantity: formData.quantity,
          unit: formData.unit,
          expirationDate: formData.expirationDate || undefined,
          storageMethod: formData.storageMethod || undefined,
          servingMethod: formData.servingMethod,
          servingMethodDetail: formData.servingMethodDetail || undefined,
          plannedServeDate: formData.plannedServeDate || undefined,
          noteToStaff: formData.noteToStaff || undefined,
          // Phase 33: 残った場合の処置指示
          remainingHandlingInstruction: formData.remainingHandlingInstruction,
          // Phase 54: 処置指示の条件
          remainingHandlingConditions: formData.remainingHandlingConditions,
          // Phase 36: 構造化スケジュール
          servingSchedule: formData.servingSchedule,
        },
      });
      alert('更新しました');
      navigate(`/family/items`);
    } catch (error) {
      console.error('Update failed:', error);
      alert('更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // キャンセル
  const handleCancel = () => {
    navigate(`${pathPrefix}/family/items`);
  };

  if (isLoading) {
    return (
      <Layout title="品物を編集" showBackButton>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </Layout>
    );
  }

  if (error || !item) {
    return (
      <Layout title="品物を編集" showBackButton>
        <div className="p-4">
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error ? 'エラーが発生しました' : '品物が見つかりません'}
          </div>
          <Link to={`${pathPrefix}/family/items`} className="block mt-4 text-primary text-center">
            ← 品物一覧に戻る
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="品物を編集" showBackButton>
      <form onSubmit={handleSubmit} className="p-4 pb-24 space-y-6">
        {/* いつもの指示（プリセット）- 品物名の上に配置 */}
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          {/* ヘッダー：タイトル + 新規追加ボタン */}
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-amber-700">
              <span>⚡</span>
              <span>いつもの指示（プリセット）</span>
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingPreset(true)}
              className="text-xs px-2 py-1 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded border border-amber-300 transition-colors"
            >
              + 新規追加
            </button>
          </div>
          {/* 検索 + ソート + グループ化コントロール */}
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              type="text"
              placeholder="検索..."
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              className="flex-1 min-w-[120px] px-3 py-1.5 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
            <div className="flex gap-2 shrink-0">
              <select
                value={presetSortBy}
                onChange={(e) => setPresetSortBy(e.target.value as 'name' | 'usage')}
                className="px-2 py-1.5 text-xs border border-amber-200 rounded bg-white"
              >
                <option value="usage">使用順</option>
                <option value="name">名前順</option>
              </select>
              <button
                type="button"
                onClick={() => setGroupByTimeSlot(!groupByTimeSlot)}
                className={`px-2 py-1.5 text-xs rounded border transition-colors ${
                  groupByTimeSlot
                    ? 'bg-amber-100 border-amber-400 text-amber-700'
                    : 'border-amber-200 bg-white text-amber-600 hover:bg-amber-50'
                }`}
              >
                {groupByTimeSlot ? '分類中' : '分類'}
              </button>
            </div>
          </div>

          {/* プリセット一覧（グループ化対応） */}
          {Object.entries(processedPresets).map(([timeSlot, items]) => (
            items.length > 0 && (
              <div key={timeSlot} className="mb-3">
                {groupByTimeSlot && timeSlot !== 'all' && (
                  <h4 className="text-xs font-medium text-amber-700 mb-1.5 flex items-center gap-1">
                    <span>
                      {timeSlot === 'unset'
                        ? '📋 未設定'
                        : `${timeSlot === 'breakfast' ? '🌅' : timeSlot === 'lunch' ? '☀️' : timeSlot === 'snack' ? '🍵' : timeSlot === 'dinner' ? '🌙' : '⏰'} ${SERVING_TIME_SLOT_LABELS[timeSlot as ServingTimeSlot]}`}
                    </span>
                  </h4>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {items.map((preset) => (
                    <div
                      key={preset.id}
                      className="relative flex flex-col items-center gap-1 p-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-100 transition-colors text-center group"
                    >
                      {/* 編集アイコン（モバイル：常に薄く表示、デスクトップ：ホバー時に濃く） */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPreset(preset);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-sm text-gray-400 opacity-40 hover:opacity-100 hover:text-amber-600 group-hover:opacity-100 transition-opacity"
                        title="編集"
                      >
                        ✏️
                      </button>
                      {/* クリックで適用 */}
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="w-full flex flex-col items-center gap-1"
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <span className="text-xs text-gray-700 line-clamp-2">
                          {preset.name.replace(/[（(].*/g, '')}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {/* フッター：説明 + 一覧管理リンク */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-amber-600">
              ※ 選択すると品物名と提供方法詳細が自動入力されます
            </p>
            <Link
              to={isDemo ? '/demo/family/presets' : '/family/presets'}
              className="text-xs text-amber-700 hover:text-amber-900 underline"
            >
              📋 一覧で管理
            </Link>
          </div>
        </div>

        {/* 品物名 */}
        <div>
          <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
            品物名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="itemName"
            name="itemName"
            value={formData.itemName}
            onChange={handleChange}
            onBlur={handleNormalizeItemName}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
              errors.itemName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例: ぶどう（プリセット以外は手入力）"
          />
          {errors.itemName && (
            <p className="mt-1 text-sm text-red-500">{errors.itemName}</p>
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
          <input
            id="normalizedName"
            name="normalizedName"
            type="text"
            value={formData.normalizedName}
            onChange={handleChange}
            placeholder={formData.itemName || '品物名と同じ（変更可能）'}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
          {/* AI提案バナー */}
          {normalizedSuggestion && !formData.normalizedName && (
            <button
              type="button"
              onClick={handleApplyNormalizedName}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 border-2 border-green-300 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
            >
              <span>💡</span>
              <span>AIの提案: 「{normalizedSuggestion}」を使う</span>
            </button>
          )}
          {/* AI提案のヒント表示（手動入力済みの場合） */}
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
                onClick={() => setFormData((prev) => ({
                  ...prev,
                  category: cat.value as ItemCategory,
                  // カテゴリに応じて単位を自動変更
                  unit: cat.value === 'drink' ? 'cc' : '個',
                }))}
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

        {/* 数量 */}
        <div className="space-y-3">
          {/* 数量を管理しないオプション */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="skipQuantity"
              checked={skipQuantity}
              onChange={(e) => {
                setSkipQuantity(e.target.checked);
                if (e.target.checked) {
                  // 数量管理しない場合はquantityをundefinedに
                  setFormData(prev => ({ ...prev, quantity: undefined }));
                  setErrors(prev => ({ ...prev, quantity: '' }));
                }
              }}
              className="w-4 h-4 text-primary rounded"
            />
            <label htmlFor="skipQuantity" className="text-sm text-gray-700">
              数量を管理しない
              <span className="text-gray-500 ml-1">（詰め合わせ等）</span>
            </label>
          </div>

          {/* 数量入力（数量管理する場合のみ表示） */}
          {!skipQuantity && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  個数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleQuantityChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.quantity && (
                  <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
                )}
              </div>
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  単位
                </label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {ITEM_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 数量管理しない場合の説明 */}
          {skipQuantity && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
              📦 在庫数は追跡されません。提供時は「提供した」の記録のみ行います。
            </div>
          )}
        </div>

        {/* 賞味期限 */}
        <div>
          <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1">
            賞味期限
          </label>
          <input
            type="date"
            id="expirationDate"
            name="expirationDate"
            value={formData.expirationDate}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
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
                onClick={() => setFormData((prev) => ({ ...prev, storageMethod: method.value as StorageMethod }))}
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
                onClick={() => setFormData((prev) => ({ ...prev, servingMethod: method.value as ServingMethod }))}
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
            <label htmlFor="servingMethodDetail" className="block text-sm font-medium text-gray-700 mb-1">
              提供方法の詳細
            </label>
            <textarea
              id="servingMethodDetail"
              name="servingMethodDetail"
              rows={3}
              value={formData.servingMethodDetail}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
              placeholder="例: 食べやすい大きさにカットしてください"
            />
          </div>
        )}

        {/* Phase 36: 提供スケジュール（構造化） */}
        <div>
          <ServingScheduleInput
            value={formData.servingSchedule}
            onChange={handleScheduleChange}
          />
          {errors.servingSchedule && (
            <p className="mt-1 text-sm text-red-500">{errors.servingSchedule}</p>
          )}
        </div>

        {/* スタッフへの申し送り */}
        <div>
          <label htmlFor="noteToStaff" className="block text-sm font-medium text-gray-700 mb-1">
            スタッフへの申し送り
          </label>
          <textarea
            id="noteToStaff"
            name="noteToStaff"
            rows={3}
            value={formData.noteToStaff}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
            placeholder="例: 好物なのでぜひ食べさせてあげてください"
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
            {REMAINING_HANDLING_INSTRUCTION_OPTIONS.map((option) => {
              const isSelected = formData.remainingHandlingInstruction === option.value;
              const showConditions = isSelected && (option.value === 'discarded' || option.value === 'stored');
              const suggestions = option.value === 'discarded' ? DISCARD_CONDITION_SUGGESTIONS : STORE_CONDITION_SUGGESTIONS;
              const conditions = formData.remainingHandlingConditions || [];

              return (
                <div key={option.value}>
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="remainingHandlingInstruction"
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          remainingHandlingInstruction: e.target.value as RemainingHandlingInstruction,
                          remainingHandlingConditions: undefined,
                        }));
                      }}
                      className="mt-1 w-4 h-4"
                    />
                    <div>
                      <span className="font-medium text-sm">{option.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
                    </div>
                  </label>

                  {/* 条件入力UI（破棄/保存が選択されている場合のみ表示） */}
                  {showConditions && (
                    <div className="ml-7 mt-2 pl-4 border-l-2 border-gray-200">
                      <div className="text-xs text-gray-600 mb-2">条件を追加（任意）:</div>
                      {conditions.map((cond, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={cond.condition}
                            onChange={(e) => {
                              const newConditions = [...conditions];
                              newConditions[index] = { condition: e.target.value };
                              setFormData((prev) => ({
                                ...prev,
                                remainingHandlingConditions: newConditions as RemainingHandlingCondition[],
                              }));
                            }}
                            placeholder="条件を入力..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            list={`condition-suggestions-${option.value}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newConditions = conditions.filter((_, i) => i !== index);
                              setFormData((prev) => ({
                                ...prev,
                                remainingHandlingConditions: newConditions.length > 0 ? newConditions as RemainingHandlingCondition[] : undefined,
                              }));
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="条件を削除"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <datalist id={`condition-suggestions-${option.value}`}>
                        {suggestions.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                      <button
                        type="button"
                        onClick={() => {
                          const newConditions = [...conditions, { condition: '' }];
                          setFormData((prev) => ({
                            ...prev,
                            remainingHandlingConditions: newConditions as RemainingHandlingCondition[],
                          }));
                        }}
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        <span>＋</span> 条件を追加
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            ※ 指示がある場合、スタッフは指示通りの対応のみ選択可能になります
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition disabled:opacity-50"
          >
            {isSubmitting ? '更新中...' : '更新する'}
          </button>
        </div>
      </form>

      {/* プリセット作成/編集モーダル */}
      {(isCreatingPreset || editingPreset) && (
        <PresetFormModal
          preset={editingPreset}
          onClose={() => {
            setIsCreatingPreset(false);
            setEditingPreset(null);
          }}
          onSave={async (input) => {
            // デモモードの場合: APIを呼ばず、成功メッセージを表示
            if (isDemo) {
              const action = editingPreset ? '更新' : '作成';
              alert(`${action}しました（デモモード - 実際には保存されません）`);
              setIsCreatingPreset(false);
              setEditingPreset(null);
              return;
            }

            // 本番モードの場合: 通常通りAPI呼び出し
            if (editingPreset) {
              await updatePresetMutation.mutateAsync({
                presetId: editingPreset.id,
                updates: input,
              });
            } else {
              await createPresetMutation.mutateAsync({
                residentId: DEMO_RESIDENT_ID,
                userId: DEMO_USER_ID,
                preset: input,
                source: 'manual',
              });
            }
            setIsCreatingPreset(false);
            setEditingPreset(null);
          }}
          isSaving={createPresetMutation.isPending || updatePresetMutation.isPending}
        />
      )}
    </Layout>
  );
}

export default ItemEditPage;
