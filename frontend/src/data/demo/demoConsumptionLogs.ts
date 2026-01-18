/**
 * 消費ログデモデータ
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション4.4
 *
 * 品物タイムラインで表示される提供・摂食履歴
 */

import type { ConsumptionLog } from '../../types/consumptionLog';
import { formatDateString } from '../../utils/scheduleUtils';

// ===== 日付ヘルパー =====

function getDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return formatDateString(date);
}

function getDateTimeString(daysFromToday: number, hour = 12, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

// ===== デモ消費ログデータ =====

export const DEMO_CONSUMPTION_LOGS: ConsumptionLog[] = [
  // ===== バナナ (demo-item-001) のログ =====
  {
    id: 'log-001',
    itemId: 'demo-item-001',
    servedDate: getDateString(-3),
    servedQuantity: 0.5,
    servedBy: '田中花子',
    consumedQuantity: 0.4,
    consumptionRate: 80,
    consumptionStatus: 'most',
    quantityBefore: 4,
    quantityAfter: 3.5,
    noteToFamily: 'おいしそうに召し上がっていました',
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-3, 12, 30),
  },
  {
    id: 'log-002',
    itemId: 'demo-item-001',
    servedDate: getDateString(-2),
    servedQuantity: 0.5,
    servedBy: '佐藤一郎',
    consumedQuantity: 0.35,
    consumptionRate: 70,
    consumptionStatus: 'most',
    quantityBefore: 3.5,
    quantityAfter: 3,
    noteToFamily: '7割程度召し上がりました',
    recordedBy: '佐藤一郎',
    recordedAt: getDateTimeString(-2, 12, 15),
  },
  {
    id: 'log-003',
    itemId: 'demo-item-001',
    servedDate: getDateString(-1),
    servedQuantity: 0.5,
    servedBy: '田中花子',
    consumedQuantity: 0.38,
    consumptionRate: 75,
    consumptionStatus: 'most',
    quantityBefore: 3,
    quantityAfter: 2.5,
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-1, 12, 45),
  },
  {
    id: 'log-004',
    itemId: 'demo-item-001',
    servedDate: getDateString(0),
    servedQuantity: 0.5,
    servedBy: '山田太郎',
    consumedQuantity: 0.4,
    consumptionRate: 80,
    consumptionStatus: 'most',
    quantityBefore: 2.5,
    quantityAfter: 2,
    noteToFamily: '本日も元気に召し上がりました',
    sourceType: 'meal_form',  // 食事入力フォームから記録
    linkedMealRecordId: 'meal-2024-001',
    recordedBy: '山田太郎',
    recordedAt: getDateTimeString(0, 12, 20),
  },

  // ===== キウイ (demo-item-002) のログ =====
  // ★家族指示対応フィールドのデモ
  {
    id: 'log-005',
    itemId: 'demo-item-002',
    servedDate: getDateString(-5),
    servedQuantity: 1,
    servedBy: '田中花子',
    consumedQuantity: 0.95,
    consumptionRate: 95,
    consumptionStatus: 'full',
    quantityBefore: 3,
    quantityAfter: 2,
    noteToFamily: '8等分・半月切りで提供。とても喜ばれました。',
    followedInstruction: true,  // 家族指示に従った
    instructionNote: '8等分・半月切りの指示に対応',
    sourceType: 'item_detail',
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-5, 12, 30),
  },
  {
    id: 'log-006',
    itemId: 'demo-item-002',
    servedDate: getDateString(-4),
    servedQuantity: 1,
    servedBy: '佐藤一郎',
    consumedQuantity: 0.9,
    consumptionRate: 90,
    consumptionStatus: 'most',
    quantityBefore: 2,
    quantityAfter: 1,
    noteToFamily: '指示通り半月切りで対応',
    followedInstruction: true,  // 家族指示に従った
    sourceType: 'meal_form',
    recordedBy: '佐藤一郎',
    recordedAt: getDateTimeString(-4, 15, 0),
  },
  {
    id: 'log-007',
    itemId: 'demo-item-002',
    servedDate: getDateString(-3),
    servedQuantity: 1,
    servedBy: '田中花子',
    consumedQuantity: 0.95,
    consumptionRate: 95,
    consumptionStatus: 'full',
    quantityBefore: 1,
    quantityAfter: 0,
    noteToFamily: '完食に近い状態でした',
    followedInstruction: true,
    sourceType: 'meal_form',
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-3, 12, 0),
  },

  // ===== りんご (demo-item-003) のログ =====
  {
    id: 'log-008',
    itemId: 'demo-item-003',
    servedDate: getDateString(-2),
    servedQuantity: 0.25,
    servedBy: '佐藤一郎',
    consumedQuantity: 0.05,
    consumptionRate: 20,
    consumptionStatus: 'little',
    quantityBefore: 2,
    quantityAfter: 1.75,
    noteToFamily: '今日はあまり食欲がないようでした',
    recordedBy: '佐藤一郎',
    recordedAt: getDateTimeString(-2, 15, 30),
  },
  {
    id: 'log-009',
    itemId: 'demo-item-003',
    servedDate: getDateString(-1),
    servedQuantity: 0.25,
    servedBy: '田中花子',
    consumedQuantity: 0.08,
    consumptionRate: 30,
    consumptionStatus: 'little',
    quantityBefore: 1.75,
    quantityAfter: 1.5,
    noteToFamily: '少し召し上がりましたが、残りは多めです',
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-1, 12, 45),
  },

  // ===== プリン (demo-item-006) のログ =====
  {
    id: 'log-010',
    itemId: 'demo-item-006',
    servedDate: getDateString(-3),
    servedQuantity: 1,
    servedBy: '山田太郎',
    consumedQuantity: 1,
    consumptionRate: 100,
    consumptionStatus: 'full',
    quantityBefore: 6,
    quantityAfter: 5,
    noteToFamily: '完食されました！大好物のようです。',
    recordedBy: '山田太郎',
    recordedAt: getDateTimeString(-3, 15, 0),
  },
  {
    id: 'log-011',
    itemId: 'demo-item-006',
    servedDate: getDateString(-2),
    servedQuantity: 1,
    servedBy: '田中花子',
    consumedQuantity: 0.9,
    consumptionRate: 90,
    consumptionStatus: 'most',
    quantityBefore: 5,
    quantityAfter: 4,
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-2, 15, 15),
  },
  {
    id: 'log-012',
    itemId: 'demo-item-006',
    servedDate: getDateString(-1),
    servedQuantity: 1,
    servedBy: '佐藤一郎',
    consumedQuantity: 0.95,
    consumptionRate: 95,
    consumptionStatus: 'full',
    quantityBefore: 4,
    quantityAfter: 3,
    noteToFamily: '喜んで召し上がっていました',
    recordedBy: '佐藤一郎',
    recordedAt: getDateTimeString(-1, 15, 30),
  },
  {
    id: 'log-013',
    itemId: 'demo-item-006',
    servedDate: getDateString(0),
    servedQuantity: 1,
    servedBy: '田中花子',
    consumedQuantity: 0.95,
    consumptionRate: 95,
    consumptionStatus: 'full',
    quantityBefore: 3,
    quantityAfter: 2,
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(0, 15, 0),
  },

  // ===== カステラ (demo-item-007) のログ =====
  {
    id: 'log-014',
    itemId: 'demo-item-007',
    servedDate: getDateString(-1),
    servedQuantity: 1,
    servedBy: '佐藤一郎',
    consumedQuantity: 0.8,
    consumptionRate: 80,
    consumptionStatus: 'most',
    quantityBefore: 8,
    quantityAfter: 7,
    recordedBy: '佐藤一郎',
    recordedAt: getDateTimeString(-1, 15, 0),
  },
  {
    id: 'log-015',
    itemId: 'demo-item-007',
    servedDate: getDateString(0),
    servedQuantity: 2,
    servedBy: '山田太郎',
    consumedQuantity: 1.6,
    consumptionRate: 80,
    consumptionStatus: 'most',
    quantityBefore: 7,
    quantityAfter: 5,
    noteToFamily: '2切れ提供しました',
    recordedBy: '山田太郎',
    recordedAt: getDateTimeString(0, 15, 30),
  },

  // ===== Phase 63: 廃棄済み品物（consumptionSummaryなし）の消費ログ =====
  // demo-item-discarded-001: consumptionSummaryがないので、消費ログからフォールバック取得をテスト
  {
    id: 'log-discarded-001',
    itemId: 'demo-item-discarded-001',
    servedDate: getDateString(-2),
    servedQuantity: 1.5,
    servedBy: '山田',
    consumedQuantity: 1.05,  // 70%消費 = 30%破棄
    consumptionRate: 70,
    consumptionStatus: 'most',
    quantityBefore: 2,
    quantityAfter: 0.5,
    noteToFamily: '7割程度召し上がりました',
    recordedBy: '山田',
    recordedAt: getDateTimeString(-2, 15, 0),
  },

  // ===== 黒豆 (demo-item-011) のログ =====
  {
    id: 'log-016',
    itemId: 'demo-item-011',
    servedDate: getDateString(-5),
    servedQuantity: 20,
    servedBy: '田中花子',
    consumedQuantity: 10,
    consumptionRate: 50,
    consumptionStatus: 'half',
    quantityBefore: 200,
    quantityAfter: 180,
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-5, 12, 30),
  },
  {
    id: 'log-017',
    itemId: 'demo-item-011',
    servedDate: getDateString(-3),
    servedQuantity: 20,
    servedBy: '佐藤一郎',
    consumedQuantity: 8,
    consumptionRate: 40,
    consumptionStatus: 'little',
    quantityBefore: 180,
    quantityAfter: 160,
    noteToFamily: '少し残されました',
    recordedBy: '佐藤一郎',
    recordedAt: getDateTimeString(-3, 12, 45),
  },
  {
    id: 'log-018',
    itemId: 'demo-item-011',
    servedDate: getDateString(-1),
    servedQuantity: 20,
    servedBy: '田中花子',
    consumedQuantity: 6,
    consumptionRate: 30,
    consumptionStatus: 'little',
    quantityBefore: 160,
    quantityAfter: 140,
    noteToFamily: '最近あまり召し上がりません。提供方法の変更を検討してください。',
    recordedBy: '田中花子',
    recordedAt: getDateTimeString(-1, 12, 30),
  },
];

// ===== ヘルパー関数 =====

/**
 * 品物IDで消費ログをフィルタ
 */
export function getDemoConsumptionLogsForItem(itemId: string): ConsumptionLog[] {
  return DEMO_CONSUMPTION_LOGS
    .filter(log => log.itemId === itemId)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

/**
 * 日付範囲で消費ログをフィルタ
 */
export function getDemoConsumptionLogsByDateRange(
  startDate: string,
  endDate: string
): ConsumptionLog[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return DEMO_CONSUMPTION_LOGS.filter(log => {
    const logDate = new Date(log.servedDate);
    return logDate >= start && logDate <= end;
  });
}

/**
 * 全消費ログを日付降順で取得
 */
export function getAllDemoConsumptionLogs(): ConsumptionLog[] {
  return [...DEMO_CONSUMPTION_LOGS].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  );
}
