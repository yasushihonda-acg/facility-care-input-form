/**
 * 統計データ取得API (Phase 8.3)
 * @see docs/STATS_DASHBOARD_SPEC.md
 */

import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {getTodayString} from "../utils/scheduleUtils";
import type {
  GetStatsRequest,
  GetStatsResponse,
  ItemStatsData,
  ItemStatsSummary,
  CategoryDistribution,
  ExpirationCalendarEntry,
  Alert,
  AlertType,
  AlertSeverity,
  CareItem,
  ItemCategory,
} from "../types";

const CARE_ITEMS_COLLECTION = "care_items";
const DISMISSED_ALERTS_COLLECTION = "dismissed_alerts";

/**
 * 日付文字列から日数差を計算（日本時間）
 */
function getDaysUntil(dateString: string): number {
  const todayStr = getTodayString();
  const today = new Date(todayStr);
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 品物統計データを計算
 */
async function calculateItemStats(
  db: FirebaseFirestore.Firestore,
  residentId?: string
): Promise<ItemStatsData> {
  // 品物データを取得
  let query: FirebaseFirestore.Query = db.collection(CARE_ITEMS_COLLECTION);
  if (residentId) {
    query = query.where("residentId", "==", residentId);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as CareItem));

  // サマリ計算
  const summary: ItemStatsSummary = {
    totalItems: items.length,
    pendingItems: items.filter((i) => i.status === "pending").length,
    servedItems: items.filter((i) => i.status === "served").length,
    consumedItems: items.filter((i) => i.status === "consumed").length,
    expiringToday: 0,
    expiringIn3Days: 0,
  };

  // 賞味期限カウント
  items.forEach((item) => {
    if (item.expirationDate && item.status === "pending") {
      const daysUntil = getDaysUntil(item.expirationDate);
      if (daysUntil === 0) {
        summary.expiringToday++;
      } else if (daysUntil > 0 && daysUntil <= 3) {
        summary.expiringIn3Days++;
      }
    }
  });

  // カテゴリ別分布
  const categoryCount: Record<string, number> = {};
  items.forEach((item) => {
    const cat = item.category || "other";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const categoryDistribution: CategoryDistribution[] = Object.entries(categoryCount)
    .map(([category, count]) => ({
      category: category as ItemCategory,
      count,
      percentage: items.length > 0 ? Math.round((count / items.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 賞味期限カレンダー（今後7日間）
  const expirationCalendar: ExpirationCalendarEntry[] = [];
  const calendarMap: Map<string, ExpirationCalendarEntry["items"]> = new Map();

  items.forEach((item) => {
    if (item.expirationDate && item.status === "pending") {
      const daysUntil = getDaysUntil(item.expirationDate);
      if (daysUntil >= 0 && daysUntil <= 7) {
        if (!calendarMap.has(item.expirationDate)) {
          calendarMap.set(item.expirationDate, []);
        }
        calendarMap.get(item.expirationDate)!.push({
          id: item.id,
          itemName: item.itemName,
          daysUntil,
        });
      }
    }
  });

  // 日付順にソート
  const sortedDates = Array.from(calendarMap.keys()).sort();
  sortedDates.forEach((date) => {
    expirationCalendar.push({
      date,
      items: calendarMap.get(date)!,
    });
  });

  return {
    summary,
    categoryDistribution,
    expirationCalendar,
  };
}

/**
 * アラートを生成
 */
async function generateAlerts(
  db: FirebaseFirestore.Firestore,
  residentId?: string
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const today = getTodayString();

  // Phase 63: 確認済みアラートIDを取得
  const dismissedSnapshot = await db.collection(DISMISSED_ALERTS_COLLECTION).get();
  const dismissedAlertIds = new Set(
    dismissedSnapshot.docs.map((doc) => doc.data().alertId as string)
  );

  // 品物データを取得
  let query: FirebaseFirestore.Query = db.collection(CARE_ITEMS_COLLECTION);
  if (residentId) {
    query = query.where("residentId", "==", residentId);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()} as CareItem));

  items.forEach((item) => {
    if (item.expirationDate && item.status === "pending") {
      const daysUntil = getDaysUntil(item.expirationDate);

      // 本日期限
      if (daysUntil === 0) {
        alerts.push({
          id: `alert-exp-today-${item.id}`,
          type: "expiration_today" as AlertType,
          severity: "urgent" as AlertSeverity,
          title: `${item.itemName}の賞味期限が本日です`,
          description: `期限: ${item.expirationDate}  残: ${item.remainingQuantity}${item.unit}`,
          relatedItemId: item.id,
          createdAt: today,
        });
      } else if (daysUntil > 0 && daysUntil <= 3) {
        // 3日以内期限
        alerts.push({
          id: `alert-exp-soon-${item.id}`,
          type: "expiration_soon" as AlertType,
          severity: "warning" as AlertSeverity,
          title: `${item.itemName}の賞味期限が${daysUntil}日以内です`,
          description: `期限: ${item.expirationDate}  残: ${item.remainingQuantity}${item.unit}`,
          relatedItemId: item.id,
          createdAt: today,
        });
      }
    }

    // 在庫少（数量管理する品物のみ）
    if (item.status === "pending" && item.remainingQuantity != null && item.remainingQuantity <= 1) {
      alerts.push({
        id: `alert-low-stock-${item.id}`,
        type: "low_stock" as AlertType,
        severity: "warning" as AlertSeverity,
        title: `${item.itemName}の在庫が残り${item.remainingQuantity}${item.unit}です`,
        description: "補充を検討してください",
        relatedItemId: item.id,
        createdAt: today,
      });
    }
  });

  // Phase 63: 確認済みアラートを除外
  const filteredAlerts = alerts.filter((alert) => !dismissedAlertIds.has(alert.id));

  // 重要度でソート
  const severityOrder: Record<AlertSeverity, number> = {
    urgent: 0,
    warning: 1,
    info: 2,
  };

  return filteredAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * 統計データ取得API
 * GET /getStats
 */
export const getStats = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(async (req, res) => {
    // CORS設定
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({
        success: false,
        error: {code: "METHOD_NOT_ALLOWED", message: "Only GET allowed"},
      });
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      // クエリパラメータ取得
      const params: GetStatsRequest = {
        residentId: req.query.residentId as string | undefined,
        startDate: (req.query.startDate as string) || getTodayString(),
        endDate: (req.query.endDate as string) || getTodayString(),
        include: req.query.include ?
          ((req.query.include as string).split(",") as GetStatsRequest["include"]) :
          ["items", "alerts"],
      };

      functions.logger.info("getStats request", {params});

      const db = getFirestore();
      const response: GetStatsResponse = {
        period: {
          start: params.startDate,
          end: params.endDate,
        },
      };

      // 品物統計
      if (params.include?.includes("items")) {
        response.itemStats = await calculateItemStats(db, params.residentId);
      }

      // アラート
      if (params.include?.includes("alerts")) {
        response.alerts = await generateAlerts(db, params.residentId);
      }

      // TODO: 摂食統計・食事統計は将来実装
      // if (params.include?.includes("consumption")) { ... }
      // if (params.include?.includes("meals")) { ... }

      functions.logger.info("getStats completed", {
        itemStats: response.itemStats?.summary,
        alertCount: response.alerts?.length,
      });

      res.status(200).json({
        success: true,
        data: response,
        timestamp,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("getStats error", {error: errorMsg});

      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
        timestamp,
      });
    }
  });
