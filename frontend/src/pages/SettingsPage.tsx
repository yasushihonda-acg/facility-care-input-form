import { useState, useEffect, useCallback } from 'react';
import { useMealFormSettings } from '../hooks/useMealFormSettings';
import { useSheetList } from '../hooks/usePlanData';
import type { UpdateMealFormSettingsRequest } from '../types';
import {
  testWebhook,
  syncPlanData,
  syncChatImages,
  checkOAuthTokenStatus,
  exchangeOAuthCodeForToken,
  getOAuthAuthorizationUrl,
} from '../api';

/**
 * グローバル設定ページ
 *
 * - フッターなし
 * - 戻るボタンなし
 * - 単独リンクからのアクセス（/settings）
 */

// テスト状態の型
interface TestState {
  isLoading: boolean;
  result: 'success' | 'error' | null;
  message: string;
  advice?: string;
}

const initialTestState: TestState = {
  isLoading: false,
  result: null,
  message: '',
};

// クールダウン時間（ミリ秒）
const TEST_COOLDOWN_MS = 5000;

export function SettingsPage() {
  const { settings, isLoading: isSettingsLoading, saveSettings } = useMealFormSettings();
  const { sheets, lastSyncedAt } = useSheetList();

  // シート別アイコン定義（ViewPageと同期）
  const getSheetIcon = (sheetName: string) => {
    const icons: Record<string, string> = {
      '食事': '🍽️',
      '水分摂取量': '💧',
      '排便・排尿': '🚻',
      'バイタル': '❤️',
      '口腔ケア': '🦷',
      '内服': '💊',
      '特記事項': '📝',
      '血糖値インスリン投与': '💉',
      '往診録': '🩺',
      '体重': '⚖️',
      'カンファレンス録': '👥',
    };
    return icons[sheetName] || '📋';
  };

  // シート表示トグル
  const toggleSheetVisibility = (sheetName: string) => {
    setLocalSettings((prev) => {
      const hiddenSheets = prev.hiddenSheets || [];
      const isHidden = hiddenSheets.includes(sheetName);
      return {
        ...prev,
        hiddenSheets: isHidden
          ? hiddenSheets.filter((s) => s !== sheetName)
          : [...hiddenSheets, sheetName],
      };
    });
  };

  // 同期状態
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Chat画像同期状態
  const [isChatImageSyncing, setIsChatImageSyncing] = useState(false);
  const [chatImageSyncResult, setChatImageSyncResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [localSettings, setLocalSettings] = useState<UpdateMealFormSettingsRequest>({
    defaultFacility: '',
    defaultResidentName: '',
    defaultDayServiceName: '',
    webhookUrl: '',
    importantWebhookUrl: '',
    familyNotifyWebhookUrl: '',
    recordCheckHour: 16,
    hiddenSheets: [],
    chatImageSettings: undefined,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // テスト状態
  const [webhookTestState, setWebhookTestState] = useState<TestState>(initialTestState);
  const [importantWebhookTestState, setImportantWebhookTestState] = useState<TestState>(initialTestState);
  const [familyNotifyWebhookTestState, setFamilyNotifyWebhookTestState] = useState<TestState>(initialTestState);

  // クールダウン状態
  const [webhookCooldown, setWebhookCooldown] = useState(false);
  const [importantWebhookCooldown, setImportantWebhookCooldown] = useState(false);
  const [familyNotifyWebhookCooldown, setFamilyNotifyWebhookCooldown] = useState(false);

  // OAuth トークン状態（Phase 53）
  const [oauthTokenConfigured, setOauthTokenConfigured] = useState<boolean | null>(null);
  const [oauthTokenUpdatedAt, setOauthTokenUpdatedAt] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);

  // 設定読み込み時に同期
  useEffect(() => {
    if (!isSettingsLoading && settings) {
      setLocalSettings({
        defaultFacility: settings.defaultFacility,
        defaultResidentName: settings.defaultResidentName,
        defaultDayServiceName: settings.defaultDayServiceName,
        webhookUrl: settings.webhookUrl || '',
        importantWebhookUrl: settings.importantWebhookUrl || '',
        familyNotifyWebhookUrl: settings.familyNotifyWebhookUrl || '',
        recordCheckHour: settings.recordCheckHour ?? 16,
        hiddenSheets: settings.hiddenSheets ?? [],
        chatImageSettings: settings.chatImageSettings,
      });
    }
  }, [isSettingsLoading, settings]);

  // OAuthトークン状態確認（Phase 53）
  const checkOAuthStatus = useCallback(async () => {
    try {
      const response = await checkOAuthTokenStatus();
      if (response.success && response.data) {
        setOauthTokenConfigured(response.data.configured);
        setOauthTokenUpdatedAt(response.data.updatedAt);
      }
    } catch (error) {
      console.error('[SettingsPage] OAuth status check failed:', error);
    }
  }, []);

  // ページ読み込み時にOAuth状態確認 & 認可コード処理
  useEffect(() => {
    checkOAuthStatus();

    // URLから認可コードを取得して処理
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      // URLからcodeパラメータを削除
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // 認可コードをトークンに交換
      (async () => {
        setOauthLoading(true);
        setOauthError(null);
        try {
          const response = await exchangeOAuthCodeForToken(code);
          if (response.success) {
            setOauthSuccess('認証トークンを保存しました');
            await checkOAuthStatus();
            setTimeout(() => setOauthSuccess(null), 5000);
          } else {
            setOauthError('トークン交換に失敗しました');
          }
        } catch (error) {
          setOauthError(error instanceof Error ? error.message : 'トークン交換に失敗しました');
        } finally {
          setOauthLoading(false);
        }
      })();
    }
  }, [checkOAuthStatus]);

  // OAuth認可開始（Phase 53）
  const handleStartOAuth = useCallback(async () => {
    setOauthLoading(true);
    setOauthError(null);
    try {
      const response = await getOAuthAuthorizationUrl();
      if (response.success && response.data?.authUrl) {
        // Googleの認可画面にリダイレクト
        window.location.href = response.data.authUrl;
      } else {
        setOauthError('認可URLの取得に失敗しました');
      }
    } catch (error) {
      setOauthError(error instanceof Error ? error.message : '認可URLの取得に失敗しました');
      setOauthLoading(false);
    }
  }, []);

  // Webhookテスト関数
  const handleTestWebhook = useCallback(async (
    url: string,
    setTestState: React.Dispatch<React.SetStateAction<TestState>>,
    setCooldown: React.Dispatch<React.SetStateAction<boolean>>,
    webhookType?: 'normal' | 'familyNotify'
  ) => {
    if (!url) {
      setTestState({
        isLoading: false,
        result: 'error',
        message: 'URLを入力してください',
      });
      return;
    }

    // Google Chat URLプレフィックスチェック
    if (!url.startsWith('https://chat.googleapis.com/')) {
      setTestState({
        isLoading: false,
        result: 'error',
        message: 'URLは https://chat.googleapis.com/ で始まる必要があります',
      });
      return;
    }

    setTestState({ isLoading: true, result: null, message: '' });

    try {
      const response = await testWebhook(url, webhookType);
      if (response.success) {
        setTestState({
          isLoading: false,
          result: 'success',
          message: response.message,
        });
      } else {
        setTestState({
          isLoading: false,
          result: 'error',
          message: response.error || response.message,
        });
      }
    } catch (error) {
      setTestState({
        isLoading: false,
        result: 'error',
        message: error instanceof Error ? error.message : 'テストに失敗しました',
      });
    }

    // クールダウン開始
    setCooldown(true);
    setTimeout(() => setCooldown(false), TEST_COOLDOWN_MS);
  }, []);

  // 全データ同期
  const handleFullSync = async () => {
    if (isSyncing) return;

    const confirmed = window.confirm(
      '全データ同期を実行しますか？\n\n' +
      '・Google Sheetsから全データを取得します\n' +
      '・過去データ（2024年9月〜）も含めて同期されます\n' +
      '・処理に数分かかる場合があります'
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await syncPlanData({ incremental: false });
      if (result.success && result.data) {
        setSyncResult({
          type: 'success',
          message: `同期完了: ${result.data.totalRecords}件（${result.data.syncedSheets.length}シート）`,
        });
      } else {
        setSyncResult({
          type: 'error',
          message: result.error?.message || '同期に失敗しました',
        });
      }
    } catch (error) {
      setSyncResult({
        type: 'error',
        message: error instanceof Error ? error.message : '同期に失敗しました',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Chat画像全件同期
  const handleChatImageFullSync = async () => {
    if (isChatImageSyncing) return;

    const spaceId = localSettings.chatImageSettings?.spaceId;
    const residentId = localSettings.chatImageSettings?.residentId;

    if (!spaceId || !residentId) {
      setChatImageSyncResult({
        type: 'error',
        message: '対象利用者IDとスペースIDを設定してください',
      });
      return;
    }

    const confirmed = window.confirm(
      'Chat画像全件同期を実行しますか？\n\n' +
      '・2024年以降の全メッセージを取得します\n' +
      '・存在しない画像は削除されます\n' +
      '・処理に数分かかる場合があります'
    );

    if (!confirmed) return;

    setIsChatImageSyncing(true);
    setChatImageSyncResult(null);

    try {
      const result = await syncChatImages({
        spaceId,
        residentId,
        fullSync: true,
      });
      if (result.success && result.data) {
        setChatImageSyncResult({
          type: 'success',
          message: `同期完了: ${result.data.synced}件同期、${result.data.orphansDeleted || 0}件削除`,
        });
      } else {
        setChatImageSyncResult({
          type: 'error',
          message: result.error?.message || '同期に失敗しました',
        });
      }
    } catch (error) {
      setChatImageSyncResult({
        type: 'error',
        message: error instanceof Error ? error.message : '同期に失敗しました',
      });
    } finally {
      setIsChatImageSyncing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const success = await saveSettings(localSettings);
      if (success) {
        setSaveMessage({ type: 'success', text: '設定を保存しました' });
        setTimeout(() => setSaveMessage(null), 3000);
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
      const success = await saveSettings({
        defaultFacility: '',
        defaultResidentName: '',
        defaultDayServiceName: '',
        webhookUrl: '',
        importantWebhookUrl: '',
        familyNotifyWebhookUrl: '',
        recordCheckHour: 16,
        hiddenSheets: [],
      });
      if (success) {
        setSaveMessage({ type: 'success', text: '設定をクリアしました' });
        // localSettingsも更新
        setLocalSettings({
          defaultFacility: '',
          defaultResidentName: '',
          defaultDayServiceName: '',
          webhookUrl: '',
          importantWebhookUrl: '',
          familyNotifyWebhookUrl: '',
          recordCheckHour: 16,
          hiddenSheets: [],
        });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: 'error', text: 'クリアに失敗しました' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: error instanceof Error ? error.message : 'クリアに失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // テスト結果表示コンポーネント
  const TestResultDisplay = ({ state }: { state: TestState }) => {
    if (state.isLoading) {
      return (
        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <svg className="animate-spin h-3 w-3 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          テスト中...
        </div>
      );
    }

    if (state.result === 'success') {
      return (
        <div className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {state.message}
        </div>
      );
    }

    if (state.result === 'error') {
      return (
        <div className="mt-1 space-y-1">
          <div className="text-xs text-red-600 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {state.message}
          </div>
          {state.advice && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
              <div className="flex items-start gap-1.5">
                <span className="text-yellow-500 flex-shrink-0">💡</span>
                <pre className="whitespace-pre-wrap font-sans">{state.advice}</pre>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (isSettingsLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          設定を読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-yellow-50 border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
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
            <h1 className="text-lg font-bold text-gray-800">
              グローバル初期値設定
              <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                管理者
              </span>
            </h1>
            <p className="text-xs text-gray-500">全ユーザーに適用される初期値</p>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-lg mx-auto p-4 space-y-5">
        {/* 施設 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="例: あおぞら荘"
          />
        </div>

        {/* 利用者名 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="例: 山田 太郎"
          />
        </div>

        {/* Google Chat 通知設定セクション */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Google Chat 通知設定
          </h2>

          {/* 通常Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              通常Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={localSettings.webhookUrl || ''}
                onChange={(e) => {
                  setLocalSettings((prev) => ({
                    ...prev,
                    webhookUrl: e.target.value,
                  }));
                  setWebhookTestState(initialTestState);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                placeholder="https://chat.googleapis.com/v1/spaces/..."
              />
              <button
                type="button"
                onClick={() => handleTestWebhook(
                  localSettings.webhookUrl || '',
                  setWebhookTestState,
                  setWebhookCooldown
                )}
                disabled={webhookTestState.isLoading || webhookCooldown || !localSettings.webhookUrl}
                className="px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                テスト送信
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">全ての食事記録を通知</p>
            <TestResultDisplay state={webhookTestState} />
          </div>

          {/* 重要Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              重要Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={localSettings.importantWebhookUrl || ''}
                onChange={(e) => {
                  setLocalSettings((prev) => ({
                    ...prev,
                    importantWebhookUrl: e.target.value,
                  }));
                  setImportantWebhookTestState(initialTestState);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                placeholder="https://chat.googleapis.com/v1/spaces/..."
              />
              <button
                type="button"
                onClick={() => handleTestWebhook(
                  localSettings.importantWebhookUrl || '',
                  setImportantWebhookTestState,
                  setImportantWebhookCooldown
                )}
                disabled={importantWebhookTestState.isLoading || importantWebhookCooldown || !localSettings.importantWebhookUrl}
                className="px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                テスト送信
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">「重要」選択時のみ追加通知</p>
            <TestResultDisplay state={importantWebhookTestState} />
          </div>
        </div>

        {/* 家族・入力監視 通知設定セクション */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            家族・入力監視 通知設定
          </h2>

          {/* 監視通知Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              監視通知Webhook URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={localSettings.familyNotifyWebhookUrl || ''}
                onChange={(e) => {
                  setLocalSettings((prev) => ({
                    ...prev,
                    familyNotifyWebhookUrl: e.target.value,
                  }));
                  setFamilyNotifyWebhookTestState(initialTestState);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
                placeholder="https://chat.googleapis.com/v1/spaces/..."
              />
              <button
                type="button"
                onClick={() => handleTestWebhook(
                  localSettings.familyNotifyWebhookUrl || '',
                  setFamilyNotifyWebhookTestState,
                  setFamilyNotifyWebhookCooldown,
                  'familyNotify'
                )}
                disabled={familyNotifyWebhookTestState.isLoading || familyNotifyWebhookCooldown || !localSettings.familyNotifyWebhookUrl}
                className="px-3 py-2 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                テスト送信
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">品物登録・編集・削除時、設定時刻の入力無し時に通知</p>
            <TestResultDisplay state={familyNotifyWebhookTestState} />
          </div>

          {/* 記録チェック通知時間 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              記録チェック通知時間
            </label>
            <div className="flex items-center gap-2">
              <select
                value={localSettings.recordCheckHour ?? 16}
                onChange={(e) => {
                  setLocalSettings((prev) => ({
                    ...prev,
                    recordCheckHour: parseInt(e.target.value, 10),
                  }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i}時
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-600">に確認</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">食事・水分記録が未入力の場合に通知する時刻</p>
          </div>
        </div>

        {/* 記録閲覧 表示設定セクション */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            記録閲覧 表示設定
          </h2>

          <p className="text-xs text-gray-500">
            記録閲覧ページで表示するシートを選択します。
            チェックを外したシートは非表示になります。
          </p>

          {/* シートリスト */}
          <div className="space-y-2">
            {sheets.length > 0 ? (
              sheets.map((sheet) => {
                const isVisible = !(localSettings.hiddenSheets || []).includes(sheet.sheetName);
                return (
                  <label
                    key={sheet.sheetName}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${isVisible
                        ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={() => toggleSheetVisibility(sheet.sheetName)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-lg">{getSheetIcon(sheet.sheetName)}</span>
                    <span className={`flex-1 text-sm ${isVisible ? 'text-gray-700' : 'text-gray-400'}`}>
                      {sheet.sheetName}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isVisible ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {sheet.recordCount}件
                    </span>
                  </label>
                );
              })
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                データを同期すると、シート一覧が表示されます
              </div>
            )}
          </div>

          {sheets.length > 0 && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLocalSettings((prev) => ({ ...prev, hiddenSheets: [] }))}
                className="flex-1 py-2 px-3 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                すべて表示
              </button>
              <button
                type="button"
                onClick={() => setLocalSettings((prev) => ({
                  ...prev,
                  hiddenSheets: sheets.map((s) => s.sheetName),
                }))}
                className="flex-1 py-2 px-3 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                すべて非表示
              </button>
            </div>
          )}
        </div>

        {/* 画像閲覧設定セクション (Phase 51) */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            画像閲覧設定
          </h2>

          <p className="text-xs text-gray-500">
            Google Chatスペースから画像を取得するための設定です。
            記録閲覧ページの「画像」タブで表示されます。
          </p>

          {/* 対象利用者ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              対象利用者ID
            </label>
            <input
              type="text"
              value={localSettings.chatImageSettings?.residentId || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  chatImageSettings: {
                    residentId: e.target.value,
                    spaceId: prev.chatImageSettings?.spaceId || '',
                  },
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              placeholder="例: 7282"
            />
            <p className="mt-1 text-xs text-gray-500">
              利用者名に含まれるID番号を入力（例: 「ID7282」の場合は「7282」）
            </p>
          </div>

          {/* Google ChatスペースID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Google ChatスペースID
            </label>
            <input
              type="text"
              value={localSettings.chatImageSettings?.spaceId || ''}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  chatImageSettings: {
                    residentId: prev.chatImageSettings?.residentId || '',
                    spaceId: e.target.value,
                  },
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              placeholder="例: AAAAL1Foxd8"
            />
            <p className="mt-1 text-xs text-gray-500">
              Google ChatスペースのURLから取得（例: https://chat.google.com/room/<strong>AAAAL1Foxd8</strong>）
            </p>
          </div>

          {/* 設定状態表示 */}
          {localSettings.chatImageSettings?.residentId && localSettings.chatImageSettings?.spaceId ? (
            <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>
                画像タブが利用可能です（ID: {localSettings.chatImageSettings.residentId}）
              </span>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>両方の項目を入力すると画像タブが利用可能になります</span>
            </div>
          )}
        </div>

        {/* Chat画像同期 認証設定セクション（Phase 53） */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Chat画像同期 認証設定
          </h2>

          <p className="text-xs text-gray-500">
            Google Chatスペースから画像を自動同期するための認証設定です。
            一度設定すれば、ユーザーがログインしなくても画像が同期されます。
          </p>

          {/* 認証状態表示 */}
          {oauthTokenConfigured === null ? (
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>認証状態を確認中...</span>
            </div>
          ) : oauthTokenConfigured ? (
            <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <span className="font-medium">認証済み</span>
                {oauthTokenUpdatedAt && (
                  <span className="ml-2 text-gray-500">
                    （{new Date(oauthTokenUpdatedAt).toLocaleString('ja-JP')}）
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>認証が必要です</span>
            </div>
          )}

          {/* エラー表示 */}
          {oauthError && (
            <div className="p-3 bg-red-50 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{oauthError}</span>
            </div>
          )}

          {/* 成功表示 */}
          {oauthSuccess && (
            <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{oauthSuccess}</span>
            </div>
          )}

          {/* 認証ボタン */}
          <button
            onClick={handleStartOAuth}
            disabled={oauthLoading}
            className="w-full py-2.5 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {oauthLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </>
            ) : oauthTokenConfigured ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                認証を更新
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Googleアカウントで認証
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            ※ 管理者がChatスペースへのアクセス権限を持つGoogleアカウントで認証してください。
          </p>

          {/* Chat画像全件同期（認証済みかつ設定済みの場合のみ表示） */}
          {oauthTokenConfigured && localSettings.chatImageSettings?.spaceId && localSettings.chatImageSettings?.residentId && (
            <>
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-xs font-medium text-gray-600 mb-2">
                  Chat画像全件同期
                </h3>
                <p className="text-xs text-gray-500 mb-2">
                  2024年以降の全メッセージから画像を取得し、存在しない画像を削除します。
                </p>

                {/* 同期結果 */}
                {chatImageSyncResult && (
                  <div className={`p-2 rounded-lg text-xs mb-2 ${
                    chatImageSyncResult.type === 'success'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {chatImageSyncResult.message}
                  </div>
                )}

                <button
                  onClick={handleChatImageFullSync}
                  disabled={isChatImageSyncing}
                  className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isChatImageSyncing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      同期中...
                    </>
                  ) : (
                    <>
                      <span>🔁</span>
                      Chat画像全件同期
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* データ同期セクション */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            記録データ同期
          </h2>

          {/* 同期状態 */}
          <div className="text-sm text-gray-600">
            <p>最終同期: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('ja-JP') : '未取得'}</p>
            <p className="text-xs text-gray-400 mt-1">
              自動同期: 毎時0分（差分）/ 毎日3時（完全）
            </p>
          </div>

          {/* 同期結果 */}
          {syncResult && (
            <div className={`p-3 rounded-lg text-sm ${
              syncResult.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {syncResult.message}
            </div>
          )}

          {/* 全同期ボタン */}
          <button
            onClick={handleFullSync}
            disabled={isSyncing}
            className="w-full py-2.5 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                同期中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                全データ同期
              </>
            )}
          </button>

          <p className="text-xs text-gray-500">
            ※ 過去データが表示されない場合にクリックしてください
          </p>
        </div>

        {/* 写真保存について */}
        <div className="p-3 bg-green-50 rounded-lg text-xs text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>写真は自動的にクラウドに保存されます（設定不要）</span>
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

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>

        {/* 全設定をクリア */}
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

        {/* 余白（フッターがないので下部に余裕） */}
        <div className="h-8"></div>
      </main>

      {/* クリア確認ダイアログ */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
