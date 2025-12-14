import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MealInputForm } from '../types/mealForm';
import {
  initialMealForm,
  FACILITIES,
  RESIDENTS,
  MEAL_TIMES,
  INTAKE_RATIOS,
  INJECTION_TYPES,
  INJECTION_AMOUNTS,
} from '../types/mealForm';

export function MealInputPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<MealInputForm>(initialMealForm);
  const [errors, setErrors] = useState<Partial<Record<keyof MealInputForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 施設に連動した利用者リスト
  const availableResidents = useMemo(() => {
    return form.facility ? RESIDENTS[form.facility] || [] : [];
  }, [form.facility]);

  // フィールド更新
  const updateField = <K extends keyof MealInputForm>(
    field: K,
    value: MealInputForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // 施設変更時は利用者をリセット
    if (field === 'facility') {
      setForm((prev) => ({ ...prev, residentName: '' }));
    }
  };

  // バリデーション
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MealInputForm, string>> = {};

    if (!form.staffName.trim()) {
      newErrors.staffName = 'このフィールドを入力してください。';
    }
    if (!form.facility) {
      newErrors.facility = '施設を選択してください。';
    }
    if (!form.residentName) {
      newErrors.residentName = '利用者を選択してください。';
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
      // デモ版: 実際のAPI呼び出しはスキップ
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('送信データ:', form);
      setShowSuccess(true);
      // 3秒後にフォームリセット
      setTimeout(() => {
        setForm(initialMealForm);
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('送信エラー:', error);
      alert('送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gray-700 text-white shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">食事</h1>
        </div>
      </header>

      {/* 成功トースト */}
      {showSuccess && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg bg-secondary text-white">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">送信しました</span>
          </div>
        </div>
      )}

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-lg mx-auto">
        {/* 入力者 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            入力者（あなた）は？ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.staffName}
            onChange={(e) => updateField('staffName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.staffName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="お名前を入力"
          />
          {errors.staffName && (
            <p className="mt-1 text-sm text-red-500">{errors.staffName}</p>
          )}
        </div>

        {/* 施設 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            利用者様のお住まいの施設は？ <span className="text-red-500">*</span>
          </label>
          <select
            value={form.facility}
            onChange={(e) => updateField('facility', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
              errors.facility ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">選んでください</option>
            {FACILITIES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          {errors.facility && (
            <p className="mt-1 text-sm text-red-500">{errors.facility}</p>
          )}
        </div>

        {/* 利用者名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            利用者名は？ <span className="text-red-500">*</span>
          </label>
          <select
            value={form.residentName}
            onChange={(e) => updateField('residentName', e.target.value)}
            disabled={!form.facility}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed ${
              errors.residentName ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">選んでください</option>
            {availableResidents.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.residentName && (
            <p className="mt-1 text-sm text-red-500">{errors.residentName}</p>
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
                  checked={form.dayServiceUsage === option}
                  onChange={(e) => updateField('dayServiceUsage', e.target.value as typeof option)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 食事時間帯 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            食事はいつのことですか？ <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {MEAL_TIMES.map((time) => (
              <label key={time} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mealTime"
                  value={time}
                  checked={form.mealTime === time}
                  onChange={(e) => updateField('mealTime', e.target.value as typeof time)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">{time}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 主食摂取量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            主食の摂取量は何割ですか？
          </label>
          <select
            value={form.mainDishRatio}
            onChange={(e) => updateField('mainDishRatio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">選んでください</option>
            {INTAKE_RATIOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 副食摂取量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            副食の摂取量は何割ですか？
          </label>
          <select
            value={form.sideDishRatio}
            onChange={(e) => updateField('sideDishRatio', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">選んでください</option>
            {INTAKE_RATIOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 注入の種類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            注入の種類は？
          </label>
          <select
            value={form.injectionType}
            onChange={(e) => updateField('injectionType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">選んでください</option>
            {INJECTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 注入量 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            注入量は？
          </label>
          <select
            value={form.injectionAmount}
            onChange={(e) => updateField('injectionAmount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">選んでください</option>
            {INJECTION_AMOUNTS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* 間食 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            間食は何を食べましたか？
          </label>
          <input
            type="text"
            value={form.snack}
            onChange={(e) => updateField('snack', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* 特記事項 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            特記事項
          </label>
          <textarea
            value={form.note}
            onChange={(e) => updateField('note', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            placeholder="【ケアに関すること】&#10;&#10;【ACPiece】"
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
                  checked={form.isImportant === option}
                  onChange={(e) => updateField('isImportant', e.target.value as typeof option)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 写真アップロード */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            写真アップロード
          </label>
          <div className="flex items-center gap-3">
            <label className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors">
              ファイル選択
              <input
                type="file"
                accept="image/*"
                onChange={(e) => updateField('photo', e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-500">
              {form.photo ? form.photo.name : '選択されていません'}
            </span>
          </div>
        </div>

        {/* 送信ボタン */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '送信中...' : '送信'}
          </button>
        </div>

        {/* トップへ戻る */}
        <div className="text-center pt-2 pb-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-primary hover:underline text-sm"
          >
            トップへ戻る
          </button>
        </div>
      </form>
    </div>
  );
}
