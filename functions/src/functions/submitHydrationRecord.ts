/**
 * Phase 29: 水分記録入力関数
 * スタッフが水分記録を水分摂取量シートに記録
 * docs/STAFF_RECORD_FORM_SPEC.md セクション7.3に基づく
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore} from "firebase-admin/firestore";
import {appendHydrationRecordToSheet} from "../services/sheetsService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  SubmitHydrationRecordRequest,
  MealFormSettings,
  ErrorCodes,
} from "../types";
import {updateDailyRecordLog} from "../services/dailyRecordLogService";

/**
 * 水分記録レスポンス型
 */
interface SubmitHydrationRecordResponse {
  postId: string;
  sheetRow: number;
}

/**
 * リクエストのバリデーション
 */
function validateRequest(
  body: unknown
): { valid: true; data: SubmitHydrationRecordRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  // 必須フィールド
  if (!req.staffName || typeof req.staffName !== "string") {
    return {valid: false, error: "staffName is required"};
  }

  if (!req.residentName || typeof req.residentName !== "string") {
    return {valid: false, error: "residentName is required"};
  }

  if (typeof req.hydrationAmount !== "number" || req.hydrationAmount <= 0) {
    return {valid: false, error: "hydrationAmount must be a positive number"};
  }

  if (!req.facility || typeof req.facility !== "string") {
    return {valid: false, error: "facility is required"};
  }

  if (!req.isImportant ||
      !["重要", "重要ではない"].includes(req.isImportant as string)) {
    return {valid: false, error: "isImportant must be '重要' or '重要ではない'"};
  }

  if (!req.dayServiceUsage ||
      !["利用中", "利用中ではない"].includes(req.dayServiceUsage as string)) {
    return {valid: false, error: "dayServiceUsage must be '利用中' or '利用中ではない'"};
  }

  // 条件付き必須: デイサービス利用中の場合はデイサービス名が必須
  if (req.dayServiceUsage === "利用中" &&
      (!req.dayServiceName || typeof req.dayServiceName !== "string")) {
    return {valid: false, error: "dayServiceName is required when dayServiceUsage is '利用中'"};
  }

  return {
    valid: true,
    data: {
      staffName: req.staffName as string,
      residentName: req.residentName as string,
      residentId: req.residentId as string | undefined,
      hydrationAmount: req.hydrationAmount as number,
      note: req.note as string | undefined,
      isImportant: req.isImportant as "重要" | "重要ではない",
      facility: req.facility as string,
      dayServiceUsage: req.dayServiceUsage as "利用中" | "利用中ではない",
      dayServiceName: req.dayServiceName as string | undefined,
      itemId: req.itemId as string | undefined,
      itemName: req.itemName as string | undefined,
      servedQuantity: req.servedQuantity as number | undefined,
      unit: req.unit as string | undefined,
    },
  };
}

/**
 * Google Chat Webhook用メッセージを生成
 * 正しいフォーマット例:
 * 【七福の里215_蒲地 キヌヱ様(ID7282)】
 * #水分摂取 💧
 * 記録者：ヴィ
 * 摂取量：150cc
 * 特記事項：【ケアに関すること】
 * 【ACPiece】
 * 【投稿ID】：HYD...
 */
function buildWebhookMessage(
  record: SubmitHydrationRecordRequest,
  postId: string
): string {
  const parts: string[] = [];

  // 「様」の重複を防ぐ
  const residentNameWithoutSama = record.residentName.replace(/様$/, "");

  // ヘッダー: 施設名 + 入居者名
  parts.push(`【${record.facility}${residentNameWithoutSama}様】`);

  // タグ
  parts.push("#水分摂取 💧");
  if (record.isImportant === "重要") {
    parts.push("#重要 ⚠️");
  }
  if (record.dayServiceUsage === "利用中" && record.dayServiceName) {
    parts.push(`#デイ利用中[${record.dayServiceName}]`);
  }

  parts.push("");
  parts.push(`記録者：${record.staffName}`);

  parts.push("");
  parts.push(`摂取量：${record.hydrationAmount}cc`);

  if (record.note) {
    parts.push("");
    parts.push(`特記事項：${record.note}`);
  }

  parts.push("");
  parts.push("【ACPiece】");

  parts.push("");
  parts.push(`【投稿ID】：${postId}`);

  return parts.join("\n");
}

/**
 * Webhook送信
 */
async function sendWebhookNotification(
  webhookUrl: string,
  message: string
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text: message}),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }
  } catch (error) {
    functions.logger.warn("Webhook notification failed:", error);
  }
}

/**
 * submitHydrationRecord 関数本体
 */
async function submitHydrationRecordHandler(
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

    const hydrationRecord = validation.data;

    functions.logger.info("submitHydrationRecord started", {
      staffName: hydrationRecord.staffName,
      residentName: hydrationRecord.residentName,
      hydrationAmount: hydrationRecord.hydrationAmount,
      facility: hydrationRecord.facility,
    });

    // 水分摂取量シートに追記
    const {sheetRow, postId} = await appendHydrationRecordToSheet(hydrationRecord);

    // Google Chat Webhook通知（非同期・エラーでも処理続行）
    try {
      const db = getFirestore();
      const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
      const settings = settingsDoc.exists ?
        (settingsDoc.data() as MealFormSettings) :
        null;

      if (settings && settings.webhookUrl) {
        const webhookMessage = buildWebhookMessage(hydrationRecord, postId);
        const isImportant = hydrationRecord.isImportant === "重要";

        // 通常Webhookに送信（全記録）
        sendWebhookNotification(settings.webhookUrl, webhookMessage);

        // 重要フラグが立っている場合は追加で重要Webhookにも送信
        if (isImportant && settings.importantWebhookUrl) {
          sendWebhookNotification(settings.importantWebhookUrl, webhookMessage);
        }
      }
    } catch (webhookError) {
      functions.logger.warn("Webhook setup failed:", webhookError);
    }

    const responseData: SubmitHydrationRecordResponse = {
      postId,
      sheetRow,
    };

    const response: ApiResponse<SubmitHydrationRecordResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("submitHydrationRecord completed", {
      postId,
      sheetRow,
      residentName: hydrationRecord.residentName,
    });

    // Phase 30: 日次記録ログ更新（非同期・エラーでも処理続行）
    updateDailyRecordLog("hydration").catch((err) => {
      functions.logger.warn("submitHydrationRecord daily log update failed:", err);
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("submitHydrationRecord error", error);

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
export const submitHydrationRecord = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(submitHydrationRecordHandler);
