/**
 * 同期処理フック
 *
 * 競合防止対策（SYNC_CONCURRENCY.md Phase 1 実装）:
 * - 同期中は再実行をブロック（isPending チェック）
 * - クールダウン期間（30秒）の間は手動同期をブロック
 * - タブ間での同期状態共有（localStorage + storage イベント）
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { syncPlanData } from '../api';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const SYNC_COOLDOWN_MS = 30 * 1000; // 30 seconds - 連続同期防止

// localStorage keys
const LS_LAST_SYNCED_AT = 'lastSyncedAt';
const LS_SYNC_IN_PROGRESS = 'syncInProgress';

export function useSync() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);
  const [isOtherTabSyncing, setIsOtherTabSyncing] = useState(false);

  const syncMutation = useMutation({
    mutationFn: syncPlanData,
    onMutate: () => {
      // 同期開始をlocalStorageに記録（タブ間共有）
      localStorage.setItem(LS_SYNC_IN_PROGRESS, Date.now().toString());
    },
    onSuccess: () => {
      // Invalidate plan data queries to refetch
      queryClient.invalidateQueries({ queryKey: ['planData'] });
      localStorage.setItem(LS_LAST_SYNCED_AT, new Date().toISOString());
    },
    onSettled: () => {
      // 同期完了（成功・失敗問わず）でフラグをクリア
      localStorage.removeItem(LS_SYNC_IN_PROGRESS);
    },
  });

  const getLastSyncedAt = useCallback((): Date | null => {
    const stored = localStorage.getItem(LS_LAST_SYNCED_AT);
    return stored ? new Date(stored) : null;
  }, []);

  /**
   * 同期可能かどうかをチェック
   * - 自タブで同期中でない
   * - 他タブで同期中でない
   * - クールダウン期間を過ぎている
   */
  const canSync = useCallback((): boolean => {
    // 自タブで同期中
    if (syncMutation.isPending) {
      return false;
    }

    // 他タブで同期中
    const syncInProgress = localStorage.getItem(LS_SYNC_IN_PROGRESS);
    if (syncInProgress) {
      const syncStartTime = parseInt(syncInProgress, 10);
      // 5分以上経過していれば古いフラグとみなしてクリア
      if (Date.now() - syncStartTime > 5 * 60 * 1000) {
        localStorage.removeItem(LS_SYNC_IN_PROGRESS);
      } else {
        return false;
      }
    }

    // クールダウン期間チェック（手動同期の連打防止）
    const lastSync = getLastSyncedAt();
    if (lastSync && Date.now() - lastSync.getTime() < SYNC_COOLDOWN_MS) {
      return false;
    }

    return true;
  }, [syncMutation.isPending, getLastSyncedAt]);

  /**
   * クールダウン残り時間（秒）を取得
   */
  const getCooldownRemaining = useCallback((): number => {
    const lastSync = getLastSyncedAt();
    if (!lastSync) return 0;
    const elapsed = Date.now() - lastSync.getTime();
    const remaining = Math.max(0, SYNC_COOLDOWN_MS - elapsed);
    return Math.ceil(remaining / 1000);
  }, [getLastSyncedAt]);

  const isStale = useCallback((): boolean => {
    const lastSync = getLastSyncedAt();
    if (!lastSync) return true;
    return Date.now() - lastSync.getTime() > STALE_THRESHOLD_MS;
  }, [getLastSyncedAt]);

  /**
   * 同期を実行（保護付き）
   * @param force クールダウンを無視して強制実行（自動同期用）
   */
  const triggerSync = useCallback((force = false) => {
    if (syncMutation.isPending) {
      return;
    }

    // 他タブで同期中かチェック
    const syncInProgress = localStorage.getItem(LS_SYNC_IN_PROGRESS);
    if (syncInProgress) {
      const syncStartTime = parseInt(syncInProgress, 10);
      if (Date.now() - syncStartTime < 5 * 60 * 1000) {
        console.log('[useSync] Another tab is syncing, skipping');
        return;
      }
    }

    // 手動同期の場合はクールダウンをチェック
    if (!force) {
      const lastSync = getLastSyncedAt();
      if (lastSync && Date.now() - lastSync.getTime() < SYNC_COOLDOWN_MS) {
        console.log('[useSync] Cooldown period, skipping');
        return;
      }
    }

    syncMutation.mutate();
  }, [syncMutation, getLastSyncedAt]);

  // 他タブのlocalStorage変更を監視
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LS_SYNC_IN_PROGRESS) {
        setIsOtherTabSyncing(!!e.newValue);
      }
      if (e.key === LS_LAST_SYNCED_AT && e.newValue) {
        // 他タブで同期完了したらデータを再取得
        queryClient.invalidateQueries({ queryKey: ['planData'] });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [queryClient]);

  // Auto-sync on mount if stale
  useEffect(() => {
    if (isStale()) {
      triggerSync(true); // 自動同期はクールダウン無視
    }
  }, [isStale, triggerSync]);

  // Set up interval for auto-sync
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      triggerSync(true); // 自動同期はクールダウン無視
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [triggerSync]);

  return {
    sync: () => triggerSync(false), // 手動同期はクールダウンチェックあり
    isSyncing: syncMutation.isPending || isOtherTabSyncing,
    canSync: canSync(),
    cooldownRemaining: getCooldownRemaining(),
    lastSyncedAt: getLastSyncedAt(),
    error: syncMutation.error?.message ?? null,
    syncResult: syncMutation.data,
  };
}
