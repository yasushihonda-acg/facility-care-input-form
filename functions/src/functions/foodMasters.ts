/**
 * FoodMaster 食品マスタ CRUD API (Phase 11)
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md セクション2.2
 */

import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import type {
  FoodMaster,
  FoodMasterInput,
  FoodMasterUpdateInput,
  FoodMasterStats,
  GetFoodMastersRequest,
  GetFoodMastersResponse,
  SearchFoodMasterRequest,
  ItemCategory,
} from "../types";

const firestore = getFirestore();
const COLLECTION = "food_masters";

// =============================================================================
// 初期統計データ
// =============================================================================

const INITIAL_STATS: FoodMasterStats = {
  totalServed: 0,
  totalConsumed: 0,
  avgConsumptionRate: 0,
  preferenceScore: 0,
  wasteRate: 0,
};

// =============================================================================
// GET /getFoodMasters - 食品マスタ一覧取得
// =============================================================================

export const getFoodMasters = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .https.onRequest(async (req, res) => {
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

    try {
      const {category, isActive, limit = 100, offset = 0} =
        req.query as unknown as GetFoodMastersRequest;

      let query = firestore.collection(COLLECTION).orderBy("name");

      // カテゴリフィルタ
      if (category) {
        query = query.where("category", "==", category);
      }

      // 有効フラグフィルタ（デフォルト: 有効のみ）
      // クエリパラメータは文字列として渡されるため、文字列として比較
      const isActiveStr = String(isActive);
      const activeFilter = isActiveStr !== "false";
      if (activeFilter) {
        query = query.where("isActive", "==", true);
      }

      // ページネーション
      const limitNum = Math.min(Number(limit) || 100, 500);
      const offsetNum = Number(offset) || 0;

      const snapshot = await query.offset(offsetNum).limit(limitNum + 1).get();

      const items: FoodMaster[] = snapshot.docs.slice(0, limitNum).map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          stats: {
            ...INITIAL_STATS,
            ...data.stats,
            lastUpdated: data.stats?.lastUpdated?.toDate?.()?.toISOString() ||
              data.stats?.lastUpdated,
          },
        } as FoodMaster;
      });

      const response: GetFoodMastersResponse = {
        items,
        total: items.length,
        hasMore: snapshot.docs.length > limitNum,
      };

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("getFoodMasters error", {error: errorMsg});
      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
      });
    }
  });

// =============================================================================
// GET /searchFoodMaster - 食品マスタ検索（名前・別名でマッチ）
// =============================================================================

export const searchFoodMaster = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .https.onRequest(async (req, res) => {
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

    try {
      const {query: searchQuery, category, limit = 10} =
        req.query as unknown as SearchFoodMasterRequest;

      if (!searchQuery || typeof searchQuery !== "string") {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "query is required"},
        });
        return;
      }

      const normalizedQuery = searchQuery.trim().toLowerCase();
      const limitNum = Math.min(Number(limit) || 10, 50);

      // 全件取得してフィルタ（Firestoreは部分一致検索が苦手なため）
      // 実運用では件数増加時にAlgoliaなどの検索エンジン導入を検討
      let baseQuery = firestore.collection(COLLECTION)
        .where("isActive", "==", true);

      if (category) {
        baseQuery = baseQuery.where("category", "==", category);
      }

      const snapshot = await baseQuery.get();

      const matches: FoodMaster[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();

        // 名前でマッチ
        const nameMatch = data.name?.toLowerCase().includes(normalizedQuery);

        // 別名でマッチ
        const aliasMatch = (data.aliases || []).some(
          (alias: string) => alias.toLowerCase().includes(normalizedQuery)
        );

        if (nameMatch || aliasMatch) {
          matches.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            stats: {
              ...INITIAL_STATS,
              ...data.stats,
              lastUpdated: data.stats?.lastUpdated?.toDate?.()?.toISOString() ||
                data.stats?.lastUpdated,
            },
          } as FoodMaster);

          if (matches.length >= limitNum) break;
        }
      }

      // 完全一致を優先
      matches.sort((a, b) => {
        const aExact = a.name.toLowerCase() === normalizedQuery;
        const bExact = b.name.toLowerCase() === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });

      res.status(200).json({
        success: true,
        data: {
          items: matches,
          total: matches.length,
          found: matches.length > 0,
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("searchFoodMaster error", {error: errorMsg});
      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
      });
    }
  });

// =============================================================================
// POST /createFoodMaster - 食品マスタ作成
// =============================================================================

export const createFoodMaster = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({
        success: false,
        error: {code: "METHOD_NOT_ALLOWED", message: "Only POST allowed"},
      });
      return;
    }

    try {
      const input = req.body as FoodMasterInput;

      // バリデーション
      if (!input.name || typeof input.name !== "string") {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "name is required"},
        });
        return;
      }

      if (!input.category) {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "category is required"},
        });
        return;
      }

      const now = Timestamp.now();

      const newFoodMaster: Omit<FoodMaster, "id"> = {
        name: input.name.trim(),
        aliases: input.aliases || [],
        category: input.category as ItemCategory,
        defaultUnit: input.defaultUnit || "個",
        defaultExpirationDays: input.defaultExpirationDays || 7,
        defaultStorageMethod: input.defaultStorageMethod || "room_temp",
        defaultServingMethods: input.defaultServingMethods || ["as_is"],
        careNotes: input.careNotes,
        allergyInfo: input.allergyInfo,
        stats: INITIAL_STATS,
        isActive: true,
        source: input.source || "manual",
        createdAt: now.toDate().toISOString(),
        updatedAt: now.toDate().toISOString(),
      };

      const docRef = await firestore.collection(COLLECTION).add({
        ...newFoodMaster,
        createdAt: now,
        updatedAt: now,
      });

      functions.logger.info("createFoodMaster success", {
        id: docRef.id,
        name: input.name,
      });

      res.status(201).json({
        success: true,
        data: {
          foodMasterId: docRef.id,
          createdAt: now.toDate().toISOString(),
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("createFoodMaster error", {error: errorMsg});
      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
      });
    }
  });

// =============================================================================
// PUT /updateFoodMaster - 食品マスタ更新
// =============================================================================

export const updateFoodMaster = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "PUT, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "PUT") {
      res.status(405).json({
        success: false,
        error: {code: "METHOD_NOT_ALLOWED", message: "Only PUT allowed"},
      });
      return;
    }

    try {
      const {foodMasterId, updates} = req.body as {
        foodMasterId: string;
        updates: FoodMasterUpdateInput;
      };

      if (!foodMasterId) {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "foodMasterId is required"},
        });
        return;
      }

      const docRef = firestore.collection(COLLECTION).doc(foodMasterId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          error: {code: "NOT_FOUND", message: "FoodMaster not found"},
        });
        return;
      }

      const now = Timestamp.now();

      // undefinedフィールドを除外
      const updateData: Record<string, unknown> = {
        updatedAt: now,
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.aliases !== undefined) updateData.aliases = updates.aliases;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.defaultUnit !== undefined) {
        updateData.defaultUnit = updates.defaultUnit;
      }
      if (updates.defaultExpirationDays !== undefined) {
        updateData.defaultExpirationDays = updates.defaultExpirationDays;
      }
      if (updates.defaultStorageMethod !== undefined) {
        updateData.defaultStorageMethod = updates.defaultStorageMethod;
      }
      if (updates.defaultServingMethods !== undefined) {
        updateData.defaultServingMethods = updates.defaultServingMethods;
      }
      if (updates.careNotes !== undefined) {
        updateData.careNotes = updates.careNotes;
      }
      if (updates.allergyInfo !== undefined) {
        updateData.allergyInfo = updates.allergyInfo;
      }
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      await docRef.update(updateData);

      functions.logger.info("updateFoodMaster success", {
        id: foodMasterId,
        updates: Object.keys(updateData),
      });

      res.status(200).json({
        success: true,
        data: {
          foodMasterId,
          updatedAt: now.toDate().toISOString(),
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("updateFoodMaster error", {error: errorMsg});
      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
      });
    }
  });

// =============================================================================
// DELETE /deleteFoodMaster - 食品マスタ削除（論理削除）
// =============================================================================

export const deleteFoodMaster = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "DELETE") {
      res.status(405).json({
        success: false,
        error: {code: "METHOD_NOT_ALLOWED", message: "Only DELETE allowed"},
      });
      return;
    }

    try {
      const {foodMasterId} = req.body as {foodMasterId: string};

      if (!foodMasterId) {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "foodMasterId is required"},
        });
        return;
      }

      const docRef = firestore.collection(COLLECTION).doc(foodMasterId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          error: {code: "NOT_FOUND", message: "FoodMaster not found"},
        });
        return;
      }

      // 論理削除（isActive = false）
      await docRef.update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      functions.logger.info("deleteFoodMaster success", {id: foodMasterId});

      res.status(200).json({
        success: true,
        data: {},
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("deleteFoodMaster error", {error: errorMsg});
      res.status(500).json({
        success: false,
        error: {code: "INTERNAL_ERROR", message: errorMsg},
      });
    }
  });
