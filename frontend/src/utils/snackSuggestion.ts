/**
 * 間食提供サジェスト ユーティリティ
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md - Phase 5
 */

import type { CareItem } from '../types/careItem';

/**
 * 家族指示から推奨提供数を抽出
 * 例: "1日1切れまで" → 1, "2個まで" → 2
 */
export function extractQuantityFromInstruction(instruction: string): number | null {
  // パターン: "1日1切れ", "1個まで", "2枚", "3本" など
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(?:切れ|個|枚|本|パック|袋)/i,
    /(\d+(?:\.\d+)?)\s*(?:まで|以下)/i,
    /1日\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = instruction.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }
  return null;
}

/**
 * 品物情報から推奨提供数を計算
 * 優先順位: 家族指示 > 在庫制限 > デフォルト(1)
 */
export function extractSuggestedQuantity(item: CareItem): {
  quantity: number;
  reason: string;
  source: 'instruction' | 'stock' | 'default';
} {
  let quantity = 1;
  let reason = 'デフォルト';
  let source: 'instruction' | 'stock' | 'default' = 'default';

  // 1. 家族指示から抽出
  if (item.noteToStaff) {
    const instructionQty = extractQuantityFromInstruction(item.noteToStaff);
    if (instructionQty !== null) {
      quantity = instructionQty;
      reason = item.noteToStaff;
      source = 'instruction';
    }
  }

  // 2. 在庫制限でキャップ
  const currentQty = item.currentQuantity ?? item.remainingQuantity ?? item.quantity;
  if (currentQty !== undefined && quantity > currentQty) {
    quantity = Math.max(0, currentQty);
    reason = `残り ${currentQty}${item.unit}`;
    source = 'stock';
  }

  return { quantity, reason, source };
}

/**
 * 賞味期限に基づく警告を取得
 */
export function getExpirationWarning(expirationDate?: string): {
  type: 'expired' | 'expiring_soon' | 'ok';
  message: string;
  daysLeft: number | null;
} | null {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      type: 'expired',
      message: `期限切れ（${Math.abs(daysLeft)}日前）`,
      daysLeft,
    };
  } else if (daysLeft <= 3) {
    return {
      type: 'expiring_soon',
      message: daysLeft === 0 ? '本日期限' : `あと${daysLeft}日`,
      daysLeft,
    };
  }

  return { type: 'ok', message: '', daysLeft };
}
