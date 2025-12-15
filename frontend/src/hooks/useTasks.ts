/**
 * タスク管理 カスタムフック
 * docs/TASK_MANAGEMENT_SPEC.md に基づく
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../api';
import type { GetTasksParams } from '../api';
import type {
  CreateTaskInput,
  UpdateTaskInput,
  TaskCounts,
} from '../types/task';

// クエリキー
const TASKS_KEY = 'tasks';

/**
 * タスク一覧を取得するフック
 */
export function useTasks(params: GetTasksParams = {}) {
  return useQuery({
    queryKey: [TASKS_KEY, params],
    queryFn: async () => {
      const response = await getTasks(params);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to fetch tasks');
      }
      return response.data;
    },
  });
}

/**
 * タスクを作成するミューテーションフック
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput & { createdBy?: string }) => {
      const response = await createTask(input);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to create task');
      }
      return response.data;
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

/**
 * タスクを更新するミューテーションフック
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
      completedBy,
    }: {
      taskId: string;
      updates: UpdateTaskInput;
      completedBy?: string;
    }) => {
      const response = await updateTask(taskId, updates, completedBy);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to update task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

/**
 * タスクを削除するミューテーションフック
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await deleteTask(taskId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete task');
      }
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

/**
 * タスクを完了にするミューテーションフック
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      completedBy,
      completionNote,
    }: {
      taskId: string;
      completedBy: string;
      completionNote?: string;
    }) => {
      const updates: UpdateTaskInput = {
        status: 'completed',
        completionNote,
        completedBy,
      };
      const response = await updateTask(taskId, updates, completedBy);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to complete task');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TASKS_KEY] });
    },
  });
}

/**
 * 未完了タスク（pending, in_progress）を取得するフック
 */
export function usePendingTasks(residentId?: string) {
  return useTasks({
    residentId,
    status: ['pending', 'in_progress'],
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });
}

/**
 * 今日が期限のタスクを取得するフック
 */
export function useTodayTasks(residentId?: string) {
  const today = new Date().toISOString().split('T')[0];
  return useTasks({
    residentId,
    dueDate: today,
    status: ['pending', 'in_progress'],
  });
}

/**
 * 期限切れタスクを取得するフック
 */
export function useOverdueTasks(residentId?: string) {
  const { data, isLoading, error } = useTasks({
    residentId,
    status: ['pending', 'in_progress'],
    sortBy: 'dueDate',
    sortOrder: 'asc',
    limit: 100,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = data?.tasks?.filter((task) => {
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }) ?? [];

  return { overdueTasks, isLoading, error };
}

/**
 * タスク件数を取得するフック
 */
export function useTaskCounts(residentId?: string): {
  counts: TaskCounts;
  isLoading: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useTasks({
    residentId,
    limit: 1,  // countsのみ取得したいので最小限
  });

  const counts: TaskCounts = data?.counts ?? {
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };

  return { counts, isLoading, error };
}

/**
 * タスクバッジ用：未完了タスク数を取得するフック
 */
export function useTaskBadgeCount(residentId?: string): {
  count: number;
  hasOverdue: boolean;
  isLoading: boolean;
} {
  const { counts, isLoading } = useTaskCounts(residentId);

  return {
    count: counts.pending + counts.inProgress,
    hasOverdue: counts.overdue > 0,
    isLoading,
  };
}
