/**
 * 禁止ルール（提供禁止品目）CRUD API
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション8
 */

import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  GetProhibitionsRequest,
  CreateProhibitionRequest,
  UpdateProhibitionRequest,
  DeleteProhibitionRequest,
  ProhibitionRule,
} from "../types";

const firestore = getFirestore();

// =============================================================================
// GET /getProhibitions - 禁止ルール一覧取得
// =============================================================================

export const getProhibitions = functions
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
      const {residentId, activeOnly} =
        req.query as unknown as GetProhibitionsRequest;

      // バリデーション
      if (!residentId) {
        res.status(400).json({
          success: false,
          error: "residentId is required",
        });
        return;
      }

      // サブコレクションからクエリ
      // Firestore: residents/{residentId}/prohibitions/{prohibitionId}
      const query = firestore
        .collection("residents")
        .doc(residentId)
        .collection("prohibitions");

      // activeOnlyフィルタ（デフォルト: true）
      const activeOnlyStr = String(activeOnly);
      const filterActive = activeOnlyStr !== "false";

      // 注: サブコレクションではwhere句を追加
      let filteredQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = query;
      if (filterActive) {
        filteredQuery = query.where("isActive", "==", true);
      }

      const snapshot = await filteredQuery.get();

      const prohibitions: ProhibitionRule[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          residentId,
          itemName: data.itemName,
          category: data.category,
          reason: data.reason,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          isActive: data.isActive,
        } as ProhibitionRule;
      });

      res.status(200).json({
        success: true,
        data: {
          prohibitions,
          total: prohibitions.length,
        },
      });
    } catch (error) {
      functions.logger.error("getProhibitions error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// POST /createProhibition - 禁止ルール作成
// =============================================================================

export const createProhibition = functions
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
      const {residentId, userId, prohibition} =
        req.body as CreateProhibitionRequest;

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

      if (!prohibition || !prohibition.itemName) {
        res.status(400).json({
          success: false,
          error: "prohibition.itemName is required",
        });
        return;
      }

      const now = Timestamp.now();

      // サブコレクションに保存
      const prohibitionData = {
        itemName: prohibition.itemName,
        category: prohibition.category || undefined,
        reason: prohibition.reason || undefined,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      };

      const docRef = await firestore
        .collection("residents")
        .doc(residentId)
        .collection("prohibitions")
        .add(prohibitionData);

      res.status(201).json({
        success: true,
        data: {
          prohibitionId: docRef.id,
          createdAt: now.toDate().toISOString(),
        },
      });
    } catch (error) {
      functions.logger.error("createProhibition error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// PUT /updateProhibition - 禁止ルール更新
// =============================================================================

export const updateProhibition = functions
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
      const {residentId, prohibitionId, updates} =
        req.body as UpdateProhibitionRequest;

      // バリデーション
      if (!residentId) {
        res.status(400).json({
          success: false,
          error: "residentId is required",
        });
        return;
      }

      if (!prohibitionId) {
        res.status(400).json({
          success: false,
          error: "prohibitionId is required",
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

      // 禁止ルール存在確認
      const docRef = firestore
        .collection("residents")
        .doc(residentId)
        .collection("prohibitions")
        .doc(prohibitionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          error: "Prohibition rule not found",
        });
        return;
      }

      // 更新データ構築
      const updateData: Record<string, unknown> = {
        updatedAt: Timestamp.now(),
      };

      // 許可されたフィールドのみ更新
      if (updates.itemName !== undefined) {
        updateData.itemName = updates.itemName;
      }
      if (updates.category !== undefined) {
        updateData.category = updates.category;
      }
      if (updates.reason !== undefined) {
        updateData.reason = updates.reason;
      }
      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
      }

      await docRef.update(updateData);

      res.status(200).json({
        success: true,
        data: {
          prohibitionId,
          updatedAt: (updateData.updatedAt as Timestamp).toDate().toISOString(),
        },
      });
    } catch (error) {
      functions.logger.error("updateProhibition error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });

// =============================================================================
// DELETE /deleteProhibition - 禁止ルール削除（論理削除）
// =============================================================================

export const deleteProhibition = functions
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
      const {residentId, prohibitionId} =
        req.query as unknown as DeleteProhibitionRequest;

      // バリデーション
      if (!residentId) {
        res.status(400).json({
          success: false,
          error: "residentId is required",
        });
        return;
      }

      if (!prohibitionId) {
        res.status(400).json({
          success: false,
          error: "prohibitionId is required",
        });
        return;
      }

      // 禁止ルール存在確認
      const docRef = firestore
        .collection("residents")
        .doc(residentId)
        .collection("prohibitions")
        .doc(prohibitionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        res.status(404).json({
          success: false,
          error: "Prohibition rule not found",
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
      functions.logger.error("deleteProhibition error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  });
