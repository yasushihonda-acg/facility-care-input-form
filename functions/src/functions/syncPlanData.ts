/**
 * Flow A: 記録同期関数
 * Sheet A（記録の結果）からデータを取得し、Firestoreへ洗い替え同期
 *
 * 各シートの列構造は docs/SHEET_A_STRUCTURE.md を参照
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
 * スプレッドシートの行データを汎用 PlanData にパース
 *
 * 列構造:
 * - A列: タイムスタンプ
 * - B列: 入力者名（スタッフ）
 * - C列: 利用者名（※血糖値シートはD列）
 * - D列以降: シート固有データ（列名をキーとして保持）
 *
 * @param row データ行
 * @param headers ヘッダー行（列名一覧）
 * @param sheetName シート名
 */
function parseSheetRow(
  row: string[],
  headers: string[],
  sheetName: string
): Omit<PlanData, "syncedAt"> | null {
  // 空行をスキップ
  if (!row[0] || row[0].trim() === "") {
    return null;
  }

  // 共通フィールド
  const timestamp = row[0] || "";
  const staffName = row[1] || "";

  // 利用者名の位置はシートによって異なる
  // 「血糖値インスリン投与」シートはC列が施設、D列が利用者名
  let residentName: string;
  let dataStartIndex: number;

  if (sheetName === "血糖値インスリン投与") {
    residentName = row[3] || ""; // D列
    dataStartIndex = 4; // E列以降
  } else {
    residentName = row[2] || ""; // C列
    dataStartIndex = 3; // D列以降
  }

  // D列以降のデータを列名→値のマップに変換
  const data: Record<string, string> = {};
  for (let i = dataStartIndex; i < row.length && i < headers.length; i++) {
    const headerName = headers[i];
    if (headerName) {
      data[headerName] = row[i] || "";
    }
  }

  return {
    sheetName,
    timestamp,
    staffName,
    residentName,
    data,
    rawRow: row,
    headers,
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
        // ヘッダー行を含めて全データを取得
        const allRows = await readFromSheetA(sheetName, "A1:Z");

        if (allRows.length < 2) {
          // ヘッダー行のみ or 空シート
          functions.logger.info(`Skipping empty sheet: ${sheetName}`);
          continue;
        }

        const headers = allRows[0] || [];
        const dataRows = allRows.slice(1);

        const records = dataRows
          .map((row) => parseSheetRow(row, headers, sheetName))
          .filter((record): record is Omit<PlanData, "syncedAt"> =>
            record !== null
          );

        if (records.length > 0) {
          await syncToFirestore(sheetName, records);
          totalRecords += records.length;
          syncedSheets.push(sheetName);
          functions.logger.info(
            `Synced ${records.length} records from ${sheetName}`
          );
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
        message: error instanceof Error ? error.message : "Unknown error",
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
