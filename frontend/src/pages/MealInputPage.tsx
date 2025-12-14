import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { MealInputForm } from '../types/mealForm';
import {
  initialMealForm,
  RESIDENTS,
  MEAL_TIMES,
  INTAKE_RATIOS,
  INJECTION_TYPES,
  INJECTION_AMOUNTS,
} from '../types/mealForm';
import { submitMealRecord } from '../api';
import { Layout } from '../components/Layout';
import { useMealFormSettings } from '../hooks/useMealFormSettings';
import { MealSettingsModal } from '../components/MealSettingsModal';

export function MealInputPage() {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';

  const { settings, isLoading: isSettingsLoading, saveSettings } = useMealFormSettings();
  const [form, setForm] = useState<MealInputForm>(initialMealForm);
  const [errors, setErrors] = useState<Partial<Record<keyof MealInputForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 設定が読み込まれたら初期値を適用
  useEffect(() => {
    if (!isSettingsLoading && settings) {
      setForm((prev) => ({
        ...prev,
        facility: settings.defaultFacility || prev.facility,
        residentName: settings.defaultResidentName || prev.residentName,
        dayServiceName: settings.defaultDayServiceName || prev.dayServiceName,
        // デイサービスが設定されていれば「利用中」にする
        dayServiceUsage: settings.defaultDayServiceName ? '利用中' : prev.dayServiceUsage,
      }));
    }
  }, [isSettingsLoading, settings]);

  // 施設リスト（初期値のみ表示）
  const availableFacilities = useMemo(() => {
    // 初期値が設定されている場合のみ、その値だけを選択肢として表示
    if (settings.defaultFacility) {
      return [settings.defaultFacility];
    }
    return [];
  }, [settings.defaultFacility]);

  // 施設に連動した利用者リスト（設定値が選択肢にない場合は動的追加）
  const availableResidents = useMemo(() => {
    const residents = form.facility ? RESIDENTS[form.facility] || [] : [];
    // 設定値のデフォルト利用者がリストにない場合は追加
    if (
      settings.defaultResidentName &&
      form.facility === settings.defaultFacility &&
      !residents.includes(settings.defaultResidentName)
    ) {
      return [settings.defaultResidentName, ...residents];
    }
    return residents;
  }, [form.facility, settings.defaultFacility, settings.defaultResidentName]);

  // デイサービスリスト（初期値のみ表示）
  const availableDayServices = useMemo(() => {
    // 初期値が設定されている場合のみ、その値だけを選択肢として表示
    if (settings.defaultDayServiceName) {
      return [settings.defaultDayServiceName];
    }
    return [];
  }, [settings.defaultDayServiceName]);

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
    // デイサービス利用状況変更時はデイサービス名をリセット
    if (field === 'dayServiceUsage' && value === '利用中ではない') {
      setForm((prev) => ({ ...prev, dayServiceName: '' }));
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
    // 条件付き必須: デイサービス利用中の場合はデイサービス名が必須
    if (form.dayServiceUsage === '利用中' && !form.dayServiceName) {
      newErrors.dayServiceName = 'デイサービスを選択してください。';
    }
    // 条件付き必須: 注入の種類が「その他」の場合は入力必須
    if (form.injectionType === 'その他' && !form.injectionTypeOther?.trim()) {
      newErrors.injectionTypeOther = 'その他の注入種類を入力してください。';
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
      // APIリクエストデータを構築
      // 注入の種類: 「その他」の場合は入力値を使用
      const injectionTypeValue = form.injectionType === 'その他'
        ? form.injectionTypeOther
        : form.injectionType;

      const requestData = {
        staffName: form.staffName,
        facility: form.facility,
        residentName: form.residentName,
        dayServiceUsage: form.dayServiceUsage,
        mealTime: form.mealTime,
        isImportant: form.isImportant,
        ...(form.dayServiceName && { dayServiceName: form.dayServiceName }),
        ...(form.mainDishRatio && { mainDishRatio: form.mainDishRatio }),
        ...(form.sideDishRatio && { sideDishRatio: form.sideDishRatio }),
        ...(injectionTypeValue && { injectionType: injectionTypeValue }),
        ...(form.injectionAmount && { injectionAmount: form.injectionAmount }),
        ...(form.snack && { snack: form.snack }),
        ...(form.note && { note: form.note }),
      };

      const response = await submitMealRecord(requestData);
      console.log('送信成功:', response);

      setShowSuccess(true);
      // 3秒後にフォームリセット（グローバル初期値を適用）
      setTimeout(() => {
        setForm({
          ...initialMealForm,
          facility: settings.defaultFacility || '',
          residentName: settings.defaultResidentName || '',
          dayServiceName: settings.defaultDayServiceName || '',
          dayServiceUsage: settings.defaultDayServiceName ? '利用中' : '利用中ではない',
        });
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('送信エラー:', error);
      alert(error instanceof Error ? error.message : '送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-primary to-primary-dark text-white shadow-header">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/view"
              className="p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="記録閲覧に戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-lg font-bold">
                食事記録
                {isAdminMode && (
                  <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                    管理者モード
                  </span>
                )}
              </h1>
              <p className="text-xs text-white/70">食事の摂取量を記録します</p>
            </div>
          </div>
          {/* 設定ボタン（adminモードのみ表示） */}
          {isAdminMode && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="初期値設定"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* 設定モーダル（adminモードのみ） */}
      {isAdminMode && (
        <MealSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={saveSettings}
        />
      )}

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

      {/* ローディング */}
      {isSettingsLoading && (
        <div className="p-4 text-center text-gray-500">
          設定を読み込み中...
        </div>
      )}

      {/* フォーム */}
      {!isSettingsLoading && (
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
              {availableFacilities.map((f) => (
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

          {/* どこのデイサービスですか？ ※条件付き表示 */}
          {form.dayServiceUsage === '利用中' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                どこのデイサービスですか？ <span className="text-red-500">*</span>
              </label>
              <select
                value={form.dayServiceName}
                onChange={(e) => updateField('dayServiceName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.dayServiceName ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">選んでください</option>
                {availableDayServices.map((ds) => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
              </select>
              {errors.dayServiceName && (
                <p className="mt-1 text-sm text-red-500">{errors.dayServiceName}</p>
              )}
            </div>
          )}

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
              onChange={(e) => {
                updateField('injectionType', e.target.value);
                // 「その他」以外を選択した場合、その他入力欄をクリア
                if (e.target.value !== 'その他') {
                  updateField('injectionTypeOther', '');
                }
                // 注入の種類を変更した場合、注入量をリセット
                if (e.target.value !== form.injectionType) {
                  updateField('injectionAmount', '');
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">選んでください</option>
              {INJECTION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* その他の注入種類 ※条件付き表示 */}
          {form.injectionType === 'その他' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                その他の注入種類は？ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.injectionTypeOther || ''}
                onChange={(e) => updateField('injectionTypeOther', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                  errors.injectionTypeOther ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="注入の種類を入力"
              />
              {errors.injectionTypeOther && (
                <p className="mt-1 text-sm text-red-500">{errors.injectionTypeOther}</p>
              )}
            </div>
          )}

          {/* 注入量 ※注入の種類が選択されている場合のみ表示 */}
          {form.injectionType && (
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
          )}

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

          {/* 記録閲覧へ戻る */}
          <div className="text-center pt-2 pb-8">
            <Link
              to="/view"
              className="text-primary hover:underline text-sm"
            >
              記録閲覧へ戻る
            </Link>
          </div>
        </form>
      )}
    </Layout>
  );
}
