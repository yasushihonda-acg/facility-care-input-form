/**
 * 品物デモデータ
 *
 * 統計・在庫サマリーが見栄えするよう、様々なステータス・期限・カテゴリのデータを用意
 */

import type { CareItem, ItemStatus, ItemCategory, ServingMethod, ServingSchedule, RemainingHandlingInstruction, RemainingHandlingLog } from '../../types/careItem';

// ===== 日付ヘルパー =====

function getDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split('T')[0];
}

function getDateTimeString(daysFromToday: number, hour = 12): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

// ===== デモ品物データ =====

export const DEMO_CARE_ITEMS: CareItem[] = [
  // ===== 食べ物カテゴリ (food) =====
  {
    id: 'demo-item-001',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'バナナ',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-5),
    initialQuantity: 4,
    currentQuantity: 1.5,
    remainingQuantity: 1.5,
    quantity: 4,
    unit: '房',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(2),
    storageMethod: 'room_temp',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '1日1房を目安に提供、皮を剥いてカット',
    consumptionSummary: {
      totalServed: 5,
      totalServedQuantity: 2.5,
      totalConsumedQuantity: 1.88,
      avgConsumptionRate: 75,
    },
    consumptionRate: 75,
    remainingHandlingInstruction: 'stored' as RemainingHandlingInstruction, // Phase 33: 残ったら保存
    // Phase 42: 残り対応履歴
    remainingHandlingLogs: [
      {
        id: 'RHL_demo_001',
        handling: 'stored',
        quantity: 1,
        note: '1房保存しました',
        recordedBy: '田中',
        recordedAt: getDateTimeString(-2, 15),
      } as RemainingHandlingLog,
      {
        id: 'RHL_demo_002',
        handling: 'stored',
        quantity: 0.5,
        note: '半房保存',
        recordedBy: '佐藤',
        recordedAt: getDateTimeString(-1, 10),
      } as RemainingHandlingLog,
    ],
    // 残り1.5房 → 特定の1日に提供
    servingSchedule: {
      type: 'once',
      date: getDateString(1), // 明日
      timeSlot: 'breakfast',
    } as ServingSchedule,
    createdAt: getDateTimeString(-5),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'demo-item-002',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'キウイ',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-7),
    initialQuantity: 3,
    currentQuantity: 0,
    remainingQuantity: 0,
    quantity: 3,
    unit: '個',
    status: 'consumed' as ItemStatus,
    storageMethod: 'refrigerated',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '8等分・半月切りで提供（皮を剥く）',
    consumptionSummary: {
      totalServed: 3,
      totalServedQuantity: 3,
      totalConsumedQuantity: 2.8,
      avgConsumptionRate: 93,
    },
    consumptionRate: 93,
    noteToFamily: '大変喜んで召し上がっていました',
    actualServeDate: getDateString(-2),
    createdAt: getDateTimeString(-7),
    updatedAt: getDateTimeString(-2),
  },
  {
    id: 'demo-item-003',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'りんご',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-3),
    initialQuantity: 2,
    currentQuantity: 1.5,
    remainingQuantity: 1.5,
    quantity: 2,
    unit: '個',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(5),
    storageMethod: 'refrigerated',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '皮を剥いて一口大にカット',
    consumptionSummary: {
      totalServed: 2,
      totalServedQuantity: 0.5,
      totalConsumedQuantity: 0.13,
      avgConsumptionRate: 25,
    },
    consumptionRate: 25,
    remainingHandlingInstruction: 'discarded' as RemainingHandlingInstruction, // Phase 33: 残ったら破棄
    noteToFamily: '食べ残しが多いようです',
    // Phase 42: 残り対応履歴
    remainingHandlingLogs: [
      {
        id: 'RHL_demo_003',
        handling: 'discarded',
        quantity: 0.3,
        note: '傷みが出ていたため破棄',
        recordedBy: '山田',
        recordedAt: getDateTimeString(-1, 14),
      } as RemainingHandlingLog,
    ],
    // 残り1.5個 → 2日に分けて提供
    servingSchedule: {
      type: 'specific_dates',
      dates: [getDateString(2), getDateString(4)], // 2日後と4日後
      timeSlot: 'snack',
    } as ServingSchedule,
    createdAt: getDateTimeString(-3),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'demo-item-004',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'みかん',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-4),
    initialQuantity: 5,
    currentQuantity: 3,
    remainingQuantity: 3,
    quantity: 5,
    unit: '個',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(7),
    storageMethod: 'room_temp',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: '皮を剥かずに提供。剥かずに残した場合はおやつへ',
    consumptionSummary: {
      totalServed: 2,
      totalServedQuantity: 2,
      totalConsumedQuantity: 1.6,
      avgConsumptionRate: 80,
    },
    consumptionRate: 80,
    // 残り3個 → 3日に分けて提供
    servingSchedule: {
      type: 'specific_dates',
      dates: [getDateString(1), getDateString(3), getDateString(5)], // 明日、3日後、5日後
      timeSlot: 'snack',
    } as ServingSchedule,
    createdAt: getDateTimeString(-4),
    updatedAt: getDateTimeString(0),
  },
  {
    id: 'demo-item-005',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: '柿（熟し）',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-1),
    initialQuantity: 2,
    currentQuantity: 2,
    remainingQuantity: 2,
    quantity: 2,
    unit: '個',
    status: 'pending' as ItemStatus,
    expirationDate: getDateString(1),
    storageMethod: 'room_temp',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '熟した部分も捨てずに提供。ご本人の好物です。',
    // 期限間近のため毎日おやつ時に提供
    servingSchedule: {
      type: 'daily',
      timeSlot: 'snack',
      note: '期限が近いので早めに提供をお願いします',
    } as ServingSchedule,
    createdAt: getDateTimeString(-1),
    updatedAt: getDateTimeString(-1),
  },

  // ===== 食べ物（おやつ系）=====
  {
    id: 'demo-item-006',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'プリン',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-4),
    initialQuantity: 6,
    currentQuantity: 2,
    remainingQuantity: 2,
    quantity: 6,
    unit: '個',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(1),
    storageMethod: 'refrigerated',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: 'そのまま提供',
    consumptionSummary: {
      totalServed: 4,
      totalServedQuantity: 4,
      totalConsumedQuantity: 3.8,
      avgConsumptionRate: 95,
    },
    consumptionRate: 95,
    remainingHandlingInstruction: 'discarded' as RemainingHandlingInstruction, // Phase 33: 冷蔵品なので残ったら破棄
    noteToFamily: '大好物のようです',
    // 残り2個 → 2日に分けて提供（期限間近）
    servingSchedule: {
      type: 'specific_dates',
      dates: [getDateString(0), getDateString(1)], // 今日と明日
      timeSlot: 'snack',
    } as ServingSchedule,
    createdAt: getDateTimeString(-4),
    updatedAt: getDateTimeString(0),
  },
  {
    id: 'demo-item-007',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'カステラ',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-2),
    initialQuantity: 8,
    currentQuantity: 5,
    remainingQuantity: 5,
    quantity: 8,
    unit: '切れ',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(10),
    storageMethod: 'room_temp',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: '1切れずつ提供',
    consumptionSummary: {
      totalServed: 3,
      totalServedQuantity: 3,
      totalConsumedQuantity: 2.4,
      avgConsumptionRate: 80,
      lastServedDate: getDateString(0), // 今日記録済み → 「入力済み」表示
      lastServedBy: 'スタッフA',
    },
    consumptionRate: 80,
    noteToStaff: 'おやつタイムに1切れずつ提供してください',
    // Phase 13.2 テスト用: 毎日スケジュール
    servingSchedule: {
      type: 'daily',
      startDate: getDateString(-2),
      timeSlot: 'snack',
    } as ServingSchedule,
    createdAt: getDateTimeString(-2),
    updatedAt: getDateTimeString(0),
  },
  {
    id: 'demo-item-008',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: '羊羹',
    category: 'food' as ItemCategory,
    sentDate: getDateString(0),
    initialQuantity: 4,
    currentQuantity: 4,
    remainingQuantity: 4,
    quantity: 4,
    unit: '切れ',
    status: 'pending' as ItemStatus,
    expirationDate: getDateString(30),
    storageMethod: 'room_temp',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '小さく切って提供',
    noteToStaff: '1日1切れまで',
    // Phase 13.2 テスト用: 曜日指定スケジュール
    servingSchedule: {
      type: 'weekly',
      weekdays: [1, 3, 5], // 月・水・金
      timeSlot: 'snack',
      note: '15時のおやつに提供',
    } as ServingSchedule,
    createdAt: getDateTimeString(0),
    updatedAt: getDateTimeString(0),
  },

  // ===== 飲料カテゴリ (drink) =====
  {
    id: 'demo-item-009',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: '麦茶',
    category: 'drink' as ItemCategory,
    sentDate: getDateString(-3),
    initialQuantity: 2,
    currentQuantity: 1,
    remainingQuantity: 1,
    quantity: 2,
    unit: 'L',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(3),
    storageMethod: 'refrigerated',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: '食事時に提供',
    consumptionSummary: {
      totalServed: 5,
      totalServedQuantity: 1,
      totalConsumedQuantity: 0.9,
      avgConsumptionRate: 90,
    },
    consumptionRate: 90,
    remainingHandlingInstruction: 'stored' as RemainingHandlingInstruction, // Phase 33: 残ったら保存
    // 飲み物は毎日提供
    servingSchedule: {
      type: 'daily',
      timeSlot: 'anytime',
      note: '食事時にコップ1杯',
    } as ServingSchedule,
    createdAt: getDateTimeString(-3),
    updatedAt: getDateTimeString(0),
  },

  // ===== 食べ物（その他）=====
  {
    id: 'demo-item-010',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'らっきょう',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-10),
    initialQuantity: 1,
    currentQuantity: 0.7,
    remainingQuantity: 0.7,
    quantity: 1,
    unit: '瓶',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(60),
    storageMethod: 'refrigerated',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: '冷たいまま小皿で提供。常温放置しない。',
    consumptionSummary: {
      totalServed: 3,
      totalServedQuantity: 0.3,
      totalConsumedQuantity: 0.24,
      avgConsumptionRate: 80,
    },
    consumptionRate: 80,
    // 週1回（日）昼食時 - 漬物は控えめに
    servingSchedule: {
      type: 'weekly',
      weekdays: [0], // 日
      timeSlot: 'lunch',
      note: '小皿に3〜4粒程度',
    } as ServingSchedule,
    createdAt: getDateTimeString(-10),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'demo-item-011',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: '黒豆',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-8),
    initialQuantity: 200,
    currentQuantity: 120,
    remainingQuantity: 120,
    quantity: 200,
    unit: 'g',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(14),
    storageMethod: 'refrigerated',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: '煮汁を切って小皿で提供',
    consumptionSummary: {
      totalServed: 4,
      totalServedQuantity: 80,
      totalConsumedQuantity: 32,
      avgConsumptionRate: 40,
    },
    consumptionRate: 40,
    noteToFamily: '最近あまり召し上がりません',
    // 週2回（月・木）朝食時
    servingSchedule: {
      type: 'weekly',
      weekdays: [1, 4], // 月・木
      timeSlot: 'breakfast',
    } as ServingSchedule,
    createdAt: getDateTimeString(-8),
    updatedAt: getDateTimeString(-2),
  },

  // ===== 期限切れサンプル（期限切れアラート表示用） =====
  // Phase 38.3: status: 'in_progress' かつ expirationDate < 今日 で期限切れアラートに表示
  {
    id: 'demo-item-012',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'ヨーグルト',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-10),
    initialQuantity: 4,
    currentQuantity: 1,
    remainingQuantity: 1,
    quantity: 4,
    unit: '個',
    status: 'in_progress' as ItemStatus, // 期限切れアラートに表示するためin_progress
    expirationDate: getDateString(-1), // 昨日 → 期限切れ
    storageMethod: 'refrigerated',
    servingMethod: 'as_is' as ServingMethod,
    consumptionSummary: {
      totalServed: 3,
      totalServedQuantity: 3,
      totalConsumedQuantity: 2.7,
      avgConsumptionRate: 90,
    },
    consumptionRate: 90,
    // 残り1個 → 1日で提供（期限切れのため早急に対応）
    servingSchedule: {
      type: 'once',
      date: getDateString(-1), // 昨日予定だった（期限切れ）
      timeSlot: 'breakfast',
    } as ServingSchedule,
    createdAt: getDateTimeString(-10),
    updatedAt: getDateTimeString(-2),
  },

  // ===== FIFO テスト用: 同じ品物名の重複アイテム =====
  // 同名品物の先入れ先出し（FIFO）動作確認用データ
  {
    id: 'demo-item-013',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'りんご',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-10),
    initialQuantity: 3,
    currentQuantity: 2,
    remainingQuantity: 2,
    quantity: 3,
    unit: '個',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(2), // demo-item-003より早い期限
    storageMethod: 'refrigerated',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '一口大にカット',
    // 残り2個 → 2日に分けて提供（FIFO優先）
    servingSchedule: {
      type: 'specific_dates',
      dates: [getDateString(0), getDateString(1)], // 今日と明日
      timeSlot: 'snack',
      note: '古いものから先に提供',
    } as ServingSchedule,
    createdAt: getDateTimeString(-10),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'demo-item-014',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'バナナ',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-10),
    initialQuantity: 3,
    currentQuantity: 1,
    remainingQuantity: 1,
    quantity: 3,
    unit: '房',
    status: 'in_progress' as ItemStatus,
    expirationDate: getDateString(0), // demo-item-001より早い期限（今日）
    storageMethod: 'room_temp',
    servingMethod: 'cut' as ServingMethod,
    servingMethodDetail: '皮を剥いてカット',
    // 残り1房・期限今日 → 本日中に提供
    servingSchedule: {
      type: 'once',
      date: getDateString(0), // 今日
      timeSlot: 'breakfast',
      note: '本日中に提供してください',
    } as ServingSchedule,
    createdAt: getDateTimeString(-10),
    updatedAt: getDateTimeString(0),
  },

  // ===== 提供漏れサンプル（スケジュール通りに提供されていない） =====
  {
    id: 'demo-item-015',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'ゼリー（提供漏れ）',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-7),
    initialQuantity: 4,
    currentQuantity: 4,
    remainingQuantity: 4,
    quantity: 4,
    unit: '個',
    status: 'pending' as ItemStatus, // まだ一度も提供されていない
    expirationDate: getDateString(5),
    storageMethod: 'refrigerated',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: '冷やしてそのまま提供',
    noteToStaff: '喉に詰まらないよう注意',
    remainingHandlingInstruction: 'stored' as RemainingHandlingInstruction,
    // 5日前からスケジュールされているが一度も記録なし → 提供漏れ
    servingSchedule: {
      type: 'daily',
      startDate: getDateString(-5), // 5日前から毎日予定だったが...
      timeSlot: 'snack',
      note: 'おやつ時に1個提供',
    } as ServingSchedule,
    // consumptionSummary がない = 一度も記録されていない
    createdAt: getDateTimeString(-7),
    updatedAt: getDateTimeString(-7),
  },
  {
    id: 'demo-item-016',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'クッキー（提供漏れ・期限切れ）',
    category: 'food' as ItemCategory,
    sentDate: getDateString(-10),
    initialQuantity: 10,
    currentQuantity: 10,
    remainingQuantity: 10,
    quantity: 10,
    unit: '枚',
    status: 'pending' as ItemStatus,
    expirationDate: getDateString(-2), // 2日前に期限切れ → 赤色で目立つ
    storageMethod: 'room_temp',
    servingMethod: 'as_is' as ServingMethod,
    servingMethodDetail: 'そのまま提供',
    noteToStaff: '1回2枚まで',
    // 1週間前からスケジュールされているが記録なし＋期限切れ
    servingSchedule: {
      type: 'weekly',
      startDate: getDateString(-7), // 7日前から週2回予定だったが...
      weekdays: [2, 5], // 火・金
      timeSlot: 'snack',
    } as ServingSchedule,
    createdAt: getDateTimeString(-10),
    updatedAt: getDateTimeString(-10),
  },
];

// ===== ヘルパー関数 =====

/**
 * 入居者IDで品物をフィルタ
 */
export function getDemoCareItemsForResident(residentId: string): CareItem[] {
  return DEMO_CARE_ITEMS.filter(item => item.residentId === residentId);
}

/**
 * ステータスで品物をフィルタ
 */
export function getDemoCareItemsByStatus(status: ItemStatus | ItemStatus[]): CareItem[] {
  const statuses = Array.isArray(status) ? status : [status];
  return DEMO_CARE_ITEMS.filter(item => statuses.includes(item.status));
}

/**
 * 期限間近の品物を取得（3日以内）
 */
export function getDemoExpiringSoonItems(): CareItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  return DEMO_CARE_ITEMS.filter(item => {
    if (!item.expirationDate || item.status === 'consumed' || item.status === 'expired') {
      return false;
    }
    const expDate = new Date(item.expirationDate);
    return expDate >= today && expDate <= threeDaysLater;
  });
}

/**
 * 品物IDで品物を取得
 */
export function getDemoCareItemById(itemId: string): CareItem | undefined {
  return DEMO_CARE_ITEMS.find(item => item.id === itemId);
}
