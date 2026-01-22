/**
 * 品物名正規化API (Phase 43.1)
 * 品物名から統計用の基準品目名をAIで推定
 * Gemini 2.5 Flash Liteを使用（低コスト・高速）
 * @see docs/API_SPEC.md
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {generateContentLite} from "../services/geminiService";

/**
 * 品物名正規化リクエスト
 */
interface NormalizeItemNameRequest {
  itemName: string;
}

/**
 * 品物名正規化レスポンス
 */
interface NormalizeItemNameResponse {
  normalizedName: string;
  confidence: "high" | "medium" | "low";
}

/**
 * 品物名から基準品目名を抽出するプロンプト
 */
function buildNormalizePrompt(itemName: string): string {
  return `あなたは食品名を正規化するエキスパートです。

入力された食品名から、ブランド名・修飾語・形容詞を除去して、基本的な品目名のみを抽出してください。

ルール:
- ブランド名を除去: 「森永プリン」→「プリン」
- 修飾語を除去: 「極みプリン」→「プリン」、「なめらかヨーグルト」→「ヨーグルト」
- 産地を除去: 「青森りんご」→「りんご」
- サイズ・形状は保持可: 「カットバナナ」→「バナナ」、「スライスりんご」→「りんご」
- 複合名はメインを抽出: 「フルーツヨーグルト」→「ヨーグルト」
- 不明な場合はそのまま返す

入力: ${itemName}

基本品目名のみを1語で回答してください（説明不要）:`;
}

/**
 * 品物名正規化ハンドラー
 */
async function normalizeItemNameHandler(
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
    const {itemName} = req.body as NormalizeItemNameRequest;

    if (!itemName || itemName.trim().length < 1) {
      res.status(400).json({
        success: false,
        error: {code: "INVALID_REQUEST", message: "itemName is required"},
        timestamp,
      });
      return;
    }

    const trimmedName = itemName.trim();

    functions.logger.info("normalizeItemName request", {itemName: trimmedName});

    // 短い品物名（2文字以下）はそのまま返す
    if (trimmedName.length <= 2) {
      const response: NormalizeItemNameResponse = {
        normalizedName: trimmedName,
        confidence: "high",
      };
      res.status(200).json({
        success: true,
        data: response,
        timestamp,
      });
      return;
    }

    // Gemini Flash Liteで正規化
    const prompt = buildNormalizePrompt(trimmedName);
    const result = await generateContentLite(prompt);

    // 結果をクリーンアップ（改行・余分な空白を除去）
    const normalizedName = result.replace(/[\n\r]/g, "").trim();

    // 信頼度を判定
    let confidence: "high" | "medium" | "low" = "medium";
    if (normalizedName === trimmedName) {
      // 変更なし = そのままでOK
      confidence = "high";
    } else if (normalizedName.length <= trimmedName.length / 2) {
      // 大幅に短くなった = 抽出成功
      confidence = "high";
    } else if (normalizedName.length > trimmedName.length) {
      // 長くなった = 何かおかしい
      confidence = "low";
    }

    functions.logger.info("normalizeItemName result", {
      itemName: trimmedName,
      normalizedName,
      confidence,
    });

    const response: NormalizeItemNameResponse = {
      normalizedName: normalizedName || trimmedName,
      confidence,
    };

    res.status(200).json({
      success: true,
      data: response,
      timestamp,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    functions.logger.error("normalizeItemName error", {error: errorMsg});

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
export const normalizeItemName = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(normalizeItemNameHandler);
