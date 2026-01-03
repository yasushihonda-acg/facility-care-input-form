/**
 * 食事入力フォームのグローバル初期値設定API
 *
 * GET /getMealFormSettings - 設定を取得（全ユーザー）
 * POST /updateMealFormSettings?admin=true - 設定を更新（adminパラメータ必須）
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  MealFormSettings,
  UpdateMealFormSettingsRequest,
  ErrorCodes,
} from "../types";

const SETTINGS_COLLECTION = "settings";
const MEAL_FORM_SETTINGS_DOC = "mealFormDefaults";

// デフォルト設定値
const DEFAULT_SETTINGS: MealFormSettings = {
  defaultFacility: "",
  defaultResidentName: "",
  defaultDayServiceName: "",
  webhookUrl: "",
  importantWebhookUrl: "",
  familyNotifyWebhookUrl: "",
  updatedAt: new Date().toISOString(),
};

/**
 * 設定を取得するハンドラ
 */
async function getMealFormSettingsHandler(
  req: Request,
  res: Response
): Promise<void> {
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
      timestamp: new Date().toISOString(),
    };
    res.status(405).json(response);
    return;
  }

  try {
    const db = getFirestore();
    const docRef = db.collection(SETTINGS_COLLECTION).doc(MEAL_FORM_SETTINGS_DOC);
    const doc = await docRef.get();

    let settings: MealFormSettings;

    if (doc.exists) {
      settings = doc.data() as MealFormSettings;
    } else {
      // ドキュメントがない場合はデフォルト値を返す（作成はしない）
      settings = DEFAULT_SETTINGS;
    }

    const response: ApiResponse<MealFormSettings> = {
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("[getMealFormSettings] Error:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
}

/**
 * 設定を更新するハンドラ
 */
async function updateMealFormSettingsHandler(
  req: Request,
  res: Response
): Promise<void> {
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
      timestamp: new Date().toISOString(),
    };
    res.status(405).json(response);
    return;
  }

  // adminパラメータチェック
  const adminParam = req.query.admin;
  if (adminParam !== "true") {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: "Admin access required. Add ?admin=true to the URL.",
      },
      timestamp: new Date().toISOString(),
    };
    res.status(403).json(response);
    return;
  }

  try {
    const body = req.body as UpdateMealFormSettingsRequest;

    // 現在の設定を取得
    const db = getFirestore();
    const docRef = db.collection(SETTINGS_COLLECTION).doc(MEAL_FORM_SETTINGS_DOC);
    const doc = await docRef.get();

    let currentSettings: MealFormSettings;
    if (doc.exists) {
      currentSettings = doc.data() as MealFormSettings;
    } else {
      currentSettings = DEFAULT_SETTINGS;
    }

    // 更新する値をマージ
    const updatedSettings: MealFormSettings = {
      defaultFacility: body.defaultFacility ?? currentSettings.defaultFacility,
      defaultResidentName: body.defaultResidentName ?? currentSettings.defaultResidentName,
      defaultDayServiceName: body.defaultDayServiceName ?? currentSettings.defaultDayServiceName,
      webhookUrl: body.webhookUrl ?? currentSettings.webhookUrl ?? "",
      importantWebhookUrl: body.importantWebhookUrl ?? currentSettings.importantWebhookUrl ?? "",
      familyNotifyWebhookUrl: body.familyNotifyWebhookUrl ?? currentSettings.familyNotifyWebhookUrl ?? "",
      recordCheckHour: body.recordCheckHour ?? currentSettings.recordCheckHour ?? 16,
      hiddenSheets: body.hiddenSheets ?? currentSettings.hiddenSheets ?? [],
      updatedAt: new Date().toISOString(),
    };

    // Firestoreに保存
    await docRef.set(updatedSettings);

    functions.logger.info("[updateMealFormSettings] Settings updated:", updatedSettings);

    const response: ApiResponse<MealFormSettings> = {
      success: true,
      data: updatedSettings,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("[updateMealFormSettings] Error:", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    };
    res.status(500).json(response);
  }
}

/**
 * 設定を取得
 * GET /getMealFormSettings
 *
 * 全ユーザーがアクセス可能
 */
export const getMealFormSettings = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getMealFormSettingsHandler);

/**
 * 設定を更新
 * POST /updateMealFormSettings?admin=true
 *
 * admin=true クエリパラメータが必須
 */
export const updateMealFormSettings = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(updateMealFormSettingsHandler);
