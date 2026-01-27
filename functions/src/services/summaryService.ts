/**
 * 階層的要約サービス (Phase 46)
 *
 * syncPlanData実行時に日次/週次/月次要約を自動生成し、
 * RAGの品質・効率を向上させる。
 */

import * as functions from "firebase-functions";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {generateContent, generateContentLite} from "./geminiService";
import {formatDateString, getTodayString} from "../utils/scheduleUtils";
import type {
  PlanDataSummary,
  SummaryType,
  SummarySheetInfo,
  CorrelationResult,
} from "../types";

const COLLECTIONS = {
  PLAN_DATA: "plan_data",
  SUMMARIES: "plan_data_summaries",
};

// Phase 70: JST固定オフセット（Asia/Tokyo = UTC+9）
const JST_OFFSET_MINUTES = 9 * 60;

/**
 * Phase 70: 日付文字列（YYYY-MM-DD）をJST境界のTimestampに変換
 * @param dateStr 日付文字列（YYYY-MM-DD形式）
 * @param endOfDay true: 23:59:59、false: 00:00:00
 */
function toJstDayBoundary(dateStr: string, endOfDay = false): Timestamp {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Invalid date string: ${dateStr}`);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;

  // JSTをUTCに変換
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second) -
    JST_OFFSET_MINUTES * 60 * 1000;
  return Timestamp.fromMillis(utcMs);
}

interface PlanRecord {
  date: string;
  sheetName: string;
  [key: string]: unknown;
}

/**
 * 日付文字列からISO週番号を取得
 */
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 +
    (week1.getDay() + 6) % 7) / 7
  );
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

/**
 * 期間の開始日・終了日を計算
 */
function getPeriodRange(
  type: SummaryType,
  dateStr: string
): { start: string; end: string } {
  if (type === "daily") {
    return {start: dateStr, end: dateStr};
  }

  if (type === "weekly") {
    // YYYY-Www 形式をパース
    const match = dateStr.match(/^(\d{4})-W(\d{2})$/);
    if (!match) {
      throw new Error(`Invalid weekly format: ${dateStr}`);
    }
    const year = parseInt(match[1]);
    const week = parseInt(match[2]);

    // ISO週の開始日（月曜日）を計算
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      start: formatDateString(weekStart),
      end: formatDateString(weekEnd),
    };
  }

  if (type === "monthly") {
    // YYYY-MM 形式
    const [year, month] = dateStr.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // 月末

    return {
      start: formatDateString(start),
      end: formatDateString(end),
    };
  }

  throw new Error(`Unknown type: ${type}`);
}

/**
 * 指定期間のレコードを取得
 * Phase 70: timestampAt（Firestore Timestamp型）を優先使用
 */
async function getRecordsForPeriod(
  startDate: string,
  endDate: string
): Promise<PlanRecord[]> {
  const db = getFirestore();

  // Phase 70: Timestamp型で期間検索（より正確）
  const startAt = toJstDayBoundary(startDate, false);
  const endAt = toJstDayBoundary(endDate, true);

  const snapshot = await db
    .collection(COLLECTIONS.PLAN_DATA)
    .where("timestampAt", ">=", startAt)
    .where("timestampAt", "<=", endAt)
    .orderBy("timestampAt", "desc")
    .limit(2000)
    .get();

  // timestampAtがない古いデータへのフォールバック
  if (snapshot.empty) {
    functions.logger.info("No records with timestampAt, falling back to string query", {
      startDate,
      endDate,
    });
    const fallbackSnapshot = await db
      .collection(COLLECTIONS.PLAN_DATA)
      .where("timestamp", ">=", startDate)
      .where("timestamp", "<=", endDate + "T23:59:59")
      .orderBy("timestamp", "desc")
      .limit(2000)
      .get();

    return fallbackSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        date: String(data.timestamp || ""),
        sheetName: String(data.sheetName || ""),
        ...data.data as Record<string, unknown>,
      };
    });
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      date: String(data.timestamp || ""),
      sheetName: String(data.sheetName || ""),
      ...data.data as Record<string, unknown>,
    };
  });
}

/**
 * シート別にレコードをグループ化
 */
function groupBySheet(
  records: PlanRecord[]
): Record<string, PlanRecord[]> {
  const grouped: Record<string, PlanRecord[]> = {};
  for (const record of records) {
    const sheet = record.sheetName;
    if (!grouped[sheet]) {
      grouped[sheet] = [];
    }
    grouped[sheet].push(record);
  }
  return grouped;
}

/**
 * 相関パターンを検出
 */
function detectCorrelations(
  records: PlanRecord[],
  bySheet: Record<string, PlanRecord[]>
): CorrelationResult[] {
  const correlations: CorrelationResult[] = [];

  // 頓服×排便 相関
  if (bySheet["内服"] && bySheet["排便・排尿"]) {
    const tonpukuDates: string[] = [];
    for (const r of bySheet["内服"]) {
      const tonpuku = String(r["何時に頓服薬を飲まれましたか？"] || "");
      if (tonpuku && tonpuku !== "-" && tonpuku !== "") {
        const dateStr = r.date?.split(" ")[0];
        if (dateStr) tonpukuDates.push(dateStr);
      }
    }

    if (tonpukuDates.length > 0) {
      let matchCount = 0;
      for (const tonpukuDate of tonpukuDates) {
        // 同日または翌日に排便があるか
        const nextDay = new Date(tonpukuDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = formatDateString(nextDay);

        const hasBowel = bySheet["排便・排尿"].some((r) => {
          const dateStr = r.date?.split(" ")[0];
          const bowel = String(r["排便はありましたか？"] || "");
          return (dateStr === tonpukuDate || dateStr === nextDayStr) &&
                 bowel.includes("あり");
        });
        if (hasBowel) matchCount++;
      }

      if (tonpukuDates.length >= 2) {
        const rate = matchCount / tonpukuDates.length;
        correlations.push({
          pattern: "頓服→排便",
          observation: `頓服服用後に排便あり: ${matchCount}/${tonpukuDates.length}回 (${Math.round(rate * 100)}%)`,
          confidence: rate >= 0.8 ? "high" : rate >= 0.5 ? "medium" : "low",
        });
      }
    }
  }

  // バイタル異常検出
  if (bySheet["バイタル"]) {
    const abnormals: string[] = [];
    for (const r of bySheet["バイタル"]) {
      const bp = String(r["血圧（収縮期）"] || r["血圧"] || "");
      const temp = String(r["体温"] || "");

      const bpNum = parseFloat(bp);
      const tempNum = parseFloat(temp);

      if (bpNum >= 140) {
        abnormals.push(`高血圧(${bpNum})`);
      }
      if (tempNum >= 37.5) {
        abnormals.push(`発熱(${tempNum})`);
      }
    }

    if (abnormals.length > 0) {
      correlations.push({
        pattern: "バイタル異常",
        observation: `期間中の異常値: ${abnormals.slice(0, 5).join(", ")}${abnormals.length > 5 ? "..." : ""}`,
        confidence: abnormals.length >= 3 ? "high" : "medium",
      });
    }
  }

  return correlations;
}

/**
 * 要約プロンプトを生成
 */
function buildSummaryPrompt(
  type: SummaryType,
  periodStart: string,
  periodEnd: string,
  bySheet: Record<string, PlanRecord[]>,
  correlations: CorrelationResult[]
): string {
  const sheetSummaries = Object.entries(bySheet)
    .map(([sheet, recs]) => `- ${sheet}: ${recs.length}件`)
    .join("\n");

  const correlationText = correlations.length > 0 ?
    correlations.map((c) => `- ${c.pattern}: ${c.observation}`).join("\n") :
    "特になし";

  const typeLabel = type === "daily" ? "日次" : type === "weekly" ? "週次" : "月次";

  return `あなたは介護記録の分析専門家です。以下のケア記録データを分析し、${typeLabel}要約を作成してください。

## 対象期間
${periodStart} ～ ${periodEnd}

## シート別レコード数
${sheetSummaries}

## 検出された相関パターン
${correlationText}

## 要約作成ルール
1. 日本語で簡潔に（${type === "daily" ? "100" : type === "weekly" ? "200" : "300"}文字以内）
2. 重要な傾向・変化を優先
3. 相関パターンがあれば言及
4. 具体的な日付や数値を含める

## 出力形式
以下のJSON形式で出力してください:
{
  "summary": "要約テキスト",
  "keyInsights": ["洞察1", "洞察2", "洞察3"]
}`;
}

/**
 * 要約を生成
 */
export async function generateSummary(
  type: SummaryType,
  dateStr: string,
  forceRegenerate = false
): Promise<{summary: PlanDataSummary; generated: boolean; processingTime: number}> {
  const startTime = Date.now();
  const db = getFirestore();

  // 既存チェック
  const existingDoc = await db
    .collection(COLLECTIONS.SUMMARIES)
    .doc(dateStr)
    .get();

  if (existingDoc.exists && !forceRegenerate) {
    return {
      summary: existingDoc.data() as PlanDataSummary,
      generated: false,
      processingTime: Date.now() - startTime,
    };
  }

  // 期間を計算
  const {start, end} = getPeriodRange(type, dateStr);

  // レコードを取得
  const records = await getRecordsForPeriod(start, end);

  if (records.length === 0) {
    throw new Error(`No records found for period: ${start} - ${end}`);
  }

  // シート別にグループ化
  const bySheet = groupBySheet(records);

  // 相関を検出
  const correlations = detectCorrelations(records, bySheet);

  // 関連日付を抽出（頓服日など）
  const relatedDates: string[] = [];
  if (bySheet["内服"]) {
    for (const r of bySheet["内服"]) {
      const tonpuku = String(r["何時に頓服薬を飲まれましたか？"] || "");
      if (tonpuku && tonpuku !== "-" && tonpuku !== "") {
        const dateStr = r.date?.split(" ")[0];
        if (dateStr && !relatedDates.includes(dateStr)) {
          relatedDates.push(dateStr);
        }
      }
    }
  }

  // プロンプト生成
  const prompt = buildSummaryPrompt(type, start, end, bySheet, correlations);

  // AI生成（日次はLite、週次/月次はFlash）
  const generateFn = type === "daily" ? generateContentLite : generateContent;
  const responseText = await generateFn(prompt);

  // レスポンスをパース
  let summaryText = "";
  let keyInsights: string[] = [];

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summaryText = parsed.summary || "";
      keyInsights = parsed.keyInsights || [];
    }
  } catch (e) {
    // JSONパース失敗時は全文を要約として使用
    summaryText = responseText.trim();
    functions.logger.warn("Summary JSON parse failed, using raw text", {error: e});
  }

  // シート別サマリー
  const sheetSummaries: SummarySheetInfo[] = Object.entries(bySheet).map(
    ([sheetName, recs]) => ({
      sheetName,
      summary: `${recs.length}件の記録`,
      recordCount: recs.length,
    })
  );

  // 要約ドキュメント作成
  const summary: PlanDataSummary = {
    id: dateStr,
    type,
    periodStart: start,
    periodEnd: end,
    summary: summaryText,
    keyInsights,
    sheetSummaries,
    correlations: correlations.length > 0 ? correlations : undefined,
    relatedDates,
    sourceRecordCount: records.length,
    generatedAt: Timestamp.now(),
    generatedBy: type === "daily" ? "gemini-flash-lite" : "gemini-flash",
  };

  // Firestoreに保存
  await db.collection(COLLECTIONS.SUMMARIES).doc(dateStr).set(summary);

  functions.logger.info("Summary generated", {
    type,
    dateStr,
    recordCount: records.length,
    processingTime: Date.now() - startTime,
  });

  return {
    summary,
    generated: true,
    processingTime: Date.now() - startTime,
  };
}

/**
 * 要約一覧を取得
 */
export async function getSummaries(options: {
  type?: SummaryType;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<{summaries: PlanDataSummary[]; totalCount: number}> {
  const db = getFirestore();
  let query = db.collection(COLLECTIONS.SUMMARIES)
    .orderBy("periodStart", "desc");

  if (options.type) {
    query = query.where("type", "==", options.type);
  }

  if (options.from) {
    query = query.where("periodStart", ">=", options.from);
  }

  if (options.to) {
    query = query.where("periodEnd", "<=", options.to);
  }

  const limit = options.limit || 50;
  query = query.limit(limit);

  const snapshot = await query.get();
  const summaries = snapshot.docs.map((doc) => doc.data() as PlanDataSummary);

  return {
    summaries,
    totalCount: summaries.length,
  };
}

/**
 * 今日の要約を生成（syncPlanData後に呼び出し）
 */
export async function generateTodaySummary(): Promise<void> {
  const today = new Date();
  const todayStr = getTodayString();

  try {
    await generateSummary("daily", todayStr, true);
    functions.logger.info("Daily summary generated", {date: todayStr});
  } catch (e) {
    functions.logger.warn("Daily summary generation failed", {
      date: todayStr,
      error: e instanceof Error ? e.message : "Unknown",
    });
  }

  // 日曜日なら週次要約も生成
  if (today.getDay() === 0) {
    const weekStr = getISOWeek(today);
    try {
      await generateSummary("weekly", weekStr, true);
      functions.logger.info("Weekly summary generated", {week: weekStr});
    } catch (e) {
      functions.logger.warn("Weekly summary generation failed", {
        week: weekStr,
        error: e instanceof Error ? e.message : "Unknown",
      });
    }
  }

  // 月末なら月次要約も生成
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (tomorrow.getMonth() !== today.getMonth()) {
    const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    try {
      await generateSummary("monthly", monthStr, true);
      functions.logger.info("Monthly summary generated", {month: monthStr});
    } catch (e) {
      functions.logger.warn("Monthly summary generation failed", {
        month: monthStr,
        error: e instanceof Error ? e.message : "Unknown",
      });
    }
  }
}
