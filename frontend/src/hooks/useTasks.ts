/**
 * タスク管理 カスタムフック
 * docs/TASK_MANAGEMENT_SPEC.md に基づく
 *
 * デモモード対応: /demo パス配下ではローカルデモデータを返却
 * @see docs/DEMO_SHOWCASE_SPEC.md
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
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TaskCounts,
} from '../types/task';
import { useDemoMode } from './useDemoMode';
import { DEMO_TASKS } from '../data/demo';

// クエリキー
const TASKS_KEY = 'tasks';

/**
 * デモデータをAPI形式にフィルタリング
 */
function filterDemoTasks(params: GetTasksParams): { tasks: Task[]; counts: TaskCounts; total: number } {
  let tasks = [...DEMO_TASKS];

  // 入居者IDでフィルタ
  if (params.residentId) {
    tasks = tasks.filter(task => task.residentId === params.residentId);
  }

  // ステータスでフィルタ
  if (params.status && params.status.length > 0) {
    tasks = tasks.filter(task => (params.status as TaskStatus[]).includes(task.status));
  }

  // 期日でフィルタ
  if (params.dueDate) {
    tasks = tasks.filter(task => task.dueDate === params.dueDate);
  }

  // 優先度でフィルタ
  if (params.priority) {
    tasks = tasks.filter(task => task.priority === params.priority);
  }

  // ソート（期日順デフォルト）
  if (params.sortBy) {
    tasks.sort((a, b) => {
      const aVal = a[params.sortBy as keyof Task];
      const bVal = b[params.sortBy as keyof Task];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const comparison = String(aVal).localeCompare(String(bVal));
      return params.sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  // 件数カウントを計算（フィルタ前の全タスクから計算）
  const today = new Date().toISOString().split('T')[0];
  const counts: TaskCounts = {
    pending: DEMO_TASKS.filter(t => t.status === 'pending').length,
    inProgress: DEMO_TASKS.filter(t => t.status === 'in_progress').length,
    completed: DEMO_TASKS.filter(t => t.status === 'completed').length,
    overdue: DEMO_TASKS.filter(t =>
      (t.status === 'pending' || t.status === 'in_progress') && t.dueDate < today
    ).length,
  };

  const total = tasks.length;

  // ページネーション
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;
  tasks = tasks.slice(offset, offset + limit);

  return { tasks, counts, total };
}

/**
 * タスク一覧を取得するフック
 */
export function useTasks(params: GetTasksParams = {}) {
  const isDemo = useDemoMode();

  return useQuery({
    queryKey: [TASKS_KEY, params, isDemo],
    queryFn: async () => {
      // デモモードではローカルデータを返却
      if (isDemo) {
        return filterDemoTasks(params);
      }

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
