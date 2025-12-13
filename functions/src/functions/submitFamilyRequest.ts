/**
 * Flow C: 家族要望送信関数
 * ご家族からのケア要望をFirestoreに保存
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {
  createFamilyRequest,
  calculateEstimatedReviewDate,
} from "../services/firestoreService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  SubmitFamilyRequestRequest,
  SubmitFamilyRequestResponse,
  ErrorCodes,
} from "../types";

/**
 * カテゴリの有効な値
 */
const VALID_CATEGORIES = [
  "meal",
  "daily_life",
  "medical",
  "recreation",
  "communication",
  "other",
] as const;

/**
 * 優先度の有効な値
 */
const VALID_PRIORITIES = ["low", "medium", "high"] as const;

/**
 * リクエストのバリデーション
 */
function validateRequest(
  body: unknown
): { valid: true; data: SubmitFamilyRequestRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  if (!req.userId || typeof req.userId !== "string") {
    return {valid: false, error: "userId is required"};
  }

  if (!req.residentId || typeof req.residentId !== "string") {
    return {valid: false, error: "residentId is required"};
  }

  if (
    !req.category ||
    !VALID_CATEGORIES.includes(req.category as typeof VALID_CATEGORIES[number])
  ) {
    return {
      valid: false,
      error: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
    };
  }

  if (!req.content || typeof req.content !== "string") {
    return {valid: false, error: "content is required"};
  }

  if (req.content.length > 2000) {
    return {valid: false, error: "content must not exceed 2000 characters"};
  }

  if (
    !req.priority ||
    !VALID_PRIORITIES.includes(req.priority as typeof VALID_PRIORITIES[number])
  ) {
    return {
      valid: false,
      error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}`,
    };
  }

  // attachments のバリデーション（オプション）
  if (req.attachments !== undefined) {
    if (!Array.isArray(req.attachments)) {
      return {valid: false, error: "attachments must be an array"};
    }
    for (const attachment of req.attachments) {
      if (typeof attachment !== "string") {
        return {valid: false, error: "attachments must be an array of strings"};
      }
    }
  }

  return {
    valid: true,
    data: {
      userId: req.userId as string,
      residentId: req.residentId as string,
      category: req.category as SubmitFamilyRequestRequest["category"],
      content: req.content as string,
      priority: req.priority as SubmitFamilyRequestRequest["priority"],
      attachments: req.attachments as string[] | undefined,
    },
  };
}

/**
 * submitFamilyRequest 関数本体
 */
async function submitFamilyRequestHandler(
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

    const familyRequest = validation.data;

    functions.logger.info("submitFamilyRequest started", {
      userId: familyRequest.userId,
      residentId: familyRequest.residentId,
      category: familyRequest.category,
      priority: familyRequest.priority,
    });

    // Firestore に保存
    const requestId = await createFamilyRequest(familyRequest);

    // 推定レビュー日を計算
    const estimatedReviewDate = calculateEstimatedReviewDate();

    const responseData: SubmitFamilyRequestResponse = {
      requestId,
      status: "pending",
      estimatedReviewDate,
    };

    const response: ApiResponse<SubmitFamilyRequestResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("submitFamilyRequest completed", {
      requestId,
      estimatedReviewDate,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("submitFamilyRequest error", error);

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
export const submitFamilyRequest = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(submitFamilyRequestHandler);
