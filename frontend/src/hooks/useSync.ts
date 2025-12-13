/**
 * データ更新フック
 *
 * 設計変更（SYNC_CONCURRENCY.md Phase 2）:
 * - Cloud Schedulerが唯一の同期トリガー（15分差分 + 日次完全同期）
 * - フロントエンドはFirestoreキャッシュの再取得のみ
 * - syncPlanDataの直接呼び出しは廃止（競合防止）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const REFRESH_COOLDOWN_MS = 10 * 1000; // 10 seconds - 連続更新防止

// localStorage keys
const LS_LAST_REFRESHED_AT = 'lastRefreshedAt';

export function useSync() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const getLastRefreshedAt = useCallback((): Date | null => {
    const stored = localStorage.getItem(LS_LAST_REFRESHED_AT);
    return stored ? new Date(stored) : null;
  }, []);

  /**
   * 更新可能かどうかをチェック
   * - 更新中でない
   * - クールダウン期間を過ぎている
   */
  const canRefresh = useCallback((): boolean => {
    if (isRefreshing) {
      return false;
    }

    const lastRefresh = getLastRefreshedAt();
    if (lastRefresh && Date.now() - lastRefresh.getTime() < REFRESH_COOLDOWN_MS) {
      return false;
    }

    return true;
  }, [isRefreshing, getLastRefreshedAt]);

  /**
   * クールダウン残り時間を計算・更新
   */
  const updateCooldown = useCallback(() => {
    const lastRefresh = getLastRefreshedAt();
    if (!lastRefresh) {
      setCooldownRemaining(0);
      return;
    }
    const elapsed = Date.now() - lastRefresh.getTime();
    const remaining = Math.max(0, REFRESH_COOLDOWN_MS - elapsed);
    setCooldownRemaining(Math.ceil(remaining / 1000));
  }, [getLastRefreshedAt]);

  /**
   * Firestoreキャッシュを再取得（同期処理は呼び出さない）
   */
  const refresh = useCallback(async () => {
    if (!canRefresh()) {
      console.log('[useSync] Refresh blocked by cooldown or already refreshing');
      return;
    }

    setIsRefreshing(true);

    try {
      // Invalidate queries to refetch from Firestore
      await queryClient.invalidateQueries({ queryKey: ['planData'] });

      // 更新完了を記録
      localStorage.setItem(LS_LAST_REFRESHED_AT, new Date().toISOString());

      console.log('[useSync] Cache refreshed successfully');
    } catch (error) {
      console.error('[useSync] Refresh error:', error);
    } finally {
      setIsRefreshing(false);
      updateCooldown();
    }
  }, [canRefresh, queryClient, updateCooldown]);

  // クールダウンタイマー
  useEffect(() => {
    updateCooldown();

    cooldownTimerRef.current = window.setInterval(() => {
      updateCooldown();
    }, 1000);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [updateCooldown]);

  // 他タブでの更新を監視
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LS_LAST_REFRESHED_AT && e.newValue) {
        // 他タブで更新されたらデータを再取得
        queryClient.invalidateQueries({ queryKey: ['planData'] });
        updateCooldown();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient, updateCooldown]);

  return {
    sync: refresh, // 互換性維持のためsyncという名前を保持
    isSyncing: isRefreshing,
    canSync: canRefresh(),
    cooldownRemaining,
    lastSyncedAt: getLastRefreshedAt(),
    error: null, // 同期エラーはCloud Scheduler側で処理
    syncResult: null, // 同期結果はCloud Scheduler側で記録
  };
}
