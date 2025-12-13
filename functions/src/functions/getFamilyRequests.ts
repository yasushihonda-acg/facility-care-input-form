/**
 * 家族要望取得関数
 * Firestoreから家族要望一覧を取得
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFamilyRequests} from "../services/firestoreService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  GetFamilyRequestsRequest,
  GetFamilyRequestsResponse,
  FamilyRequestRecord,
  ErrorCodes,
} from "../types";

/**
 * 有効なステータス値
 */
const VALID_STATUSES = ["pending", "reviewed", "implemented"] as const;

/**
 * getFamilyRequests 関数本体
 */
async function getFamilyRequestsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use GET.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    // クエリパラメータの取得
    const statusParam = req.query.status as string | undefined;

    // statusのバリデーション
    if (statusParam && !VALID_STATUSES.includes(statusParam as typeof VALID_STATUSES[number])) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: `status must be one of: ${VALID_STATUSES.join(", ")}`,
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    const request: GetFamilyRequestsRequest = {
      userId: req.query.userId as string | undefined,
      residentId: req.query.residentId as string | undefined,
      status: statusParam as GetFamilyRequestsRequest["status"],
      limit: req.query.limit ?
        parseInt(req.query.limit as string, 10) :
        undefined,
    };

    // limitのバリデーション
    if (request.limit !== undefined && (isNaN(request.limit) || request.limit < 1)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "limit must be a positive integer",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    functions.logger.info("getFamilyRequests started", request);

    // Firestoreからデータを取得
    const result = await getFamilyRequests(request);

    // レスポンス用にデータを変換
    const requests: FamilyRequestRecord[] = result.requests.map((record) => ({
      requestId: record.id,
      userId: record.userId,
      residentId: record.residentId,
      category: record.category,
      content: record.content,
      priority: record.priority,
      status: record.status,
      createdAt: record.createdAt.toDate().toISOString(),
      updatedAt: record.updatedAt.toDate().toISOString(),
    }));

    const responseData: GetFamilyRequestsResponse = {
      requests,
      totalCount: result.totalCount,
    };

    const response: ApiResponse<GetFamilyRequestsResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("getFamilyRequests completed", {
      totalCount: result.totalCount,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getFamilyRequests error", error);

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
export const getFamilyRequestsFunc = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getFamilyRequestsHandler);
