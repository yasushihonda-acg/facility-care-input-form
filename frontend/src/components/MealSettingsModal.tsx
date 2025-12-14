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
    driveUploadFolderId: settings.driveUploadFolderId || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // 設定が変更されたら同期
  useEffect(() => {
    setLocalSettings({
      defaultFacility: settings.defaultFacility,
      defaultResidentName: settings.defaultResidentName,
      defaultDayServiceName: settings.defaultDayServiceName,
      webhookUrl: settings.webhookUrl || '',
      importantWebhookUrl: settings.importantWebhookUrl || '',
      driveUploadFolderId: settings.driveUploadFolderId || '',
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

  const handleClearConfirm = async () => {
    setShowClearConfirm(false);
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const success = await onSave({
        defaultFacility: '',
        defaultResidentName: '',
        defaultDayServiceName: '',
        webhookUrl: '',
        importantWebhookUrl: '',
        driveUploadFolderId: '',
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

          {/* セパレーター */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              写真アップロード設定
            </h3>
          </div>

          {/* 写真保存先フォルダID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              写真保存先フォルダID
            </label>
            <input
              type="text"
              value={localSettings.driveUploadFolderId || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  driveUploadFolderId: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm font-mono"
              placeholder="1ABC123xyz..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Google DriveのフォルダURLからIDを取得
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              例: https://drive.google.com/drive/folders/<span className="font-mono text-blue-600">[ID]</span>
            </p>
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

          {/* 全設定をクリア（危険な操作） */}
          <div className="pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              全設定をクリア
            </button>
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50"
          >
            キャンセル
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

      {/* クリア確認ダイアログ */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowClearConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-[85%] max-w-sm mx-4 p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              全設定をクリアしますか？
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              この操作は取り消せません。<br />
              全ての初期値設定が空になります。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleClearConfirm}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                クリア
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
