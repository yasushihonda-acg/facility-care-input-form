/**
 * スタッフ注意事項 型定義
 * Phase 40: スタッフ専用の注意事項管理機能
 */

// === 列挙型 ===

/** 注意事項の優先度 */
export type StaffNotePriority = 'critical' | 'warning' | 'normal';

/** 注意事項の優先度設定 */
export const STAFF_NOTE_PRIORITIES: {
  value: StaffNotePriority;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    value: 'critical',
    label: '重要',
    icon: '🔴',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    value: 'warning',
    label: '注意',
    icon: '⚠️',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    value: 'normal',
    label: '通常',
    icon: '○',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
];

// === インターフェース ===

/**
 * スタッフ注意事項（Firestore: staffNotes/{noteId}）
 */
export interface StaffNote {
  // 識別情報
  id: string;

  // 内容
  content: string;
  priority: StaffNotePriority;

  // 期間設定（warning/normalのみ必須、criticalは不要）
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD

  // メタ情報
  createdBy: string;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

// === APIリクエスト/レスポンス型 ===

/** 注意事項作成入力 */
export interface CreateStaffNoteInput {
  content: string;
  priority: StaffNotePriority;
  startDate?: string;
  endDate?: string;
  createdBy: string;
}

/** 注意事項更新入力 */
export interface UpdateStaffNoteInput {
  content?: string;
  priority?: StaffNotePriority;
  startDate?: string;
  endDate?: string;
}

/** 注意事項一覧取得パラメータ */
export interface GetStaffNotesParams {
  includeAll?: boolean; // 期間外も含めるか（デフォルト: false）
}

/** 注意事項一覧取得レスポンス */
export interface GetStaffNotesResponse {
  notes: StaffNote[];
  total: number;
}

/** 注意事項作成レスポンス */
export interface CreateStaffNoteResponse {
  noteId: string;
  createdAt: string;
}

/** 注意事項更新レスポンス */
export interface UpdateStaffNoteResponse {
  noteId: string;
  updatedAt: string;
}

// === ユーティリティ関数 ===

/**
 * 優先度のラベルを取得
 */
export function getStaffNotePriorityLabel(priority: StaffNotePriority): string {
  return STAFF_NOTE_PRIORITIES.find(p => p.value === priority)?.label ?? priority;
}

/**
 * 優先度のアイコンを取得
 */
export function getStaffNotePriorityIcon(priority: StaffNotePriority): string {
  return STAFF_NOTE_PRIORITIES.find(p => p.value === priority)?.icon ?? '○';
}

/**
 * 優先度の色クラスを取得
 */
export function getStaffNotePriorityColorClass(priority: StaffNotePriority): {
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const config = STAFF_NOTE_PRIORITIES.find(p => p.value === priority);
  return {
    color: config?.color ?? 'text-gray-700',
    bgColor: config?.bgColor ?? 'bg-gray-50',
    borderColor: config?.borderColor ?? 'border-gray-200',
  };
}

/**
 * 注意事項が表示対象かどうかを判定
 * - critical: 常に表示
 * - warning/normal: 期間内のみ表示
 */
export function isStaffNoteVisible(note: StaffNote): boolean {
  // criticalは常に表示
  if (note.priority === 'critical') {
    return true;
  }

  // warning/normalは期間内のみ表示
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  if (note.startDate && note.startDate > todayStr) {
    return false; // 開始日前
  }

  if (note.endDate && note.endDate < todayStr) {
    return false; // 終了日後
  }

  return true;
}

/**
 * 期間を表示用テキストに変換
 */
export function formatStaffNotePeriod(note: StaffNote): string | null {
  if (note.priority === 'critical') {
    return '常時';
  }

  if (!note.startDate || !note.endDate) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return `${formatDate(note.startDate)}〜${formatDate(note.endDate)}`;
}
