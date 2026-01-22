/**
 * AI品物入力補助API (Phase 8.4 + Phase 11 FoodMaster連携)
 * 品物名から賞味期限・保存方法を自動提案
 * FoodMasterに存在すればキャッシュとして使用、なければGeminiで生成
 * @see docs/AI_INTEGRATION_SPEC.md
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md
 */

import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {generateContent, parseJsonResponse} from "../services/geminiService";
import {buildItemSuggestionPrompt} from "../prompts/itemSuggestion";
import type {
  AISuggestRequest,
  AISuggestResponse,
  FoodMaster,
  FoodMasterStats,
  ItemCategory,
} from "../types";
import {DEFAULT_AI_SUGGESTION} from "../types";

const firestore = getFirestore();
const FOOD_MASTERS_COLLECTION = "food_masters";

// 初期統計データ
const INITIAL_STATS: FoodMasterStats = {
  totalServed: 0,
  totalConsumed: 0,
  avgConsumptionRate: 0,
  preferenceScore: 0,
  wasteRate: 0,
};

/**
 * FoodMasterを検索（名前・別名でマッチ）
 */
async function searchFoodMasterByName(
  itemName: string,
  category?: string
): Promise<FoodMaster | null> {
  const normalizedQuery = itemName.trim().toLowerCase();

  let query = firestore.collection(FOOD_MASTERS_COLLECTION)
    .where("isActive", "==", true);

  if (category) {
    query = query.where("category", "==", category);
  }

  const snapshot = await query.get();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // 名前で完全一致
    if (data.name?.toLowerCase() === normalizedQuery) {
      return convertDocToFoodMaster(doc);
    }

    // 別名で完全一致
    const aliasMatch = (data.aliases || []).some(
      (alias: string) => alias.toLowerCase() === normalizedQuery
    );
    if (aliasMatch) {
      return convertDocToFoodMaster(doc);
    }
  }

  // 完全一致なければ部分一致を試行
  for (const doc of snapshot.docs) {
    const data = doc.data();

    // 名前で部分一致
    if (data.name?.toLowerCase().includes(normalizedQuery)) {
      return convertDocToFoodMaster(doc);
    }

    // 別名で部分一致
    const aliasMatch = (data.aliases || []).some(
      (alias: string) => alias.toLowerCase().includes(normalizedQuery)
    );
    if (aliasMatch) {
      return convertDocToFoodMaster(doc);
    }
  }

  return null;
}

/**
 * FirestoreドキュメントをFoodMasterに変換
 */
function convertDocToFoodMaster(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): FoodMaster {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    aliases: data.aliases || [],
    category: data.category,
    defaultUnit: data.defaultUnit,
    defaultExpirationDays: data.defaultExpirationDays,
    defaultStorageMethod: data.defaultStorageMethod,
    defaultServingMethods: data.defaultServingMethods || [],
    careNotes: data.careNotes,
    allergyInfo: data.allergyInfo,
    stats: data.stats || INITIAL_STATS,
    isActive: data.isActive,
    source: data.source || "manual",
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  } as FoodMaster;
}

/**
 * AI生成結果をFoodMasterに保存
 */
async function saveSuggestionAsFoodMaster(
  itemName: string,
  category: ItemCategory | undefined,
  suggestion: AISuggestResponse
): Promise<string> {
  const now = Timestamp.now();

  const newFoodMaster = {
    name: itemName.trim(),
    aliases: [],
    category: category || "other",
    defaultUnit: "個",
    defaultExpirationDays: suggestion.expirationDays,
    defaultStorageMethod: suggestion.storageMethod,
    defaultServingMethods: suggestion.servingMethods,
    careNotes: suggestion.notes,
    stats: INITIAL_STATS,
    isActive: true,
    source: "ai",
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await firestore.collection(FOOD_MASTERS_COLLECTION).add(newFoodMaster);
  functions.logger.info("Saved AI suggestion as FoodMaster", {
    id: docRef.id,
    name: itemName,
  });

  return docRef.id;
}

/**
 * AI品物入力補助API
 * POST /aiSuggest
 *
 * 品物名を送信すると、まずFoodMasterを検索。
 * 存在すればその情報を返却、なければAIが提案を生成。
 * saveToFoodMaster=trueの場合、AI生成結果をFoodMasterに保存。
 */
export const aiSuggest = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(async (req, res) => {
    // CORS設定
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

    const timestamp = new Date().toISOString();

    try {
      const {itemName, category, saveToFoodMaster, skipFoodMasterSearch} =
        req.body as AISuggestRequest & {
          saveToFoodMaster?: boolean;
          skipFoodMasterSearch?: boolean;
        };

      // バリデーション
      if (!itemName || typeof itemName !== "string") {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "itemName is required"},
          timestamp,
        });
        return;
      }

      if (itemName.length < 1 || itemName.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "itemName must be 1-100 characters",
          },
          timestamp,
        });
        return;
      }

      functions.logger.info("aiSuggest request", {itemName, category, saveToFoodMaster});

      // ===== Step 1: FoodMasterを検索 =====
      if (!skipFoodMasterSearch) {
        const foodMaster = await searchFoodMasterByName(itemName, category);

        if (foodMaster) {
          // FoodMasterが見つかった場合、そのデータを返却
          const suggestion: AISuggestResponse = {
            expirationDays: foodMaster.defaultExpirationDays,
            storageMethod: foodMaster.defaultStorageMethod,
            servingMethods: foodMaster.defaultServingMethods,
            notes: foodMaster.careNotes,
          };

          functions.logger.info("aiSuggest: Found in FoodMaster", {
            itemName,
            foodMasterId: foodMaster.id,
          });

          res.status(200).json({
            success: true,
            data: suggestion,
            source: "food_master",
            foodMasterId: foodMaster.id,
            timestamp,
          });
          return;
        }
      }

      // ===== Step 2: Gemini APIでAI提案を取得 =====
      const prompt = buildItemSuggestionPrompt(itemName, category);
      const responseText = await generateContent(prompt);
      const suggestion = parseJsonResponse<AISuggestResponse>(responseText);

      if (!suggestion) {
        // パース失敗時はデフォルト値を返却
        functions.logger.warn("AI response parse failed, using fallback", {
          itemName,
          responseText,
        });

        res.status(200).json({
          success: true,
          data: DEFAULT_AI_SUGGESTION,
          source: "default",
          warning: "AI suggestion unavailable, using defaults",
          timestamp,
        });
        return;
      }

      // バリデーション & デフォルト値補完
      const validatedSuggestion: AISuggestResponse = {
        expirationDays: typeof suggestion.expirationDays === "number" &&
          suggestion.expirationDays > 0 ?
          suggestion.expirationDays :
          DEFAULT_AI_SUGGESTION.expirationDays,
        storageMethod: ["room_temp", "refrigerated", "frozen"]
          .includes(suggestion.storageMethod) ?
          suggestion.storageMethod :
          DEFAULT_AI_SUGGESTION.storageMethod,
        // Phase 28で整理: cooled/blended削除
        servingMethods: Array.isArray(suggestion.servingMethods) &&
          suggestion.servingMethods.length > 0 ?
          suggestion.servingMethods.filter((m) =>
            ["as_is", "cut", "peeled", "heated", "other"]
              .includes(m)
          ) :
          DEFAULT_AI_SUGGESTION.servingMethods,
        notes: typeof suggestion.notes === "string" ?
          suggestion.notes.slice(0, 100) :
          undefined,
      };

      // 空の servingMethods になった場合のフォールバック
      if (validatedSuggestion.servingMethods.length === 0) {
        validatedSuggestion.servingMethods = DEFAULT_AI_SUGGESTION.servingMethods;
      }

      // ===== Step 3: FoodMasterに保存（オプション） =====
      let savedFoodMasterId: string | undefined;
      if (saveToFoodMaster) {
        try {
          savedFoodMasterId = await saveSuggestionAsFoodMaster(
            itemName,
            category as ItemCategory | undefined,
            validatedSuggestion
          );
        } catch (saveError) {
          functions.logger.warn("Failed to save to FoodMaster", {
            error: saveError instanceof Error ? saveError.message : "Unknown",
          });
          // 保存失敗してもAI提案は返す
        }
      }

      functions.logger.info("aiSuggest success (AI generated)", {
        itemName,
        suggestion: validatedSuggestion,
        savedFoodMasterId,
      });

      res.status(200).json({
        success: true,
        data: validatedSuggestion,
        source: "ai",
        savedFoodMasterId,
        timestamp,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("aiSuggest error", {error: errorMsg});

      // エラー時もデフォルト値を返却（フォールバック）
      res.status(200).json({
        success: true,
        data: DEFAULT_AI_SUGGESTION,
        source: "default",
        warning: `AI suggestion unavailable: ${errorMsg}`,
        timestamp,
      });
    }
  });
