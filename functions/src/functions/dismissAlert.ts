/**
 * アラート確認API (Phase 63)
 * - アラートを確認済みとしてFirestoreに保存
 * - 確認済みアラートは統計APIから除外される
 */

import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {ApiResponse, ErrorCodes} from "../types";

// Firestoreコレクション名
const DISMISSED_ALERTS_COLLECTION = "dismissed_alerts";

/**
 * アラート確認リクエスト型
 */
interface DismissAlertRequest {
  alertId: string;
  residentId: string;
  dismissedBy?: string;
}

/**
 * アラート確認レスポンス型
 */
interface DismissAlertResponse {
  alertId: string;
  dismissedAt: string;
}

/**
 * dismissAlert API
 * POST /dismissAlert
 */
export const dismissAlert = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "128MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(async (req, res) => {
    // CORS設定
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
        timestamp: new Date().toISOString(),
      };
      res.status(405).json(response);
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      const body = req.body as DismissAlertRequest;

      // バリデーション
      if (!body.alertId || typeof body.alertId !== "string") {
        const response: ApiResponse<null> = {
          success: false,
          error: {
            code: ErrorCodes.MISSING_REQUIRED_FIELD,
            message: "alertId is required",
          },
          timestamp,
        };
        res.status(400).json(response);
        return;
      }

      if (!body.residentId || typeof body.residentId !== "string") {
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

      functions.logger.info("dismissAlert request", {
        alertId: body.alertId,
        residentId: body.residentId,
      });

      const db = getFirestore();
      const now = Timestamp.now();

      // 確認済みアラートを保存（alertIdをドキュメントIDとして使用）
      const docRef = db.collection(DISMISSED_ALERTS_COLLECTION).doc(body.alertId);
      await docRef.set({
        alertId: body.alertId,
        residentId: body.residentId,
        dismissedAt: now,
        dismissedBy: body.dismissedBy || "unknown",
      });

      functions.logger.info("Alert dismissed", {
        alertId: body.alertId,
      });

      const response: ApiResponse<DismissAlertResponse> = {
        success: true,
        data: {
          alertId: body.alertId,
          dismissedAt: now.toDate().toISOString(),
        },
        timestamp,
      };

      res.status(200).json(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("dismissAlert error", {error: errorMsg});

      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.FIRESTORE_ERROR,
          message: errorMsg,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(500).json(response);
    }
  });
