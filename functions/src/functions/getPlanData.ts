/**
 * 記録データ取得関数
 * Firestoreに同期済みの記録データを取得
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getPlanData} from "../services/firestoreService";
import {FUNCTIONS_CONFIG, SHEET_A_ORDER} from "../config/sheets";
import {
  ApiResponse,
  GetPlanDataResponse,
  PlanDataRecord,
  SheetSummary,
  ErrorCodes,
} from "../types";

/**
 * getPlanData 関数本体
 */
async function getPlanDataHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

    // クエリパラメータの取得
    const sheetName = req.query.sheetName as string | undefined;
    const yearStr = req.query.year as string | undefined;
    const monthStr = req.query.month as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    // パラメータのパース
    const year = yearStr ? parseInt(yearStr, 10) : undefined;
    const month = monthStr ? parseInt(monthStr, 10) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;

    // yearのバリデーション
    if (year !== undefined && (isNaN(year) || year < 2000 || year > 2100)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "year must be a valid year (2000-2100)",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // monthのバリデーション
    if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "month must be 1-12",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // limitのバリデーション
    if (limit !== undefined && (isNaN(limit) || limit < 1)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "limit must be a positive integer",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // year/month指定時はsheetNameが必須（Firestoreインデックス制約）
    if ((year !== undefined || month !== undefined) && !sheetName) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "sheetName is required when year or month is specified",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    functions.logger.info("getPlanData started", {sheetName, year, month, limit});

    // Firestoreからデータを取得
    const result = await getPlanData({sheetName, year, month, limit});

    // レスポンス用にデータを変換
    const records: PlanDataRecord[] = result.records.map((record) => ({
      id: record.id || "",
      sheetName: record.sheetName,
      timestamp: record.timestamp,
      staffName: record.staffName,
      residentName: record.residentName,
      data: record.data,
      rawRow: record.rawRow,
      syncedAt: record.syncedAt.toDate().toISOString(),
    }));

    // シート別の集計を作成
    const sheetMap = new Map<string, {count: number; headers: string[]}>();
    for (const record of result.records) {
      const existing = sheetMap.get(record.sheetName);
      if (existing) {
        existing.count++;
      } else {
        sheetMap.set(record.sheetName, {
          count: 1,
          headers: record.headers || [],
        });
      }
    }

    // シート順序でソート（SHEET_A_ORDER に基づく）
    const sheets: SheetSummary[] = Array.from(sheetMap.entries())
      .map(([name, info]) => ({
        sheetName: name,
        recordCount: info.count,
        headers: info.headers,
      }))
      .sort((a, b) => {
        const indexA = SHEET_A_ORDER.indexOf(a.sheetName);
        const indexB = SHEET_A_ORDER.indexOf(b.sheetName);
        // 定義されていないシートは末尾に配置
        const orderA = indexA === -1 ? SHEET_A_ORDER.length : indexA;
        const orderB = indexB === -1 ? SHEET_A_ORDER.length : indexB;
        return orderA - orderB;
      });

    const responseData: GetPlanDataResponse = {
      sheets,
      records,
      totalCount: result.totalCount,
      lastSyncedAt: result.lastSyncedAt,
    };

    const response: ApiResponse<GetPlanDataResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("getPlanData completed", {
      totalCount: result.totalCount,
      sheetCount: sheets.length,
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getPlanData error", error);

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
 * Cloud Functions エクスポート
 */
export const getPlanDataFunc = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getPlanDataHandler);
