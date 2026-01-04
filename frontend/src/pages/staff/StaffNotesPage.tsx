/**
 * スタッフ注意事項ページ
 * Phase 40: スタッフ専用の注意事項管理機能
 * Phase 49: 廃棄指示フロー対応（家族→スタッフ通知）
 *
 * タブ構成:
 * - 注意事項: スタッフ注意事項のCRUD
 * - 家族依頼: 家族からのタスク一覧 + 廃棄指示（バッジ付き）
 */

import { useState, useCallback, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { StaffNoteCard } from '../../components/staff/StaffNoteCard';
import { StaffNoteModal } from '../../components/staff/StaffNoteModal';
import {
  useAllStaffNotes,
  useCreateStaffNote,
  useUpdateStaffNote,
  useDeleteStaffNote,
} from '../../hooks/useStaffNotes';
import { useTasks } from '../../hooks/useTasks';
import { usePendingDiscardItems, useConfirmDiscard } from '../../hooks/useCareItems';
import { useDemoMode } from '../../hooks/useDemoMode';
import type { StaffNote, CreateStaffNoteInput } from '../../types/staffNote';
import type { Task } from '../../types/task';
import { isItemActionTask, ITEM_ACTION_COLORS } from '../../types/task';
import type { CareItem } from '../../types/careItem';
import { getCategoryIcon, formatDate } from '../../types/careItem';

// デモ用スタッフ名（将来は認証から取得）
const DEMO_STAFF_NAME = 'スタッフA';

// タブ定義
type TabValue = 'notes' | 'tasks';

export function StaffNotesPage() {
  const isDemo = useDemoMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StaffNote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 注意事項データ（includeAll=trueで期間外も取得して管理画面で表示）
  const { data: notesData, isLoading: notesLoading, error: notesError } = useAllStaffNotes();
  const createMutation = useCreateStaffNote();
  const updateMutation = useUpdateStaffNote();
  const deleteMutation = useDeleteStaffNote();

  // 家族依頼（タスク）データ - 全タスクを取得
  const { data: tasksData, isLoading: tasksLoading, error: tasksError } = useTasks({});

  // 廃棄指示中の品物（Phase 49）
  const { pendingDiscardItems, isLoading: discardLoading } = usePendingDiscardItems();
  const discardCount = pendingDiscardItems.length;

  // 廃棄指示があれば家族依頼タブをデフォルトに
  const [activeTab, setActiveTab] = useState<TabValue>('notes');
  useEffect(() => {
    if (discardCount > 0 && !discardLoading) {
      setActiveTab('tasks');
    }
  }, [discardCount, discardLoading]);

  // タブ定義（バッジ付き）
  const TABS: { value: TabValue; label: string; icon: string; badge?: number }[] = [
    { value: 'notes', label: '注意事項', icon: '📋' },
    { value: 'tasks', label: '家族依頼', icon: '📝', badge: discardCount > 0 ? discardCount : undefined },
  ];

  // 注意事項の作成/更新
  const handleSubmit = useCallback(async (input: CreateStaffNoteInput) => {
    if (isDemo) {
      // デモモードでは実際のAPIを呼ばない
      console.log('[Demo] Staff note submit:', input);
      return;
    }

    if (editingNote) {
      await updateMutation.mutateAsync({
        noteId: editingNote.id,
        updates: {
          content: input.content,
          priority: input.priority,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    } else {
      await createMutation.mutateAsync(input);
    }
  }, [editingNote, createMutation, updateMutation, isDemo]);

  // 編集モーダルを開く
  const handleEdit = useCallback((note: StaffNote) => {
    setEditingNote(note);
    setIsModalOpen(true);
  }, []);

  // 新規作成モーダルを開く
  const handleCreate = useCallback(() => {
    setEditingNote(null);
    setIsModalOpen(true);
  }, []);

  // 削除確認
  const handleDelete = useCallback((noteId: string) => {
    setDeleteConfirm(noteId);
  }, []);

  // 削除実行
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;

    if (isDemo) {
      console.log('[Demo] Staff note delete:', deleteConfirm);
      setDeleteConfirm(null);
      return;
    }

    try {
      await deleteMutation.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [deleteConfirm, deleteMutation, isDemo]);

  return (
    <Layout title="注意事項" showBackButton>
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>📋</span>
            注意事項
          </h1>
          {activeTab === 'notes' && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              追加
            </button>
          )}
        </div>

        {/* タブ */}
        <div className="flex border-b">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.value
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
              {/* バッジ */}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 right-1/4 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px]">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'notes' ? (
          <NotesContent
            notes={notesData?.notes ?? []}
            isLoading={notesLoading}
            error={notesError}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <TasksContent
            tasks={tasksData?.tasks ?? []}
            isLoading={tasksLoading || discardLoading}
            error={tasksError}
            pendingDiscardItems={pendingDiscardItems}
            isDemo={isDemo}
          />
        )}
      </div>

      {/* 作成/編集モーダル */}
      <StaffNoteModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingNote(null);
        }}
        onSubmit={handleSubmit}
        editingNote={editingNote}
        staffName={DEMO_STAFF_NAME}
      />

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">削除確認</h3>
            <p className="text-gray-600 mb-4">
              この注意事項を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

/**
 * 注意事項コンテンツ
 */
function NotesContent({
  notes,
  isLoading,
  error,
  onEdit,
  onDelete,
}: {
  notes: StaffNote[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (note: StaffNote) => void;
  onDelete: (noteId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📋</div>
        <p className="text-gray-500 mb-4">注意事項はありません</p>
        <p className="text-sm text-gray-400">
          「追加」ボタンから新しい注意事項を登録できます
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <StaffNoteCard
          key={note.id}
          note={note}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

/**
 * 家族依頼（タスク）コンテンツ
 * Phase 49: 廃棄指示セクションを追加
 * Phase 55: 品物操作通知を優先表示
 */
function TasksContent({
  tasks,
  isLoading,
  error,
  pendingDiscardItems,
  isDemo,
}: {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  pendingDiscardItems: CareItem[];
  isDemo: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  const hasDiscardItems = pendingDiscardItems.length > 0;

  // 品物操作タスクを分離して優先表示（Phase 55）
  const itemActionTasks = tasks.filter((t) => isItemActionTask(t.taskType));
  const otherTasks = tasks.filter((t) => !isItemActionTask(t.taskType));

  const hasItemActionTasks = itemActionTasks.length > 0;
  const hasOtherTasks = otherTasks.length > 0;

  if (!hasDiscardItems && !hasItemActionTasks && !hasOtherTasks) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-gray-500">家族からの依頼はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 廃棄指示セクション（Phase 49） */}
      {hasDiscardItems && (
        <DiscardInstructionSection items={pendingDiscardItems} isDemo={isDemo} />
      )}

      {/* 品物更新通知セクション（Phase 55）- 優先表示 */}
      {hasItemActionTasks && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <h3 className="text-sm font-semibold text-gray-700">品物更新通知</h3>
            <span className="text-xs text-gray-500">（24時間後に自動削除）</span>
          </div>
          {itemActionTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* その他のタスク */}
      {hasOtherTasks && (
        <div className="space-y-3">
          {(hasDiscardItems || hasItemActionTasks) && (
            <h3 className="text-sm font-semibold text-gray-600 mt-4">その他の依頼</h3>
          )}
          {otherTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 廃棄指示セクション（Phase 49）
 * 目立つ赤枠で廃棄指示を表示
 */
function DiscardInstructionSection({
  items,
  isDemo,
}: {
  items: CareItem[];
  isDemo: boolean;
}) {
  const confirmDiscard = useConfirmDiscard();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleConfirmDiscard = async (item: CareItem) => {
    if (isDemo) {
      alert(`${item.itemName}の廃棄を完了しました（デモモード - 実際には変更されません）`);
      return;
    }

    setProcessingId(item.id);
    try {
      await confirmDiscard.mutateAsync({
        itemId: item.id,
        staffName: DEMO_STAFF_NAME,
      });
    } catch (error) {
      console.error('Confirm discard failed:', error);
      alert('廃棄完了処理に失敗しました');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-xl overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3 bg-red-100 border-b border-red-200">
        <h2 className="text-base font-bold text-red-800 flex items-center gap-2">
          <span className="text-xl">🚨</span>
          廃棄指示（{items.length}件）
        </h2>
        <p className="text-xs text-red-600 mt-1">
          家族から廃棄指示が届いています。確認後「廃棄完了」ボタンを押してください。
        </p>
      </div>

      {/* アイテムリスト */}
      <div className="divide-y divide-red-200">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-4 bg-white">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">
                {getCategoryIcon(item.category)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-red-900 text-base">
                  🗑️ {item.itemName}
                </div>
                <div className="text-sm text-red-700 mt-1">
                  期限: {item.expirationDate ? formatDate(item.expirationDate) : '未設定'}
                  {item.expirationDate && new Date(item.expirationDate) < new Date() && (
                    <span className="ml-2 text-xs bg-red-200 px-1.5 py-0.5 rounded">期限切れ</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="text-gray-500">家族からの指示:</span>{' '}
                  {item.discardReason || '期限切れのため廃棄'}
                </div>
                {item.discardRequestedAt && (
                  <div className="text-xs text-gray-400 mt-1">
                    指示日時: {new Date(item.discardRequestedAt).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleConfirmDiscard(item)}
                  disabled={processingId === item.id}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {processingId === item.id ? '処理中...' : '廃棄完了'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * タスクカード（読み取り専用）
 * Phase 55: 品物操作タスクは色付きバッジで表示
 */
function TaskCard({ task }: { task: Task }) {
  const statusConfig = {
    pending: { label: '未着手', color: 'bg-gray-100 text-gray-700' },
    in_progress: { label: '進行中', color: 'bg-blue-100 text-blue-700' },
    completed: { label: '完了', color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
  };

  const priorityConfig: Record<string, { icon: string; label: string }> = {
    urgent: { icon: '🔴', label: '緊急' },
    high: { icon: '🟠', label: '高' },
    medium: { icon: '🟡', label: '中' },
    low: { icon: '🟢', label: '低' },
  };

  const status = statusConfig[task.status] || statusConfig.pending;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  // 品物操作タスクの場合は専用バッジを表示
  const isItemAction = isItemActionTask(task.taskType);
  const itemActionStyle = isItemAction ? ITEM_ACTION_COLORS[task.taskType] : null;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${isItemAction ? 'border-l-4' : ''}`}
      style={isItemAction && itemActionStyle ? { borderLeftColor: itemActionStyle.color.replace('text-', '').replace('-700', '') === 'green' ? '#22c55e' : itemActionStyle.color.replace('text-', '').replace('-700', '') === 'blue' ? '#3b82f6' : '#ef4444' } : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{isItemAction && itemActionStyle ? itemActionStyle.icon : priority.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-base">{task.title}</h3>
            {/* 品物操作バッジ */}
            {isItemAction && itemActionStyle && (
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${itemActionStyle.bgColor} ${itemActionStyle.color}`}>
                {itemActionStyle.label}
              </span>
            )}
            {/* ステータスバッジ（品物操作タスク以外） */}
            {!isItemAction && (
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 mb-2">{task.description}</p>
          )}
          <div className="text-xs text-gray-400 flex gap-4">
            <span>登録日時: {new Date(task.createdAt).toLocaleString('ja-JP')}</span>
            {task.completedBy && <span>完了者: {task.completedBy}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StaffNotesPage;
