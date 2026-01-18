/**
 * plan_data インメモリキャッシュサービス (Phase 45.1)
 *
 * Cloud Functionsのウォームインスタンスで再利用されるメモリキャッシュ。
 * Firestoreクエリを省略し、RAGの応答時間を3-5秒短縮。
 *
 * 特徴:
 * - TTL: 5分（データの鮮度とパフォーマンスのバランス）
 * - コールドスタート時は自動でFirestoreから取得
 * - syncPlanData実行時にキャッシュを無効化可能
 */

import * as functions from "firebase-functions";
import {getPlanData} from "./firestoreService";

interface CachedPlanData {
  records: unknown[];
  cachedAt: number;
  totalCount: number;
}

// キャッシュ設定
const CACHE_TTL_MS = 5 * 60 * 1000; // 5分
const DEFAULT_CACHE_LIMIT = 2000; // キャッシュ取得時のデフォルト件数

// インメモリキャッシュ（Cloud Functionsインスタンス間で共有されない）
let planDataCache: CachedPlanData | null = null;

/**
 * キャッシュからplan_dataを取得（キャッシュミス時はFirestoreから取得）
 */
export async function getCachedPlanData(
  options: { forceRefresh?: boolean; limit?: number } = {}
): Promise<{ records: unknown[]; fromCache: boolean; cacheAge?: number }> {
  const now = Date.now();

  // キャッシュヒット判定
  if (
    !options.forceRefresh &&
    planDataCache &&
    now - planDataCache.cachedAt < CACHE_TTL_MS
  ) {
    const cacheAge = Math.round((now - planDataCache.cachedAt) / 1000);
    const requestedLimit = options.limit || DEFAULT_CACHE_LIMIT;
    // リクエストされたlimitに応じてキャッシュからsliceして返す
    const records = requestedLimit < planDataCache.records.length
      ? planDataCache.records.slice(0, requestedLimit)
      : planDataCache.records;
    functions.logger.info("planDataCache HIT", {
      cacheAge: `${cacheAge}s`,
      cachedRecordCount: planDataCache.records.length,
      returnedRecordCount: records.length,
      requestedLimit,
    });
    return {
      records,
      fromCache: true,
      cacheAge,
    };
  }

  // キャッシュミス: Firestoreから取得
  // 常に最大件数でキャッシュを構築し、返す時にlimitを適用
  functions.logger.info("planDataCache MISS - fetching from Firestore");
  const startTime = Date.now();
  const requestedLimit = options.limit || DEFAULT_CACHE_LIMIT;

  const result = await getPlanData({
    limit: DEFAULT_CACHE_LIMIT, // 常に最大件数で取得
  });

  const fetchDuration = Date.now() - startTime;

  // キャッシュ更新
  planDataCache = {
    records: result.records,
    cachedAt: now,
    totalCount: result.totalCount,
  };

  // リクエストされたlimitに応じてsliceして返す
  const records = requestedLimit < result.records.length
    ? result.records.slice(0, requestedLimit)
    : result.records;

  functions.logger.info("planDataCache updated", {
    cachedRecordCount: result.records.length,
    returnedRecordCount: records.length,
    requestedLimit,
    fetchDuration: `${fetchDuration}ms`,
  });

  return {
    records,
    fromCache: false,
  };
}

/**
 * キャッシュを無効化（syncPlanData後に呼び出し）
 */
export function invalidatePlanDataCache(): void {
  if (planDataCache) {
    functions.logger.info("planDataCache invalidated");
    planDataCache = null;
  }
}

/**
 * キャッシュ統計を取得
 */

interface CacheStats {
  isCached: boolean;
  cacheAge: number | null;
  recordCount: number | null;
  ttlRemaining: number | null;
}

export function getCacheStats(): CacheStats {
  if (!planDataCache) {
    return {
      isCached: false,
      cacheAge: null,
      recordCount: null,
      ttlRemaining: null,
    };
  }

  const now = Date.now();
  const age = now - planDataCache.cachedAt;
  const ttlRemaining = Math.max(0, CACHE_TTL_MS - age);

  return {
    isCached: true,
    cacheAge: Math.round(age / 1000),
    recordCount: planDataCache.records.length,
    ttlRemaining: Math.round(ttlRemaining / 1000),
  };
}
