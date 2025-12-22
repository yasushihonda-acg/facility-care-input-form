/**
 * プリセット管理 CRUD API
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  GetPresetsRequest,
  CreatePresetRequest,
  UpdatePresetRequest,
  DeletePresetRequest,
  CarePreset,
  PresetCategory,
  PresetSource,
  SaveAISuggestionAsPresetRequest,
} from "../types";

const firestore = getFirestore();

// =============================================================================
// GET /getPresets - プリセット一覧取得
// =============================================================================

export const getPresets = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // CORS処理
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
        error: "Method not allowed. Use GET.",
      });
      return;
    }

    try {
      const {residentId, category, source, activeOnly} =
        req.query as unknown as GetPresetsRequest;

      // バリデーション
      if (!residentId) {
        res.status(400).json({
          success: false,
          error: "residentId is required",
        });
        return;
      }

      // クエリ構築
      let query = firestore
        .collection("care_presets")
        .where("residentId", "==", residentId);

      // activeOnlyフィルタ（デフォルト: true）
      // クエリパラメータは文字列として渡されるため、明示的に文字列比較
      const activeOnlyStr = String(activeOnly);
      const filterActive = activeOnlyStr !== "false";
      if (filterActive) {
        query = query.where("isActive", "==", true);
      }

      // カテゴリフィルタ
      if (category) {
        query = query.where("category", "==", category);
      }

      // 出所フィルタ
      if (source) {
        query = query.where("source", "==", source);
      }

      const snapshot = await query.get();

      const presets: CarePreset[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        } as CarePreset;
      });

      res.status(200).json({
        success: true,
        data: {
          presets,
          total: presets.length,
        },
      });
    } catch (error) {
      functions.logger.error("getPresets error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// POST /createPreset - プリセット作成
// =============================================================================

export const createPreset = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // CORS処理
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
        error: "Method not allowed. Use POST.",
      });
      return;
    }

    try {
      const {residentId, userId, preset, source} =
        req.body as CreatePresetRequest;

      // バリデーション
      if (!residentId) {
        res.status(400).json({
          success: false,
          error: "residentId is required",
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "userId is required",
        });
        return;
      }

      // processingDetail優先、旧形式instruction.contentもフォールバック
      const processingDetail = preset?.processingDetail || preset?.instruction?.content;
      if (!preset || !preset.name || !processingDetail) {
        res.status(400).json({
          success: false,
          error: "preset.name and preset.processingDetail are required",
        });
        return;
      }

      const now = Timestamp.now();

      // Firestoreに保存（processingDetailを正規フィールドとして保存）
      const presetData = {
        residentId,
        name: preset.name,
        category: preset.category || "cut" as PresetCategory,
        icon: preset.icon || undefined,
        processingDetail,
        // 旧形式との後方互換性のため instruction も保存
        instruction: {
          content: processingDetail,
        },
        matchConfig: {
          keywords: preset.matchConfig?.keywords || [],
          categories: preset.matchConfig?.categories || undefined,
          exactMatch: preset.matchConfig?.exactMatch || false,
        },
        source: source || "manual" as PresetSource,
        isActive: true,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      };

      const docRef = await firestore.collection("care_presets").add(presetData);

      res.status(201).json({
        success: true,
        data: {
          presetId: docRef.id,
          createdAt: now.toDate().toISOString(),
        },
      });
    } catch (error) {
      functions.logger.error("createPreset error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// PUT /updatePreset - プリセット更新
// =============================================================================

export const updatePreset = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // CORS処理
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
        error: "Method not allowed. Use PUT.",
      });
      return;
    }

    try {
      const {presetId, updates} = req.body as UpdatePresetRequest;

      // バリデーション
      if (!presetId) {
        res.status(400).json({
          success: false,
          error: "presetId is required",
        });
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          error: "updates is required and must not be empty",
        });
        return;
      }

      // プリセット存在確認
      const docRef = firestore.collection("care_presets").doc(presetId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          error: "Preset not found",
        });
        return;
      }

      // 更新データ構築
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      // 許可されたフィールドのみ更新
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.category !== undefined) {
        updateData.category = updates.category;
      }
      if (updates.icon !== undefined) {
        updateData.icon = updates.icon;
      }
      // processingDetailを優先、旧形式instructionも後方互換性のため対応
      if (updates.processingDetail !== undefined) {
        updateData.processingDetail = updates.processingDetail;
        // 後方互換性のためinstructionも同期
        updateData.instruction = {content: updates.processingDetail};
      } else if (updates.instruction !== undefined) {
        updateData.instruction = updates.instruction;
        // 新形式にも同期
        if (updates.instruction.content) {
          updateData.processingDetail = updates.instruction.content;
        }
      }
      if (updates.matchConfig !== undefined) {
        updateData.matchConfig = updates.matchConfig;
      }
      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
      }

      await docRef.update(updateData);

      res.status(200).json({
        success: true,
        data: {
          presetId,
          updatedAt: (updateData.updatedAt as Timestamp).toDate().toISOString(),
        },
      });
    } catch (error) {
      functions.logger.error("updatePreset error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// DELETE /deletePreset - プリセット削除（論理削除）
// =============================================================================

export const deletePreset = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // CORS処理
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
        error: "Method not allowed. Use DELETE.",
      });
      return;
    }

    try {
      const {presetId} = req.query as unknown as DeletePresetRequest;

      // バリデーション
      if (!presetId) {
        res.status(400).json({
          success: false,
          error: "presetId is required",
        });
        return;
      }

      // プリセット存在確認
      const docRef = firestore.collection("care_presets").doc(presetId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          error: "Preset not found",
        });
        return;
      }

      // 論理削除（isActive: false）
      await docRef.update({
        isActive: false,
        updatedAt: Timestamp.now(),
      });

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      functions.logger.error("deletePreset error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// POST /saveAISuggestionAsPreset - AI提案をプリセットとして保存
// =============================================================================

export const saveAISuggestionAsPreset = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res) => {
    // CORS処理
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
        error: "Method not allowed. Use POST.",
      });
      return;
    }

    try {
      const {
        residentId,
        userId,
        itemName,
        presetName,
        category,
        icon,
        aiSuggestion,
        keywords,
        itemCategories,
      } = req.body as SaveAISuggestionAsPresetRequest;

      // バリデーション
      if (!residentId || !userId || !presetName || !aiSuggestion) {
        res.status(400).json({
          success: false,
          error: "residentId, userId, presetName, and aiSuggestion are required",
        });
        return;
      }

      const now = Timestamp.now();

      // AI提案から指示内容を構築
      // Phase 28で整理: cooled/blended削除
      const servingMethodLabels: Record<string, string> = {
        as_is: "そのまま",
        cut: "カット",
        peeled: "皮むき",
        heated: "温める",
        other: "その他",
      };

      const servingMethods = aiSuggestion.servingMethods || [];
      const servingMethodsText = servingMethods
        .map((m) => servingMethodLabels[m] || m)
        .join("、");

      let instructionContent = `賞味期限目安: ${aiSuggestion.expirationDays}日`;
      if (servingMethodsText) {
        instructionContent += `\n提供方法: ${servingMethodsText}`;
      }
      if (aiSuggestion.notes) {
        instructionContent += `\n注意: ${aiSuggestion.notes}`;
      }

      // プリセットデータ構築
      const presetData = {
        residentId,
        name: presetName,
        category: category || "other" as PresetCategory,
        icon: icon || "🤖",
        instruction: {
          content: instructionContent,
          servingMethod: servingMethods[0] || undefined,
          servingDetail: aiSuggestion.notes || undefined,
        },
        matchConfig: {
          keywords: keywords || [itemName],
          categories: itemCategories || undefined,
        },
        source: "ai" as PresetSource,
        aiSourceInfo: {
          originalItemName: itemName,
          originalSuggestion: {
            expirationDays: aiSuggestion.expirationDays,
            storageMethod: aiSuggestion.storageMethod,
            servingMethods: aiSuggestion.servingMethods,
            notes: aiSuggestion.notes,
          },
          savedAt: now.toDate().toISOString(),
        },
        isActive: true,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      };

      const docRef = await firestore.collection("care_presets").add(presetData);

      res.status(201).json({
        success: true,
        data: {
          presetId: docRef.id,
          createdAt: now.toDate().toISOString(),
        },
      });
    } catch (error) {
      functions.logger.error("saveAISuggestionAsPreset error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
