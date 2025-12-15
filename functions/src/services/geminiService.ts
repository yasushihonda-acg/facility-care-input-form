/**
 * Gemini AI サービス (Phase 8.4)
 * Vertex AI を使用した Gemini 2.5 Flash 連携
 * @see docs/AI_INTEGRATION_SPEC.md
 */

import {VertexAI} from "@google-cloud/vertexai";
import * as functions from "firebase-functions";

const PROJECT_ID = "facility-care-input-form";
const LOCATION = "asia-northeast1";
// Gemini 2.0 Flash (Preview) - 最新の高速モデル
const MODEL_ID = "gemini-2.0-flash-001";

let vertexAIInstance: VertexAI | null = null;

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
 * Gemini モデルを使用してテキスト生成
 */
export async function generateContent(prompt: string): Promise<string> {
  try {
    const vertexAI = getVertexAI();
    const model = vertexAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        maxOutputTokens: 1024,
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
