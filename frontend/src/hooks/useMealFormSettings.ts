import { useState, useEffect, useCallback } from 'react';
import { getMealFormSettings, updateMealFormSettings } from '../api';
import type { MealFormSettings, UpdateMealFormSettingsRequest } from '../types';

const DEFAULT_SETTINGS: MealFormSettings = {
  defaultFacility: '',
  defaultResidentName: '',
  defaultDayServiceName: '',
  updatedAt: '',
};

/**
 * 食事入力フォームのグローバル初期値設定を管理するフック
 * - APIから取得（Firestoreで永続化）
 * - 全ユーザーに等しく適用
 * - 更新はadminモードでのみ可能
 */
export function useMealFormSettings() {
  const [settings, setSettings] = useState<MealFormSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 設定を取得
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMealFormSettings();
      if (response.success && response.data) {
        setSettings(response.data);
      } else {
        // エラーでもデフォルト値を使用
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err) {
      console.error('[useMealFormSettings] Failed to fetch settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // エラーでもデフォルト値を使用
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 設定を更新（adminモードでのみ使用）
  const saveSettings = useCallback(async (newSettings: UpdateMealFormSettingsRequest) => {
    setError(null);
    try {
      const response = await updateMealFormSettings(newSettings);
      if (response.success && response.data) {
        setSettings(response.data);
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useMealFormSettings] Failed to save settings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  return {
    settings,
    isLoading,
    error,
    saveSettings,
    refetch: fetchSettings,
  };
}
