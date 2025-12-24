/**
 * 残り対応記録 API
 *
 * スタッフが「破棄した」「保存した」を記録するAPI
 * - 記録は消費ログとは独立
 * - 履歴として remainingHandlingLogs 配列に追加
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  ErrorCodes,
  RemainingHandlingLog,
} from "../types";

// Firestoreコレクション名
const CARE_ITEMS_COLLECTION = "care_items";

/**
 * リクエスト型
 */
interface SubmitRemainingHandlingRequest {
  itemId: string;
  handling: "discarded" | "stored";
  quantity: number;
  note?: string;
  staffName: string;
}

/**
 * レスポンス型
 */
interface SubmitRemainingHandlingResponse {
  success: boolean;
  log?: RemainingHandlingLog;
  error?: string;
}

/**
 * バリデーション
 */
function validateRequest(
  body: unknown
): { valid: true; data: SubmitRemainingHandlingRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  // itemId
  if (!req.itemId || typeof req.itemId !== "string") {
    return {valid: false, error: "itemId is required"};
  }

  // handling
  if (!req.handling || !["discarded", "stored"].includes(req.handling as string)) {
    return {valid: false, error: "handling must be 'discarded' or 'stored'"};
  }

  // quantity
  if (typeof req.quantity !== "number" || req.quantity <= 0) {
    return {valid: false, error: "quantity must be a positive number"};
  }

  // staffName
  if (!req.staffName || typeof req.staffName !== "string") {
    return {valid: false, error: "staffName is required"};
  }

  return {
    valid: true,
    data: {
      itemId: req.itemId as string,
      handling: req.handling as "discarded" | "stored",
      quantity: req.quantity as number,
      note: typeof req.note === "string" ? req.note : undefined,
      staffName: req.staffName as string,
    },
  };
}

/**
 * ログID生成
 */
function generateLogId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `RHL_${timestamp}_${random}`;
}

/**
 * 残り対応記録API
 */
export const submitRemainingHandling = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .https.onRequest(async (req: Request, res: Response) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      const response: ApiResponse<SubmitRemainingHandlingResponse> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed",
        },
        timestamp: new Date().toISOString(),
      };
      res.status(405).json(response);
      return;
    }

    try {
      // バリデーション
      const validation = validateRequest(req.body);
      if (!validation.valid) {
        const response: ApiResponse<SubmitRemainingHandlingResponse> = {
          success: false,
          error: {
            code: ErrorCodes.INVALID_REQUEST,
            message: validation.error,
          },
          timestamp: new Date().toISOString(),
        };
        res.status(400).json(response);
        return;
      }

      const {itemId, handling, quantity, note, staffName} = validation.data;

      // デモモードチェック
      const isDemo = itemId.startsWith("demo-");
      if (isDemo) {
        // デモモードは成功を返す（実際には保存しない）
        const demoLog: RemainingHandlingLog = {
          id: generateLogId(),
          handling,
          quantity,
          note,
          recordedBy: staffName,
          recordedAt: new Date().toISOString(),
        };

        const response: ApiResponse<SubmitRemainingHandlingResponse> = {
          success: true,
          data: {
            success: true,
            log: demoLog,
          },
          timestamp: new Date().toISOString(),
        };
        res.status(200).json(response);
        return;
      }

      // Firestore更新
      const db = getFirestore();
      const itemRef = db.collection(CARE_ITEMS_COLLECTION).doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        const response: ApiResponse<SubmitRemainingHandlingResponse> = {
          success: false,
          error: {
            code: ErrorCodes.RESOURCE_NOT_FOUND,
            message: "Item not found",
          },
          timestamp: new Date().toISOString(),
        };
        res.status(404).json(response);
        return;
      }

      // ログ作成
      const log: RemainingHandlingLog = {
        id: generateLogId(),
        handling,
        quantity,
        note,
        recordedBy: staffName,
        recordedAt: new Date().toISOString(),
      };

      // 配列に追加
      await itemRef.update({
        remainingHandlingLogs: FieldValue.arrayUnion(log),
        updatedAt: new Date().toISOString(),
      });

      functions.logger.info("Remaining handling recorded", {
        itemId,
        handling,
        quantity,
        staffName,
        logId: log.id,
      });

      const response: ApiResponse<SubmitRemainingHandlingResponse> = {
        success: true,
        data: {
          success: true,
          log,
        },
        timestamp: new Date().toISOString(),
      };
      res.status(200).json(response);
    } catch (error) {
      functions.logger.error("Error recording remaining handling", error);
      const response: ApiResponse<SubmitRemainingHandlingResponse> = {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: "Failed to record remaining handling",
        },
        timestamp: new Date().toISOString(),
      };
      res.status(500).json(response);
    }
  });
