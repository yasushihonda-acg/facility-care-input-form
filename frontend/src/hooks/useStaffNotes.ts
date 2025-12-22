/**
 * スタッフ注意事項 カスタムフック
 * Phase 40: スタッフ専用の注意事項管理機能
 *
 * デモモード対応: /demo パス配下ではローカルデモデータを返却
 * @see docs/DEMO_SHOWCASE_SPEC.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStaffNotes,
  createStaffNote,
  updateStaffNote,
  deleteStaffNote,
} from '../api';
import type {
  CreateStaffNoteInput,
  UpdateStaffNoteInput,
  GetStaffNotesParams,
} from '../types/staffNote';
import { useDemoMode } from './useDemoMode';
import { getDemoStaffNotes } from '../data/demo/demoStaffNotes';

// クエリキー
const STAFF_NOTES_KEY = 'staffNotes';

/**
 * 注意事項一覧を取得するフック
 */
export function useStaffNotes(params: GetStaffNotesParams = {}) {
  const isDemo = useDemoMode();

  return useQuery({
    queryKey: [STAFF_NOTES_KEY, params, isDemo],
    queryFn: async () => {
      // デモモードではローカルデータを返却
      if (isDemo) {
        const notes = getDemoStaffNotes(params.includeAll);
        return { notes, total: notes.length };
      }

      const response = await getStaffNotes(params);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch staff notes');
      }
      return response.data;
    },
  });
}

/**
 * 表示対象の注意事項のみ取得するフック
 * critical: 常に表示
 * warning/normal: 期間内のみ表示
 */
export function useVisibleStaffNotes() {
  return useStaffNotes({ includeAll: false });
}

/**
 * 全注意事項を取得するフック（管理用）
 * 期間外の注意事項も含む
 */
export function useAllStaffNotes() {
  return useStaffNotes({ includeAll: true });
}

/**
 * 注意事項を作成するミューテーションフック
 */
export function useCreateStaffNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStaffNoteInput) => {
      const response = await createStaffNote(input);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create staff note');
      }
      return response.data;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: [STAFF_NOTES_KEY] });
    },
  });
}

/**
 * 注意事項を更新するミューテーションフック
 */
export function useUpdateStaffNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      updates,
    }: {
      noteId: string;
      updates: UpdateStaffNoteInput;
    }) => {
      const response = await updateStaffNote(noteId, updates);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update staff note');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_NOTES_KEY] });
    },
  });
}

/**
 * 注意事項を削除するミューテーションフック
 */
export function useDeleteStaffNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const response = await deleteStaffNote(noteId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete staff note');
      }
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STAFF_NOTES_KEY] });
    },
  });
}

/**
 * 注意事項の件数を取得するフック
 */
export function useStaffNotesCount(): {
  total: number;
  critical: number;
  warning: number;
  normal: number;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useVisibleStaffNotes();

  const notes = data?.notes ?? [];

  return {
    total: notes.length,
    critical: notes.filter((n) => n.priority === 'critical').length,
    warning: notes.filter((n) => n.priority === 'warning').length,
    normal: notes.filter((n) => n.priority === 'normal').length,
    isLoading,
    error,
  };
}

/**
 * 重要な注意事項（critical）のみ取得するフック
 */
export function useCriticalStaffNotes() {
  const { data, isLoading, error } = useVisibleStaffNotes();

  const criticalNotes = data?.notes?.filter(
    (note) => note.priority === 'critical'
  ) ?? [];

  return { notes: criticalNotes, isLoading, error };
}

/**
 * バッジ用：重要な注意事項の件数を取得するフック
 */
export function useStaffNotesBadgeCount(): {
  count: number;
  hasCritical: boolean;
  isLoading: boolean;
} {
  const { total, critical, isLoading } = useStaffNotesCount();

  return {
    count: total,
    hasCritical: critical > 0,
    isLoading,
  };
}
