/**
 * Flow B: 食事記録入力関数
 * スタッフが食事記録をSheet Bに記録
 * docs/MEAL_INPUT_FORM_SPEC.md に基づく
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore} from "firebase-admin/firestore";
import {appendMealRecordToSheetB} from "../services/sheetsService";
import {notifyMealRecord} from "../services/googleChatService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  SubmitMealRecordRequest,
  MealFormSettings,
  MealRecordForChat,
  ErrorCodes,
  SnackRecord,
} from "../types";
import {
  createConsumptionLogsFromSnackRecords,
  generateSnackTextFromRecords,
} from "../services/consumptionLogService";

/**
 * 食事記録レスポンス型
 */
interface SubmitMealRecordResponse {
  postId: string;
  sheetRow: number;
}

/**
 * リクエストのバリデーション
 * docs/MEAL_INPUT_FORM_SPEC.md に基づく
 * Phase 13.0.4: recordMode='snack_only' 対応
 * docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2.5
 */
function validateRequest(
  body: unknown
): { valid: true; data: SubmitMealRecordRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;
  const recordMode = (req.recordMode as string) || "full";

  // staffNameは常に必須
  if (!req.staffName || typeof req.staffName !== "string") {
    return {valid: false, error: "staffName is required"};
  }

  // snack_onlyモードの場合: snackRecordsが必須、他の必須フィールドはスキップ
  if (recordMode === "snack_only") {
    if (!req.snackRecords || !Array.isArray(req.snackRecords) ||
        req.snackRecords.length === 0) {
      return {valid: false, error: "snackRecords is required for snack_only mode"};
    }

    return {
      valid: true,
      data: {
        recordMode: "snack_only",
        staffName: req.staffName as string,
        facility: req.facility as string | undefined,
        residentName: req.residentName as string | undefined,
        snack: req.snack as string | undefined,
        note: req.note as string | undefined,
        snackRecords: req.snackRecords as SnackRecord[],
        residentId: req.residentId as string | undefined,
      },
    };
  }

  // fullモード: 従来通りの必須バリデーション
  if (!req.facility || typeof req.facility !== "string") {
    return {valid: false, error: "facility is required"};
  }

  if (!req.residentName || typeof req.residentName !== "string") {
    return {valid: false, error: "residentName is required"};
  }

  if (!req.dayServiceUsage ||
      !["利用中", "利用中ではない"].includes(req.dayServiceUsage as string)) {
    return {valid: false, error: "dayServiceUsage must be '利用中' or '利用中ではない'"};
  }

  if (!req.mealTime || !["朝", "昼", "夜"].includes(req.mealTime as string)) {
    return {valid: false, error: "mealTime must be '朝', '昼', or '夜'"};
  }

  if (!req.isImportant ||
      !["重要", "重要ではない"].includes(req.isImportant as string)) {
    return {valid: false, error: "isImportant must be '重要' or '重要ではない'"};
  }

  // 条件付き必須: デイサービス利用中の場合はデイサービス名が必須
  if (req.dayServiceUsage === "利用中" &&
      (!req.dayServiceName || typeof req.dayServiceName !== "string")) {
    return {valid: false, error: "dayServiceName is required when dayServiceUsage is '利用中'"};
  }

  return {
    valid: true,
    data: {
      recordMode: "full",
      staffName: req.staffName as string,
      facility: req.facility as string,
      residentName: req.residentName as string,
      dayServiceUsage: req.dayServiceUsage as "利用中" | "利用中ではない",
      mealTime: req.mealTime as "朝" | "昼" | "夜",
      isImportant: req.isImportant as "重要" | "重要ではない",
      dayServiceName: req.dayServiceName as string | undefined,
      mainDishRatio: req.mainDishRatio as string | undefined,
      sideDishRatio: req.sideDishRatio as string | undefined,
      injectionType: req.injectionType as string | undefined,
      injectionAmount: req.injectionAmount as string | undefined,
      snack: req.snack as string | undefined,
      note: req.note as string | undefined,
      // 間食記録連携用（オプショナル）
      snackRecords: req.snackRecords as SnackRecord[] | undefined,
      residentId: req.residentId as string | undefined,
    },
  };
}

/**
 * submitMealRecord 関数本体
 */
async function submitMealRecordHandler(
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

    const mealRecord = validation.data;

    // snackRecords がある場合は snack テキストを自動生成し、既存テキストと連結
    if (mealRecord.snackRecords && mealRecord.snackRecords.length > 0) {
      const generatedSnackText = generateSnackTextFromRecords(
        mealRecord.snackRecords
      );
      if (mealRecord.snack) {
        // 両方ある場合は連結（提供記録 + 補足）
        mealRecord.snack = `${generatedSnackText}。${mealRecord.snack}`;
      } else {
        mealRecord.snack = generatedSnackText;
      }
    }

    const isSnackOnlyMode = mealRecord.recordMode === "snack_only";

    functions.logger.info("submitMealRecord started", {
      staffName: mealRecord.staffName,
      residentName: mealRecord.residentName,
      facility: mealRecord.facility,
      mealTime: mealRecord.mealTime,
      recordMode: mealRecord.recordMode || "full",
      hasSnackRecords: !!mealRecord.snackRecords?.length,
    });

    // Sheet B に追記
    const {sheetRow, postId} = await appendMealRecordToSheetB(mealRecord);

    // Google Chat Webhook通知（非同期・エラーでも処理続行）
    // snack_onlyモードの場合はWebhook通知をスキップ
    if (!isSnackOnlyMode) {
      try {
        // Firestoreから設定を取得
        const db = getFirestore();
        const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
        const settings = settingsDoc.exists ?
          (settingsDoc.data() as MealFormSettings) :
          null;

        if (settings && (settings.webhookUrl || settings.importantWebhookUrl)) {
          // Webhook送信用データを作成
          const chatRecord: MealRecordForChat = {
            facility: mealRecord.facility || "",
            residentName: mealRecord.residentName || "",
            staffName: mealRecord.staffName,
            mealTime: mealRecord.mealTime || "朝",
            mainDishRatio: mealRecord.mainDishRatio,
            sideDishRatio: mealRecord.sideDishRatio,
            injectionType: mealRecord.injectionType,
            injectionAmount: mealRecord.injectionAmount,
            note: mealRecord.note,
            postId: postId,
          };

          // 重要フラグの判定
          const isImportant = mealRecord.isImportant === "重要";

          // Webhook送信（非同期で実行、結果を待たない）
          notifyMealRecord(
            chatRecord,
            settings.webhookUrl,
            settings.importantWebhookUrl,
            isImportant
          ).catch((webhookError) => {
            functions.logger.warn("Webhook notification failed:", webhookError);
          });
        }
      } catch (webhookError) {
        // Webhookエラーは記録成功には影響させない
        functions.logger.warn("Webhook setup failed:", webhookError);
      }
    }

    // 間食記録から消費ログを作成（非同期・エラーでも処理続行）
    let consumptionLogResult: {createdCount: number; errors: string[]} | null =
      null;
    if (mealRecord.snackRecords && mealRecord.snackRecords.length > 0) {
      try {
        consumptionLogResult = await createConsumptionLogsFromSnackRecords(
          mealRecord.snackRecords,
          mealRecord.staffName,
          postId
        );
        functions.logger.info("Consumption logs created", {
          createdCount: consumptionLogResult.createdCount,
          errors: consumptionLogResult.errors,
        });
      } catch (consumptionError) {
        // 消費ログエラーは記録成功には影響させない
        functions.logger.warn("Consumption log creation failed:", consumptionError);
      }
    }

    const responseData: SubmitMealRecordResponse = {
      postId,
      sheetRow,
    };

    const response: ApiResponse<SubmitMealRecordResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("submitMealRecord completed", {
      postId,
      sheetRow,
      residentName: mealRecord.residentName,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("submitMealRecord error", error);

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
export const submitMealRecord = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(submitMealRecordHandler);
