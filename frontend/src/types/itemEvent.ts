/**
 * 品物イベント型定義
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション9.4 - 編集履歴タイムライン
 */

/**
 * イベントタイプ
 * - created: 品物登録
 * - updated: 品物編集
 * - deleted: 品物削除
 * - served: 提供・消費
 * - status_changed: ステータス変更
 */
export type ItemEventType = 'created' | 'updated' | 'deleted' | 'served' | 'status_changed';

/**
 * 編集変更内容
 */
export interface ItemEventChange {
  field: string;      // 変更されたフィールド名
  fieldLabel: string; // 日本語フィールド名
  oldValue: string;   // 変更前の値
  newValue: string;   // 変更後の値
}

/**
 * 品物イベント
 */
export interface ItemEvent {
  id: string;
  itemId: string;
  eventType: ItemEventType;
  eventAt: string;           // ISO 8601形式
  performedBy?: string;      // 実行者名
  description?: string;      // イベント説明
  changes?: ItemEventChange[]; // 編集時の変更内容（eventType=updated時のみ）
  metadata?: Record<string, unknown>; // その他メタデータ
}

/**
 * イベントタイプごとのアイコン
 */
export function getEventTypeIcon(eventType: ItemEventType): string {
  switch (eventType) {
    case 'created':
      return '📦';
    case 'updated':
      return '✏️';
    case 'deleted':
      return '🗑️';
    case 'served':
      return '🍽️';
    case 'status_changed':
      return '🔄';
    default:
      return '📋';
  }
}

/**
 * イベントタイプごとのラベル
 */
export function getEventTypeLabel(eventType: ItemEventType): string {
  switch (eventType) {
    case 'created':
      return '品物登録';
    case 'updated':
      return '品物編集';
    case 'deleted':
      return '品物削除';
    case 'served':
      return '提供';
    case 'status_changed':
      return 'ステータス変更';
    default:
      return 'その他';
  }
}
