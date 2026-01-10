/**
 * 消費ログ API
 * docs/INVENTORY_CONSUMPTION_SPEC.md に基づく
 *
 * スタッフが記録する提供・摂食の履歴を管理するAPI
 * - recordConsumptionLog: 消費ログ記録（スタッフ用）
 * - getConsumptionLogs: 消費ログ一覧取得（全ロール）
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  ErrorCodes,
  RecordConsumptionLogRequest,
  RecordConsumptionLogResponse,
  GetConsumptionLogsRequest,
  GetConsumptionLogsResponse,
  ConsumptionLog,
  ConsumptionStatus,
  ItemStatus,
  MealTime,
  CareItem,
  RemainingHandling,
  RemainingHandlingLog,
} from "../types";
import {calculateConsumptionAmounts} from "../utils/consumptionCalc";
import {getTodayString} from "../utils/scheduleUtils";

// Firestoreコレクション名
const CARE_ITEMS_COLLECTION = "care_items";
const CONSUMPTION_LOGS_SUBCOLLECTION = "consumption_logs";

// =============================================================================
// バリデーション
// =============================================================================

/**
 * RecordConsumptionLogRequestのバリデーション
 */
function validateRecordConsumptionLogRequest(
  body: unknown
): { valid: true; data: RecordConsumptionLogRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;

  // itemId
  if (!req.itemId || typeof req.itemId !== "string") {
    return {valid: false, error: "itemId is required"};
  }

  // servedDate (YYYY-MM-DD)
  if (!req.servedDate || typeof req.servedDate !== "string") {
    return {valid: false, error: "servedDate is required (YYYY-MM-DD)"};
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.servedDate)) {
    return {valid: false, error: "servedDate must be in YYYY-MM-DD format"};
  }

  // servedQuantity
  if (typeof req.servedQuantity !== "number" || req.servedQuantity <= 0) {
    return {valid: false, error: "servedQuantity must be a positive number"};
  }

  // servedBy
  if (!req.servedBy || typeof req.servedBy !== "string") {
    return {valid: false, error: "servedBy is required"};
  }

  // consumedQuantity
  if (typeof req.consumedQuantity !== "number" || req.consumedQuantity < 0) {
    return {valid: false, error: "consumedQuantity must be a non-negative number"};
  }

  if (req.consumedQuantity > req.servedQuantity) {
    return {valid: false, error: "consumedQuantity cannot exceed servedQuantity"};
  }

  // consumptionStatus
  const validStatuses: ConsumptionStatus[] = ["full", "most", "half", "little", "none"];
  if (!req.consumptionStatus || !validStatuses.includes(req.consumptionStatus as ConsumptionStatus)) {
    return {valid: false, error: "consumptionStatus must be one of: " + validStatuses.join(", ")};
  }

  // recordedBy
  if (!req.recordedBy || typeof req.recordedBy !== "string") {
    return {valid: false, error: "recordedBy is required"};
  }

  // mealTime (optional)
  if (req.mealTime !== undefined) {
    const validMealTimes: MealTime[] = ["breakfast", "lunch", "dinner", "snack"];
    if (!validMealTimes.includes(req.mealTime as MealTime)) {
      return {valid: false, error: "mealTime must be one of: " + validMealTimes.join(", ")};
    }
  }

  // Phase 15.7: remainingHandling (optional)
  if (req.remainingHandling !== undefined) {
    const validHandlings: RemainingHandling[] = ["discarded", "stored", "other"];
    if (!validHandlings.includes(req.remainingHandling as RemainingHandling)) {
      return {valid: false, error: "remainingHandling must be one of: " + validHandlings.join(", ")};
    }
  }

  return {
    valid: true,
    data: {
      itemId: req.itemId as string,
      servedDate: req.servedDate as string,
      servedTime: req.servedTime as string | undefined,
      mealTime: req.mealTime as MealTime | undefined,
      servedQuantity: req.servedQuantity as number,
      servedBy: req.servedBy as string,
      consumedQuantity: req.consumedQuantity as number,
      consumptionStatus: req.consumptionStatus as ConsumptionStatus,
      consumptionNote: req.consumptionNote as string | undefined,
      noteToFamily: req.noteToFamily as string | undefined,
      recordedBy: req.recordedBy as string,
      // Phase 15.7: 残り対応
      remainingHandling: req.remainingHandling as RemainingHandling | undefined,
      remainingHandlingOther: req.remainingHandlingOther as string | undefined,
      // Phase 29: 水分量（飲み物カテゴリの場合）
      hydrationAmount: typeof req.hydrationAmount === "number" ? req.hydrationAmount : undefined,
      // Sheet A検索用タイムスタンプ（水分記録編集時に使用）
      sheetTimestamp: typeof req.sheetTimestamp === "string" ? req.sheetTimestamp : undefined,
    },
  };
}

// =============================================================================
// ステータス判定ロジック
// =============================================================================

/**
 * 品物のステータスを判定
 */
function determineItemStatus(
  currentQuantity: number,
  expirationDate: string | undefined,
  consumptionSummary: { totalServed: number }
): ItemStatus {
  const today = getTodayString();

  // 期限切れチェック
  if (expirationDate && expirationDate < today) {
    return "expired";
  }

  // 残量ゼロ = 消費完了
  if (currentQuantity <= 0) {
    return "consumed";
  }

  // 一度でも提供していれば in_progress
  if (consumptionSummary.totalServed > 0) {
    return "in_progress";
  }

  // まだ一度も提供していない
  return "pending";
}

// =============================================================================
// Handler: recordConsumptionLog
// =============================================================================

/**
 * 消費ログを記録
 * トランザクションでCareItemも更新
 */
async function recordConsumptionLogHandler(
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
    const validation = validateRecordConsumptionLogRequest(req.body);
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

    const input = validation.data;

    functions.logger.info("recordConsumptionLog started", {
      itemId: input.itemId,
      servedQuantity: input.servedQuantity,
      consumedQuantity: input.consumedQuantity,
    });

    const db = getFirestore();
    const itemRef = db.collection(CARE_ITEMS_COLLECTION).doc(input.itemId);

    // トランザクションで処理
    const result = await db.runTransaction(async (transaction) => {
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists) {
        throw new Error("Item not found");
      }

      const item = itemDoc.data() as CareItem;

      // 現在の残量を取得（currentQuantityがなければremainingQuantityを使用）
      const currentQty = item.currentQuantity ?? item.remainingQuantity ?? item.quantity ?? 0;

      // バリデーション: 提供数量が残量を超えていないか
      if (input.servedQuantity > currentQty) {
        throw new Error(`提供数量(${input.servedQuantity})が残量(${currentQty})を超えています`);
      }

      // 摂食率を計算
      const consumptionRate = input.servedQuantity > 0 ?
        Math.round((input.consumedQuantity / input.servedQuantity) * 100) :
        0;

      // Phase 15.7: 残り対応に基づいて消費量を計算
      const amounts = calculateConsumptionAmounts(
        input.servedQuantity,
        consumptionRate,
        input.remainingHandling
      );

      // 新しい残量を計算（inventoryDeductedを使用）
      const newQuantity = currentQty - amounts.inventoryDeducted;

      // 既存のサマリーを取得
      const existingSummary = item.consumptionSummary ?? {
        totalServed: 0,
        totalServedQuantity: 0,
        totalConsumedQuantity: 0,
        avgConsumptionRate: 0,
      };

      // 新しいサマリーを計算
      const newTotalServed = existingSummary.totalServed + 1;
      const newTotalServedQty = existingSummary.totalServedQuantity + input.servedQuantity;
      const newTotalConsumedQty = existingSummary.totalConsumedQuantity + input.consumedQuantity;
      const newAvgRate = newTotalServedQty > 0 ?
        Math.round((newTotalConsumedQty / newTotalServedQty) * 100) :
        0;

      const newSummary = {
        totalServed: newTotalServed,
        totalServedQuantity: newTotalServedQty,
        totalConsumedQuantity: newTotalConsumedQty,
        avgConsumptionRate: newAvgRate,
        lastServedDate: input.servedDate,
        lastServedBy: input.servedBy,
      };

      // ステータスを判定
      const newStatus = determineItemStatus(
        newQuantity,
        item.expirationDate,
        newSummary
      );

      // 消費ログを作成
      const logRef = itemRef.collection(CONSUMPTION_LOGS_SUBCOLLECTION).doc();
      const now = Timestamp.now();

      const logData = {
        id: logRef.id,
        itemId: input.itemId,
        servedDate: input.servedDate,
        servedTime: input.servedTime ?? null,
        mealTime: input.mealTime ?? null,
        servedQuantity: input.servedQuantity,
        servedBy: input.servedBy,
        consumedQuantity: input.consumedQuantity,
        consumptionRate,
        consumptionStatus: input.consumptionStatus,
        // Phase 15.7: 残り対応による在庫・統計分離
        remainingHandling: input.remainingHandling ?? null,
        remainingHandlingOther: input.remainingHandlingOther ?? null,
        inventoryDeducted: amounts.inventoryDeducted,
        wastedQuantity: amounts.wastedQuantity,
        quantityBefore: currentQty,
        quantityAfter: newQuantity,
        consumptionNote: input.consumptionNote ?? null,
        noteToFamily: input.noteToFamily ?? null,
        recordedBy: input.recordedBy,
        recordedAt: now,
        // Phase 29: 水分量（飲み物カテゴリの場合）
        hydrationAmount: input.hydrationAmount ?? null,
        // Sheet A検索用タイムスタンプ（水分記録編集時に使用）
        sheetTimestamp: input.sheetTimestamp ?? null,
      };

      transaction.set(logRef, logData);

      // Phase 58: remainingHandlingが 'discarded' または 'stored' の場合、
      // remainingHandlingLogs 配列に追加（「残り対応」タブに表示するため）
      const updateData: Record<string, unknown> = {
        currentQuantity: newQuantity,
        remainingQuantity: newQuantity, // 互換性のため
        status: newStatus,
        consumptionSummary: newSummary,
        // 旧フィールドも更新（互換性のため）
        actualServeDate: input.servedDate,
        servedQuantity: input.servedQuantity,
        servedBy: input.servedBy,
        consumptionRate,
        consumptionStatus: input.consumptionStatus,
        consumptionNote: input.consumptionNote ?? FieldValue.delete(),
        noteToFamily: input.noteToFamily ?? FieldValue.delete(),
        recordedBy: input.recordedBy,
        updatedAt: now,
      };

      // 残り対応がある場合、ログを追加
      if (input.remainingHandling === "discarded" || input.remainingHandling === "stored") {
        const remainingQuantity = input.servedQuantity - input.consumedQuantity;
        const handlingLog: RemainingHandlingLog = {
          id: `RHL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          handling: input.remainingHandling,
          quantity: remainingQuantity,
          note: input.remainingHandlingOther || undefined,
          recordedBy: input.recordedBy,
          recordedAt: now.toDate().toISOString(),
        };
        updateData.remainingHandlingLogs = FieldValue.arrayUnion(handlingLog);
      }

      // CareItemを更新
      transaction.update(itemRef, updateData);

      return {
        logId: logRef.id,
        currentQuantity: newQuantity,
        status: newStatus,
        // Phase 15.7: 追加フィールド
        inventoryDeducted: amounts.inventoryDeducted,
        wastedQuantity: amounts.wastedQuantity,
      };
    });

    functions.logger.info("recordConsumptionLog success", {
      logId: result.logId,
      itemId: input.itemId,
      currentQuantity: result.currentQuantity,
      status: result.status,
      inventoryDeducted: result.inventoryDeducted,
      wastedQuantity: result.wastedQuantity,
    });

    const responseData: RecordConsumptionLogResponse = {
      logId: result.logId,
      itemId: input.itemId,
      currentQuantity: result.currentQuantity,
      status: result.status,
      // Phase 15.7: 追加フィールド
      inventoryDeducted: result.inventoryDeducted,
      wastedQuantity: result.wastedQuantity,
    };

    const response: ApiResponse<RecordConsumptionLogResponse> = {
      success: true,
      data: responseData,
      timestamp,
    };
    res.status(201).json(response);
  } catch (error) {
    functions.logger.error("recordConsumptionLog error", error);

    const isValidationError = error instanceof Error &&
      (error.message.includes("not found") || error.message.includes("超えています"));

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: isValidationError ? ErrorCodes.INVALID_REQUEST : ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(isValidationError ? 400 : 500).json(response);
  }
}

// =============================================================================
// Handler: getConsumptionLogs
// =============================================================================

/**
 * 消費ログ一覧を取得
 */
async function getConsumptionLogsHandler(
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

    const params = req.query as unknown as GetConsumptionLogsRequest;

    // itemIdは必須
    if (!params.itemId) {
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

    functions.logger.info("getConsumptionLogs started", {
      itemId: params.itemId,
      startDate: params.startDate,
      endDate: params.endDate,
      limit: params.limit,
    });

    const db = getFirestore();
    const logsRef = db
      .collection(CARE_ITEMS_COLLECTION)
      .doc(params.itemId)
      .collection(CONSUMPTION_LOGS_SUBCOLLECTION);

    // limit
    const limit = params.limit ? parseInt(String(params.limit), 10) : 50;

    // 日付フィルタがなく、limit=1の場合は単純なクエリを使用
    // （複合インデックス不要、inventoryStats.ts と同じパターン）
    const hasDateFilter = params.startDate || params.endDate;
    let query;

    if (!hasDateFilter && limit === 1) {
      // 最新1件のみ取得する場合は recordedAt のみでソート
      query = logsRef.orderBy("recordedAt", "desc").limit(1);
    } else {
      // 日付フィルタがある場合や複数件取得の場合は従来のクエリ
      query = logsRef.orderBy("servedDate", "desc").orderBy("recordedAt", "desc");

      if (params.startDate) {
        query = query.where("servedDate", ">=", params.startDate);
      }
      if (params.endDate) {
        query = query.where("servedDate", "<=", params.endDate);
      }

      query = query.limit(limit);
    }

    const snapshot = await query.get();

    const logs: ConsumptionLog[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        itemId: data.itemId,
        servedDate: data.servedDate,
        servedTime: data.servedTime ?? undefined,
        mealTime: data.mealTime ?? undefined,
        servedQuantity: data.servedQuantity,
        servedBy: data.servedBy,
        consumedQuantity: data.consumedQuantity,
        consumptionRate: data.consumptionRate,
        consumptionStatus: data.consumptionStatus,
        // Phase 15.7: 残り対応フィールド
        remainingHandling: data.remainingHandling ?? undefined,
        remainingHandlingOther: data.remainingHandlingOther ?? undefined,
        inventoryDeducted: data.inventoryDeducted ?? undefined,
        wastedQuantity: data.wastedQuantity ?? undefined,
        quantityBefore: data.quantityBefore,
        quantityAfter: data.quantityAfter,
        consumptionNote: data.consumptionNote ?? undefined,
        noteToFamily: data.noteToFamily ?? undefined,
        recordedBy: data.recordedBy,
        recordedAt: data.recordedAt?.toDate?.().toISOString() ?? data.recordedAt,
        updatedAt: data.updatedAt?.toDate?.().toISOString() ?? data.updatedAt ?? undefined,
        updatedBy: data.updatedBy ?? undefined,
        // Phase 29: 水分量
        hydrationAmount: data.hydrationAmount ?? undefined,
        // Sheet A検索用タイムスタンプ（水分記録編集時に使用）
        sheetTimestamp: data.sheetTimestamp ?? undefined,
      };
    });

    // 総数を取得（日付フィルタなし）
    const countSnapshot = await logsRef.count().get();
    const total = countSnapshot.data().count;

    functions.logger.info("getConsumptionLogs success", {
      itemId: params.itemId,
      count: logs.length,
      total,
    });

    const responseData: GetConsumptionLogsResponse = {
      logs,
      total,
    };

    const response: ApiResponse<GetConsumptionLogsResponse> = {
      success: true,
      data: responseData,
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getConsumptionLogs error", error);
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
// Handler: correctDiscardedRecord
// =============================================================================

/**
 * 破棄記録を修正
 * - 破棄済みの消費ログを無効化し、新しい記録で置き換える
 * - 在庫・統計を正しい値に修正する
 */
async function correctDiscardedRecordHandler(
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

    // バリデーション（RecordConsumptionLogRequestと同様）
    const validation = validateRecordConsumptionLogRequest(req.body);
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

    const input = validation.data;
    const targetLogId = (req.body as { targetLogId?: string }).targetLogId;

    functions.logger.info("correctDiscardedRecord started", {
      itemId: input.itemId,
      targetLogId,
      servedQuantity: input.servedQuantity,
      consumedQuantity: input.consumedQuantity,
    });

    const db = getFirestore();
    const itemRef = db.collection(CARE_ITEMS_COLLECTION).doc(input.itemId);
    const logsRef = itemRef.collection(CONSUMPTION_LOGS_SUBCOLLECTION);

    // トランザクションで処理
    const result = await db.runTransaction(async (transaction) => {
      const itemDoc = await transaction.get(itemRef);

      if (!itemDoc.exists) {
        throw new Error("Item not found");
      }

      const item = itemDoc.data() as CareItem;

      // 修正対象の破棄ログを取得
      let discardLogDoc;
      if (targetLogId) {
        discardLogDoc = await transaction.get(logsRef.doc(targetLogId));
        if (!discardLogDoc.exists) {
          throw new Error("Target log not found");
        }
      } else {
        // 最新の破棄ログを取得
        const discardLogsSnapshot = await logsRef
          .where("remainingHandling", "==", "discarded")
          .orderBy("recordedAt", "desc")
          .limit(1)
          .get();

        if (discardLogsSnapshot.empty) {
          throw new Error("No discarded log found for this item");
        }
        discardLogDoc = discardLogsSnapshot.docs[0];
      }

      const discardLog = discardLogDoc.data() as ConsumptionLog;

      // 破棄ログであることを確認
      if (discardLog.remainingHandling !== "discarded") {
        throw new Error("Target log is not a discarded record");
      }

      // 既に修正済みでないことを確認
      if ((discardLog as { correctedAt?: unknown }).correctedAt) {
        throw new Error("Target log has already been corrected");
      }

      // === 1. 在庫の逆算 ===
      // 破棄時: inventoryDeducted = servedQuantity（全量を在庫から引いた）
      // 修正後: 破棄量を戻して、新しい消費量を引く
      const discardedInventoryDeducted = discardLog.inventoryDeducted ?? discardLog.servedQuantity;
      const currentQty = item.currentQuantity ?? item.remainingQuantity ?? item.quantity ?? 0;

      // 破棄した分を在庫に戻す
      const restoredQty = currentQty + discardedInventoryDeducted;

      // === 2. サマリーの逆算 ===
      const existingSummary = item.consumptionSummary ?? {
        totalServed: 0,
        totalServedQuantity: 0,
        totalConsumedQuantity: 0,
        avgConsumptionRate: 0,
      };

      // 破棄ログの分を引く
      const adjustedTotalServed = Math.max(0, existingSummary.totalServed - 1);
      const adjustedTotalServedQty = Math.max(0, existingSummary.totalServedQuantity - discardLog.servedQuantity);
      const adjustedTotalConsumedQty = Math.max(0, existingSummary.totalConsumedQuantity - discardLog.consumedQuantity);

      // === 3. 新しい消費量を計算 ===
      const newConsumptionRate = input.servedQuantity > 0 ?
        Math.round((input.consumedQuantity / input.servedQuantity) * 100) :
        0;

      const newAmounts = calculateConsumptionAmounts(
        input.servedQuantity,
        newConsumptionRate,
        input.remainingHandling
      );

      // 新しい残量を計算
      const newQuantity = restoredQty - newAmounts.inventoryDeducted;

      // バリデーション: 残量がマイナスにならないか
      if (newQuantity < 0) {
        throw new Error(`修正後の残量がマイナスになります: ${newQuantity}`);
      }

      // === 4. 新しいサマリーを計算 ===
      const newTotalServed = adjustedTotalServed + 1;
      const newTotalServedQty = adjustedTotalServedQty + input.servedQuantity;
      const newTotalConsumedQty = adjustedTotalConsumedQty + input.consumedQuantity;
      const newAvgRate = newTotalServedQty > 0 ?
        Math.round((newTotalConsumedQty / newTotalServedQty) * 100) :
        0;

      const newSummary = {
        totalServed: newTotalServed,
        totalServedQuantity: newTotalServedQty,
        totalConsumedQuantity: newTotalConsumedQty,
        avgConsumptionRate: newAvgRate,
        lastServedDate: input.servedDate,
        lastServedBy: input.servedBy,
      };

      // === 5. ステータスを判定 ===
      const newStatus = determineItemStatus(
        newQuantity,
        item.expirationDate,
        newSummary
      );

      // === 6. 元のログを修正済みとしてマーク ===
      const now = Timestamp.now();
      transaction.update(logsRef.doc(discardLogDoc.id), {
        correctedAt: now,
        correctedBy: input.recordedBy,
      });

      // === 7. 新しい消費ログを作成 ===
      const newLogRef = logsRef.doc();
      const newLogData = {
        id: newLogRef.id,
        itemId: input.itemId,
        servedDate: input.servedDate,
        servedTime: input.servedTime ?? null,
        mealTime: input.mealTime ?? null,
        servedQuantity: input.servedQuantity,
        servedBy: input.servedBy,
        consumedQuantity: input.consumedQuantity,
        consumptionRate: newConsumptionRate,
        consumptionStatus: input.consumptionStatus,
        remainingHandling: input.remainingHandling ?? null,
        remainingHandlingOther: input.remainingHandlingOther ?? null,
        inventoryDeducted: newAmounts.inventoryDeducted,
        wastedQuantity: newAmounts.wastedQuantity,
        quantityBefore: restoredQty,
        quantityAfter: newQuantity,
        consumptionNote: input.consumptionNote ?? null,
        noteToFamily: input.noteToFamily ?? null,
        recordedBy: input.recordedBy,
        recordedAt: now,
        // 修正記録であることを示すフィールド
        isCorrectionOf: discardLogDoc.id,
      };

      transaction.set(newLogRef, newLogData);

      // === 8. CareItemを更新 ===
      const updateData: Record<string, unknown> = {
        currentQuantity: newQuantity,
        remainingQuantity: newQuantity,
        status: newStatus,
        consumptionSummary: newSummary,
        actualServeDate: input.servedDate,
        servedQuantity: input.servedQuantity,
        servedBy: input.servedBy,
        consumptionRate: newConsumptionRate,
        consumptionStatus: input.consumptionStatus,
        consumptionNote: input.consumptionNote ?? FieldValue.delete(),
        noteToFamily: input.noteToFamily ?? FieldValue.delete(),
        recordedBy: input.recordedBy,
        updatedAt: now,
        // 破棄済みステータスを解除
        discardedAt: FieldValue.delete(),
        discardReason: FieldValue.delete(),
      };

      // remainingHandlingLogsから破棄エントリを削除
      const existingLogs = item.remainingHandlingLogs ?? [];
      // 同じ日付・数量の破棄ログを削除
      const updatedLogs = existingLogs.filter((log: RemainingHandlingLog) => {
        if (log.handling !== "discarded") return true;
        // 破棄ログの記録日時と比較（最新のものを削除）
        return log.recordedAt !== discardLog.recordedAt?.toDate?.().toISOString();
      });
      updateData.remainingHandlingLogs = updatedLogs;

      // 新しい残り対応がある場合は追加
      if (input.remainingHandling === "discarded" || input.remainingHandling === "stored") {
        const remainingQuantity = input.servedQuantity - input.consumedQuantity;
        const handlingLog: RemainingHandlingLog = {
          id: `RHL_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          handling: input.remainingHandling,
          quantity: remainingQuantity,
          note: input.remainingHandlingOther || undefined,
          recordedBy: input.recordedBy,
          recordedAt: now.toDate().toISOString(),
        };
        updateData.remainingHandlingLogs = FieldValue.arrayUnion(handlingLog);
      }

      transaction.update(itemRef, updateData);

      return {
        newLogId: newLogRef.id,
        correctedLogId: discardLogDoc.id,
        currentQuantity: newQuantity,
        status: newStatus,
      };
    });

    functions.logger.info("correctDiscardedRecord success", {
      newLogId: result.newLogId,
      correctedLogId: result.correctedLogId,
      itemId: input.itemId,
      currentQuantity: result.currentQuantity,
      status: result.status,
    });

    const responseData = {
      newLogId: result.newLogId,
      correctedLogId: result.correctedLogId,
      itemId: input.itemId,
      currentQuantity: result.currentQuantity,
      status: result.status,
    };

    const response: ApiResponse<typeof responseData> = {
      success: true,
      data: responseData,
      timestamp,
    };
    res.status(201).json(response);
  } catch (error) {
    functions.logger.error("correctDiscardedRecord error", error);

    const isValidationError = error instanceof Error &&
      (error.message.includes("not found") ||
       error.message.includes("already been corrected") ||
       error.message.includes("not a discarded") ||
       error.message.includes("マイナス"));

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: isValidationError ? ErrorCodes.INVALID_REQUEST : ErrorCodes.FIRESTORE_ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(isValidationError ? 400 : 500).json(response);
  }
}

// =============================================================================
// Cloud Functions エクスポート
// =============================================================================

export const recordConsumptionLog = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(recordConsumptionLogHandler);

export const getConsumptionLogs = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getConsumptionLogsHandler);


export const correctDiscardedRecord = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(correctDiscardedRecordHandler);
