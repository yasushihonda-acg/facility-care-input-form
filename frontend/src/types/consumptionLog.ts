/**
 * 消費ログ 型定義
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md
 */

import type { ConsumptionStatus } from './careItem';

// ConsumptionStatusを再エクスポート（他モジュールで使用可能に）
export type { ConsumptionStatus } from './careItem';

// === 列挙型 ===

// 食事時間帯
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TIMES: { value: MealTime; label: string }[] = [
  { value: 'breakfast', label: '朝食' },
  { value: 'lunch', label: '昼食' },
  { value: 'dinner', label: '夕食' },
  { value: 'snack', label: '間食' },
];

// === インターフェース ===

/**
 * 消費ログ（Firestore: care_items/{itemId}/consumption_logs/{logId}）
 * スタッフが記録する提供・摂食の履歴
 */
export interface ConsumptionLog {
  // 識別情報
  id: string;
  itemId: string;

  // 提供情報
  servedDate: string;              // YYYY-MM-DD
  servedTime?: string;             // HH:mm
  mealTime?: MealTime;
  servedQuantity: number;
  servedBy: string;

  // 摂食情報
  consumedQuantity: number;
  consumptionRate: number;         // 0-100
  consumptionStatus: ConsumptionStatus;

  // 残量情報
  quantityBefore: number;
  quantityAfter: number;

  // 特記事項・申し送り
  consumptionNote?: string;
  noteToFamily?: string;

  // メタ情報
  recordedBy: string;
  recordedAt: string;              // ISO8601
  updatedAt?: string;              // ISO8601
  updatedBy?: string;
}

/**
 * 消費サマリー（CareItemに埋め込み）
 * パフォーマンス用キャッシュ
 */
export interface ConsumptionSummary {
  totalServed: number;             // 累計提供回数
  totalServedQuantity: number;     // 累計提供量
  totalConsumedQuantity: number;   // 累計消費量
  avgConsumptionRate: number;      // 平均摂食率
  lastServedDate?: string;         // 最終提供日
  lastServedBy?: string;           // 最終提供者
}

// === APIリクエスト/レスポンス型 ===

/**
 * 消費ログ記録リクエスト
 */
export interface RecordConsumptionLogRequest {
  itemId: string;
  servedDate: string;              // YYYY-MM-DD
  servedTime?: string;             // HH:mm
  mealTime?: MealTime;
  servedQuantity: number;
  servedBy: string;
  consumedQuantity: number;
  consumptionStatus: ConsumptionStatus;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
}

/**
 * 消費ログ記録レスポンス（APIのdata部分）
 * 注: API全体のレスポンスはApiResponse<RecordConsumptionLogResponse>
 */
export interface RecordConsumptionLogResponse {
  logId: string;
  itemId: string;
  currentQuantity: number;       // 更新後の残量
  status: string;                // 更新後のステータス
}

/**
 * 消費ログ一覧取得リクエスト
 */
export interface GetConsumptionLogsRequest {
  itemId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/**
 * 消費ログ一覧取得レスポンス（APIのdata部分）
 * 注: API全体のレスポンスはApiResponse<GetConsumptionLogsResponse>
 */
export interface GetConsumptionLogsResponse {
  logs: ConsumptionLog[];
  total: number;
}

// === ユーティリティ関数 ===

/**
 * 食事時間帯のラベルを取得
 */
export function getMealTimeLabel(mealTime: MealTime): string {
  return MEAL_TIMES.find(m => m.value === mealTime)?.label ?? mealTime;
}

/**
 * 消費数量から摂食率を自動計算
 */
export function calculateConsumptionRate(
  consumedQuantity: number,
  servedQuantity: number
): number {
  if (servedQuantity <= 0) return 0;
  return Math.round((consumedQuantity / servedQuantity) * 100);
}

/**
 * 摂食率から摂食状況を自動判定
 */
export function determineConsumptionStatus(rate: number): ConsumptionStatus {
  if (rate >= 100) return 'full';
  if (rate >= 80) return 'most';
  if (rate >= 50) return 'half';
  if (rate > 0) return 'little';
  return 'none';
}

/**
 * 初期の消費サマリーを作成
 */
export function createInitialConsumptionSummary(): ConsumptionSummary {
  return {
    totalServed: 0,
    totalServedQuantity: 0,
    totalConsumedQuantity: 0,
    avgConsumptionRate: 0,
  };
}
