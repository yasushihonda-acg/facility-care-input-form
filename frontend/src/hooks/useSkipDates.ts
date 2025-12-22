/**
 * スキップ日（提供なし日）管理フック
 * Phase 38: 未設定日サジェスト機能
 *
 * 現在はローカルステートのみ使用。
 * 将来的にはCloud Functions APIを通じてFirestoreに保存する。
 */

import { useState, useCallback, useMemo } from 'react';
import { useDemoMode } from './useDemoMode';
import type { SkipDateConfig } from '../types/skipDate';

/**
 * スキップ日管理の統合フック
 */
export function useSkipDateManager(residentId: string) {
  const isDemoMode = useDemoMode();
  const [skipDates, setSkipDates] = useState<SkipDateConfig[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // 日付文字列の配列を取得（ユーティリティ用）
  const skipDateStrings = useMemo(() => {
    return skipDates.map((sd) => sd.date);
  }, [skipDates]);

  // スキップ日を追加
  const addSkipDate = useCallback(
    async (date: string, reason?: string): Promise<SkipDateConfig> => {
      setIsAdding(true);

      try {
        // 既に追加済みの場合はスキップ
        if (skipDateStrings.includes(date)) {
          const existing = skipDates.find((sd) => sd.date === date);
          if (existing) return existing;
        }

        const newSkipDate: SkipDateConfig = {
          id: `skip-${Date.now()}`,
          residentId,
          date,
          reason,
          createdAt: new Date().toISOString(),
          createdBy: isDemoMode ? 'demo_user' : 'family_user',
        };

        // ローカルステートを更新
        setSkipDates((prev) => [...prev, newSkipDate]);

        // デモモードの場合はアラート表示
        if (isDemoMode) {
          alert(`${date} を「提供なし」に設定しました（デモモード）`);
        }

        // TODO: 本番モードではCloud Functions APIを呼び出し

        return newSkipDate;
      } finally {
        setIsAdding(false);
      }
    },
    [isDemoMode, residentId, skipDates, skipDateStrings]
  );

  // スキップ日を削除
  const removeSkipDate = useCallback(
    async (skipDateId: string): Promise<void> => {
      setIsRemoving(true);

      try {
        // ローカルステートから削除
        setSkipDates((prev) => prev.filter((sd) => sd.id !== skipDateId));

        // デモモードの場合はアラート表示
        if (isDemoMode) {
          alert('スキップ日を削除しました（デモモード）');
        }

        // TODO: 本番モードではCloud Functions APIを呼び出し
      } finally {
        setIsRemoving(false);
      }
    },
    [isDemoMode]
  );

  // 特定の日付がスキップ済みかチェック
  const isDateSkipped = useCallback(
    (date: string) => skipDateStrings.includes(date),
    [skipDateStrings]
  );

  return {
    skipDates,
    skipDateStrings,
    isLoading: false,
    addSkipDate,
    removeSkipDate,
    isDateSkipped,
    isAdding,
    isRemoving,
  };
}

// 後方互換性のためのエクスポート
export function useSkipDates(residentId: string) {
  const manager = useSkipDateManager(residentId);
  return {
    skipDates: manager.skipDates,
    skipDateStrings: manager.skipDateStrings,
    isLoading: manager.isLoading,
    error: null,
    setDemoSkipDates: () => {}, // 不要だが互換性のため
  };
}

export function useAddSkipDate(_residentId: string) {
  // 不要だが互換性のため
  return { mutateAsync: async () => ({} as SkipDateConfig), isPending: false };
}

export function useRemoveSkipDate(_residentId: string) {
  // 不要だが互換性のため
  return { mutateAsync: async () => {}, isPending: false };
}
