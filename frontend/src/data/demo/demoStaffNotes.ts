/**
 * デモ用スタッフ注意事項データ
 * Phase 40: スタッフ専用の注意事項管理機能
 */

import type { StaffNote } from '../../types/staffNote';
import { formatDateString, getTodayString } from '../../utils/scheduleUtils';

// Re-export for backwards compatibility (if needed elsewhere)
export { getTodayString };

/**
 * n日後の日付を取得（YYYY-MM-DD）
 */
function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateString(date);
}

/**
 * デモ用注意事項データ
 * - critical: 常時表示（期間なし）
 * - warning/normal: 期間内のみ表示
 *
 * ※ このアプリは「家族からの差し入れ品（間食・おやつ）」を管理するアプリです。
 *   注意事項も差し入れ品の提供に関する内容にしています。
 */
export const DEMO_STAFF_NOTES: StaffNote[] = [
  // critical: 常時表示（期間指定なし）- 差し入れ品提供の基本ルール
  {
    id: 'NOTE001',
    content: '【重要】施設のおやつは提供しないでください。家族からの差し入れ品のみ提供します。',
    priority: 'critical',
    createdBy: '管理者',
    createdAt: '2024-12-01T09:00:00.000Z',
    updatedAt: '2024-12-01T09:00:00.000Z',
  },
  {
    id: 'NOTE002',
    content: '糖尿病のため、砂糖を多く含むお菓子（チョコ・飴・ケーキ等）は1日1個までにしてください。',
    priority: 'critical',
    createdBy: '看護師',
    createdAt: '2024-11-15T10:00:00.000Z',
    updatedAt: '2024-11-15T10:00:00.000Z',
  },
  {
    id: 'NOTE003',
    content: '嚥下機能が低下しています。硬いお菓子（せんべい等）は細かく砕いてから提供してください。',
    priority: 'critical',
    createdBy: '管理者',
    createdAt: '2024-11-20T10:00:00.000Z',
    updatedAt: '2024-11-20T10:00:00.000Z',
  },

  // warning: 期間内表示（現在有効）- 一時的な注意事項
  {
    id: 'NOTE004',
    content: '新しいプリンが届きました（冷蔵庫保管中）。賞味期限が近いので早めに提供をお願いします。',
    priority: 'warning',
    startDate: getDateOffset(-1), // 昨日から
    endDate: getDateOffset(5),    // 5日後まで
    createdBy: 'スタッフA',
    createdAt: '2024-12-20T14:00:00.000Z',
    updatedAt: '2024-12-20T14:00:00.000Z',
  },
  {
    id: 'NOTE005',
    content: '家族より「バナナは1日1本まで」との指示がありました。複数回の提供に注意してください。',
    priority: 'warning',
    startDate: getTodayString(),  // 今日から
    endDate: getDateOffset(7),    // 1週間後まで
    createdBy: 'スタッフB',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  // normal: 期間内表示（現在有効）- 好みや習慣
  {
    id: 'NOTE006',
    content: '午後3時のおやつタイムを楽しみにされています。できるだけこの時間に提供してください。',
    priority: 'normal',
    startDate: getDateOffset(-7), // 1週間前から
    endDate: getDateOffset(30),   // 1ヶ月後まで
    createdBy: 'スタッフC',
    createdAt: '2024-12-15T11:00:00.000Z',
    updatedAt: '2024-12-15T11:00:00.000Z',
  },
  {
    id: 'NOTE007',
    content: 'お茶（温かいもの）と一緒に提供すると喜ばれます。冷たい飲み物は苦手です。',
    priority: 'normal',
    startDate: getDateOffset(-3), // 3日前から
    endDate: getDateOffset(14),   // 2週間後まで
    createdBy: 'スタッフA',
    createdAt: '2024-12-18T09:30:00.000Z',
    updatedAt: '2024-12-18T09:30:00.000Z',
  },

  // 期間外のデータ（includeAll=true時のみ表示）
  {
    id: 'NOTE008',
    content: '（終了）先月届いた羊羹は賞味期限切れのため破棄しました。',
    priority: 'warning',
    startDate: getDateOffset(-30), // 1ヶ月前
    endDate: getDateOffset(-20),   // 20日前（期間終了）
    createdBy: 'スタッフB',
    createdAt: '2024-11-20T08:00:00.000Z',
    updatedAt: '2024-11-20T08:00:00.000Z',
  },
  {
    id: 'NOTE009',
    content: '（予定）来週、家族が新しい果物を届ける予定です。',
    priority: 'normal',
    startDate: getDateOffset(7),   // 1週間後から（期間前）
    endDate: getDateOffset(14),    // 2週間後まで
    createdBy: 'スタッフC',
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
