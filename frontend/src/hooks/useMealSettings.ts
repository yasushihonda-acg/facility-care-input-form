import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'mealFormSettings';

export interface MealSettings {
  /** デフォルト施設 */
  defaultFacility: string;
  /** デフォルト利用者名 */
  defaultResidentName: string;
  /** デフォルトデイサービス */
  defaultDayServiceName: string;
}

const defaultSettings: MealSettings = {
  defaultFacility: '',
  defaultResidentName: '',
  defaultDayServiceName: '',
};

/**
 * 食事入力フォームの設定を管理するフック
 * - LocalStorageで永続化
 * - 施設・利用者名・デイサービスの初期値を保存
 */
export function useMealSettings() {
  const [settings, setSettings] = useState<MealSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初期化: LocalStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MealSettings>;
        setSettings({
          ...defaultSettings,
          ...parsed,
        });
      }
    } catch (e) {
      console.error('[useMealSettings] Failed to load settings:', e);
    }
    setIsLoaded(true);
  }, []);

  // 設定を保存
  const saveSettings = useCallback((newSettings: MealSettings) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (e) {
      console.error('[useMealSettings] Failed to save settings:', e);
    }
  }, []);

  // 設定をクリア
  const clearSettings = useCallback(() => {
    try {
      localStorage.removeItem(LS_KEY);
      setSettings(defaultSettings);
    } catch (e) {
      console.error('[useMealSettings] Failed to clear settings:', e);
    }
  }, []);

  return {
    settings,
    isLoaded,
    saveSettings,
    clearSettings,
  };
}
