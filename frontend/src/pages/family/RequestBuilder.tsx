/**
 * View B: ケア仕様ビルダー（構造化入力）
 * FAXの手書き指示をアプリ入力に置き換える画面
 * @see docs/FAMILY_UX_DESIGN.md
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import {
  MEAL_TIME_LABELS,
  CONDITION_TRIGGER_LABELS,
  CONDITION_ACTION_LABELS,
  CARE_PRIORITY_LABELS,
  type MealTime,
  type ConditionTrigger,
  type ConditionAction,
  type CarePriority,
  type CareCondition,
} from '../../types/family';
import { DEMO_PRESETS, getTodayString } from '../../data/demoFamilyData';

export function RequestBuilder() {
  const navigate = useNavigate();

  // フォーム状態
  const [targetDate, setTargetDate] = useState<string>(getTodayString());
  const [mealTime, setMealTime] = useState<MealTime>('lunch');
  const [menuName, setMenuName] = useState<string>('');
  const [processingDetail, setProcessingDetail] = useState<string>('');
  const [conditions, setConditions] = useState<CareCondition[]>([]);
  const [priority, setPriority] = useState<CarePriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // プリセット適用
  const applyPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setMenuName(preset.name.replace(/8等分|冷|は皮むき|月水金禁止/g, '').trim() || preset.name);
    setProcessingDetail(preset.processingDetail);
  };

  // 条件追加
  const addCondition = () => {
    if (conditions.length < 3) {
      setConditions([...conditions, { trigger: 'leftover', action: 'reserve_snack' }]);
    }
  };

  // 条件削除
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  // 条件更新
  const updateCondition = (index: number, field: 'trigger' | 'action', value: string) => {
    const newConditions = [...conditions];
    if (field === 'trigger') {
      newConditions[index].trigger = value as ConditionTrigger;
    } else {
      newConditions[index].action = value as ConditionAction;
    }
    setConditions(newConditions);
  };

  // 送信処理
  const handleSubmit = async () => {
    if (!menuName || !processingDetail) {
      alert('メニュー名と詳細指示は必須です');
      return;
    }

    setIsSubmitting(true);

    // デモ用: 実際のAPI呼び出しの代わりにタイムアウト
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setShowSuccess(true);

    // 成功後3秒で家族ホームへ戻る
    setTimeout(() => {
      navigate('/family');
    }, 2000);
  };

  if (showSuccess) {
    return (
      <Layout title="ケア指示の作成" showBackButton={true}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="text-6xl block mb-4">✅</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">指示を送信しました</h2>
            <p className="text-gray-500">家族ホームに戻ります...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="ケア指示の作成" showBackButton={true}>
      <div className="pb-8 space-y-4">
        {/* 対象日 */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>📅</span>
            <span>対象日</span>
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* 食事タイミング */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>🍽️</span>
            <span>食事タイミング</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(MEAL_TIME_LABELS) as MealTime[]).map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setMealTime(time)}
                className={`
                  py-2 px-3 rounded-lg text-sm font-medium transition
                  ${mealTime === time
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {MEAL_TIME_LABELS[time]}
              </button>
            ))}
          </div>
        </div>

        {/* プリセット（選択するとメニュー名と詳細指示が自動入力） */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>⚡</span>
            <span>いつもの指示（プリセット）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition flex items-center gap-1"
              >
                {preset.icon && <span>{preset.icon}</span>}
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            ※ プリセット選択時、メニュー名と詳細指示が自動入力されます
          </p>
        </div>

        {/* メニュー名 */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>🥝</span>
            <span>メニュー名</span>
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="例: キウイ"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* 詳細指示 */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>📝</span>
            <span>詳細指示</span>
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={processingDetail}
            onChange={(e) => setProcessingDetail(e.target.value)}
            placeholder="調理方法や注意事項を詳しく記入してください"
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            ※ FAXと同じ内容を記入できます。省略せず詳細に記入してください。
          </p>
        </div>

        {/* 条件付きロジック */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>🔀</span>
            <span>条件付きロジック</span>
            <span className="text-xs text-gray-400">（オプション）</span>
          </label>

          {conditions.map((condition, index) => (
            <div
              key={index}
              className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg"
            >
              <span className="text-sm text-gray-600">もし</span>
              <select
                value={condition.trigger}
                onChange={(e) => updateCondition(index, 'trigger', e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {Object.entries(CONDITION_TRIGGER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-600">なら →</span>
              <select
                value={condition.action}
                onChange={(e) => updateCondition(index, 'action', e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {Object.entries(CONDITION_ACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {conditions.length < 3 && (
            <button
              type="button"
              onClick={addCondition}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary hover:text-primary transition"
            >
              + 条件を追加
            </button>
          )}
        </div>

        {/* 優先度 */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>⚠️</span>
            <span>優先度</span>
          </label>
          <div className="flex gap-3">
            {(Object.keys(CARE_PRIORITY_LABELS) as CarePriority[]).map((p) => (
              <label
                key={p}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 rounded-lg cursor-pointer transition border-2
                  ${priority === p
                    ? p === 'critical'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-primary bg-blue-50 text-primary'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="sr-only"
                />
                <span className="text-sm font-medium">{CARE_PRIORITY_LABELS[p]}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !menuName || !processingDetail}
          className={`
            w-full py-4 rounded-lg font-bold text-white transition
            ${isSubmitting || !menuName || !processingDetail
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dark active:bg-primary-dark'
            }
          `}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>送信中...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>📤</span>
              <span>指示を送信する</span>
            </span>
          )}
        </button>
      </div>
    </Layout>
  );
}
