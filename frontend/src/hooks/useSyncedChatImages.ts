/**
 * Phase 52: 同期済みChat画像フック
 *
 * - Firestoreのcare_photosから画像を取得（全ユーザー閲覧可能）
 * - アクセストークンがある場合はChatスペースから同期可能
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCarePhotos, syncChatImages } from '../api';
import { useMealFormSettings } from './useMealFormSettings';
import { useAuth } from '../contexts/AuthContext';
import type { CarePhoto } from '../types';

export interface UseSyncedChatImagesResult {
  /** 画像配列（Firestoreから取得） */
  photos: CarePhoto[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 設定済みフラグ */
  isConfigured: boolean;
  /** アクセストークン利用可能フラグ（同期可能かどうか） */
  canSync: boolean;
  /** 同期中フラグ */
  isSyncing: boolean;
  /** 最後の同期結果 */
  lastSyncResult: {
    synced: number;
    updated: number;
    skipped: number;
    orphansDeleted?: number;
    duplicatesDeleted?: number;
  } | null;
  /** 再認証が必要かどうか（API失敗時にtrue） */
  needsReauth: boolean;
  /**
   * Chatスペースから同期を実行
   * @param options.year - 特定年のメッセージのみ同期
   * @param options.fullSync - true: 全件取得+孤児削除、false: 差分のみ（デフォルト）
   */
  sync: (options?: { year?: number; fullSync?: boolean }) => Promise<void>;
  /** 再取得 */
  refetch: () => void;
  /** 設定値 */
  settings: {
    residentId: string | undefined;
    spaceId: string | undefined;
  };
}

/**
 * 同期済みChat画像フック
 */
export function useSyncedChatImages(): UseSyncedChatImagesResult {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const { settings: formSettings, isLoading: isLoadingSettings } = useMealFormSettings();

  const chatSettings = formSettings.chatImageSettings;
  const residentId = chatSettings?.residentId;
  const spaceId = chatSettings?.spaceId;

  const isConfigured = Boolean(residentId);
  // Phase 53: バックエンドで保存済みトークンを使用するため、accessToken不要
  const canSync = Boolean(spaceId && residentId);

  // デバッグログ（Phase 52.3）
  console.log('[useSyncedChatImages] Debug:', {
    accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : null,
    spaceId,
    residentId,
    isConfigured,
    canSync,
    isLoadingSettings,
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    updated: number;
    skipped: number;
    orphansDeleted?: number;
    duplicatesDeleted?: number;
  } | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  // 自動同期が実行済みかどうか（セッション中1回のみ）
  const hasSyncedRef = useRef(false);

  // Firestoreから画像を取得（全ソース: google_chat + direct_upload）
  const {
    data,
    isLoading: isLoadingPhotos,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['carePhotos', residentId],
    queryFn: async () => {
      if (!residentId) {
        return { photos: [] };
      }
      // 全画像を取得（アプリ直接アップロード + Chat経由）
      const response = await getCarePhotos({
        residentId,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch photos');
      }
      return { photos: response.data?.photos || [] };
    },
    enabled: isConfigured && !isLoadingSettings,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // 同期実行
  // - fullSync=true: 全メッセージ取得 + 孤児削除（初回同期用）
  // - fullSync=false: 差分のみ（通常同期用、デフォルト）
  // Phase 53: バックエンドで保存済みトークンを使用するため、accessToken不要
  const sync = useCallback(async (options?: { year?: number; fullSync?: boolean }) => {
    const { year, fullSync = false } = options || {};
    console.log('[useSyncedChatImages] sync() called', {
      canSync, accessToken: !!accessToken, spaceId, residentId, year, fullSync,
    });
    if (!canSync || !spaceId || !residentId) {
      console.log('[useSyncedChatImages] sync() aborted - missing requirements');
      setSyncError('同期にはChat設定が必要です');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('[useSyncedChatImages] Calling syncChatImages API...', { year, fullSync });
      const response = await syncChatImages(
        {
          spaceId,
          residentId,
          limit: fullSync ? undefined : 1000, // fullSyncでは上限なし
          year,
          fullSync,
        },
        accessToken
      );
      console.log('[useSyncedChatImages] syncChatImages response:', response);

      if (response.success && response.data) {
        setLastSyncResult({
          synced: response.data.synced,
          updated: response.data.updated || 0,
          skipped: response.data.skipped,
          orphansDeleted: response.data.orphansDeleted,
          duplicatesDeleted: response.data.duplicatesDeleted,
        });
        // 同期成功時は再認証フラグをリセット
        setNeedsReauth(false);
        // キャッシュを更新
        queryClient.invalidateQueries({ queryKey: ['syncedChatImages', residentId] });
      } else {
        throw new Error(response.error?.message || 'Sync failed');
      }
    } catch (err) {
      console.error('[useSyncedChatImages] sync error:', err);
      const message = err instanceof Error ? err.message : '同期に失敗しました';
      setSyncError(message);

      // 認証エラーの場合は再認証フラグを立てる
      const isAuthError = message.includes('認証') ||
        message.includes('401') ||
        message.includes('UNAUTHENTICATED') ||
        message.includes('invalid_token') ||
        message.includes('再度ログイン');
      if (isAuthError) {
        setNeedsReauth(true);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [canSync, spaceId, residentId, queryClient, accessToken]);

  // 自動同期: 設定が完了していれば、ページ読み込み時に1回だけ同期（Phase 53）
  useEffect(() => {
    console.log('[useSyncedChatImages] Auto-sync check:', {
      canSync,
      hasSynced: hasSyncedRef.current,
      isSyncing,
      isLoadingSettings,
    });
    if (canSync && !hasSyncedRef.current && !isSyncing && !isLoadingSettings) {
      console.log('[useSyncedChatImages] Starting auto-sync...');
      hasSyncedRef.current = true;
      sync();
    }
  }, [canSync, isSyncing, isLoadingSettings, sync]);

  const photos = data?.photos || [];
  const error = syncError || (fetchError instanceof Error ? fetchError.message : null);

  return {
    photos,
    isLoading: isLoadingSettings || isLoadingPhotos,
    error,
    isConfigured,
    canSync,
    isSyncing,
    lastSyncResult,
    needsReauth,
    sync,
    refetch,
    settings: {
      residentId,
      spaceId,
    },
  };
}
