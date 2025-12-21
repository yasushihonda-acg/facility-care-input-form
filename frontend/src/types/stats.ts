/**
 * 統計ダッシュボード型定義 (Phase 8.3)
 * @see docs/STATS_DASHBOARD_SPEC.md
 */

import type { ItemCategory } from './careItem';

// =============================================================================
// アラート関連
// =============================================================================

/** アラート種別 */
export type AlertType =
  | 'expiration_today'
  | 'expiration_soon'
  | 'low_stock'
  | 'out_of_stock'
  | 'consumption_decline'
  | 'no_recent_record';

/** アラート重要度 */
export type AlertSeverity = 'urgent' | 'warning' | 'info';

/** アラート */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  relatedItemId?: string;
  createdAt: string;
}

// =============================================================================
// 品物統計関連
// =============================================================================

/** 品物状況サマリ */
export interface ItemStatsSummary {
  totalItems: number;
  pendingItems: number;
  servedItems: number;
  consumedItems: number;
  expiringToday: number;
  expiringIn3Days: number;
}

/** カテゴリ別分布 @deprecated Phase 32で品物別分布に変更 */
export interface CategoryDistribution {
  category: ItemCategory;
  count: number;
  percentage: number;
}

/** 品物別分布 (Phase 32) */
export interface ItemDistribution {
  id: string;
  itemName: string;
  unit: string;
  consumedQuantity: number;
  initialQuantity: number;
  consumptionPercentage: number;
}

/** 賞味期限カレンダーエントリ */
export interface ExpirationCalendarEntry {
  date: string;
  items: {
    id: string;
    itemName: string;
    daysUntil: number;
  }[];
}

/** 品物統計データ */
export interface ItemStatsData {
  summary: ItemStatsSummary;
  /** @deprecated Phase 32で itemDistribution に変更 */
  categoryDistribution?: CategoryDistribution[];
  /** 品物別分布 (Phase 32) */
  itemDistribution?: ItemDistribution[];
  expirationCalendar: ExpirationCalendarEntry[];
}

// =============================================================================
// 摂食統計関連
// =============================================================================

/** 摂食傾向サマリ */
export interface ConsumptionStatsSummary {
  averageRate: number;
  weeklyChange: number;
  totalRecords: number;
}

/** 品目ランキングアイテム */
export interface ItemRankingEntry {
  itemName: string;
  averageRate: number;
  count: number;
  suggestion?: string;
}

/** 摂食統計データ */
export interface ConsumptionStatsData {
  summary: ConsumptionStatsSummary;
  topItems: ItemRankingEntry[];
  bottomItems: ItemRankingEntry[];
}

// =============================================================================
// 食事統計関連
// =============================================================================

/** 食事統計サマリ */
export interface MealStatsSummary {
  totalRecords: number;
  mainDish: {
    high: number;
    medium: number;
    low: number;
  };
  sideDish: {
    high: number;
    medium: number;
    low: number;
  };
}

/** 食事統計データ */
export interface MealStatsData {
  summary: MealStatsSummary;
}

// =============================================================================
// API関連
// =============================================================================

/** 統計データ取得リクエスト */
export interface GetStatsRequest {
  residentId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  include?: ('items' | 'consumption' | 'meals' | 'alerts')[];
}

/** 統計データ取得レスポンス */
export interface GetStatsResponse {
  period: {
    start: string;
    end: string;
  };
  itemStats?: ItemStatsData;
  consumptionStats?: ConsumptionStatsData;
  mealStats?: MealStatsData;
  alerts?: Alert[];
}

// =============================================================================
// ユーティリティ
// =============================================================================

/** アラート種別ラベル */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  expiration_today: '本日期限',
  expiration_soon: '期限間近',
  low_stock: '在庫少',
  out_of_stock: '在庫切れ',
  consumption_decline: '摂食率低下',
  no_recent_record: '記録なし',
};

/** アラート重要度ラベル */
export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  urgent: '緊急',
  warning: '注意',
  info: '情報',
};

/** アラート重要度の色クラス */
export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, { bg: string; text: string; border: string }> = {
  urgent: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  warning: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
};

// =============================================================================
// 在庫サマリー (Phase 9.3)
// =============================================================================

import type { ItemStatus } from './careItem';

/** 在庫サマリーアイテム */
export interface InventorySummaryItem {
  itemId: string;
  itemName: string;
  category: ItemCategory;
  initialQuantity: number;
  currentQuantity: number;
  unit: string;
  consumedQuantity: number;
  consumptionPercentage: number;
  expirationDate?: string;
  daysUntilExpiration?: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  avgConsumptionRate: number;
  totalServings: number;
  status: ItemStatus;
  latestNoteToFamily?: string;
  latestNoteDate?: string;
}

/** 在庫サマリー集計 */
export interface InventorySummaryTotals {
  totalItems: number;
  pendingCount: number;
  inProgressCount: number;
  consumedCount: number;
  expiredCount: number;
  expiringSoonCount: number;
}

/** 在庫サマリー取得レスポンス */
export interface GetInventorySummaryResponse {
  items: InventorySummaryItem[];
  totals: InventorySummaryTotals;
}

// =============================================================================
// 食品統計 (Phase 9.3)
// =============================================================================

/** 食品ランキングアイテム */
export interface FoodRankingItem {
  foodName: string;
  avgConsumptionRate: number;
  totalServings: number;
  wastedQuantity?: number;
}

/** カテゴリ別統計 */
export interface CategoryStats {
  category: ItemCategory;
  avgConsumptionRate: number;
  totalItems: number;
  totalServings: number;
}

/** 食品統計取得レスポンス */
export interface GetFoodStatsResponse {
  mostPreferred: FoodRankingItem[];
  leastPreferred: FoodRankingItem[];
  categoryStats: CategoryStats[];
}

// =============================================================================
// 摂食傾向 (Phase 9.3)
// =============================================================================

/** 摂食率推移データポイント */
export interface ConsumptionTrendPoint {
  date: string;
  averageRate: number;
  recordCount: number;
}

/** 摂食傾向統計データ */
export interface ConsumptionTrendData {
  trend: ConsumptionTrendPoint[];
  topItems: ItemRankingEntry[];
  bottomItems: ItemRankingEntry[];
  mealTrend?: {
    mainDish: {
      high: number;
      medium: number;
      low: number;
    };
    sideDish: {
      high: number;
      medium: number;
      low: number;
    };
  };
  summary: ConsumptionStatsSummary;
}
