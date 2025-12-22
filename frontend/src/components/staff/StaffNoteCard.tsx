/**
 * スタッフ注意事項カード
 * Phase 40: スタッフ専用の注意事項管理機能
 */

import type { StaffNote } from '../../types/staffNote';
import {
  getStaffNotePriorityIcon,
  getStaffNotePriorityColorClass,
  formatStaffNotePeriod,
} from '../../types/staffNote';

interface StaffNoteCardProps {
  note: StaffNote;
  onEdit?: (note: StaffNote) => void;
  onDelete?: (noteId: string) => void;
  showActions?: boolean;
}

export function StaffNoteCard({
  note,
  onEdit,
  onDelete,
  showActions = true,
}: StaffNoteCardProps) {
  const { color, bgColor, borderColor } = getStaffNotePriorityColorClass(note.priority);
  const icon = getStaffNotePriorityIcon(note.priority);
  const period = formatStaffNotePeriod(note);

  return (
    <div
      className={`p-4 rounded-lg border ${bgColor} ${borderColor} ${
        note.priority === 'critical' ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 優先度アイコン */}
        <span className="text-2xl flex-shrink-0">{icon}</span>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <p className={`${color} font-medium whitespace-pre-wrap break-words`}>
            {note.content}
          </p>

          {/* 期間表示 */}
          {period && (
            <p className="text-sm text-gray-500 mt-2">
              期間: {period}
            </p>
          )}

          {/* 作成者・更新日時 */}
          <p className="text-xs text-gray-400 mt-2">
            {note.createdBy} が作成
            {note.updatedAt !== note.createdAt && ' (更新あり)'}
          </p>
        </div>

        {/* アクションボタン */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(note)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="編集"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(note.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffNoteCard;
