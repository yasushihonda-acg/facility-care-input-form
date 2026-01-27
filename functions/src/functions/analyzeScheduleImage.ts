/**
 * 画像からの品物抽出API (Phase 68)
 * Gemini Vision APIで食事スケジュール画像を解析
 * Phase 69: 複数画像対応
 * @see docs/API_SPEC.md
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  generateContentWithImage,
  generateContentWithImages,
  parseJsonResponse,
} from "../services/geminiService";
import {buildAnalyzeSchedulePrompt} from "../prompts/analyzeSchedule";

/**
 * 単一画像データ
 */
interface ImageData {
  image: string; // base64エンコード
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * 旧形式: 単一画像リクエスト（後方互換用）
 */
interface LegacyAnalyzeScheduleImageRequest {
  image: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * 新形式: 複数画像リクエスト
 */
interface MultiImageAnalyzeScheduleImageRequest {
  images: ImageData[];
}

/**
 * 画像解析リクエスト（ユニオン型：旧形式・新形式どちらも受け入れ）
 */
type AnalyzeScheduleImageRequest =
  | LegacyAnalyzeScheduleImageRequest
  | MultiImageAnalyzeScheduleImageRequest;

// 定数
const MAX_IMAGES = 5;
const MAX_TOTAL_SIZE_MB = 15;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;
const SINGLE_IMAGE_MAX_SIZE_MB = 5;
const SINGLE_IMAGE_MAX_SIZE_BYTES = SINGLE_IMAGE_MAX_SIZE_MB * 1024 * 1024;
const BASE64_OVERHEAD = 1.37; // base64エンコードによるサイズ増加係数

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
 * リクエストが新形式（複数画像）かどうか判定
 */
function isMultiImageRequest(
  body: AnalyzeScheduleImageRequest
): body is MultiImageAnalyzeScheduleImageRequest {
  return "images" in body && Array.isArray(body.images);
}

/**
 * リクエストからImageData配列を取得（旧形式・新形式を統一）
 */
function normalizeToImageArray(body: AnalyzeScheduleImageRequest): ImageData[] {
  if (isMultiImageRequest(body)) {
    return body.images;
  }
  // 旧形式: 単一画像を配列に変換
  return [{image: body.image, mimeType: body.mimeType}];
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
  const validMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  try {
    const body = req.body as AnalyzeScheduleImageRequest;

    // リクエスト形式の判定と正規化
    const images = normalizeToImageArray(body);

    // バリデーション: 画像が1枚以上あるか
    if (images.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "At least one image is required",
        },
        timestamp,
      });
      return;
    }

    // バリデーション: 最大枚数チェック
    if (images.length > MAX_IMAGES) {
      res.status(400).json({
        success: false,
        error: {
          code: "TOO_MANY_IMAGES",
          message: `Maximum ${MAX_IMAGES} images allowed`,
        },
        timestamp,
      });
      return;
    }

    // 各画像のバリデーション
    let totalSize = 0;
    for (let i = 0; i < images.length; i++) {
      const img = images[i];

      // 必須フィールドチェック
      if (!img.image || !img.mimeType) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: `Image ${i + 1}: image and mimeType are required`,
          },
          timestamp,
        });
        return;
      }

      // MIMEタイプチェック
      if (!validMimeTypes.includes(img.mimeType)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_MIME_TYPE",
            message: `Image ${i + 1}: mimeType must be image/jpeg, image/png, or image/webp`,
          },
          timestamp,
        });
        return;
      }

      // 単一画像サイズチェック
      const maxBase64Length = SINGLE_IMAGE_MAX_SIZE_BYTES * BASE64_OVERHEAD;
      if (img.image.length > maxBase64Length) {
        res.status(400).json({
          success: false,
          error: {
            code: "IMAGE_TOO_LARGE",
            message: `Image ${i + 1}: size must be less than ${SINGLE_IMAGE_MAX_SIZE_MB}MB`,
          },
          timestamp,
        });
        return;
      }

      totalSize += img.image.length;
    }

    // 合計サイズチェック
    const maxTotalBase64Length = MAX_TOTAL_SIZE_BYTES * BASE64_OVERHEAD;
    if (totalSize > maxTotalBase64Length) {
      res.status(400).json({
        success: false,
        error: {
          code: "TOTAL_SIZE_TOO_LARGE",
          message: `Total image size must be less than ${MAX_TOTAL_SIZE_MB}MB`,
        },
        timestamp,
      });
      return;
    }

    functions.logger.info("analyzeScheduleImage request", {
      imageCount: images.length,
      totalSizeKB: Math.round(totalSize / 1024),
      mimeTypes: images.map((img) => img.mimeType),
    });

    // 今日の日付を取得（日本時間）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    const today = jstDate.toISOString().split("T")[0];

    // Gemini Vision APIで解析
    const prompt = buildAnalyzeSchedulePrompt(today, images.length);

    let rawResult: string;
    if (images.length === 1) {
      // 単一画像: 既存関数を使用（後方互換）
      rawResult = await generateContentWithImage(
        prompt,
        images[0].image,
        images[0].mimeType
      );
    } else {
      // 複数画像: 新関数を使用
      rawResult = await generateContentWithImages(
        prompt,
        images.map((img) => ({base64: img.image, mimeType: img.mimeType}))
      );
    }

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
