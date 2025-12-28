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
    functions.logger.info("planDataCache HIT", {
      cacheAge: `${cacheAge}s`,
      recordCount: planDataCache.records.length,
    });
    return {
      records: planDataCache.records,
      fromCache: true,
      cacheAge,
    };
  }

  // キャッシュミス: Firestoreから取得
  functions.logger.info("planDataCache MISS - fetching from Firestore");
  const startTime = Date.now();

  const result = await getPlanData({
    limit: options.limit || 2000,
  });

  const fetchDuration = Date.now() - startTime;

  // キャッシュ更新
  planDataCache = {
    records: result.records,
    cachedAt: now,
    totalCount: result.totalCount,
  };

  functions.logger.info("planDataCache updated", {
    recordCount: result.records.length,
    fetchDuration: `${fetchDuration}ms`,
  });

  return {
    records: result.records,
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
