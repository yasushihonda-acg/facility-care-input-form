/**
 * 品物編集ページ（家族用）
 * Phase 22.1: 品物編集機能
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション9.2
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { useCareItems, useUpdateCareItem } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import {
  ITEM_CATEGORIES,
  STORAGE_METHODS,
  SERVING_METHODS,
  ITEM_UNITS,
  REMAINING_HANDLING_INSTRUCTION_OPTIONS,
  formatDate,
  migrateCategory,
} from '../../types/careItem';
import type {
  ItemCategory,
  StorageMethod,
  ServingMethod,
  RemainingHandlingInstruction,
} from '../../types/careItem';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

interface EditFormData {
  itemName: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  expirationDate: string;
  storageMethod: StorageMethod | '';
  servingMethod: ServingMethod;
  servingMethodDetail: string;
  plannedServeDate: string;
  noteToStaff: string;
  // Phase 33: 残った場合の処置指示
  remainingHandlingInstruction: RemainingHandlingInstruction;
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

  // フォーム状態（Phase 31: デフォルトカテゴリを food に変更）
  const [formData, setFormData] = useState<EditFormData>({
    itemName: '',
    category: 'food',
    quantity: 1,
    unit: '個',
    expirationDate: '',
    storageMethod: '',
    servingMethod: 'as_is',
    servingMethodDetail: '',
    plannedServeDate: '',
    noteToStaff: '',
    remainingHandlingInstruction: 'none',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 品物データが取得できたらフォームにセット（旧カテゴリは自動変換）
  useEffect(() => {
    if (item) {
      setFormData({
        itemName: item.itemName || '',
        category: migrateCategory(item.category || 'food'),
        quantity: item.quantity || 1,
        unit: item.unit || '個',
        expirationDate: item.expirationDate || '',
        storageMethod: item.storageMethod || '',
        servingMethod: item.servingMethod || 'as_is',
        servingMethodDetail: item.servingMethodDetail || '',
        plannedServeDate: item.plannedServeDate || '',
        noteToStaff: item.noteToStaff || '',
        remainingHandlingInstruction: item.remainingHandlingInstruction || 'none',
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

  // バリデーション
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.itemName.trim()) {
      newErrors.itemName = '品物名を入力してください';
    }
    if (formData.quantity < 1) {
      newErrors.quantity = '1以上を入力してください';
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
      navigate(`/demo/family/items/${id}`);
      setIsSubmitting(false);
      return;
    }

    // 本番モードの場合: API呼び出し
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        updates: {
          itemName: formData.itemName,
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
        },
      });
      navigate(`/family/items/${id}`);
    } catch (error) {
      console.error('Update failed:', error);
      alert('更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // キャンセル
  const handleCancel = () => {
    navigate(`${pathPrefix}/family/items/${id}`);
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
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
              errors.itemName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="例: キウイ"
          />
          {errors.itemName && (
            <p className="mt-1 text-sm text-red-500">{errors.itemName}</p>
          )}
        </div>

        {/* カテゴリ（Phase 31: 2カテゴリに簡素化） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カテゴリ <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {ITEM_CATEGORIES.map((cat) => (
              <label
                key={cat.value}
                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition ${
                  formData.category === cat.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.value}
                  checked={formData.category === cat.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-base font-medium">{cat.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 送付日（編集不可） */}
        <div>
          <label htmlFor="sentDate" className="block text-sm font-medium text-gray-700 mb-1">
            送付日（変更不可）
          </label>
          <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 flex items-center justify-between">
            <span>{formatDate(item.sentDate)}</span>
            <span className="text-gray-400">🔒</span>
          </div>
          <input
            type="hidden"
            id="sentDate"
            name="sentDate"
            value={item.sentDate}
            readOnly
            disabled
          />
        </div>

        {/* 個数・単位 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              個数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              min="1"
              step="0.5"
              value={formData.quantity}
              onChange={handleChange}
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
          <div className="grid grid-cols-3 gap-2">
            {STORAGE_METHODS.map((sm) => (
              <label
                key={sm.value}
                className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition text-sm ${
                  formData.storageMethod === sm.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="storageMethod"
                  value={sm.value}
                  checked={formData.storageMethod === sm.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                {sm.label}
              </label>
            ))}
          </div>
        </div>

        {/* 提供方法 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            提供方法 <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SERVING_METHODS.map((sm) => (
              <label
                key={sm.value}
                className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition text-sm ${
                  formData.servingMethod === sm.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="servingMethod"
                  value={sm.value}
                  checked={formData.servingMethod === sm.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                {sm.label}
              </label>
            ))}
          </div>
        </div>

        {/* 提供方法詳細 */}
        <div>
          <label htmlFor="servingMethodDetail" className="block text-sm font-medium text-gray-700 mb-1">
            提供方法の詳細
          </label>
          <textarea
            id="servingMethodDetail"
            name="servingMethodDetail"
            rows={2}
            value={formData.servingMethodDetail}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="例: 8等分にカットしてください"
          />
        </div>

        {/* 提供予定日 */}
        <div>
          <label htmlFor="plannedServeDate" className="block text-sm font-medium text-gray-700 mb-1">
            提供予定日
          </label>
          <input
            type="date"
            id="plannedServeDate"
            name="plannedServeDate"
            value={formData.plannedServeDate}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="スタッフに伝えたいことがあれば記入"
          />
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
                  formData.remainingHandlingInstruction === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="remainingHandlingInstruction"
                  value={option.value}
                  checked={formData.remainingHandlingInstruction === option.value}
                  onChange={handleChange}
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
    </Layout>
  );
}

export default ItemEditPage;
