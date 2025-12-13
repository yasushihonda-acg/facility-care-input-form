/**
 * Flow B: ケア実績入力関数
 * スタッフがケア実績をSheet Bに記録
 * Bot連携ハック実装済み（間食入力時の特殊処理）
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {appendCareRecordToSheetB} from "../services/sheetsService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  SubmitCareRecordRequest,
  SubmitCareRecordResponse,
  ErrorCodes,
} from "../types";

/**
 * レコードIDを生成
 * フォーマット: REC_{YYYYMMDD}_{HHmmss}_{staffId}
 */
function generateRecordId(staffId: string, timestamp: string): string {
  const date = new Date(timestamp);
  const dateStr = date
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  return `REC_${dateStr}_${staffId}`;
}

/**
 * リクエストのバリデーション
 */
function validateRequest(
  body: unknown
): { valid: true; data: SubmitCareRecordRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  if (!req.staffId || typeof req.staffId !== "string") {
    return {valid: false, error: "staffId is required"};
  }

  if (!req.residentId || typeof req.residentId !== "string") {
    return {valid: false, error: "residentId is required"};
  }

  if (!req.recordType || !["meal", "snack", "hydration"].includes(req.recordType as string)) {
    return {valid: false, error: "recordType must be 'meal', 'snack', or 'hydration'"};
  }

  if (!req.content || typeof req.content !== "string") {
    return {valid: false, error: "content is required"};
  }

  if (!req.timestamp || typeof req.timestamp !== "string") {
    return {valid: false, error: "timestamp is required"};
  }

  // ISO 8601 形式の検証
  const date = new Date(req.timestamp as string);
  if (isNaN(date.getTime())) {
    return {valid: false, error: "timestamp must be a valid ISO 8601 date string"};
  }

  return {
    valid: true,
    data: {
      staffId: req.staffId as string,
      residentId: req.residentId as string,
      recordType: req.recordType as "meal" | "snack" | "hydration",
      content: req.content as string,
      quantity: req.quantity as string | undefined,
      timestamp: req.timestamp as string,
      imageUrl: req.imageUrl as string | undefined,
      notes: req.notes as string | undefined,
    },
  };
}

/**
 * submitCareRecord 関数本体
 */
async function submitCareRecordHandler(
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

    const careRecord = validation.data;

    functions.logger.info("submitCareRecord started", {
      staffId: careRecord.staffId,
      residentId: careRecord.residentId,
      recordType: careRecord.recordType,
    });

    // Sheet B に追記（Bot連携ハックはsheetsService内で処理）
    const {sheetRow, botNotificationTriggered} =
      await appendCareRecordToSheetB(careRecord);

    const recordId = generateRecordId(careRecord.staffId, careRecord.timestamp);

    const responseData: SubmitCareRecordResponse = {
      recordId,
      sheetRow,
      botNotificationTriggered,
    };

    const response: ApiResponse<SubmitCareRecordResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("submitCareRecord completed", {
      recordId,
      sheetRow,
      botNotificationTriggered,
      recordType: careRecord.recordType,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("submitCareRecord error", error);

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.SHEETS_API_ERROR,
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
export const submitCareRecord = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(submitCareRecordHandler);
