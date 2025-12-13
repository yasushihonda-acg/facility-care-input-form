import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { syncPlanData } from '../api';

const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function useSync() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<number | null>(null);

  const syncMutation = useMutation({
    mutationFn: syncPlanData,
    onSuccess: () => {
      // Invalidate plan data queries to refetch
      queryClient.invalidateQueries({ queryKey: ['planData'] });
      localStorage.setItem('lastSyncedAt', new Date().toISOString());
    },
  });

  const getLastSyncedAt = useCallback((): Date | null => {
    const stored = localStorage.getItem('lastSyncedAt');
    return stored ? new Date(stored) : null;
  }, []);

  const isStale = useCallback((): boolean => {
    const lastSync = getLastSyncedAt();
    if (!lastSync) return true;
    return Date.now() - lastSync.getTime() > STALE_THRESHOLD_MS;
  }, [getLastSyncedAt]);

  const triggerSync = useCallback(() => {
    if (!syncMutation.isPending) {
      syncMutation.mutate();
    }
  }, [syncMutation]);

  // Auto-sync on mount if stale
  useEffect(() => {
    if (isStale()) {
      triggerSync();
    }
  }, [isStale, triggerSync]);

  // Set up interval for auto-sync
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      triggerSync();
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [triggerSync]);

  return {
    sync: triggerSync,
    isSyncing: syncMutation.isPending,
    lastSyncedAt: getLastSyncedAt(),
    error: syncMutation.error?.message ?? null,
    syncResult: syncMutation.data,
  };
}
