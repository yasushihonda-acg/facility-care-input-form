/**
 * AI摂食傾向分析API (Phase 8.4)
 * 摂食データから傾向・異常を分析
 * @see docs/AI_INTEGRATION_SPEC.md セクション3.2
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {generateContent, parseJsonResponse} from "../services/geminiService";
import {
  buildConsumptionAnalysisPrompt,
  buildMealAnalysisPrompt,
  buildComprehensiveAnalysisPrompt,
} from "../prompts/analysisPrompts";
import type {
  AIAnalyzeRequest,
  AIAnalyzeResponse,
  AIFinding,
  AISuggestion,
  AIAnalysisType,
} from "../types";
import {DEFAULT_AI_ANALYSIS} from "../types";

/** 発見事項のバリデーション */
function validateFinding(finding: unknown): AIFinding | null {
  if (!finding || typeof finding !== "object") return null;
  const f = finding as Record<string, unknown>;

  const validTypes = ["positive", "negative", "neutral"];
  if (!validTypes.includes(f.type as string)) return null;
  if (typeof f.title !== "string" || !f.title) return null;
  if (typeof f.description !== "string" || !f.description) return null;

  const result: AIFinding = {
    type: f.type as "positive" | "negative" | "neutral",
    title: f.title.slice(0, 50),
    description: f.description.slice(0, 200),
  };

  // メトリクスのバリデーション（オプション）
  if (f.metric && typeof f.metric === "object") {
    const m = f.metric as Record<string, unknown>;
    if (typeof m.current === "number") {
      result.metric = {
        current: m.current,
        previous: typeof m.previous === "number" ? m.previous : undefined,
        change: typeof m.change === "number" ? m.change : undefined,
      };
    }
  }

  return result;
}

/** 提案のバリデーション */
function validateSuggestion(suggestion: unknown): AISuggestion | null {
  if (!suggestion || typeof suggestion !== "object") return null;
  const s = suggestion as Record<string, unknown>;

  const validPriorities = ["high", "medium", "low"];
  if (!validPriorities.includes(s.priority as string)) return null;
  if (typeof s.title !== "string" || !s.title) return null;
  if (typeof s.description !== "string" || !s.description) return null;

  return {
    priority: s.priority as "high" | "medium" | "low",
    title: s.title.slice(0, 50),
    description: s.description.slice(0, 200),
    relatedItemName: typeof s.relatedItemName === "string" ?
      s.relatedItemName.slice(0, 50) :
      undefined,
  };
}

/** AIレスポンスのバリデーション */
function validateAnalysisResponse(
  raw: unknown,
  analysisType: AIAnalysisType
): AIAnalyzeResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;

  // summary は必須
  if (typeof data.summary !== "string" || !data.summary) return null;

  // findings バリデーション
  const findings: AIFinding[] = [];
  if (Array.isArray(data.findings)) {
    for (const f of data.findings) {
      const valid = validateFinding(f);
      if (valid) findings.push(valid);
    }
  }

  // suggestions バリデーション
  const suggestions: AISuggestion[] = [];
  if (Array.isArray(data.suggestions)) {
    for (const s of data.suggestions) {
      const valid = validateSuggestion(s);
      if (valid) suggestions.push(valid);
    }
  }

  return {
    analysisType,
    summary: data.summary.slice(0, 500),
    findings,
    suggestions,
  };
}

/**
 * AI摂食傾向分析API
 * POST /aiAnalyze
 *
 * 摂食データを送信すると、AIが傾向分析と改善提案を返却
 */
export const aiAnalyze = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60, // 分析は時間がかかる可能性があるため60秒
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
      const {
        residentId,
        analysisType,
        period,
        data,
      } = req.body as AIAnalyzeRequest;

      // バリデーション
      if (!residentId || typeof residentId !== "string") {
        res.status(400).json({
          success: false,
          error: {code: "INVALID_REQUEST", message: "residentId is required"},
          timestamp,
        });
        return;
      }

      const validTypes: AIAnalysisType[] = [
        "consumption",
        "prediction",
        "care_suggestion",
      ];
      if (!analysisType || !validTypes.includes(analysisType)) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "analysisType must be one of: consumption, prediction, care_suggestion",
          },
          timestamp,
        });
        return;
      }

      if (!period || !period.startDate || !period.endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "period with startDate and endDate is required",
          },
          timestamp,
        });
        return;
      }

      // データチェック
      const hasConsumptionData = data?.consumptionRecords &&
        data.consumptionRecords.length > 0;
      const hasMealData = data?.mealRecords &&
        data.mealRecords.length > 0;

      if (!hasConsumptionData && !hasMealData) {
        // データがない場合はデフォルトレスポンス
        res.status(200).json({
          success: true,
          data: {
            ...DEFAULT_AI_ANALYSIS,
            analysisType,
            summary: "分析対象のデータがありません。摂食記録が蓄積されると分析が可能になります。",
          },
          timestamp,
        });
        return;
      }

      functions.logger.info("aiAnalyze request", {
        residentId,
        analysisType,
        period,
        consumptionCount: data?.consumptionRecords?.length || 0,
        mealCount: data?.mealRecords?.length || 0,
      });

      // プロンプト生成
      let prompt: string;
      if (hasConsumptionData && hasMealData) {
        // 両方のデータがある場合は総合分析
        prompt = buildComprehensiveAnalysisPrompt(
          data!.consumptionRecords!,
          data!.mealRecords!,
          period
        );
      } else if (hasConsumptionData) {
        // 間食（品物）データのみ
        prompt = buildConsumptionAnalysisPrompt(
          data!.consumptionRecords!,
          period
        );
      } else {
        // 食事データのみ
        prompt = buildMealAnalysisPrompt(
          data!.mealRecords!,
          period
        );
      }

      // Gemini APIで分析実行
      const responseText = await generateContent(prompt);
      const rawResponse = parseJsonResponse<Record<string, unknown>>(responseText);

      if (!rawResponse) {
        functions.logger.warn("AI analysis response parse failed", {
          residentId,
          responseText: responseText.slice(0, 500),
        });

        res.status(200).json({
          success: true,
          data: {
            ...DEFAULT_AI_ANALYSIS,
            analysisType,
          },
          warning: "AI analysis unavailable, using defaults",
          timestamp,
        });
        return;
      }

      // レスポンスバリデーション
      const validatedResponse = validateAnalysisResponse(rawResponse, analysisType);

      if (!validatedResponse) {
        functions.logger.warn("AI analysis validation failed", {
          residentId,
          rawResponse,
        });

        res.status(200).json({
          success: true,
          data: {
            ...DEFAULT_AI_ANALYSIS,
            analysisType,
          },
          warning: "AI analysis validation failed, using defaults",
          timestamp,
        });
        return;
      }

      functions.logger.info("aiAnalyze success", {
        residentId,
        analysisType,
        findingsCount: validatedResponse.findings.length,
        suggestionsCount: validatedResponse.suggestions.length,
      });

      res.status(200).json({
        success: true,
        data: validatedResponse,
        timestamp,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("aiAnalyze error", {error: errorMsg});

      // エラー時もデフォルト値を返却（フォールバック）
      res.status(200).json({
        success: true,
        data: DEFAULT_AI_ANALYSIS,
        warning: `AI analysis unavailable: ${errorMsg}`,
        timestamp,
      });
    }
  });
