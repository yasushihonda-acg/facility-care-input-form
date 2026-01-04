/**
 * 写真取得API
 * @see docs/FIREBASE_STORAGE_MIGRATION_SPEC.md
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getCarePhotos as getCarePhotosFromStorage} from "../services/storageService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  GetCarePhotosResponse,
  ErrorCodes,
} from "../types";

/**
 * getCarePhotos 関数本体
 */
async function getCarePhotosHandler(
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

    // クエリパラメータ取得
    const residentId = req.query.residentId as string;
    const date = req.query.date as string | undefined;
    const mealTime = req.query.mealTime as string | undefined;
    const source = req.query.source as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    // バリデーション
    if (!residentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "residentId is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // 日付形式バリデーション（指定された場合のみ）
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Invalid date format. Use YYYY-MM-DD.",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 200;

    functions.logger.info("getCarePhotos started", {
      residentId,
      date,
      mealTime,
      source,
      limit,
    });

    // Firestoreから写真を取得
    const photos = await getCarePhotosFromStorage(residentId, date, mealTime, source, limit);

    const responseData: GetCarePhotosResponse = {
      photos: photos.map((photo) => ({
        photoId: photo.photoId,
        residentId: photo.residentId,
        date: photo.date,
        mealTime: photo.mealTime,
        photoUrl: photo.photoUrl,
        storagePath: photo.storagePath,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        staffId: photo.staffId,
        staffName: photo.staffName,
        uploadedAt: photo.uploadedAt,
        postId: photo.postId,
        source: photo.source,
        // Chat画像メタデータ（Phase 52.3追加）
        chatMessageId: photo.chatMessageId,
        chatTags: photo.chatTags,
        chatContent: photo.chatContent,
      })),
    };

    const response: ApiResponse<GetCarePhotosResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("getCarePhotos completed", {
      count: photos.length,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getCarePhotos error", error);

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
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
export const getCarePhotos = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getCarePhotosHandler);
