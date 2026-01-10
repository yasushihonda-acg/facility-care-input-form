/**
 * 水分記録編集API
 * - Firestoreのconsumption_logsを更新
 * - SHEET_Aの「水分摂取量」シートのD列を更新
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {updateHydrationRecordInSheetA} from "../services/sheetsService";
import {
  ApiResponse,
  ErrorCodes,
  RemainingHandling,
} from "../types";

// Firestoreコレクション名
const CARE_ITEMS_COLLECTION = "care_items";
const CONSUMPTION_LOGS_SUBCOLLECTION = "consumption_logs";

/**
 * 水分記録更新リクエスト型
 */
interface UpdateHydrationRecordRequest {
  itemId: string;
  logId: string;
  hydrationAmount: number;
  remainingHandling?: RemainingHandling;
  remainingHandlingOther?: string;
  // SHEET_A検索用タイムスタンプ（例: "2024/09/01 9:37:34"）
  sheetTimestamp: string;
  updatedBy: string;
}

/**
 * 水分記録更新レスポンス型
 */
interface UpdateHydrationRecordResponse {
  logId: string;
  itemId: string;
  hydrationAmount: number;
  sheetUpdated: boolean;
  sheetRow?: number;
}

/**
 * リクエストのバリデーション
 */
function validateRequest(
  body: unknown
): { valid: true; data: UpdateHydrationRecordRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  if (!req.itemId || typeof req.itemId !== "string") {
    return {valid: false, error: "itemId is required"};
  }

  if (!req.logId || typeof req.logId !== "string") {
    return {valid: false, error: "logId is required"};
  }

  if (typeof req.hydrationAmount !== "number" || req.hydrationAmount < 0) {
    return {valid: false, error: "hydrationAmount must be a non-negative number"};
  }

  if (!req.sheetTimestamp || typeof req.sheetTimestamp !== "string") {
    return {valid: false, error: "sheetTimestamp is required"};
  }

  if (!req.updatedBy || typeof req.updatedBy !== "string") {
    return {valid: false, error: "updatedBy is required"};
  }

  // remainingHandling (optional)
  if (req.remainingHandling !== undefined) {
    const validHandlings: RemainingHandling[] = ["discarded", "stored", "other"];
    if (!validHandlings.includes(req.remainingHandling as RemainingHandling)) {
      return {valid: false, error: "remainingHandling must be one of: " + validHandlings.join(", ")};
    }
  }

  return {
    valid: true,
    data: {
      itemId: req.itemId as string,
      logId: req.logId as string,
      hydrationAmount: req.hydrationAmount as number,
      remainingHandling: req.remainingHandling as RemainingHandling | undefined,
      remainingHandlingOther: req.remainingHandlingOther as string | undefined,
      sheetTimestamp: req.sheetTimestamp as string,
      updatedBy: req.updatedBy as string,
    },
  };
}

/**
 * updateHydrationRecord 関数本体
 */
async function updateHydrationRecordHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use POST.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    // バリデーション
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: validation.error,
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    const input = validation.data;

    functions.logger.info("updateHydrationRecord started", {
      itemId: input.itemId,
      logId: input.logId,
      hydrationAmount: input.hydrationAmount,
      sheetTimestamp: input.sheetTimestamp,
    });

    const db = getFirestore();
    const itemRef = db.collection(CARE_ITEMS_COLLECTION).doc(input.itemId);
    const logRef = itemRef.collection(CONSUMPTION_LOGS_SUBCOLLECTION).doc(input.logId);

    // 1. Firestoreのconsumption_logを更新
    const logDoc = await logRef.get();
    if (!logDoc.exists) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Consumption log not found",
        },
        timestamp,
      };
      res.status(404).json(response);
      return;
    }

    const now = Timestamp.now();
    const updateData: Record<string, unknown> = {
      // 水分量はconsumption_logsでは直接hydrationAmountというフィールドはないが、
      // consumedQuantityまたは別フィールドとして保存する可能性あり
      // ここでは汎用的にhydrationAmountフィールドを追加
      hydrationAmount: input.hydrationAmount,
      updatedAt: now,
      updatedBy: input.updatedBy,
    };

    // 残り対応がある場合は更新
    if (input.remainingHandling !== undefined) {
      updateData.remainingHandling = input.remainingHandling;
      updateData.remainingHandlingOther = input.remainingHandlingOther ?? null;
    }

    await logRef.update(updateData);

    functions.logger.info("Firestore consumption_log updated", {
      logId: input.logId,
      hydrationAmount: input.hydrationAmount,
    });

    // 2. SHEET_Aの「水分摂取量」シートを更新
    let sheetUpdated = false;
    let sheetRow: number | undefined;

    try {
      const sheetResult = await updateHydrationRecordInSheetA(
        input.sheetTimestamp,
        input.hydrationAmount
      );

      if (sheetResult) {
        sheetUpdated = true;
        sheetRow = sheetResult.updatedRow;
        functions.logger.info("Sheet A hydration record updated", {
          row: sheetRow,
          hydrationAmount: input.hydrationAmount,
        });
      } else {
        functions.logger.warn("Sheet A hydration record not found", {
          sheetTimestamp: input.sheetTimestamp,
        });
      }
    } catch (sheetError) {
      functions.logger.error("Sheet A update failed", sheetError);
      // シート更新失敗でもFirestore更新は成功しているので処理続行
    }

    const responseData: UpdateHydrationRecordResponse = {
      logId: input.logId,
      itemId: input.itemId,
      hydrationAmount: input.hydrationAmount,
      sheetUpdated,
      sheetRow,
    };

    const response: ApiResponse<UpdateHydrationRecordResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("updateHydrationRecord completed", responseData);

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("updateHydrationRecord error", error);

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
}

/**
 * Cloud Functions エクスポート
 */
export const updateHydrationRecord = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(updateHydrationRecordHandler);
