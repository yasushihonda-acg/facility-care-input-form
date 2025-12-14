import { useState, useEffect, useMemo } from 'react';
import type { MealSettings } from '../hooks/useMealSettings';
import { FACILITIES, RESIDENTS, DAY_SERVICES } from '../types/mealForm';

interface MealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MealSettings;
  onSave: (settings: MealSettings) => void;
  onClear: () => void;
}

export function MealSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onClear,
}: MealSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<MealSettings>(settings);

  // 設定が変更されたら同期
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 施設に連動した利用者リスト
  const availableResidents = useMemo(() => {
    return localSettings.defaultFacility
      ? RESIDENTS[localSettings.defaultFacility] || []
      : [];
  }, [localSettings.defaultFacility]);

  const handleFacilityChange = (facility: string) => {
    setLocalSettings((prev) => ({
      ...prev,
      defaultFacility: facility,
      defaultResidentName: '', // 施設変更時は利用者をリセット
    }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[90%] max-w-md mx-4 max-h-[85vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">初期値設定</h2>
              <p className="text-xs text-gray-500">よく使う値を保存できます</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[50vh]">
          {/* 施設 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルト施設
            </label>
            <select
              value={localSettings.defaultFacility}
              onChange={(e) => handleFacilityChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">選択なし</option>
              {FACILITIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* 利用者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルト利用者名
            </label>
            <select
              value={localSettings.defaultResidentName}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultResidentName: e.target.value,
                }))
              }
              disabled={!localSettings.defaultFacility}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">選択なし</option>
              {availableResidents.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {!localSettings.defaultFacility && (
              <p className="mt-1 text-xs text-gray-400">
                施設を選択すると利用者を選べます
              </p>
            )}
          </div>

          {/* デイサービス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルトデイサービス
            </label>
            <select
              value={localSettings.defaultDayServiceName}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultDayServiceName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">選択なし</option>
              {DAY_SERVICES.map((ds) => (
                <option key={ds} value={ds}>
                  {ds}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            クリア
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
