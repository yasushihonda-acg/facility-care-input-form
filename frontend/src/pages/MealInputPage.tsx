/**
 * スタッフ用記録入力ページ
 * Phase 15: タブ削除・統一フォーム
 * 設計書: docs/STAFF_RECORD_FORM_SPEC.md
 */

import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SnackRecord } from '../types/mealForm';
import { DAY_SERVICE_OPTIONS } from '../types/mealForm';
import { submitMealRecord } from '../api';
import { Layout } from '../components/Layout';
import { useMealFormSettings } from '../hooks/useMealFormSettings';
import { MealSettingsModal } from '../components/MealSettingsModal';
import { ItemBasedSnackRecord } from '../components/meal';

// 統一フォームの型定義
interface StaffRecordForm {
  staffName: string;
  dayServiceUsage: '利用中' | '利用中ではない';
  dayServiceName: string;
  snack: string;         // 間食について補足
  note: string;          // 特記事項
  isImportant: '重要' | '重要ではない';
  photo: File | null;
}

const initialForm: StaffRecordForm = {
  staffName: '',
  dayServiceUsage: '利用中ではない',
  dayServiceName: '',
  snack: '',
  note: '',
  isImportant: '重要ではない',
  photo: null,
};

export function MealInputPage() {
  const [searchParams] = useSearchParams();
  const isAdminMode = searchParams.get('admin') === 'true';

  const { settings, isLoading: isSettingsLoading, saveSettings } = useMealFormSettings();
  const [form, setForm] = useState<StaffRecordForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof StaffRecordForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 間食記録（品物から記録で追加されたもの）
  const [snackRecords, setSnackRecords] = useState<SnackRecord[]>([]);

  // デイサービスリスト（固定リスト使用）
  const availableDayServices = DAY_SERVICE_OPTIONS;

  // フィールド更新
  const updateField = useCallback(<K extends keyof StaffRecordForm>(
    field: K,
    value: StaffRecordForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // デイサービス利用状況変更時はデイサービス名をリセット
    if (field === 'dayServiceUsage' && value === '利用中ではない') {
      setForm((prev) => ({ ...prev, dayServiceName: '' }));
    }
  }, [errors]);

  // バリデーション
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof StaffRecordForm, string>> = {};

    if (!form.staffName.trim()) {
      newErrors.staffName = '入力者名を入力してください。';
    }
    // 条件付き必須: デイサービス利用中の場合はデイサービス名が必須
    if (form.dayServiceUsage === '利用中' && !form.dayServiceName) {
      newErrors.dayServiceName = 'デイサービスを選択してください。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.staffName, form.dayServiceUsage, form.dayServiceName]);

  // 送信処理
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // snackRecordsが空の場合は警告
    if (snackRecords.length === 0 && !form.snack.trim()) {
      if (!confirm('品物の記録がありません。このまま送信しますか？')) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // APIリクエストデータを構築（隠し項目はマスター設定から取得）
      const requestData = {
        recordMode: 'snack_only' as const,
        staffName: form.staffName,
        facility: settings.defaultFacility || '',
        residentName: settings.defaultResidentName || '',
        dayServiceUsage: form.dayServiceUsage,
        isImportant: form.isImportant,
        ...(form.dayServiceName && { dayServiceName: form.dayServiceName }),
        ...(form.snack && { snack: form.snack }),
        ...(form.note && { note: form.note }),
        ...(snackRecords.length > 0 && { snackRecords }),
        residentId: 'resident-001',
      };

      const response = await submitMealRecord(requestData);
      console.log('送信成功:', response);

      setShowSuccess(true);
      // 3秒後にフォームリセット
      setTimeout(() => {
        setForm(initialForm);
        setSnackRecords([]);
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('送信エラー:', error);
      alert(error instanceof Error ? error.message : '送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, snackRecords, settings, validate]);

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
                記録入力
                {isAdminMode && (
                  <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                    管理者モード
                  </span>
                )}
              </h1>
              <p className="text-xs text-white/70">品物の提供・摂食を記録</p>
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
            <span className="text-sm font-medium">記録しました</span>
          </div>
        </div>
      )}

      {/* ローディング */}
      {isSettingsLoading && (
        <div className="p-4 text-center text-gray-500">
          設定を読み込み中...
        </div>
      )}

      {/* メインコンテンツ */}
      {!isSettingsLoading && (
        <form onSubmit={handleSubmit} className="pb-24">
          {/* 共通項目（上部） */}
          <div className="p-4 space-y-4 bg-white border-b">
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
          </div>

          {/* 品物から記録（メインエリア） */}
          <ItemBasedSnackRecord
            residentId="resident-001"
            onRecordComplete={() => {
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            }}
          />

          {/* 共通項目（下部） */}
          <div className="p-4 space-y-4 bg-white border-t">
            {/* 間食について補足 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                間食について補足（自由記入）
              </label>
              <textarea
                value={form.snack}
                onChange={(e) => updateField('snack', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                placeholder="施設のおやつも召し上がりました など"
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
                rows={3}
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
          </div>

          {/* 送信ボタン（固定） */}
          <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 to-transparent pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '送信中...' : '記録を送信'}
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
}
