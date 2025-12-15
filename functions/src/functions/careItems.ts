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
} from "../types";

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

  // item.category
  const validCategories: ItemCategory[] = [
    "fruit", "snack", "drink", "dairy", "prepared", "supplement", "other",
  ];
  if (!item.category || !validCategories.includes(item.category as ItemCategory)) {
    return {valid: false, error: "item.category must be one of: " + validCategories.join(", ")};
  }

  // item.sentDate
  if (!item.sentDate || typeof item.sentDate !== "string") {
    return {valid: false, error: "item.sentDate is required (YYYY-MM-DD)"};
  }

  // item.quantity
  if (typeof item.quantity !== "number" || item.quantity < 1) {
    return {valid: false, error: "item.quantity must be a positive number"};
  }

  // item.unit
  if (!item.unit || typeof item.unit !== "string") {
    return {valid: false, error: "item.unit is required"};
  }

  // item.servingMethod
  const validServingMethods = ["as_is", "cut", "peeled", "heated", "cooled", "blended", "other"];
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
        servingMethod: item.servingMethod as "as_is" | "cut" | "peeled" | "heated" | "cooled" | "blended" | "other",
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
      category: item.category,
      sentDate: item.sentDate,
      quantity: item.quantity,
      unit: item.unit,
      expirationDate: item.expirationDate,
      storageMethod: item.storageMethod,
      servingMethod: item.servingMethod,
      servingMethodDetail: item.servingMethodDetail,
      plannedServeDate: item.plannedServeDate,
      noteToStaff: item.noteToStaff,
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
    let query = db.collection(CARE_ITEMS_COLLECTION)
      .orderBy("sentDate", "desc")
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

    // 日付フィルタ（sentDate）
    if (params.startDate) {
      query = query.where("sentDate", ">=", params.startDate);
    }

    if (params.endDate) {
      query = query.where("sentDate", "<=", params.endDate);
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
        category: data.category,
        sentDate: data.sentDate,
        quantity: data.quantity,
        unit: data.unit,
        expirationDate: data.expirationDate,
        storageMethod: data.storageMethod,
        servingMethod: data.servingMethod,
        servingMethodDetail: data.servingMethodDetail,
        plannedServeDate: data.plannedServeDate,
        noteToStaff: data.noteToStaff,
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

    // ドキュメント存在確認
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

    // ドキュメント存在確認
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

    await docRef.delete();

    functions.logger.info("deleteCareItem success", {itemId});

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
