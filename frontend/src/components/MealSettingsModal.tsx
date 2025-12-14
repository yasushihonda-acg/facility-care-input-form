import { useState, useEffect } from 'react';
import type { MealFormSettings, UpdateMealFormSettingsRequest } from '../types';

interface MealSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MealFormSettings;
  onSave: (settings: UpdateMealFormSettingsRequest) => Promise<boolean>;
}

export function MealSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
}: MealSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<UpdateMealFormSettingsRequest>({
    defaultFacility: settings.defaultFacility,
    defaultResidentName: settings.defaultResidentName,
    defaultDayServiceName: settings.defaultDayServiceName,
    webhookUrl: settings.webhookUrl || '',
    importantWebhookUrl: settings.importantWebhookUrl || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 設定が変更されたら同期
  useEffect(() => {
    setLocalSettings({
      defaultFacility: settings.defaultFacility,
      defaultResidentName: settings.defaultResidentName,
      defaultDayServiceName: settings.defaultDayServiceName,
      webhookUrl: settings.webhookUrl || '',
      importantWebhookUrl: settings.importantWebhookUrl || '',
    });
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const success = await onSave(localSettings);
      if (success) {
        setSaveMessage({ type: 'success', text: '設定を保存しました' });
        setTimeout(() => {
          setSaveMessage(null);
          onClose();
        }, 1500);
      } else {
        setSaveMessage({ type: 'error', text: '保存に失敗しました' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const success = await onSave({
        defaultFacility: '',
        defaultResidentName: '',
        defaultDayServiceName: '',
        webhookUrl: '',
        importantWebhookUrl: '',
      });
      if (success) {
        setSaveMessage({ type: 'success', text: '設定をクリアしました' });
        setTimeout(() => {
          setSaveMessage(null);
          onClose();
        }, 1500);
      } else {
        setSaveMessage({ type: 'error', text: 'クリアに失敗しました' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : 'クリアに失敗しました' });
    } finally {
      setIsSaving(false);
    }
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-yellow-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-yellow-600"
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
              <h2 className="text-lg font-bold text-gray-800">
                グローバル初期値設定
                <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                  管理者
                </span>
              </h2>
              <p className="text-xs text-gray-500">全ユーザーに適用される初期値</p>
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
            <input
              type="text"
              value={localSettings.defaultFacility || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultFacility: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="例: あおぞら荘"
            />
          </div>

          {/* 利用者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルト利用者名
            </label>
            <input
              type="text"
              value={localSettings.defaultResidentName || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultResidentName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="例: 山田 太郎"
            />
          </div>

          {/* デイサービス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              デフォルトデイサービス
            </label>
            <input
              type="text"
              value={localSettings.defaultDayServiceName || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  defaultDayServiceName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="例: デイサービスあおぞら"
            />
          </div>

          {/* セパレーター */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Google Chat 通知設定
            </h3>
          </div>

          {/* 通常Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              通常Webhook URL
            </label>
            <input
              type="url"
              value={localSettings.webhookUrl || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  webhookUrl: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              placeholder="https://chat.googleapis.com/v1/spaces/..."
            />
            <p className="mt-1 text-xs text-gray-500">全ての食事記録を通知</p>
          </div>

          {/* 重要Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              重要Webhook URL
            </label>
            <input
              type="url"
              value={localSettings.importantWebhookUrl || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  importantWebhookUrl: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm"
              placeholder="https://chat.googleapis.com/v1/spaces/..."
            />
            <p className="mt-1 text-xs text-gray-500">「重要」選択時のみ追加通知</p>
          </div>

          {/* 保存メッセージ */}
          {saveMessage && (
            <div
              className={`p-3 rounded-lg text-sm ${
                saveMessage.type === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {saveMessage.text}
            </div>
          )}

          {/* 注意書き */}
          <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800">
            <p className="font-medium mb-1">注意</p>
            <p>この設定は全ユーザーに即座に反映されます。</p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={handleClear}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            クリア
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
