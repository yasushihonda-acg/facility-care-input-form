/**
 * 階層的要約API (Phase 46)
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  getSummaries as getSummariesService,
  generateSummary as generateSummaryService,
} from "../services/summaryService";
import type {
  GetSummariesRequest,
  GetSummariesResponse,
  GenerateSummaryRequest,
  GenerateSummaryResponse,
  ApiResponse,
  SummaryType,
} from "../types";
import {ErrorCodes} from "../types";

/**
 * GET /getSummaries
 * 階層的要約一覧を取得
 */
export const getSummaries = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(async (req, res) => {
    // CORS設定
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json({
        success: false,
        error: {code: "METHOD_NOT_ALLOWED", message: "Only GET allowed"},
      });
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      const query = req.query as GetSummariesRequest;

      // バリデーション
      if (query.type && !["daily", "weekly", "monthly"].includes(query.type)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_REQUEST,
            message: "type must be daily, weekly, or monthly",
          },
          timestamp,
        });
        return;
      }

      const result = await getSummariesService({
        type: query.type as SummaryType | undefined,
        from: query.from as string | undefined,
        to: query.to as string | undefined,
        limit: query.limit ? parseInt(String(query.limit)) : undefined,
      });

      const response: ApiResponse<GetSummariesResponse> = {
        success: true,
        data: result,
        timestamp,
      };

      res.status(200).json(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("getSummaries error", {error: errorMsg});

      const response: ApiResponse<GetSummariesResponse> = {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: errorMsg,
        },
        timestamp,
      };

      res.status(500).json(response);
    }
  });

/**
 * POST /generateSummary
 * 要約を手動生成
 */
export const generateSummary = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(async (req, res) => {
    // CORS設定
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({
        success: false,
        error: {code: "METHOD_NOT_ALLOWED", message: "Only POST allowed"},
      });
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      const {type, date, forceRegenerate} = req.body as GenerateSummaryRequest;

      // バリデーション
      if (!type || !["daily", "weekly", "monthly"].includes(type)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_REQUEST,
            message: "type must be daily, weekly, or monthly",
          },
          timestamp,
        });
        return;
      }

      if (!date) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.MISSING_REQUIRED_FIELD,
            message: "date is required",
          },
          timestamp,
        });
        return;
      }

      // 日付形式のバリデーション
      const dateFormats: Record<SummaryType, RegExp> = {
        daily: /^\d{4}-\d{2}-\d{2}$/,
        weekly: /^\d{4}-W\d{2}$/,
        monthly: /^\d{4}-\d{2}$/,
      };

      if (!dateFormats[type].test(date)) {
        res.status(400).json({
          success: false,
          error: {
            code: ErrorCodes.INVALID_REQUEST,
            message: `Invalid date format for ${type}. Expected: ${
              type === "daily" ? "YYYY-MM-DD" :
                type === "weekly" ? "YYYY-Www" :
                  "YYYY-MM"
            }`,
          },
          timestamp,
        });
        return;
      }

      functions.logger.info("generateSummary request", {type, date, forceRegenerate});

      const result = await generateSummaryService(type, date, forceRegenerate);

      const response: ApiResponse<GenerateSummaryResponse> = {
        success: true,
        data: result,
        timestamp,
      };

      res.status(200).json(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("generateSummary error", {error: errorMsg});

      const response: ApiResponse<GenerateSummaryResponse> = {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: errorMsg,
        },
        timestamp,
      };

      res.status(500).json(response);
    }
  });
