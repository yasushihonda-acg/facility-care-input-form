/**
 * 品物管理 API
 * docs/ITEM_MANAGEMENT_SPEC.md に基づく
 *
 * 家族が入居者に送った品物（食品等）を管理するAPI
 * - submitCareItem: 品物登録（家族用）
 * - getCareItems: 品物一覧取得（全ロール）
 * - updateCareItem: 品物更新（家族/管理者）
 * - deleteCareItem: 品物削除（家族/管理者）
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  ErrorCodes,
  CareItem,
  SubmitCareItemRequest,
  SubmitCareItemResponse,
  GetCareItemsRequest,
  GetCareItemsResponse,
  ItemStatus,
  ItemCategory,
  MealFormSettings,
} from "../types";
import {
  sendToGoogleChat,
  formatCareItemNotification,
  CareItemNotifyData,
} from "../services/googleChatService";
import {logItemEvent, detectChanges} from "./itemEvents";

// Firestoreコレクション名
const CARE_ITEMS_COLLECTION = "care_items";

/**
 * CareItemInputのバリデーション
 */
function validateCareItemInput(
  body: unknown
): { valid: true; data: SubmitCareItemRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  // residentId
  if (!req.residentId || typeof req.residentId !== "string") {
    return {valid: false, error: "residentId is required"};
  }

  // userId
  if (!req.userId || typeof req.userId !== "string") {
    return {valid: false, error: "userId is required"};
  }

  // item
  if (!req.item || typeof req.item !== "object") {
    return {valid: false, error: "item is required"};
  }

  const item = req.item as Record<string, unknown>;

  // item.itemName
  if (!item.itemName || typeof item.itemName !== "string") {
    return {valid: false, error: "item.itemName is required"};
  }

  // item.category（Phase 31: 新2カテゴリ + 旧カテゴリも後方互換性のため許可）
  const validCategories = [
    "food", "drink", // 新カテゴリ
    "fruit", "snack", "dairy", "prepared", "supplement", "other", // 旧カテゴリ（後方互換）
  ];
  if (!item.category || !validCategories.includes(item.category as string)) {
    return {valid: false, error: "item.category must be one of: food, drink"};
  }

  // item.sentDate（オプショナル - UI非表示）
  // 形式チェックのみ（設定されている場合）
  if (item.sentDate !== undefined && typeof item.sentDate !== "string") {
    return {valid: false, error: "item.sentDate must be a string (YYYY-MM-DD) if provided"};
  }

  // item.quantity
  if (typeof item.quantity !== "number" || item.quantity < 1) {
    return {valid: false, error: "item.quantity must be a positive number"};
  }

  // item.unit
  if (!item.unit || typeof item.unit !== "string") {
    return {valid: false, error: "item.unit is required"};
  }

  // item.servingMethod（Phase 28で整理: cooled/blended削除）
  const validServingMethods = ["as_is", "cut", "peeled", "heated", "other"];
  if (!item.servingMethod || !validServingMethods.includes(item.servingMethod as string)) {
    return {valid: false, error: "item.servingMethod must be one of: " + validServingMethods.join(", ")};
  }

  // オプショナルフィールドの型チェック
  if (item.expirationDate !== undefined && typeof item.expirationDate !== "string") {
    return {valid: false, error: "item.expirationDate must be a string (YYYY-MM-DD)"};
  }

  const validStorageMethods = ["room_temp", "refrigerated", "frozen"];
  if (item.storageMethod !== undefined &&
      !validStorageMethods.includes(item.storageMethod as string)) {
    return {valid: false, error: "item.storageMethod must be one of: " + validStorageMethods.join(", ")};
  }

  return {
    valid: true,
    data: {
      residentId: req.residentId as string,
      userId: req.userId as string,
      item: {
        itemName: item.itemName as string,
        category: item.category as ItemCategory,
        sentDate: item.sentDate as string,
        quantity: item.quantity as number,
        unit: item.unit as string,
        expirationDate: item.expirationDate as string | undefined,
        storageMethod: item.storageMethod as "room_temp" | "refrigerated" | "frozen" | undefined,
        servingMethod: item.servingMethod as "as_is" | "cut" | "peeled" | "heated" | "other",
        servingMethodDetail: item.servingMethodDetail as string | undefined,
        plannedServeDate: item.plannedServeDate as string | undefined,
        noteToStaff: item.noteToStaff as string | undefined,
      },
    },
  };
}

/**
 * submitCareItem: 品物登録
 */
async function submitCareItemHandler(
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
    const validation = validateCareItemInput(req.body);
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

    const {residentId, userId, item} = validation.data;

    functions.logger.info("submitCareItem started", {
      residentId,
      userId,
      itemName: item.itemName,
    });

    // Firestoreに保存
    const db = getFirestore();
    const now = Timestamp.now();

    const careItemData: Omit<CareItem, "id"> = {
      residentId,
      userId,
      itemName: item.itemName,
      // 統計用の正規化名（未設定時はitemNameをフォールバック）
      normalizedName: item.normalizedName || item.itemName,
      category: item.category,
      sentDate: item.sentDate,
      quantity: item.quantity,
      unit: item.unit,
      expirationDate: item.expirationDate,
      storageMethod: item.storageMethod,
      servingMethod: item.servingMethod,
      servingMethodDetail: item.servingMethodDetail,
      plannedServeDate: item.plannedServeDate,
      // Phase 13.1: 構造化スケジュール
      servingSchedule: item.servingSchedule,
      noteToStaff: item.noteToStaff,
      // Phase 33: 残った場合の処置指示
      remainingHandlingInstruction: item.remainingHandlingInstruction,
      // Phase 54: 処置指示の条件
      remainingHandlingConditions: item.remainingHandlingConditions,
      status: "pending" as ItemStatus,
      remainingQuantity: item.quantity,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection(CARE_ITEMS_COLLECTION).add(careItemData);

    functions.logger.info("submitCareItem success", {
      itemId: docRef.id,
      itemName: item.itemName,
    });

    // Phase 58: 品物イベントログ（非同期・エラーでも処理続行）
    logItemEvent({
      itemId: docRef.id,
      itemName: item.itemName,
      eventType: "created",
      performedBy: userId,
      description: `${item.itemName} を新規登録しました`,
    }).catch((err) => {
      functions.logger.warn("submitCareItem event logging failed:", err);
    });

    // Phase 30: 家族操作通知（非同期・エラーでも処理続行）
    try {
      const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
      const settings = settingsDoc.exists ? (settingsDoc.data() as MealFormSettings) : null;

      if (settings?.familyNotifyWebhookUrl) {
        const notifyData: CareItemNotifyData = {
          itemName: item.itemName,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          expirationDate: item.expirationDate,
          noteToStaff: item.noteToStaff,
        };
        const message = formatCareItemNotification("register", notifyData, userId);
        sendToGoogleChat(settings.familyNotifyWebhookUrl, message).catch((err) => {
          functions.logger.warn("submitCareItem notification failed:", err);
        });
      }
    } catch (notifyError) {
      functions.logger.warn("submitCareItem notification setup failed:", notifyError);
    }

    const responseData: SubmitCareItemResponse = {
      itemId: docRef.id,
      createdAt: now.toDate().toISOString(),
    };

    const response: ApiResponse<SubmitCareItemResponse> = {
      success: true,
      data: responseData,
      timestamp,
    };
    res.status(201).json(response);
  } catch (error) {
    functions.logger.error("submitCareItem error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

/**
 * getCareItems: 品物一覧取得
 */
async function getCareItemsHandler(
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

    // クエリパラメータを取得
    const params: GetCareItemsRequest = {
      itemId: req.query.itemId as string | undefined,
      residentId: req.query.residentId as string | undefined,
      userId: req.query.userId as string | undefined,
      status: req.query.status as ItemStatus | ItemStatus[] | undefined,
      category: req.query.category as ItemCategory | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    };

    functions.logger.info("getCareItems started", params);

    const db = getFirestore();

    // itemIdが指定された場合は単一ドキュメントを直接取得
    if (params.itemId) {
      const docRef = db.collection(CARE_ITEMS_COLLECTION).doc(params.itemId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        const response: ApiResponse<GetCareItemsResponse> = {
          success: true,
          data: {
            items: [],
            total: 0,
            hasMore: false,
          },
          timestamp,
        };
        res.status(200).json(response);
        return;
      }

      const data = docSnap.data()!;
      const item: CareItem = {
        id: docSnap.id,
        residentId: data.residentId,
        userId: data.userId,
        itemName: data.itemName,
        normalizedName: data.normalizedName,
        category: data.category,
        sentDate: data.sentDate,
        quantity: data.quantity,
        unit: data.unit,
        expirationDate: data.expirationDate,
        storageMethod: data.storageMethod,
        servingMethod: data.servingMethod,
        servingMethodDetail: data.servingMethodDetail,
        plannedServeDate: data.plannedServeDate,
        servingSchedule: data.servingSchedule,
        noteToStaff: data.noteToStaff,
        remainingHandlingInstruction: data.remainingHandlingInstruction,
        remainingHandlingConditions: data.remainingHandlingConditions,
        remainingHandlingLogs: data.remainingHandlingLogs,
        actualServeDate: data.actualServeDate,
        servedQuantity: data.servedQuantity,
        servedBy: data.servedBy,
        consumptionRate: data.consumptionRate,
        consumptionStatus: data.consumptionStatus,
        consumptionNote: data.consumptionNote,
        recordedBy: data.recordedBy,
        noteToFamily: data.noteToFamily,
        status: data.status,
        remainingQuantity: data.remainingQuantity,
        currentQuantity: data.currentQuantity,
        consumptionSummary: data.consumptionSummary,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as CareItem;

      functions.logger.info("getCareItems by itemId success", {itemId: params.itemId});

      const response: ApiResponse<GetCareItemsResponse> = {
        success: true,
        data: {
          items: [item],
          total: 1,
          hasMore: false,
        },
        timestamp,
      };
      res.status(200).json(response);
      return;
    }

    let query = db.collection(CARE_ITEMS_COLLECTION)
      .orderBy("createdAt", "desc");

    // フィルタ適用
    if (params.residentId) {
      query = query.where("residentId", "==", params.residentId);
    }

    if (params.userId) {
      query = query.where("userId", "==", params.userId);
    }

    if (params.status) {
      if (Array.isArray(params.status)) {
        query = query.where("status", "in", params.status);
      } else {
        query = query.where("status", "==", params.status);
      }
    }

    if (params.category) {
      query = query.where("category", "==", params.category);
    }

    // 日付フィルタ（createdAtに変更 - sentDateはUI非表示）
    // startDate/endDateパラメータはcreatedAtでフィルタ
    if (params.startDate) {
      query = query.where("createdAt", ">=", new Date(params.startDate));
    }

    if (params.endDate) {
      // endDateの終端を含めるため、翌日の0時で比較
      const endDate = new Date(params.endDate);
      endDate.setDate(endDate.getDate() + 1);
      query = query.where("createdAt", "<", endDate);
    }

    // 総件数取得（ページネーション用）
    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    // ページネーション適用
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    const snapshot = await query.limit(limit).offset(offset).get();

    const items: CareItem[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        residentId: data.residentId,
        userId: data.userId,
        itemName: data.itemName,
        normalizedName: data.normalizedName,
        category: data.category,
        sentDate: data.sentDate,
        quantity: data.quantity,
        unit: data.unit,
        expirationDate: data.expirationDate,
        storageMethod: data.storageMethod,
        servingMethod: data.servingMethod,
        servingMethodDetail: data.servingMethodDetail,
        plannedServeDate: data.plannedServeDate,
        servingSchedule: data.servingSchedule,
        noteToStaff: data.noteToStaff,
        remainingHandlingInstruction: data.remainingHandlingInstruction,
        remainingHandlingConditions: data.remainingHandlingConditions,
        remainingHandlingLogs: data.remainingHandlingLogs,
        actualServeDate: data.actualServeDate,
        servedQuantity: data.servedQuantity,
        servedBy: data.servedBy,
        consumptionRate: data.consumptionRate,
        consumptionStatus: data.consumptionStatus,
        consumptionNote: data.consumptionNote,
        recordedBy: data.recordedBy,
        noteToFamily: data.noteToFamily,
        status: data.status,
        remainingQuantity: data.remainingQuantity,
        currentQuantity: data.currentQuantity,
        consumptionSummary: data.consumptionSummary,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as CareItem;
    });

    functions.logger.info("getCareItems success", {
      count: items.length,
      total,
    });

    const responseData: GetCareItemsResponse = {
      items,
      total,
      hasMore: offset + items.length < total,
    };

    const response: ApiResponse<GetCareItemsResponse> = {
      success: true,
      data: responseData,
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getCareItems error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

/**
 * updateCareItem: 品物更新
 */
async function updateCareItemHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "PUT, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "PUT") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use PUT.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    const body = req.body as Record<string, unknown>;
    const itemId = body.itemId as string;
    const updates = body.updates as Record<string, unknown>;

    if (!itemId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "itemId is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    if (!updates || typeof updates !== "object") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "updates is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    functions.logger.info("updateCareItem started", {itemId});

    const db = getFirestore();
    const docRef = db.collection(CARE_ITEMS_COLLECTION).doc(itemId);

    // ドキュメント存在確認と更新前データ取得
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          message: `CareItem with id ${itemId} not found`,
        },
        timestamp,
      };
      res.status(404).json(response);
      return;
    }

    // Phase 58: 更新前のデータを保存（イベントログ用）
    const oldData = docSnapshot.data() as Record<string, unknown>;

    // 更新不可フィールドを除外
    const {id: _id, createdAt: _createdAt, ...allowedUpdates} = updates as Record<string, unknown>;
    void _id;
    void _createdAt;

    // updatedAtを追加
    const updateData = {
      ...allowedUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await docRef.update(updateData);

    functions.logger.info("updateCareItem success", {itemId});

    // Phase 58: 品物イベントログ（非同期・エラーでも処理続行）
    const fieldsToTrack = [
      "itemName", "category", "quantity", "unit", "expirationDate",
      "storageMethod", "servingMethod", "servingMethodDetail",
      "noteToStaff", "remainingHandlingInstruction",
      "scheduleType", "scheduleDays", "specificDates", "scheduleTime",
    ];
    const changes = detectChanges(oldData, {...oldData, ...allowedUpdates}, fieldsToTrack);
    if (changes.length > 0) {
      logItemEvent({
        itemId,
        itemName: (oldData.itemName as string) || "不明",
        eventType: "updated",
        performedBy: (oldData.userId as string) || "不明",
        description: `${oldData.itemName} を編集しました`,
        changes,
      }).catch((err) => {
        functions.logger.warn("updateCareItem event logging failed:", err);
      });
    }

    // Phase 30: 家族操作通知（非同期・エラーでも処理続行）
    try {
      const settingsDocRef = db.collection("settings").doc("mealFormDefaults");
      const settingsDoc = await settingsDocRef.get();
      const settings = settingsDoc.exists ? (settingsDoc.data() as MealFormSettings) : null;

      if (settings?.familyNotifyWebhookUrl) {
        // 更新後のデータを取得
        const updatedDoc = await docRef.get();
        const updatedItem = updatedDoc.data() as CareItem;
        const notifyData: CareItemNotifyData = {
          itemName: updatedItem.itemName,
          category: updatedItem.category,
          quantity: updatedItem.quantity,
          unit: updatedItem.unit,
          expirationDate: updatedItem.expirationDate,
          noteToStaff: updatedItem.noteToStaff,
        };
        const message = formatCareItemNotification("update", notifyData, updatedItem.userId);
        sendToGoogleChat(settings.familyNotifyWebhookUrl, message).catch((err) => {
          functions.logger.warn("updateCareItem notification failed:", err);
        });
      }
    } catch (notifyError) {
      functions.logger.warn("updateCareItem notification setup failed:", notifyError);
    }

    const response: ApiResponse<{itemId: string; updatedAt: string}> = {
      success: true,
      data: {
        itemId,
        updatedAt: new Date().toISOString(),
      },
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("updateCareItem error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

/**
 * deleteCareItem: 品物削除
 */
async function deleteCareItemHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "DELETE") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use DELETE.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    const itemId = req.query.itemId as string || (req.body as Record<string, unknown>)?.itemId as string;

    if (!itemId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: "itemId is required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    functions.logger.info("deleteCareItem started", {itemId});

    const db = getFirestore();
    const docRef = db.collection(CARE_ITEMS_COLLECTION).doc(itemId);

    // ドキュメント存在確認（通知用に品物情報も取得）
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          message: `CareItem with id ${itemId} not found`,
        },
        timestamp,
      };
      res.status(404).json(response);
      return;
    }

    // 通知用に削除前の品物情報を保持
    const deletedItem = docSnapshot.data() as CareItem;

    await docRef.delete();

    functions.logger.info("deleteCareItem success", {itemId});

    // Phase 58: 品物イベントログ（非同期・エラーでも処理続行）
    logItemEvent({
      itemId,
      itemName: deletedItem.itemName,
      eventType: "deleted",
      performedBy: deletedItem.userId,
      description: `${deletedItem.itemName} を削除しました`,
    }).catch((err) => {
      functions.logger.warn("deleteCareItem event logging failed:", err);
    });

    // Phase 30.1: 削除通知を非同期で送信
    try {
      const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
      const settings = settingsDoc.exists ?
        (settingsDoc.data() as MealFormSettings) : null;

      if (settings?.familyNotifyWebhookUrl) {
        const notifyData: CareItemNotifyData = {
          itemName: deletedItem.itemName,
          category: deletedItem.category,
          quantity: deletedItem.quantity,
          unit: deletedItem.unit,
        };
        const message = formatCareItemNotification("delete", notifyData, deletedItem.userId);
        sendToGoogleChat(settings.familyNotifyWebhookUrl, message).catch((err) => {
          functions.logger.warn("deleteCareItem notification failed:", err);
        });
      }
    } catch (notifyError) {
      functions.logger.warn("deleteCareItem notification error:", notifyError);
    }

    const response: ApiResponse<null> = {
      success: true,
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("deleteCareItem error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

// =============================================================================
// Cloud Functions エクスポート
// =============================================================================

export const submitCareItem = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(submitCareItemHandler);

export const getCareItems = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getCareItemsHandler);

export const updateCareItem = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(updateCareItemHandler);

export const deleteCareItem = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(deleteCareItemHandler);
