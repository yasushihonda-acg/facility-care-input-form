/**
 * チャット連携 型定義 (Phase 18)
 * @see docs/CHAT_INTEGRATION_SPEC.md
 */

import type { CareItem } from './careItem';

// === 列挙型 ===

/** メッセージタイプ */
export type MessageType = 'text' | 'record' | 'system';

/** 送信者タイプ */
export type SenderType = 'staff' | 'family';

/** 通知タイプ */
export type NotificationType = 'new_message' | 'record_added' | 'item_expiring';

/** 通知対象タイプ */
export type NotificationTargetType = 'staff' | 'family' | 'both';

// === インターフェース ===

/**
 * チャットメッセージ
 * Firestore: care_items/{itemId}/messages/{messageId}
 */
export interface ChatMessage {
  id: string;
  type: MessageType;

  // 送信者情報
  senderType: SenderType;
  senderName: string;

  // メッセージ内容
  content: string;
  recordData?: {
    itemId?: string;
    itemName: string;
    servedQuantity: number;
    unit?: string;
    consumptionStatus: string;
    consumptionRate?: number;
    note?: string;
    noteToFamily?: string;
    followedInstruction?: boolean;
    instructionNote?: string;
  };

  // 既読管理
  readByStaff: boolean;
  readByFamily: boolean;

  // 関連データ
  photoUrl?: string;
  linkedRecordId?: string;

  // メタ情報
  createdAt: string; // ISO8601
}

/**
 * 品物のチャット拡張フィールド
 */
export interface CareItemChatExtension {
  hasMessages: boolean;
  unreadCountStaff: number;
  unreadCountFamily: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
}

/** チャット対応の品物型 */
export type CareItemWithChat = CareItem & CareItemChatExtension;

/**
 * 通知
 * Firestore: residents/{residentId}/notifications/{notificationId}
 */
export interface ChatNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;

  targetType: NotificationTargetType;
  read: boolean;

  linkTo: string;
  relatedItemId?: string;
  relatedItemName?: string;

  createdAt: string; // ISO8601
}

// === APIリクエスト/レスポンス型 ===

/** メッセージ送信リクエスト */
export interface SendMessageRequest {
  residentId: string;
  itemId: string;
  senderType: SenderType;
  senderName: string;
  content: string;
  type?: MessageType;
  photoUrl?: string;
}

/** メッセージ送信レスポンス */
export interface SendMessageResponse {
  messageId: string;
  createdAt: string;
}

/** メッセージ取得リクエスト */
export interface GetMessagesRequest {
  residentId: string;
  itemId: string;
  limit?: number;
  before?: string;
}

/** メッセージ取得レスポンス */
export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

/** 既読マークリクエスト */
export interface MarkAsReadRequest {
  residentId: string;
  itemId: string;
  readerType: SenderType;
}

/** 既読マークレスポンス */
export interface MarkAsReadResponse {
  markedCount: number;
}

/** 通知取得リクエスト */
export interface GetNotificationsRequest {
  residentId: string;
  targetType: SenderType;
  limit?: number;
  unreadOnly?: boolean;
}

/** 通知取得レスポンス */
export interface GetNotificationsResponse {
  notifications: ChatNotification[];
  unreadCount: number;
}

/** アクティブチャット一覧取得リクエスト */
export interface GetActiveChatItemsRequest {
  residentId: string;
  userType: SenderType;
  limit?: number;
}

/** アクティブチャット一覧取得レスポンス */
export interface GetActiveChatItemsResponse {
  items: CareItemWithChat[];
  total: number;
}

// === ユーティリティ ===

/** メッセージの日時をフォーマット */
export function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 送信者タイプのラベル */
export const SENDER_TYPE_LABELS: Record<SenderType, string> = {
  staff: 'スタッフ',
  family: '家族',
};

/** 通知タイプのラベル・アイコン */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; icon: string }> = {
  new_message: { label: '新しいメッセージ', icon: '💬' },
  record_added: { label: '記録が追加されました', icon: '📝' },
  item_expiring: { label: '期限が近づいています', icon: '⚠️' },
};

// =============================================================================
// AIチャットボット (Phase 45: 記録閲覧ページ)
// =============================================================================

/** AIチャットメッセージ（会話履歴用） */
export interface RecordChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** AIチャットリクエスト */
export interface ChatWithRecordsRequest {
  message: string;
  context: {
    sheetName?: string;
    year?: number;
    month?: number | null;
  };
  conversationHistory?: RecordChatMessage[];
}

/** AIチャットレスポンス */
export interface ChatWithRecordsResponse {
  message: string;
  sources?: { sheetName: string; recordCount: number }[];
  suggestedQuestions?: string[];
}

/** サンプル質問 */
export const SAMPLE_QUESTIONS = [
  { icon: '💊', text: '頓服と排泄の関係について教えて' },
  { icon: '🍽️', text: '最近の食事摂取量の傾向は？' },
  { icon: '❤️', text: '今月のバイタルに異常はありますか？' },
  { icon: '💧', text: '水分摂取が少ない日はいつですか？' },
];
