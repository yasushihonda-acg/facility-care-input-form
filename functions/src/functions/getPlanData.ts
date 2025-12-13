/**
 * 記録データ取得関数
 * Firestoreに同期済みの記録データを取得
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getPlanData} from "../services/firestoreService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  GetPlanDataRequest,
  GetPlanDataResponse,
  PlanDataRecord,
  ErrorCodes,
} from "../types";

/**
 * getPlanData 関数本体
 */
async function getPlanDataHandler(
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
    const request: GetPlanDataRequest = {
      residentId: req.query.residentId as string | undefined,
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

    functions.logger.info("getPlanData started", request);

    // Firestoreからデータを取得
    const result = await getPlanData(request);

    // レスポンス用にデータを変換
    const records: PlanDataRecord[] = result.records.map((record) => ({
      residentId: record.residentId,
      residentName: record.residentName,
      mealRestrictions: record.mealRestrictions,
      instructions: record.instructions,
      conditionalBan: record.conditionalBan,
      syncedAt: record.syncedAt.toDate().toISOString(),
    }));

    const responseData: GetPlanDataResponse = {
      records,
      totalCount: result.totalCount,
      lastSyncedAt: result.lastSyncedAt,
    };

    const response: ApiResponse<GetPlanDataResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("getPlanData completed", {
      totalCount: result.totalCount,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getPlanData error", error);

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
export const getPlanDataFunc = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getPlanDataHandler);
