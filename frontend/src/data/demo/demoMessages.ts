/**
 * チャットメッセージ デモデータ
 * @see docs/CHAT_INTEGRATION_SPEC.md
 * @see docs/DEMO_SHOWCASE_SPEC.md
 *
 * デモモードでチャット機能をシミュレートするためのシードデータ
 */

import type { ChatMessage, ChatNotification } from '../../types/chat';

// ===== 日付ヘルパー =====

function getDateTimeString(daysFromToday: number, hour = 12, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

// ===== 品物ID別メッセージデータ =====

/** バナナ (demo-item-001) のチャット履歴 */
const BANANA_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-001',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: 'バナナを送りました。皮を剥いてカットしてから出してください。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-5, 10, 30),
  },
  {
    id: 'msg-002',
    type: 'text',
    senderType: 'staff',
    senderName: '山田スタッフ',
    content: '承知しました。朝食時に提供いたします。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-5, 11, 0),
  },
  {
    id: 'msg-003',
    type: 'record',
    senderType: 'staff',
    senderName: '山田スタッフ',
    content: '提供記録',
    recordData: {
      itemId: 'demo-item-001',
      itemName: 'バナナ',
      servedQuantity: 0.5,
      unit: '房',
      consumptionStatus: '完食',
      consumptionRate: 10,
      noteToFamily: '喜んで召し上がられました。',
    },
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-4, 8, 30),
  },
  {
    id: 'msg-004',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: '記録ありがとうございます。完食できてよかったです！',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-4, 12, 0),
  },
];

/** キウイ (demo-item-002) のチャット履歴 */
const KIWI_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-010',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: 'キウイは皮を剥いて一口大にカットしてください。種が気になる場合は取り除いてください。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-3, 14, 0),
  },
  {
    id: 'msg-011',
    type: 'text',
    senderType: 'staff',
    senderName: '鈴木スタッフ',
    content: 'かしこまりました。おやつ時に提供させていただきます。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-3, 14, 30),
  },
];

/** りんご (demo-item-003) のチャット履歴 */
const APPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-020',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: 'りんごは皮をむいて、薄くスライスしてください。',
    readByStaff: false,
    readByFamily: true,
    createdAt: getDateTimeString(-1, 9, 0),
  },
];

/** 羊羹 (demo-item-005) のチャット履歴 */
const YOKAN_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-030',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: '父の好物です。一切れずつ、お茶と一緒に出してください。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-4, 10, 0),
  },
  {
    id: 'msg-031',
    type: 'record',
    senderType: 'staff',
    senderName: '山田スタッフ',
    content: '提供記録',
    recordData: {
      itemId: 'demo-item-005',
      itemName: '羊羹',
      servedQuantity: 1,
      unit: '切れ',
      consumptionStatus: '完食',
      consumptionRate: 10,
      noteToFamily: '美味しそうに召し上がられました。',
    },
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-3, 15, 0),
  },
  {
    id: 'msg-032',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: 'いつもありがとうございます。父も喜んでいると思います。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-3, 18, 0),
  },
];

/** 緑茶 (demo-item-009) のチャット履歴 */
const GREENTEA_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-040',
    type: 'text',
    senderType: 'family',
    senderName: '田中太郎（長男）',
    content: '緑茶は熱すぎないように、適温で出してください。',
    readByStaff: true,
    readByFamily: true,
    createdAt: getDateTimeString(-2, 11, 0),
  },
];

// ===== 品物ID → メッセージのマッピング =====

export const DEMO_MESSAGES_BY_ITEM: Record<string, ChatMessage[]> = {
  'demo-item-001': BANANA_MESSAGES,
  'demo-item-002': KIWI_MESSAGES,
  'demo-item-003': APPLE_MESSAGES,
  'demo-item-005': YOKAN_MESSAGES,
  'demo-item-009': GREENTEA_MESSAGES,
};

/**
 * 品物IDからメッセージを取得
 */
export function getDemoMessages(itemId: string): ChatMessage[] {
  return DEMO_MESSAGES_BY_ITEM[itemId] || [];
}

/**
 * チャットがある品物のリスト（チャット一覧用）
 */
export const DEMO_ACTIVE_CHAT_ITEM_IDS = Object.keys(DEMO_MESSAGES_BY_ITEM);

// ===== 通知データ =====

export const DEMO_NOTIFICATIONS: ChatNotification[] = [
  {
    id: 'notif-001',
    type: 'new_message',
    title: '新しいメッセージ',
    body: '田中太郎さんからりんごについてメッセージがあります',
    targetType: 'staff',
    read: false,
    linkTo: '/staff/family-messages/demo-item-003/chat',
    relatedItemId: 'demo-item-003',
    relatedItemName: 'りんご',
    createdAt: getDateTimeString(-1, 9, 0),
  },
  {
    id: 'notif-002',
    type: 'record_added',
    title: '記録が追加されました',
    body: 'バナナの提供記録が追加されました',
    targetType: 'family',
    read: true,
    linkTo: '/family/items/demo-item-001/chat',
    relatedItemId: 'demo-item-001',
    relatedItemName: 'バナナ',
    createdAt: getDateTimeString(-4, 8, 30),
  },
  {
    id: 'notif-003',
    type: 'record_added',
    title: '記録が追加されました',
    body: '羊羹の提供記録が追加されました',
    targetType: 'family',
    read: true,
    linkTo: '/family/items/demo-item-005/chat',
    relatedItemId: 'demo-item-005',
    relatedItemName: '羊羹',
    createdAt: getDateTimeString(-3, 15, 0),
  },
];

/**
 * ユーザータイプ別の通知を取得
 */
export function getDemoNotifications(userType: 'staff' | 'family'): ChatNotification[] {
  return DEMO_NOTIFICATIONS.filter(
    (n) => n.targetType === userType || n.targetType === 'both'
  );
}

/**
 * 未読通知数を取得
 */
export function getDemoUnreadCount(userType: 'staff' | 'family'): number {
  return getDemoNotifications(userType).filter((n) => !n.read).length;
}

// ===== アクティブチャットアイテム（一覧用） =====

import type { CareItemWithChat } from '../../types/chat';
import { DEMO_CARE_ITEMS } from './demoCareItems';

/**
 * チャット一覧用: メッセージがある品物を取得
 */
export function getDemoActiveChatItems(_userType: 'staff' | 'family'): CareItemWithChat[] {
  // メッセージがある品物IDを取得
  const itemsWithMessages = DEMO_ACTIVE_CHAT_ITEM_IDS;

  // 品物データにチャット拡張フィールドを追加
  return itemsWithMessages
    .map((itemId) => {
      const item = DEMO_CARE_ITEMS.find((i) => i.id === itemId);
      if (!item) return null;

      const messages = DEMO_MESSAGES_BY_ITEM[itemId] || [];
      const lastMessage = messages[messages.length - 1];

      // スタッフ未読: readByStaff=falseのメッセージ数
      const unreadCountStaff = messages.filter((m) => !m.readByStaff).length;
      // 家族未読: readByFamily=falseのメッセージ数
      const unreadCountFamily = messages.filter((m) => !m.readByFamily).length;

      return {
        ...item,
        hasMessages: true,
        unreadCountStaff,
        unreadCountFamily,
        lastMessageAt: lastMessage?.createdAt,
        lastMessagePreview: lastMessage?.content?.slice(0, 30),
      } as CareItemWithChat;
    })
    .filter((item): item is CareItemWithChat => item !== null)
    .sort((a, b) => {
      // 最新メッセージ順にソート
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
}
