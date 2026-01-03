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
  lastSyncResult: { synced: number; updated: number; skipped: number } | null;
  /** Chatスペースから同期を実行 */
  sync: () => Promise<void>;
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
  const canSync = Boolean(accessToken && spaceId && residentId);

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
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; updated: number; skipped: number } | null>(null);

  // 自動同期が実行済みかどうか（セッション中1回のみ）
  const hasSyncedRef = useRef(false);

  // Firestoreから画像を取得（source: 'google_chat' のもの）
  const {
    data,
    isLoading: isLoadingPhotos,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['syncedChatImages', residentId],
    queryFn: async () => {
      if (!residentId) {
        return { photos: [] };
      }
      // バックエンドで source='google_chat' のみ取得
      const response = await getCarePhotos({
        residentId,
        source: 'google_chat',
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
  const sync = useCallback(async () => {
    console.log('[useSyncedChatImages] sync() called', { canSync, accessToken: !!accessToken, spaceId, residentId });
    if (!canSync || !accessToken || !spaceId || !residentId) {
      console.log('[useSyncedChatImages] sync() aborted - missing requirements');
      setSyncError('同期にはログインとChat設定が必要です');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      console.log('[useSyncedChatImages] Calling syncChatImages API...');
      const response = await syncChatImages(
        { spaceId, residentId, limit: 1000 }, // 1000件取得してID7282を含むメッセージを探す
        accessToken
      );
      console.log('[useSyncedChatImages] syncChatImages response:', response);

      if (response.success && response.data) {
        setLastSyncResult({
          synced: response.data.synced,
          updated: response.data.updated || 0,
          skipped: response.data.skipped,
        });
        // キャッシュを更新
        queryClient.invalidateQueries({ queryKey: ['syncedChatImages', residentId] });
      } else {
        throw new Error(response.error?.message || 'Sync failed');
      }
    } catch (err) {
      console.error('[useSyncedChatImages] sync error:', err);
      const message = err instanceof Error ? err.message : '同期に失敗しました';
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [canSync, accessToken, spaceId, residentId, queryClient]);

  // 自動同期: アクセストークンがある場合、ページ読み込み時に1回だけ同期
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
    sync,
    refetch,
    settings: {
      residentId,
      spaceId,
    },
  };
}
