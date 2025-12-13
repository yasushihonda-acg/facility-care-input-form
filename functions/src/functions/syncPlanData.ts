/**
 * Flow A: 記録同期関数
 * Sheet A（記録の結果）からデータを取得し、Firestoreへ洗い替え同期
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getSheetASheetNames, readFromSheetA} from "../services/sheetsService";
import {syncPlanData as syncToFirestore} from "../services/firestoreService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  SyncPlanDataRequest,
  SyncPlanDataResponse,
  PlanData,
  ErrorCodes,
} from "../types";

/**
 * スプレッドシートの行データを PlanData にパース
 * FAXデータ仕様: instructions と conditionalBan は正規化禁止
 */
function parseSheetRow(
  row: string[],
  sheetName: string
): Omit<PlanData, "syncedAt"> | null {
  // 空行をスキップ
  if (!row[0] || row[0].trim() === "") {
    return null;
  }

  return {
    residentId: row[0] || "",
    residentName: row[1] || "",
    sheetName,
    // 食材名のみリスト化（カンマまたは読点区切りで分割）
    mealRestrictions: row[2] ?
      row[2].split(/[、,]/).map((s) => s.trim()).filter((s) => s) :
      [],
    // ===== FAXデータ仕様 =====
    // 以下のフィールドは正規化せず、テキストをそのまま保持
    // 参照: BUSINESS_RULES.md 3.2節
    instructions: row[3] || "",
    conditionalBan: row[4] || "",
    // ==========================
    rawData: {
      A: row[0] || "",
      B: row[1] || "",
      C: row[2] || "",
      D: row[3] || "",
      E: row[4] || "",
    },
  };
}

/**
 * syncPlanData 関数本体
 */
async function syncPlanDataHandler(
  req: Request,
  res: Response
): Promise<void> {
  const startTime = Date.now();
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

    const requestBody = req.body as SyncPlanDataRequest;
    const triggeredBy = requestBody.triggeredBy || "manual";

    functions.logger.info("syncPlanData started", {triggeredBy});

    // 全シート名を取得
    const sheetNames = await getSheetASheetNames();
    functions.logger.info(`Found ${sheetNames.length} sheets`, {sheetNames});

    let totalRecords = 0;
    const syncedSheets: string[] = [];

    // 各シートのデータを同期
    for (const sheetName of sheetNames) {
      try {
        // ヘッダー行をスキップして2行目から取得
        const rows = await readFromSheetA(sheetName, "A2:E");

        const records = rows
          .map((row) => parseSheetRow(row, sheetName))
          .filter((record): record is Omit<PlanData, "syncedAt"> => record !== null);

        if (records.length > 0) {
          await syncToFirestore(sheetName, records);
          totalRecords += records.length;
          syncedSheets.push(sheetName);
          functions.logger.info(`Synced ${records.length} records from ${sheetName}`);
        }
      } catch (sheetError) {
        functions.logger.error(`Error syncing sheet: ${sheetName}`, sheetError);
        // 個別シートのエラーは継続
      }
    }

    const syncDuration = Date.now() - startTime;

    const responseData: SyncPlanDataResponse = {
      syncedSheets,
      totalRecords,
      syncDuration,
    };

    const response: ApiResponse<SyncPlanDataResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("syncPlanData completed", responseData);
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("syncPlanData error", error);

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
export const syncPlanData = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 300,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(syncPlanDataHandler);
