/**
 * Gemini AI サービス (Phase 8.4)
 * Vertex AI を使用した Gemini 2.5 Flash 連携
 * @see docs/AI_INTEGRATION_SPEC.md
 */

import {VertexAI} from "@google-cloud/vertexai";
import * as functions from "firebase-functions";

const PROJECT_ID = "facility-care-input-form";
// Gemini 2.5 Flash は asia-northeast1 (東京) で利用可能
const LOCATION = "asia-northeast1";
// Gemini 2.5 Flash Lite は us-central1 で利用（asia-northeast1未対応のため）
const LOCATION_LITE = "us-central1";
// Gemini 2.5 Flash - 最新の高速モデル（GA）
const MODEL_ID = "gemini-2.5-flash";
// Gemini 2.5 Flash Lite - 低コスト・高速モデル（Phase 43.1）
const MODEL_ID_LITE = "gemini-2.5-flash-lite";

let vertexAIInstance: VertexAI | null = null;
let vertexAIInstanceLite: VertexAI | null = null;

/**
 * VertexAI インスタンスを取得（遅延初期化）
 */
function getVertexAI(): VertexAI {
  if (!vertexAIInstance) {
    vertexAIInstance = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
    });
  }
  return vertexAIInstance;
}

/**
 * VertexAI Lite用インスタンスを取得（us-central1）
 */
function getVertexAILite(): VertexAI {
  if (!vertexAIInstanceLite) {
    vertexAIInstanceLite = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION_LITE,
    });
  }
  return vertexAIInstanceLite;
}

/**
 * Gemini モデルを使用してテキスト生成
 */
export async function generateContent(prompt: string): Promise<string> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.2, // 低め: 安定した出力
        topP: 0.8,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return text;
  } catch (error) {
    functions.logger.error("Gemini API error:", error);
    throw error;
  }
}

/**
 * Gemini Flash Lite モデルを使用してテキスト生成（低コスト版）
 * Phase 43.1: 品物名正規化などの軽量タスク向け
 * Note: us-central1リージョンを使用（asia-northeast1未対応のため）
 */
export async function generateContentLite(prompt: string): Promise<string> {
  try {
    const vertexAI = getVertexAILite();
    const model = vertexAI.getGenerativeModel({
      model: MODEL_ID_LITE,
      generationConfig: {
        maxOutputTokens: 64, // 短い出力で十分
        temperature: 0.1, // より安定した出力
        topP: 0.8,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return text.trim();
  } catch (error) {
    functions.logger.error("Gemini Lite API error:", error);
    throw error;
  }
}


/**
 * Gemini モデルを使用して画像付きテキスト生成（Vision API）
 * Phase 68: 画像からの品物一括登録機能
 */
export async function generateContentWithImage(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: 8192, // 画像解析は長い出力が必要
        temperature: 0.2,
        topP: 0.8,
      },
    });

    const request = {
      contents: [
        {
          role: "user" as const,
          parts: [
            {
              inlineData: {
                data: imageBase64,
                mimeType: mimeType,
              },
            },
            {text: prompt},
          ],
        },
      ],
    };

    const result = await model.generateContent(request);
    const response = result.response;

    // デバッグ: 応答の詳細をログ出力
    const candidate = response.candidates?.[0];
    functions.logger.info("Gemini Vision response details", {
      candidatesCount: response.candidates?.length ?? 0,
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      hasContent: !!candidate?.content,
      partsCount: candidate?.content?.parts?.length ?? 0,
    });

    // finishReasonがSAFETYの場合は警告
    if (candidate?.finishReason === "SAFETY") {
      functions.logger.warn("Gemini response blocked by safety filter", {
        safetyRatings: candidate.safetyRatings,
      });
    }

    const text = candidate?.content?.parts?.[0]?.text || "";

    return text;
  } catch (error) {
    functions.logger.error("Gemini Vision API error:", error);
    throw error;
  }
}

/**
 * Gemini モデルを使用して複数画像付きテキスト生成（Vision API）
 * Phase 69: 複数画像からの品物一括登録機能
 */
export async function generateContentWithImages(
  prompt: string,
  images: Array<{base64: string; mimeType: string}>
): Promise<string> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: 8192, // 複数画像解析は長い出力が必要
        temperature: 0.2,
        topP: 0.8,
      },
    });

    // 画像ごとにラベルを付けてパーツを構築
    // Codex推奨: Image N ラベルで順序を明示
    const parts: Array<{text: string} | {inlineData: {data: string; mimeType: string}}> = [];

    for (let i = 0; i < images.length; i++) {
      // 画像ラベル
      parts.push({text: `--- Image ${i + 1} ---`});
      // 画像データ
      parts.push({
        inlineData: {
          data: images[i].base64,
          mimeType: images[i].mimeType,
        },
      });
    }

    // プロンプトを最後に追加
    parts.push({text: prompt});

    const request = {
      contents: [
        {
          role: "user" as const,
          parts,
        },
      ],
    };

    const result = await model.generateContent(request);
    const response = result.response;

    // デバッグ: 応答の詳細をログ出力
    const candidate = response.candidates?.[0];
    functions.logger.info("Gemini Vision (multi-image) response details", {
      candidatesCount: response.candidates?.length ?? 0,
      imageCount: images.length,
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      hasContent: !!candidate?.content,
      partsCount: candidate?.content?.parts?.length ?? 0,
    });

    // finishReasonがSAFETYの場合は警告
    if (candidate?.finishReason === "SAFETY") {
      functions.logger.warn("Gemini response blocked by safety filter", {
        safetyRatings: candidate.safetyRatings,
      });
    }

    const text = candidate?.content?.parts?.[0]?.text || "";

    return text;
  } catch (error) {
    functions.logger.error("Gemini Vision API (multi-image) error:", error);
    throw error;
  }
}

/**
 * JSONレスポンスをパース
 * AI出力からJSONオブジェクトを抽出
 */
export function parseJsonResponse<T>(text: string): T | null {
  try {
    // JSONブロックを抽出（```json ... ``` または { ... }）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) {
      functions.logger.warn("No JSON found in response:", text);
      return null;
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    functions.logger.error("JSON parse error:", error, "text:", text);
    return null;
  }
}
