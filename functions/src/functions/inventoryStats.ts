/**
 * 在庫サマリー・食品統計API (Phase 9.3)
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md セクション4.3, 4.4
 * @see docs/STATS_DASHBOARD_SPEC.md
 */

import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import type {
  CareItem,
  ItemStatus,
  ItemCategory,
  InventorySummaryItem,
  InventorySummaryTotals,
  GetInventorySummaryResponse,
  FoodRankingItem,
  CategoryStats,
  GetFoodStatsResponse,
  ConsumptionLog,
} from "../types";

const CARE_ITEMS_COLLECTION = "care_items";

/**
 * 日付文字列から日数差を計算
 */
function getDaysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 在庫サマリーを計算
 */
async function calculateInventorySummary(
  db: FirebaseFirestore.Firestore,
  residentId?: string,
  statusFilter?: ItemStatus | ItemStatus[],
  includeExpiringSoon?: boolean
): Promise<GetInventorySummaryResponse> {
  // 品物データを取得
  let query: FirebaseFirestore.Query = db.collection(CARE_ITEMS_COLLECTION);
  if (residentId) {
    query = query.where("residentId", "==", residentId);
  }

  // ステータスフィルタ
  if (statusFilter) {
    const statuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
    if (statuses.length === 1) {
      query = query.where("status", "==", statuses[0]);
    } else if (statuses.length > 1) {
      query = query.where("status", "in", statuses);
    }
  }

  const snapshot = await query.get();
  // Phase 65: doc.idを含めてマッピング（item.id欠落バグ修正）
  const items = snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  } as CareItem));

  // 各品物の最新消費ログを取得し、サマリーを構築
  const summaryItems: InventorySummaryItem[] = [];
  const totals: InventorySummaryTotals = {
    totalItems: 0,
    pendingCount: 0,
    inProgressCount: 0,
    consumedCount: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
  };

  for (const item of items) {
    // 期限情報を計算
    const daysUntilExpiration = item.expirationDate ? getDaysUntil(item.expirationDate) : undefined;
    const isExpired = daysUntilExpiration !== undefined && daysUntilExpiration < 0;
    const isExpiringSoon = daysUntilExpiration !== undefined &&
                           daysUntilExpiration >= 0 &&
                           daysUntilExpiration <= 3;

    // includeExpiringSoonフィルタ
    if (includeExpiringSoon && !isExpiringSoon && !isExpired) {
      continue;
    }

    // 数量情報
    const initialQty = item.initialQuantity ?? item.quantity ?? 1;
    const currentQty = item.currentQuantity ?? item.remainingQuantity ?? initialQty;
    const consumedQty = initialQty - currentQty;
    const consumptionPct = initialQty > 0 ? Math.round((consumedQty / initialQty) * 100) : 0;

    // 消費サマリ情報
    const avgConsumptionRate = item.consumptionSummary?.avgConsumptionRate ?? item.consumptionRate ?? 0;
    const totalServings = item.consumptionSummary?.totalServed ?? (item.actualServeDate ? 1 : 0);

    // 最新のノート情報を取得（サブコレクションから）
    let latestNoteToFamily: string | undefined;
    let latestNoteDate: string | undefined;

    // 消費ログから最新のnoteToFamilyを取得
    try {
      const logsSnapshot = await db
        .collection(CARE_ITEMS_COLLECTION)
        .doc(item.id)
        .collection("consumption_logs")
        .orderBy("recordedAt", "desc")
        .limit(1)
        .get();

      if (!logsSnapshot.empty) {
        const latestLog = logsSnapshot.docs[0].data() as ConsumptionLog;
        if (latestLog.noteToFamily) {
          latestNoteToFamily = latestLog.noteToFamily;
          latestNoteDate = latestLog.servedDate;
        }
      }
    } catch {
      // サブコレクションがない場合は無視
    }

    // 旧フィールドからのフォールバック
    if (!latestNoteToFamily && item.noteToFamily) {
      latestNoteToFamily = item.noteToFamily;
      latestNoteDate = item.actualServeDate;
    }

    summaryItems.push({
      itemId: item.id,
      itemName: item.itemName,
      category: item.category,
      initialQuantity: initialQty,
      currentQuantity: currentQty,
      unit: item.unit,
      consumedQuantity: consumedQty,
      consumptionPercentage: consumptionPct,
      expirationDate: item.expirationDate,
      daysUntilExpiration,
      isExpiringSoon,
      isExpired,
      avgConsumptionRate,
      totalServings,
      status: item.status,
      latestNoteToFamily,
      latestNoteDate,
    });

    // 集計カウント
    totals.totalItems++;
    switch (item.status) {
    case "pending":
      totals.pendingCount++;
      break;
    case "in_progress":
      totals.inProgressCount++;
      break;
    case "consumed":
      totals.consumedCount++;
      break;
    case "expired":
      totals.expiredCount++;
      break;
    }
    if (isExpiringSoon) {
      totals.expiringSoonCount++;
    }
  }

  // 期限順でソート（期限が近い順）
  summaryItems.sort((a, b) => {
    // 期限なしは後ろに
    if (a.daysUntilExpiration === undefined && b.daysUntilExpiration === undefined) return 0;
    if (a.daysUntilExpiration === undefined) return 1;
    if (b.daysUntilExpiration === undefined) return -1;
    return a.daysUntilExpiration - b.daysUntilExpiration;
  });

  return {items: summaryItems, totals};
}

/**
 * 食品統計を計算
 */
async function calculateFoodStats(
  db: FirebaseFirestore.Firestore,
  residentId?: string,
  limit = 5
): Promise<GetFoodStatsResponse> {
  // 品物データを取得
  let query: FirebaseFirestore.Query = db.collection(CARE_ITEMS_COLLECTION);
  if (residentId) {
    query = query.where("residentId", "==", residentId);
  }

  const snapshot = await query.get();
  // Phase 65: doc.idを含めてマッピング（item.id欠落バグ修正）
  const items = snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  } as CareItem));

  // 品目名でグループ化して統計を計算
  const foodStatsMap = new Map<string, {
    totalServings: number;
    totalRate: number;
    wastedQuantity: number;
  }>();

  // カテゴリ別統計
  const categoryStatsMap = new Map<ItemCategory, {
    totalItems: number;
    totalServings: number;
    totalRate: number;
  }>();

  for (const item of items) {
    // 統計用名称: normalizedName優先、未設定時はitemNameにフォールバック
    const name = item.normalizedName || item.itemName;
    const category = item.category;
    const consumptionRate = item.consumptionSummary?.avgConsumptionRate ?? item.consumptionRate ?? 0;
    const servings = item.consumptionSummary?.totalServed ?? (item.actualServeDate ? 1 : 0);
    const initialQty = item.initialQuantity ?? item.quantity ?? 1;
    const currentQty = item.currentQuantity ?? item.remainingQuantity ?? initialQty;
    const consumedQty = item.consumptionSummary?.totalConsumedQuantity ??
                        (servings > 0 ? (initialQty - currentQty) : 0);
    const servedQty = item.consumptionSummary?.totalServedQuantity ?? item.servedQuantity ?? 0;
    const wastedQty = servedQty > 0 ? servedQty - consumedQty : 0;

    // 品目別統計
    if (servings > 0) {
      const existing = foodStatsMap.get(name) || {totalServings: 0, totalRate: 0, wastedQuantity: 0};
      existing.totalServings += servings;
      existing.totalRate += consumptionRate * servings;
      existing.wastedQuantity += wastedQty;
      foodStatsMap.set(name, existing);
    }

    // カテゴリ別統計
    const catStats = categoryStatsMap.get(category) || {totalItems: 0, totalServings: 0, totalRate: 0};
    catStats.totalItems++;
    catStats.totalServings += servings;
    if (servings > 0) {
      catStats.totalRate += consumptionRate * servings;
    }
    categoryStatsMap.set(category, catStats);
  }

  // 品目別ランキングを計算
  const foodRankings: FoodRankingItem[] = [];
  for (const [foodName, stats] of foodStatsMap) {
    if (stats.totalServings > 0) {
      foodRankings.push({
        foodName,
        avgConsumptionRate: Math.round(stats.totalRate / stats.totalServings),
        totalServings: stats.totalServings,
        wastedQuantity: stats.wastedQuantity,
      });
    }
  }

  // 摂食率でソート
  foodRankings.sort((a, b) => b.avgConsumptionRate - a.avgConsumptionRate);

  // よく食べる品目 TOP N
  const mostPreferred = foodRankings.slice(0, limit);

  // よく残す品目 TOP N（摂食率が低い順）
  const leastPreferred = [...foodRankings]
    .sort((a, b) => a.avgConsumptionRate - b.avgConsumptionRate)
    .slice(0, limit);

  // カテゴリ別統計
  const categoryStats: CategoryStats[] = [];
  for (const [category, stats] of categoryStatsMap) {
    categoryStats.push({
      category,
      avgConsumptionRate: stats.totalServings > 0 ?
        Math.round(stats.totalRate / stats.totalServings) : 0,
      totalItems: stats.totalItems,
      totalServings: stats.totalServings,
    });
  }

  // 提供回数でソート
  categoryStats.sort((a, b) => b.totalServings - a.totalServings);

  return {
    mostPreferred,
    leastPreferred,
    categoryStats,
  };
}

/**
 * 在庫サマリー取得API
 * GET /getInventorySummary
 */
export const getInventorySummary = functions
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
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
      const residentId = req.query.residentId as string | undefined;
      const statusParam = req.query.status as string | undefined;
      const includeExpiringSoon = req.query.includeExpiringSoon === "true";

      let statusFilter: ItemStatus | ItemStatus[] | undefined;
      if (statusParam) {
        if (statusParam.includes(",")) {
          statusFilter = statusParam.split(",") as ItemStatus[];
        } else {
          statusFilter = statusParam as ItemStatus;
        }
      }

      functions.logger.info("getInventorySummary request", {
        residentId,
        statusFilter,
        includeExpiringSoon,
      });

      const db = getFirestore();
      const result = await calculateInventorySummary(
        db,
        residentId,
        statusFilter,
        includeExpiringSoon
      );

      functions.logger.info("getInventorySummary completed", {
        totalItems: result.totals.totalItems,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("getInventorySummary error", {error: errorMsg});

      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
        timestamp,
      });
    }
  });

/**
 * 食品統計取得API
 * GET /getFoodStats
 */
export const getFoodStats = functions
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
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
      const residentId = req.query.residentId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;

      functions.logger.info("getFoodStats request", {residentId, limit});

      const db = getFirestore();
      const result = await calculateFoodStats(db, residentId, limit);

      functions.logger.info("getFoodStats completed", {
        mostPreferredCount: result.mostPreferred.length,
        categoryStatsCount: result.categoryStats.length,
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("getFoodStats error", {error: errorMsg});

      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
        timestamp,
      });
    }
  });
