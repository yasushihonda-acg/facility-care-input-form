/**
 * View B: ケア仕様ビルダー（一時的な指示変更・追記）
 * 品物登録で設定済みの恒久的な指示に対し、特定日時への変更・追記を行う画面
 * @see docs/FAMILY_UX_DESIGN.md セクション4
 */

import { useState, useMemo } from 'react';
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
  const [additionalInstruction, setAdditionalInstruction] = useState<string>('');
  const [conditions, setConditions] = useState<CareCondition[]>([]);
  const [priority, setPriority] = useState<CarePriority>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // メニュー名に基づいてマッチするプリセットを参考表示用に検索
  const matchingPreset = useMemo(() => {
    if (!menuName || menuName.length < 2) return null;
    const lowerName = menuName.toLowerCase();
    return DEMO_PRESETS.find((preset) =>
      preset.name.toLowerCase().includes(lowerName) ||
      lowerName.includes(preset.name.replace(/[（(].*/g, '').toLowerCase())
    );
  }, [menuName]);

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
    if (!menuName || !additionalInstruction) {
      alert('メニュー名と追加・変更の指示は必須です');
      return;
    }

    setIsSubmitting(true);

    // デモ用: 実際のAPI呼び出しの代わりにタイムアウト
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setShowSuccess(true);

    // 成功後2秒で家族ホームへ戻る
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
        {/* 説明テキスト */}
        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
          <p>品物登録で設定した指示への<strong>追加・変更</strong>を送信できます。</p>
          <p className="text-xs mt-1 text-blue-600">※ 恒久的な指示は「品物登録」で設定してください</p>
        </div>

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

        {/* メニュー名（対象品物） */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>🥝</span>
            <span>メニュー名（対象品物）</span>
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

        {/* 追加・変更の指示 */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <span>📝</span>
            <span>追加・変更の指示</span>
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={additionalInstruction}
            onChange={(e) => setAdditionalInstruction(e.target.value)}
            placeholder="例: 今日は体調が良くないので、いつもより小さめにカットしてください"
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            ※ 品物登録で設定した指示への追加・変更内容を記入
          </p>
        </div>

        {/* 参考: いつもの指示（マッチするプリセットがある場合のみ表示） */}
        {matchingPreset && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <label className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-2">
              <span>💡</span>
              <span>参考: いつもの指示</span>
            </label>
            <div className="bg-white rounded-lg p-3 text-sm text-gray-700">
              <p className="font-medium flex items-center gap-1">
                {matchingPreset.icon && <span>{matchingPreset.icon}</span>}
                <span>{matchingPreset.name}</span>
              </p>
              <p className="mt-1 text-gray-600">{matchingPreset.processingDetail}</p>
            </div>
            <p className="text-xs text-amber-600 mt-2">
              → この内容に追加・変更があれば上に記入してください
            </p>
          </div>
        )}

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
          disabled={isSubmitting || !menuName || !additionalInstruction}
          className={`
            w-full py-4 rounded-lg font-bold text-white transition
            ${isSubmitting || !menuName || !additionalInstruction
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
