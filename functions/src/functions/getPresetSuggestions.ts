/**
 * プリセット候補取得API
 * @see docs/AI_INTEGRATION_SPEC.md (セクション9)
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";
import {
  GetPresetSuggestionsRequest,
  PresetSuggestion,
  CarePreset,
  ItemCategory,
  CATEGORY_LABELS,
} from "../types";

const firestore = getFirestore();

/**
 * プリセットをマッチングしてスコアリング
 * processingDetail優先、旧形式instruction.contentもフォールバック
 */
function matchPresets(
  presets: CarePreset[],
  itemName: string,
  category?: ItemCategory
): PresetSuggestion[] {
  const suggestions: PresetSuggestion[] = [];
  const seenPresetIds = new Set<string>();

  for (const preset of presets) {
    // processingDetail優先、旧形式instruction.contentもフォールバック
    const processingDetail = preset.processingDetail || preset.instruction?.content || "";

    // 1. カテゴリマッチ（confidence: 0.8）
    if (category && preset.matchConfig.categories?.includes(category)) {
      if (!seenPresetIds.has(preset.id)) {
        suggestions.push({
          presetId: preset.id,
          presetName: preset.name,
          matchReason: `カテゴリ「${CATEGORY_LABELS[category]}」`,
          matchType: "category",
          confidence: 0.8,
          processingDetail,
          instruction: {
            title: preset.name,
            content: processingDetail,
            servingMethod: preset.instruction?.servingMethod,
            servingDetail: preset.instruction?.servingDetail,
          },
          source: preset.source,
        });
        seenPresetIds.add(preset.id);
      }
    }

    // 2. 品物名マッチ（キーワード部分一致、confidence: 0.9）
    const keywords = preset.matchConfig.keywords;
    if (keywords && keywords.length > 0) {
      const matchedKeyword = keywords.find(
        (kw: string) => itemName.includes(kw) || kw.includes(itemName)
      );
      if (matchedKeyword && !seenPresetIds.has(preset.id)) {
        suggestions.push({
          presetId: preset.id,
          presetName: preset.name,
          matchReason: `品物名「${itemName}」`,
          matchType: "itemName",
          confidence: 0.9,
          processingDetail,
          instruction: {
            title: preset.name,
            content: processingDetail,
            servingMethod: preset.instruction?.servingMethod,
            servingDetail: preset.instruction?.servingDetail,
          },
          source: preset.source,
        });
        seenPresetIds.add(preset.id);
      }
    }

    // 3. コンテンツキーワードマッチ（confidence: 0.7）
    if (
      processingDetail.includes(itemName) &&
      !seenPresetIds.has(preset.id)
    ) {
      suggestions.push({
        presetId: preset.id,
        presetName: preset.name,
        matchReason: `指示内容に「${itemName}」を含む`,
        matchType: "keyword",
        confidence: 0.7,
        processingDetail,
        instruction: {
          title: preset.name,
          content: processingDetail,
          servingMethod: preset.instruction?.servingMethod,
          servingDetail: preset.instruction?.servingDetail,
        },
        source: preset.source,
      });
      seenPresetIds.add(preset.id);
    }
  }

  // confidence降順でソート、最大3件
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * プリセット候補取得エンドポイント
 *
 * POST /getPresetSuggestions
 * Request: { residentId: string, itemName: string, category?: ItemCategory }
 * Response: { success: true, data: { suggestions: PresetSuggestion[] } }
 */
export const getPresetSuggestions = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // CORS処理
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
        error: "Method not allowed. Use POST.",
      });
      return;
    }

    try {
      const {residentId, itemName, category} =
        req.body as GetPresetSuggestionsRequest;

      // バリデーション
      if (!residentId) {
        res.status(400).json({
          success: false,
          error: "residentId is required",
        });
        return;
      }

      if (!itemName || itemName.length < 2) {
        res.status(400).json({
          success: false,
          error: "itemName must be at least 2 characters",
        });
        return;
      }

      // Firestoreからプリセットを取得
      const presetsSnapshot = await firestore
        .collection("care_presets")
        .where("residentId", "==", residentId)
        .where("isActive", "==", true)
        .get();

      if (presetsSnapshot.empty) {
        // プリセットが存在しない場合は空配列を返す
        res.status(200).json({
          success: true,
          data: {suggestions: []},
        });
        return;
      }

      // プリセットをCarePreset型に変換
      const presets: CarePreset[] = presetsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CarePreset[];

      // マッチング実行
      const suggestions = matchPresets(
        presets,
        itemName,
        category as ItemCategory | undefined
      );

      res.status(200).json({
        success: true,
        data: {suggestions},
      });
    } catch (error) {
      functions.logger.error("getPresetSuggestions error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
