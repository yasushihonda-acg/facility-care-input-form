/**
 * 品物イベント（編集履歴）デモデータ
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション9.4 - 編集履歴タイムライン
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション4
 *
 * 品物の編集履歴をタイムラインで表示するためのデモデータ
 */

import type { ItemEvent } from '../../types/itemEvent';

// ===== 日付ヘルパー =====

function getDateTimeString(daysFromToday: number, hour = 12, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

// ===== デモ品物イベントデータ =====

export const DEMO_ITEM_EVENTS: ItemEvent[] = [
  // ===== バナナ (demo-item-001) のイベント =====
  // 登録→編集（提供方法変更）→編集（期限延長）
  {
    id: 'event-001-created',
    itemId: 'demo-item-001',
    eventType: 'created',
    eventAt: getDateTimeString(-5, 10, 30),
    performedBy: '家族 太郎',
    description: '新規品物として登録',
  },
  {
    id: 'event-001-update1',
    itemId: 'demo-item-001',
    eventType: 'updated',
    eventAt: getDateTimeString(-4, 14, 15),
    performedBy: '家族 太郎',
    description: '提供方法を変更',
    changes: [
      {
        field: 'servingMethodDetail',
        fieldLabel: '提供方法詳細',
        oldValue: 'そのまま提供',
        newValue: '1日1房を目安に提供、皮を剥いてカット',
      },
    ],
  },
  {
    id: 'event-001-update2',
    itemId: 'demo-item-001',
    eventType: 'updated',
    eventAt: getDateTimeString(-1, 9, 0),
    performedBy: '家族 太郎',
    description: '賞味期限を更新',
    changes: [
      {
        field: 'expirationDate',
        fieldLabel: '賞味期限',
        oldValue: '2日前',
        newValue: '2日後',
      },
    ],
  },

  // ===== キウイ (demo-item-002) のイベント =====
  // 登録→編集（保存方法変更）
  {
    id: 'event-002-created',
    itemId: 'demo-item-002',
    eventType: 'created',
    eventAt: getDateTimeString(-7, 11, 0),
    performedBy: '家族 花子',
    description: '新規品物として登録',
  },
  {
    id: 'event-002-update1',
    itemId: 'demo-item-002',
    eventType: 'updated',
    eventAt: getDateTimeString(-6, 16, 30),
    performedBy: '家族 花子',
    description: '保存方法と提供方法を変更',
    changes: [
      {
        field: 'storageMethod',
        fieldLabel: '保存方法',
        oldValue: '常温',
        newValue: '冷蔵',
      },
      {
        field: 'servingMethodDetail',
        fieldLabel: '提供方法詳細',
        oldValue: '4等分',
        newValue: '8等分・半月切りで提供（皮を剥く）',
      },
    ],
  },

  // ===== りんご (demo-item-003) のイベント =====
  // 登録→編集（スタッフへの申し送り追加）
  {
    id: 'event-003-created',
    itemId: 'demo-item-003',
    eventType: 'created',
    eventAt: getDateTimeString(-3, 10, 0),
    performedBy: '家族 太郎',
    description: '新規品物として登録',
  },
  {
    id: 'event-003-update1',
    itemId: 'demo-item-003',
    eventType: 'updated',
    eventAt: getDateTimeString(-2, 11, 45),
    performedBy: '家族 太郎',
    description: 'スタッフへの申し送りを追加',
    changes: [
      {
        field: 'noteToStaff',
        fieldLabel: 'スタッフへの申し送り',
        oldValue: '(なし)',
        newValue: '最近食欲が落ちているようなので、無理に提供しなくて大丈夫です',
      },
    ],
  },

  // ===== みかん (demo-item-004) のイベント =====
  // 登録のみ（編集なし）
  {
    id: 'event-004-created',
    itemId: 'demo-item-004',
    eventType: 'created',
    eventAt: getDateTimeString(-4, 9, 30),
    performedBy: '家族 花子',
    description: '新規品物として登録',
  },

  // ===== プリン (demo-item-006) のイベント =====
  // 登録→編集（数量修正）
  {
    id: 'event-006-created',
    itemId: 'demo-item-006',
    eventType: 'created',
    eventAt: getDateTimeString(-4, 10, 0),
    performedBy: '家族 太郎',
    description: '新規品物として登録',
  },
  {
    id: 'event-006-update1',
    itemId: 'demo-item-006',
    eventType: 'updated',
    eventAt: getDateTimeString(-3, 8, 30),
    performedBy: '家族 太郎',
    description: '初期数量を修正',
    changes: [
      {
        field: 'initialQuantity',
        fieldLabel: '初期数量',
        oldValue: '4個',
        newValue: '6個',
      },
    ],
  },

  // ===== カステラ (demo-item-007) のイベント =====
  // 登録→編集（スケジュール追加）
  {
    id: 'event-007-created',
    itemId: 'demo-item-007',
    eventType: 'created',
    eventAt: getDateTimeString(-2, 14, 0),
    performedBy: '家族 花子',
    description: '新規品物として登録',
  },
  {
    id: 'event-007-update1',
    itemId: 'demo-item-007',
    eventType: 'updated',
    eventAt: getDateTimeString(-1, 10, 15),
    performedBy: '家族 花子',
    description: '提供スケジュールを追加',
    changes: [
      {
        field: 'servingSchedule',
        fieldLabel: '提供スケジュール',
        oldValue: '(なし)',
        newValue: '毎日・おやつ',
      },
    ],
  },

  // ===== 羊羹 (demo-item-008) のイベント =====
  // 今日登録（編集なし）
  {
    id: 'event-008-created',
    itemId: 'demo-item-008',
    eventType: 'created',
    eventAt: getDateTimeString(0, 10, 0),
    performedBy: '家族 太郎',
    description: '新規品物として登録',
  },

  // ===== らっきょう (demo-item-010) のイベント =====
  // 登録→複数回編集
  {
    id: 'event-010-created',
    itemId: 'demo-item-010',
    eventType: 'created',
    eventAt: getDateTimeString(-10, 11, 0),
    performedBy: '家族 花子',
    description: '新規品物として登録',
  },
  {
    id: 'event-010-update1',
    itemId: 'demo-item-010',
    eventType: 'updated',
    eventAt: getDateTimeString(-8, 15, 0),
    performedBy: '家族 花子',
    description: '提供方法を詳細化',
    changes: [
      {
        field: 'servingMethodDetail',
        fieldLabel: '提供方法詳細',
        oldValue: '小皿で提供',
        newValue: '冷たいまま小皿で提供。常温放置しない。',
      },
    ],
  },
  {
    id: 'event-010-update2',
    itemId: 'demo-item-010',
    eventType: 'updated',
    eventAt: getDateTimeString(-5, 9, 30),
    performedBy: '家族 太郎',
    description: '保存方法を明確化',
    changes: [
      {
        field: 'storageMethod',
        fieldLabel: '保存方法',
        oldValue: '常温',
        newValue: '冷蔵',
      },
    ],
  },

  // ===== 黒豆 (demo-item-011) のイベント =====
  {
    id: 'event-011-created',
    itemId: 'demo-item-011',
    eventType: 'created',
    eventAt: getDateTimeString(-8, 10, 30),
    performedBy: '家族 太郎',
    description: '新規品物として登録',
  },
  {
    id: 'event-011-update1',
    itemId: 'demo-item-011',
    eventType: 'updated',
    eventAt: getDateTimeString(-6, 14, 0),
    performedBy: '家族 太郎',
    description: '提供方法を変更',
    changes: [
      {
        field: 'servingMethodDetail',
        fieldLabel: '提供方法詳細',
        oldValue: 'そのまま提供',
        newValue: '煮汁を切って小皿で提供',
      },
    ],
  },
];

// ===== ヘルパー関数 =====

/**
 * 品物IDでイベントをフィルタ（新しい順）
 */
export function getDemoItemEventsForItem(itemId: string): ItemEvent[] {
  return DEMO_ITEM_EVENTS
    .filter(event => event.itemId === itemId)
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
}

/**
 * 品物IDで編集イベントのみをフィルタ（新しい順）
 */
export function getDemoEditEventsForItem(itemId: string): ItemEvent[] {
  return DEMO_ITEM_EVENTS
    .filter(event => event.itemId === itemId && event.eventType === 'updated')
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
}

/**
 * 全イベントを日付降順で取得
 */
export function getAllDemoItemEvents(): ItemEvent[] {
  return [...DEMO_ITEM_EVENTS].sort(
    (a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime()
  );
}

// ===== Phase 55: 家族操作通知用デモデータ =====
// スタッフ注意事項ページの「家族依頼」タブで24時間以内の通知を表示

/**
 * 家族操作通知（24時間以内のイベント）
 * created/updated/deleted の3種類を含む
 */
export const DEMO_FAMILY_ACTION_NOTIFICATIONS: ItemEvent[] = [
  // 新規登録通知（2時間前）
  {
    id: 'notify-001-created',
    itemId: 'demo-item-new-ichigo',
    eventType: 'created',
    eventAt: getDateTimeString(0, new Date().getHours() - 2, 30),
    performedBy: '家族 太郎',
    description: 'いちご を新規登録しました',
    metadata: {
      itemName: 'いちご',
      actionLabel: '新規',
    },
  },
  // 変更通知（5時間前）
  {
    id: 'notify-002-updated',
    itemId: 'demo-item-001', // バナナ
    eventType: 'updated',
    eventAt: getDateTimeString(0, new Date().getHours() - 5, 15),
    performedBy: '家族 太郎',
    description: 'バナナ の提供方法を変更しました',
    changes: [
      {
        field: 'servingMethodDetail',
        fieldLabel: '提供方法詳細',
        oldValue: '1日1房',
        newValue: '1日半房ずつ提供',
      },
    ],
    metadata: {
      itemName: 'バナナ',
      actionLabel: '変更',
    },
  },
  // 削除通知（8時間前）
  {
    id: 'notify-003-deleted',
    itemId: 'demo-item-deleted-budou',
    eventType: 'deleted',
    eventAt: getDateTimeString(0, new Date().getHours() - 8, 0),
    performedBy: '家族 花子',
    description: 'ぶどう を削除しました',
    metadata: {
      itemName: 'ぶどう',
      actionLabel: '削除',
      reason: '母が食べなくなったため',
    },
  },
  // 変更通知（12時間前）
  {
    id: 'notify-004-updated',
    itemId: 'demo-item-003', // りんご
    eventType: 'updated',
    eventAt: getDateTimeString(0, new Date().getHours() - 12, 45),
    performedBy: '家族 太郎',
    description: 'りんご のスタッフへの申し送りを追加しました',
    changes: [
      {
        field: 'noteToStaff',
        fieldLabel: 'スタッフへの申し送り',
        oldValue: '(なし)',
        newValue: '皮を剥いて小さく切ってください',
      },
    ],
    metadata: {
      itemName: 'りんご',
      actionLabel: '変更',
    },
  },
];

/**
 * 24時間以内の家族操作通知を取得
 * @returns 新しい順にソートされた通知リスト
 */
export function getRecentFamilyActionNotifications(): ItemEvent[] {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return DEMO_FAMILY_ACTION_NOTIFICATIONS
    .filter(event => new Date(event.eventAt) >= oneDayAgo)
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
}

/**
 * 通知のバッジカラーを取得
 */
export function getNotificationBadgeColor(eventType: ItemEvent['eventType']): string {
  switch (eventType) {
    case 'created':
      return 'bg-green-100 text-green-800';
    case 'updated':
      return 'bg-blue-100 text-blue-800';
    case 'deleted':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * 通知のラベルを取得
 */
export function getNotificationLabel(eventType: ItemEvent['eventType']): string {
  switch (eventType) {
    case 'created':
      return '新規';
    case 'updated':
      return '変更';
    case 'deleted':
      return '削除';
    default:
      return 'その他';
  }
}
