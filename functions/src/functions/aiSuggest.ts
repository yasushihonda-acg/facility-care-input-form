/**
 * AI品物入力補助API (Phase 8.4)
 * 品物名から賞味期限・保存方法を自動提案
 * @see docs/AI_INTEGRATION_SPEC.md
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {generateContent, parseJsonResponse} from "../services/geminiService";
import {buildItemSuggestionPrompt} from "../prompts/itemSuggestion";
import type {
  AISuggestRequest,
  AISuggestResponse,
} from "../types";
import {DEFAULT_AI_SUGGESTION} from "../types";

/**
 * AI品物入力補助API
 * POST /aiSuggest
 *
 * 品物名を送信すると、AIが賞味期限の目安、保存方法、提供方法を提案
 */
export const aiSuggest = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
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
      const {itemName, category} = req.body as AISuggestRequest;

      // バリデーション
      if (!itemName || typeof itemName !== "string") {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "itemName is required"},
          timestamp,
        });
        return;
      }

      if (itemName.length < 1 || itemName.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "itemName must be 1-100 characters",
          },
          timestamp,
        });
        return;
      }

      functions.logger.info("aiSuggest request", {itemName, category});

      // Gemini APIでAI提案を取得
      const prompt = buildItemSuggestionPrompt(itemName, category);
      const responseText = await generateContent(prompt);
      const suggestion = parseJsonResponse<AISuggestResponse>(responseText);

      if (!suggestion) {
        // パース失敗時はデフォルト値を返却
        functions.logger.warn("AI response parse failed, using fallback", {
          itemName,
          responseText,
        });

        res.status(200).json({
          success: true,
          data: DEFAULT_AI_SUGGESTION,
          warning: "AI suggestion unavailable, using defaults",
          timestamp,
        });
        return;
      }

      // バリデーション & デフォルト値補完
      const validatedSuggestion: AISuggestResponse = {
        expirationDays: typeof suggestion.expirationDays === "number" &&
          suggestion.expirationDays > 0 ?
          suggestion.expirationDays :
          DEFAULT_AI_SUGGESTION.expirationDays,
        storageMethod: ["room_temp", "refrigerated", "frozen"]
          .includes(suggestion.storageMethod) ?
          suggestion.storageMethod :
          DEFAULT_AI_SUGGESTION.storageMethod,
        servingMethods: Array.isArray(suggestion.servingMethods) &&
          suggestion.servingMethods.length > 0 ?
          suggestion.servingMethods.filter((m) =>
            ["as_is", "cut", "peeled", "heated", "cooled", "blended"]
              .includes(m)
          ) :
          DEFAULT_AI_SUGGESTION.servingMethods,
        notes: typeof suggestion.notes === "string" ?
          suggestion.notes.slice(0, 100) :
          undefined,
      };

      // 空の servingMethods になった場合のフォールバック
      if (validatedSuggestion.servingMethods.length === 0) {
        validatedSuggestion.servingMethods = DEFAULT_AI_SUGGESTION.servingMethods;
      }

      functions.logger.info("aiSuggest success", {itemName, suggestion: validatedSuggestion});

      res.status(200).json({
        success: true,
        data: validatedSuggestion,
        timestamp,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("aiSuggest error", {error: errorMsg});

      // エラー時もデフォルト値を返却（フォールバック）
      res.status(200).json({
        success: true,
        data: DEFAULT_AI_SUGGESTION,
        warning: `AI suggestion unavailable: ${errorMsg}`,
        timestamp,
      });
    }
  });
