/**
 * 品物の重複チェックユーティリティ
 *
 * 重複判定条件: 品物名 + 提供日 + 提供タイミング の3つが一致
 */

import type { CareItem } from '../types/careItem';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateItem?: {
    id: string;
    itemName: string;
  };
}

/**
 * スケジュールから提供日を取得
 * - once: date
 * - daily/weekly: startDate
 * - specific_dates: dates[0]（最初の日付）
 */
function getServingDateFromSchedule(schedule: CareItem['servingSchedule']): string | undefined {
  if (!schedule) return undefined;

  switch (schedule.type) {
    case 'once':
      return schedule.date;
    case 'daily':
    case 'weekly':
      return schedule.startDate;
    case 'specific_dates':
      return schedule.dates?.[0];
    default:
      return undefined;
  }
}

/**
 * 品物の重複をチェック
 *
 * @param itemName - チェック対象の品物名
 * @param servingDate - チェック対象の提供日（YYYY-MM-DD）
 * @param servingTimeSlot - チェック対象の提供タイミング
 * @param existingItems - 既存の品物一覧
 * @param excludeItemId - 除外する品物ID（編集時に自分自身を除外）
 * @returns 重複チェック結果
 */
export function checkItemDuplicate(
  itemName: string,
  servingDate: string | undefined,
  servingTimeSlot: string | undefined,
  existingItems: CareItem[],
  excludeItemId?: string
): DuplicateCheckResult {
  // 提供日または提供タイミングが未設定の場合は重複チェックしない
  if (!servingDate || !servingTimeSlot) {
    return { isDuplicate: false };
  }

  const duplicate = existingItems.find(existing => {
    // 自分自身は除外
    if (excludeItemId && existing.id === excludeItemId) {
      return false;
    }

    const existingDate = getServingDateFromSchedule(existing.servingSchedule);
    const existingTimeSlot = existing.servingSchedule?.timeSlot;

    return (
      existing.itemName === itemName &&
      existingDate === servingDate &&
      existingTimeSlot === servingTimeSlot
    );
  });

  if (duplicate) {
    return {
      isDuplicate: true,
      duplicateItem: {
        id: duplicate.id,
        itemName: duplicate.itemName,
      },
    };
  }

  return { isDuplicate: false };
}

/**
 * 一括登録用: ParsedBulkItem形式での重複チェック
 * useBulkImportから使用
 */
export function checkBulkItemDuplicate(
  itemName: string,
  servingDate: string,
  servingTimeSlot: string,
  existingItems: CareItem[]
): { isDuplicate: boolean; duplicateInfo?: { existingItemId: string; existingItemName: string } } {
  const result = checkItemDuplicate(itemName, servingDate, servingTimeSlot, existingItems);

  if (result.isDuplicate && result.duplicateItem) {
    return {
      isDuplicate: true,
      duplicateInfo: {
        existingItemId: result.duplicateItem.id,
        existingItemName: result.duplicateItem.itemName,
      },
    };
  }

  return { isDuplicate: false };
}
