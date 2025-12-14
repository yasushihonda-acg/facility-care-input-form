/**
 * 食事入力フォームのグローバル初期値設定API
 *
 * GET /getMealFormSettings - 設定を取得（全ユーザー）
 * POST /updateMealFormSettings?admin=true - 設定を更新（adminパラメータ必須）
 */

import {onRequest} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
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
  updatedAt: new Date().toISOString(),
};

/**
 * 設定を取得
 * GET /getMealFormSettings
 *
 * 全ユーザーがアクセス可能
 */
export const getMealFormSettings = onRequest(
  {region: "asia-northeast1", cors: true},
  async (req, res) => {
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
      console.error("[getMealFormSettings] Error:", error);
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
);

/**
 * 設定を更新
 * POST /updateMealFormSettings?admin=true
 *
 * admin=true クエリパラメータが必須
 */
export const updateMealFormSettings = onRequest(
  {region: "asia-northeast1", cors: true},
  async (req, res) => {
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
        updatedAt: new Date().toISOString(),
      };

      // Firestoreに保存
      await docRef.set(updatedSettings);

      console.log("[updateMealFormSettings] Settings updated:", updatedSettings);

      const response: ApiResponse<MealFormSettings> = {
        success: true,
        data: updatedSettings,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("[updateMealFormSettings] Error:", error);
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
);
