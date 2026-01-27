/**
 * 画像からの品物抽出API (Phase 68)
 * Gemini Vision APIで食事スケジュール画像を解析
 * @see docs/API_SPEC.md
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {generateContentWithImage, parseJsonResponse} from "../services/geminiService";
import {buildAnalyzeSchedulePrompt} from "../prompts/analyzeSchedule";

/**
 * 画像解析リクエスト
 */
interface AnalyzeScheduleImageRequest {
  image: string; // base64エンコード
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * 抽出された品物
 */
interface ExtractedItem {
  itemName: string;
  category: "food" | "drink";
  quantity?: number;
  unit?: string;
  servingDate: string; // YYYY-MM-DD
  servingTimeSlot: "breakfast" | "lunch" | "snack" | "dinner";
  servingMethodDetail?: "as_is" | "cut" | "peeled" | "heated";
  noteToStaff?: string;
  confidence: "high" | "medium" | "low";
}

/**
 * 画像解析レスポンス
 */
interface AnalyzeScheduleImageResponse {
  items: ExtractedItem[];
  metadata: {
    dateRange: {
      start: string;
      end: string;
    };
    confidence: "high" | "medium" | "low";
    warnings: string[];
  };
}

/**
 * Geminiの生出力をパースして型に変換
 */
function parseGeminiResponse(
  rawText: string
): AnalyzeScheduleImageResponse | null {
  const parsed = parseJsonResponse<AnalyzeScheduleImageResponse>(rawText);
  if (!parsed) {
    return null;
  }

  // バリデーション: items配列が存在するか
  if (!Array.isArray(parsed.items)) {
    return null;
  }

  // 各アイテムのバリデーションと正規化
  const validItems: ExtractedItem[] = [];
  for (const item of parsed.items) {
    // 必須フィールドのチェック
    if (!item.itemName || !item.servingDate || !item.servingTimeSlot) {
      continue;
    }

    // カテゴリのデフォルト
    const category = item.category === "drink" ? "drink" : "food";

    // servingTimeSlotの正規化
    const validTimeSlots = ["breakfast", "lunch", "snack", "dinner"];
    const timeSlot = validTimeSlots.includes(item.servingTimeSlot) ?
      item.servingTimeSlot :
      "snack";

    // servingMethodDetailの正規化
    const validMethods = ["as_is", "cut", "peeled", "heated"];
    const method = item.servingMethodDetail &&
      validMethods.includes(item.servingMethodDetail) ?
      item.servingMethodDetail :
      "as_is";

    validItems.push({
      itemName: item.itemName,
      category,
      quantity: typeof item.quantity === "number" ? item.quantity : undefined,
      unit: item.unit || undefined,
      servingDate: item.servingDate,
      servingTimeSlot: timeSlot as ExtractedItem["servingTimeSlot"],
      servingMethodDetail: method as ExtractedItem["servingMethodDetail"],
      noteToStaff: item.noteToStaff || undefined,
      confidence: item.confidence || "medium",
    });
  }

  // メタデータのデフォルト
  const metadata = parsed.metadata || {
    dateRange: {start: "", end: ""},
    confidence: "medium" as const,
    warnings: [],
  };

  return {
    items: validItems,
    metadata: {
      dateRange: metadata.dateRange || {start: "", end: ""},
      confidence: metadata.confidence || "medium",
      warnings: Array.isArray(metadata.warnings) ? metadata.warnings : [],
    },
  };
}

/**
 * 画像解析ハンドラー
 */
async function analyzeScheduleImageHandler(
  req: functions.https.Request,
  res: functions.Response
): Promise<void> {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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
    const {image, mimeType} = req.body as AnalyzeScheduleImageRequest;

    // バリデーション
    if (!image || !mimeType) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "image and mimeType are required",
        },
        timestamp,
      });
      return;
    }

    // MIMEタイプのチェック
    const validMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimeTypes.includes(mimeType)) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_MIME_TYPE",
          message: "mimeType must be image/jpeg, image/png, or image/webp",
        },
        timestamp,
      });
      return;
    }

    // 画像サイズのチェック（base64は約1.37倍になる、5MB制限）
    const maxBase64Length = 5 * 1024 * 1024 * 1.37;
    if (image.length > maxBase64Length) {
      res.status(400).json({
        success: false,
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "Image size must be less than 5MB",
        },
        timestamp,
      });
      return;
    }

    functions.logger.info("analyzeScheduleImage request", {
      mimeType,
      imageSizeKB: Math.round(image.length / 1024),
    });

    // 今日の日付を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    const today = jstDate.toISOString().split("T")[0];

    // Gemini Vision APIで解析
    const prompt = buildAnalyzeSchedulePrompt(today);
    const rawResult = await generateContentWithImage(prompt, image, mimeType);

    functions.logger.info("Gemini raw response", {
      responseLength: rawResult.length,
      responsePreview: rawResult.substring(0, 500),
    });

    // レスポンスをパース
    const parsedResult = parseGeminiResponse(rawResult);

    if (!parsedResult) {
      functions.logger.warn("Failed to parse Gemini response", {
        rawResult: rawResult.substring(0, 1000),
      });

      res.status(200).json({
        success: true,
        data: {
          items: [],
          metadata: {
            dateRange: {start: today, end: today},
            confidence: "low",
            warnings: ["画像の解析に失敗しました。別の画像をお試しください。"],
          },
        },
        timestamp,
      });
      return;
    }

    functions.logger.info("analyzeScheduleImage result", {
      itemCount: parsedResult.items.length,
      confidence: parsedResult.metadata.confidence,
    });

    res.status(200).json({
      success: true,
      data: parsedResult,
      timestamp,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    functions.logger.error("analyzeScheduleImage error", {error: errorMsg});

    res.status(500).json({
      success: false,
      error: {code: "INTERNAL_ERROR", message: errorMsg},
      timestamp,
    });
  }
}

/**
 * Cloud Function エクスポート
 */
export const analyzeScheduleImage = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60, // 画像解析は時間がかかる可能性
    memory: "512MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(analyzeScheduleImageHandler);
