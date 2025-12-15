/**
 * タスク一覧ページ
 * @see docs/TASK_MANAGEMENT_SPEC.md
 */

import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { useTasks, useUpdateTask, useCompleteTask } from '../../hooks/useTasks';
import {
  getTaskTypeLabel,
  getTaskTypeIcon,
  getTaskStatusLabel,
  getTaskStatusColorClass,
  getTaskPriorityLabel,
  getTaskPriorityColorClass,
  getDueDateDisplayText,
  isTaskOverdue,
  formatTaskDateTime,
} from '../../types/task';
import type { Task, TaskStatus } from '../../types/task';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';
const DEMO_STAFF_NAME = 'スタッフ';

export function TaskList() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showCompleteModal, setShowCompleteModal] = useState<Task | null>(null);
  const [completionNote, setCompletionNote] = useState('');

  // タスク一覧を取得
  const { data, isLoading, error } = useTasks({
    residentId: DEMO_RESIDENT_ID,
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();

  // 完了処理
  const handleComplete = async () => {
    if (!showCompleteModal) return;

    try {
      await completeTask.mutateAsync({
        taskId: showCompleteModal.id,
        completedBy: DEMO_STAFF_NAME,
        completionNote: completionNote || undefined,
      });
      setShowCompleteModal(null);
      setCompletionNote('');
    } catch (error) {
      console.error('Complete failed:', error);
      alert('完了処理に失敗しました');
    }
  };

  // ステータス変更
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTask.mutateAsync({
        taskId,
        updates: { status: newStatus },
      });
    } catch (error) {
      console.error('Status change failed:', error);
      alert('ステータス変更に失敗しました');
    }
  };

  // フィルタタブ
  const filterTabs: { value: TaskStatus | 'all'; label: string; count?: number }[] = [
    { value: 'all', label: '全て', count: data?.total },
    { value: 'pending', label: '未着手', count: data?.counts.pending },
    { value: 'in_progress', label: '対応中', count: data?.counts.inProgress },
    { value: 'completed', label: '完了', count: data?.counts.completed },
  ];

  return (
    <Layout title="タスク一覧" showBackButton>
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>📋</span>
            タスク一覧
          </h1>
          {data?.counts.overdue ? (
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              期限切れ {data.counts.overdue}件
            </span>
          ) : null}
        </div>

        {/* フィルタタブ */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1 ${
                statusFilter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs ${statusFilter === tab.value ? 'opacity-80' : 'text-gray-400'}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            エラーが発生しました: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        ) : data?.tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-500">
              {statusFilter === 'all'
                ? 'タスクはありません'
                : `${filterTabs.find(t => t.value === statusFilter)?.label}のタスクはありません`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => setShowCompleteModal(task)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>

      {/* 完了確認モーダル */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">タスクを完了しますか？</h3>
            <p className="text-gray-600 mb-4 text-sm">{showCompleteModal.title}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                完了メモ（任意）
              </label>
              <textarea
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="対応内容などを記録..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(null);
                  setCompletionNote('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg"
                disabled={completeTask.isPending}
              >
                {completeTask.isPending ? '処理中...' : '完了する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

/**
 * タスクカードコンポーネント
 */
function TaskCard({
  task,
  onComplete,
  onStatusChange,
}: {
  task: Task;
  onComplete: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const statusColor = getTaskStatusColorClass(task.status);
  const priorityColor = getTaskPriorityColorClass(task.priority);
  const typeIcon = getTaskTypeIcon(task.taskType);
  const overdue = isTaskOverdue(task);
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border p-4 ${
        overdue ? 'border-red-300 bg-red-50/30' : ''
      } ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* タイプアイコン */}
        <div className="text-2xl flex-shrink-0">{typeIcon}</div>

        {/* メイン情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={`font-bold text-base ${isCompleted ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor.bgColor} ${statusColor.color}`}>
              {getTaskStatusLabel(task.status)}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor.bgColor} ${priorityColor.color}`}>
              {getTaskPriorityLabel(task.priority)}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          )}

          <div className="text-sm text-gray-500 space-y-0.5">
            <div className={`flex items-center gap-2 ${overdue ? 'text-red-600 font-medium' : ''}`}>
              <span>期限:</span>
              <span>{formatTaskDateTime(task.dueDate, task.dueTime)}</span>
              <span>({getDueDateDisplayText(task.dueDate)})</span>
              {overdue && <span className="text-red-500">⚠️</span>}
            </div>

            <div className="flex gap-4 text-xs text-gray-400">
              <span>{getTaskTypeLabel(task.taskType)}</span>
              {task.assignee && <span>担当: {task.assignee}</span>}
            </div>
          </div>

          {/* 完了情報 */}
          {task.status === 'completed' && task.completedBy && (
            <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
              <span className="font-medium">{task.completedBy}</span> が完了
              {task.completionNote && <span>: {task.completionNote}</span>}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        {!isCompleted && (
          <div className="flex flex-col gap-2">
            {task.status === 'pending' && (
              <button
                onClick={() => onStatusChange(task.id, 'in_progress')}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
              >
                着手
              </button>
            )}
            <button
              onClick={onComplete}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors"
            >
              完了
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskList;
