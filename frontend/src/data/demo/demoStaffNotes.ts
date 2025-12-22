/**
 * デモ用スタッフ注意事項データ
 * Phase 40: スタッフ専用の注意事項管理機能
 *
 * @see docs/DEMO_SHOWCASE_SPEC.md
 */

import type { StaffNote } from '../../types/staffNote';

/**
 * 今日の日付を取得（YYYY-MM-DD）
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * n日後の日付を取得（YYYY-MM-DD）
 */
function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * デモ用注意事項データ
 * - critical: 常時表示（期間なし）
 * - warning/normal: 期間内のみ表示
 */
export const DEMO_STAFF_NOTES: StaffNote[] = [
  // critical: 常時表示（期間指定なし）
  {
    id: 'NOTE001',
    content: '血圧測定は朝食前に必ず実施してください。薬の調整に影響します。',
    priority: 'critical',
    createdBy: '管理者',
    createdAt: '2024-12-01T09:00:00.000Z',
    updatedAt: '2024-12-01T09:00:00.000Z',
  },
  {
    id: 'NOTE002',
    content: 'アレルギー：甲殻類（エビ・カニ）厳禁。重度のアナフィラキシー歴あり。',
    priority: 'critical',
    createdBy: '管理者',
    createdAt: '2024-11-15T10:00:00.000Z',
    updatedAt: '2024-11-15T10:00:00.000Z',
  },

  // warning: 期間内表示（現在有効）
  {
    id: 'NOTE003',
    content: '家族面会予定あり。居室の整理整頓をお願いします。',
    priority: 'warning',
    startDate: getDateOffset(-1), // 昨日から
    endDate: getDateOffset(5),    // 5日後まで
    createdBy: 'スタッフA',
    createdAt: '2024-12-20T14:00:00.000Z',
    updatedAt: '2024-12-20T14:00:00.000Z',
  },
  {
    id: 'NOTE004',
    content: '風邪気味のため、水分摂取を多めに促してください。',
    priority: 'warning',
    startDate: getTodayString(),  // 今日から
    endDate: getDateOffset(3),    // 3日後まで
    createdBy: '看護師B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // normal: 期間内表示（現在有効）
  {
    id: 'NOTE005',
    content: '入浴は水曜・土曜の午前中が好みです。',
    priority: 'normal',
    startDate: getDateOffset(-7), // 1週間前から
    endDate: getDateOffset(30),   // 1ヶ月後まで
    createdBy: 'スタッフC',
    createdAt: '2024-12-15T11:00:00.000Z',
    updatedAt: '2024-12-15T11:00:00.000Z',
  },
  {
    id: 'NOTE006',
    content: 'リハビリ強化期間中。歩行訓練を1日2回実施。',
    priority: 'normal',
    startDate: getDateOffset(-3), // 3日前から
    endDate: getDateOffset(14),   // 2週間後まで
    createdBy: 'PT担当',
    createdAt: '2024-12-18T09:30:00.000Z',
    updatedAt: '2024-12-18T09:30:00.000Z',
  },

  // 期間外のデータ（includeAll=true時のみ表示）
  {
    id: 'NOTE007',
    content: '（期間外）先月の検査入院に関する注意事項',
    priority: 'warning',
    startDate: getDateOffset(-30), // 1ヶ月前
    endDate: getDateOffset(-20),   // 20日前（期間終了）
    createdBy: '看護師A',
    createdAt: '2024-11-20T08:00:00.000Z',
    updatedAt: '2024-11-20T08:00:00.000Z',
  },
  {
    id: 'NOTE008',
    content: '（期間外）来月開始予定のリハビリプログラム',
    priority: 'normal',
    startDate: getDateOffset(10),  // 10日後から（期間前）
    endDate: getDateOffset(40),    // 40日後まで
    createdBy: 'PT担当',
    createdAt: '2024-12-22T10:00:00.000Z',
    updatedAt: '2024-12-22T10:00:00.000Z',
  },
];

/**
 * 表示対象の注意事項のみフィルタ
 * - critical: 常に表示
 * - warning/normal: 期間内のみ表示
 */
export function filterVisibleStaffNotes(notes: StaffNote[]): StaffNote[] {
  const today = getTodayString();

  return notes.filter((note) => {
    // criticalは常に表示
    if (note.priority === 'critical') {
      return true;
    }

    // warning/normalは期間内のみ表示
    if (note.startDate && note.startDate > today) {
      return false; // 開始日前
    }
    if (note.endDate && note.endDate < today) {
      return false; // 終了日後
    }

    return true;
  });
}

/**
 * 優先度順にソート（critical > warning > normal）
 */
export function sortStaffNotesByPriority(notes: StaffNote[]): StaffNote[] {
  const priorityOrder = { critical: 0, warning: 1, normal: 2 };
  return [...notes].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
}

/**
 * デモ用注意事項を取得
 * @param includeAll - 期間外も含めるか
 */
export function getDemoStaffNotes(includeAll = false): StaffNote[] {
  let notes = [...DEMO_STAFF_NOTES];

  if (!includeAll) {
    notes = filterVisibleStaffNotes(notes);
  }

  return sortStaffNotesByPriority(notes);
}
