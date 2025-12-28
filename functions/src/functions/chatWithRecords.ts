/**
 * 記録閲覧チャットボットAPI (Phase 45)
 * ケア記録に関する質問に回答
 */

import * as functions from "firebase-functions";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {generateContent, parseJsonResponse} from "../services/geminiService";
import {getCachedPlanData} from "../services/planDataCache";
import {
  buildChatSystemPrompt,
  buildChatUserPrompt,
  buildFollowUpPrompt,
} from "../prompts/chatPrompts";
import type {
  ChatWithRecordsRequest,
  ChatWithRecordsResponse,
  ApiResponse,
} from "../types";
import {ErrorCodes} from "../types";

interface PlanRecord {
  date: string;
  sheetName: string;
  [key: string]: unknown;
}

/**
 * キーワードから関連シートを推定
 */
function inferRelatedSheets(message: string): string[] {
  const sheetMapping: Record<string, string[]> = {
    "頓服": ["内服", "排便・排尿"],
    "排泄|排便|排尿|トイレ": ["排便・排尿"],
    "食事|主食|副食|摂取率": ["食事"],
    "水分|飲|お茶|コーヒー": ["水分摂取量"],
    "バイタル|血圧|体温|脈拍|SpO2": ["バイタル"],
    "薬|服薬|内服|投与": ["内服"],
    "体重|kg": ["体重"],
    "血糖|インスリン": ["血糖値インスリン投与"],
    "往診|医師|ドクター": ["往診録"],
    "口腔|歯磨き": ["口腔ケア"],
    "特記|申し送り|メモ": ["特記事項"],
    "カンファレンス|会議": ["カンファレンス録"],
  };

  const relatedSheets = new Set<string>();
  for (const [pattern, sheets] of Object.entries(sheetMapping)) {
    if (new RegExp(pattern).test(message)) {
      sheets.forEach((s) => relatedSheets.add(s));
    }
  }

  return Array.from(relatedSheets);
}

/**
 * レコードをフィルタリング・抽出
 */
function extractRelevantRecords(
  records: unknown[],
  context: ChatWithRecordsRequest["context"],
  message: string
): PlanRecord[] {
  // レコードを標準形式に変換
  const normalizedRecords: PlanRecord[] = records.map((r) => {
    const record = r as Record<string, unknown>;
    return {
      date: String(record.timestamp || record.date || ""),
      sheetName: String(record.sheetName || ""),
      ...record.data as Record<string, unknown>,
    };
  });

  let filtered = normalizedRecords;

  // キーワードから関連シートを推定
  const relatedSheets = inferRelatedSheets(message);

  // シート名でフィルタ（関連シートがある場合はそれを優先、なければ選択中シート）
  if (relatedSheets.length > 0) {
    // 質問に関連するシートをすべて含める
    filtered = filtered.filter((r) => relatedSheets.includes(r.sheetName));
  } else if (context.sheetName) {
    // 関連シートが推定できない場合は選択中シートのみ
    filtered = filtered.filter((r) => r.sheetName === context.sheetName);
  }

  // 年月でフィルタ
  if (context.year) {
    filtered = filtered.filter((r) => {
      const recordDate = new Date(r.date);
      if (isNaN(recordDate.getTime())) return true; // 日付パース失敗は除外しない
      const recordYear = recordDate.getFullYear();
      if (recordYear !== context.year) return false;

      if (context.month) {
        const recordMonth = recordDate.getMonth() + 1;
        return recordMonth === context.month;
      }
      return true;
    });
  }

  // キーワードによる関連度スコアリング
  const keywords = extractKeywords(message);
  if (keywords.length > 0) {
    const scored = filtered.map((record) => {
      let score = 0;
      const recordStr = JSON.stringify(record).toLowerCase();
      for (const keyword of keywords) {
        if (recordStr.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }

      // 特定キーワードに対して、実際にデータがある場合はスコアを上げる
      // 頓服: 「何時に頓服薬を飲まれましたか？」に値がある場合
      if (keywords.includes("頓服")) {
        const tonpukuValue = String(
          record["何時に頓服薬を飲まれましたか？"] || ""
        );
        if (tonpukuValue && tonpukuValue !== "-") {
          score += 10; // 実際に頓服データがあるレコードを強く優先
        }
      }

      return {record, score};
    });

    // スコアでソートし、関連度が高いものを優先
    scored.sort((a, b) => b.score - a.score);

    // スコアが0より大きいものを優先、なければ全件
    const relevant = scored.filter((s) => s.score > 0);
    if (relevant.length > 0) {
      filtered = relevant.slice(0, 100).map((s) => s.record);
    } else {
      filtered = filtered.slice(0, 100);
    }
  } else {
    filtered = filtered.slice(0, 100);
  }

  return filtered;
}

/**
 * メッセージからキーワードを抽出
 */
function extractKeywords(message: string): string[] {
  // 日本語のキーワードパターン
  const patterns = [
    /頓服/g,
    /排泄|排便|排尿|トイレ/g,
    /食事|主食|副食|摂取/g,
    /水分|飲|お茶|コーヒー/g,
    /バイタル|血圧|体温|脈拍|SpO2/g,
    /薬|服薬|内服|投与/g,
    /体重|kg/g,
    /血糖|インスリン/g,
    /往診|医師|ドクター/g,
    /口腔|歯磨き/g,
    /特記|申し送り|メモ/g,
    /カンファレンス|会議/g,
  ];

  const keywords: string[] = [];
  for (const pattern of patterns) {
    const matches = message.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  }

  // シート名キーワード
  const sheetKeywords = [
    "食事", "水分摂取量", "排便・排尿", "バイタル",
    "口腔ケア", "内服", "特記事項", "血糖値インスリン投与",
    "往診録", "体重", "カンファレンス録",
  ];

  for (const sheet of sheetKeywords) {
    if (message.includes(sheet)) {
      keywords.push(sheet);
    }
  }

  return [...new Set(keywords)];
}

/**
 * ソース情報を集計
 */
function aggregateSources(
  records: PlanRecord[]
): { sheetName: string; recordCount: number }[] {
  const sheetCounts = new Map<string, number>();
  for (const record of records) {
    const count = sheetCounts.get(record.sheetName) || 0;
    sheetCounts.set(record.sheetName, count + 1);
  }

  return Array.from(sheetCounts.entries())
    .map(([sheetName, recordCount]) => ({sheetName, recordCount}))
    .sort((a, b) => b.recordCount - a.recordCount);
}

/**
 * 記録閲覧チャットボットAPI
 * POST /chatWithRecords
 */
export const chatWithRecords = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
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
        message,
        context = {},
        conversationHistory,
      } = req.body as ChatWithRecordsRequest;

      // バリデーション
      if (!message || typeof message !== "string" || message.trim() === "") {
        res.status(400).json({
          success: false,
          error: {code: ErrorCodes.INVALID_REQUEST, message: "message is required"},
          timestamp,
        });
        return;
      }

      functions.logger.info("chatWithRecords request", {
        messageLength: message.length,
        context,
        historyLength: conversationHistory?.length || 0,
      });

      // キャッシュから記録データを取得（キャッシュミス時はFirestoreから取得）
      // シートフィルタはextractRelevantRecordsで行う（質問に応じて動的に変わるため）
      const fetchStart = Date.now();
      const planDataResult = await getCachedPlanData({
        limit: 2000, // 全シート分を取得
      });
      const fetchDuration = Date.now() - fetchStart;

      // 関連レコードを抽出
      const relevantRecords = extractRelevantRecords(
        planDataResult.records,
        context,
        message
      );

      functions.logger.info("chatWithRecords records extracted", {
        totalRecords: planDataResult.records.length,
        relevantRecords: relevantRecords.length,
        inferredSheets: inferRelatedSheets(message),
        fromCache: planDataResult.fromCache,
        cacheAge: planDataResult.cacheAge,
        fetchDuration: `${fetchDuration}ms`,
      });

      // プロンプト構築
      const systemPrompt = buildChatSystemPrompt();
      const userPrompt = buildChatUserPrompt(
        message,
        relevantRecords,
        context,
        conversationHistory
      );

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

      // Gemini APIで回答生成
      const responseText = await generateContent(fullPrompt);

      // ソース情報を集計
      const sources = aggregateSources(relevantRecords);

      // フォローアップ質問を生成（オプション）
      let suggestedQuestions: string[] = [];
      try {
        const followUpPrompt = buildFollowUpPrompt(
          message,
          responseText,
          relevantRecords
        );
        const followUpText = await generateContent(followUpPrompt);
        const parsed = parseJsonResponse<string[]>(followUpText);
        if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string")) {
          suggestedQuestions = parsed.slice(0, 3);
        }
      } catch (followUpError) {
        functions.logger.warn("Follow-up generation failed", {
          error: followUpError instanceof Error ?
            followUpError.message :
            "Unknown error",
        });
        // フォローアップ失敗は無視
      }

      const responseData: ChatWithRecordsResponse = {
        message: responseText.trim(),
        sources: sources.length > 0 ? sources : undefined,
        suggestedQuestions: suggestedQuestions.length > 0 ?
          suggestedQuestions :
          undefined,
      };

      functions.logger.info("chatWithRecords success", {
        responseLength: responseData.message.length,
        sourcesCount: sources.length,
        suggestionsCount: suggestedQuestions.length,
      });

      const response: ApiResponse<ChatWithRecordsResponse> = {
        success: true,
        data: responseData,
        timestamp,
      };

      res.status(200).json(response);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      functions.logger.error("chatWithRecords error", {error: errorMsg});

      const response: ApiResponse<ChatWithRecordsResponse> = {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: `チャットエラー: ${errorMsg}`,
        },
        timestamp,
      };

      res.status(500).json(response);
    }
  });
