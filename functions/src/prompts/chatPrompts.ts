/**
 * 記録閲覧チャットボットプロンプト (Phase 45)
 * ケア記録に関する質問に回答するためのプロンプト
 */

import {RecordChatMessage} from "../types";

interface PlanRecord {
  date: string;
  sheetName: string;
  [key: string]: unknown;
}

/**
 * 記録閲覧チャットボット用システムプロンプト
 */
export function buildChatSystemPrompt(): string {
  return `あなたは介護施設のケア記録アシスタントです。
利用者様のケア記録データに基づいて、家族やスタッフからの質問に丁寧に回答します。

【回答のルール】
1. 必ず提供されたデータに基づいて回答してください
2. データにない情報については「記録がありません」と正直に伝えてください
3. 医療的なアドバイスは避け、事実の報告に留めてください
4. 専門用語は分かりやすく説明してください
5. 回答は200文字以内で簡潔にまとめてください

【データの種類】
- 食事: 主食・副食の摂取率
- 水分摂取量: 水分の摂取量
- 排便・排尿: 排泄の記録
- バイタル: 血圧・体温・脈拍など
- 口腔ケア: 口腔ケアの実施記録
- 内服: 服薬記録
- 特記事項: スタッフからの申し送り
- 血糖値インスリン投与: 血糖値とインスリン投与記録
- 往診録: 医師の往診記録
- 体重: 体重測定記録
- カンファレンス録: カンファレンスの記録`;
}

/**
 * ユーザーの質問とコンテキストからプロンプトを構築
 */
export function buildChatUserPrompt(
  message: string,
  records: PlanRecord[],
  context: {
    sheetName?: string;
    year?: number;
    month?: number | null;
  },
  conversationHistory?: RecordChatMessage[]
): string {
  // レコードを要約形式に変換（トークン削減）
  const recordsSummary = summarizeRecords(records, context.sheetName);

  // 会話履歴のフォーマット
  let historyText = "";
  if (conversationHistory && conversationHistory.length > 0) {
    // 直近5ターンに制限
    const recentHistory = conversationHistory.slice(-10);
    historyText = "\n【これまでの会話】\n";
    for (const msg of recentHistory) {
      const role = msg.role === "user" ? "ユーザー" : "アシスタント";
      historyText += `${role}: ${msg.content}\n`;
    }
  }

  // コンテキスト情報
  let contextText = "";
  if (context.year) {
    contextText += `${context.year}年`;
    if (context.month) {
      contextText += `${context.month}月`;
    }
  }
  if (context.sheetName) {
    contextText += `の「${context.sheetName}」`;
  }
  if (contextText) {
    contextText = `【表示中の記録】${contextText}のデータ\n\n`;
  }

  return `${contextText}【ケア記録データ】
${recordsSummary}
${historyText}
【ユーザーの質問】
${message}

上記のデータに基づいて回答してください。`;
}

/**
 * レコードを要約形式に変換
 */
function summarizeRecords(
  records: PlanRecord[],
  sheetName?: string
): string {
  if (records.length === 0) {
    return "該当する記録がありません。";
  }

  // シート名でグループ化
  const bySheet: Record<string, PlanRecord[]> = {};
  for (const record of records) {
    const sheet = record.sheetName || "不明";
    if (!bySheet[sheet]) {
      bySheet[sheet] = [];
    }
    bySheet[sheet].push(record);
  }

  let summary = "";

  // 特定シートの場合は詳細表示
  if (sheetName && bySheet[sheetName]) {
    summary += `【${sheetName}】${bySheet[sheetName].length}件\n`;
    summary += formatSheetRecords(sheetName, bySheet[sheetName]);
  } else {
    // 全シートの概要
    for (const [sheet, sheetRecords] of Object.entries(bySheet)) {
      summary += `【${sheet}】${sheetRecords.length}件\n`;
      summary += formatSheetRecords(sheet, sheetRecords.slice(0, 10));
      if (sheetRecords.length > 10) {
        summary += `...他${sheetRecords.length - 10}件\n`;
      }
      summary += "\n";
    }
  }

  return summary;
}

/**
 * シート別のレコードをフォーマット
 */
function formatSheetRecords(
  sheetName: string,
  records: PlanRecord[]
): string {
  let result = "";

  for (const record of records) {
    const date = record.date || "日付不明";
    result += `  ${date}: `;

    // シート別のフォーマット
    switch (sheetName) {
    case "食事":
      result += formatMealRecord(record);
      break;
    case "水分摂取量":
      result += formatHydrationRecord(record);
      break;
    case "排便・排尿":
      result += formatExcretionRecord(record);
      break;
    case "バイタル":
      result += formatVitalRecord(record);
      break;
    case "内服":
      result += formatMedicationRecord(record);
      break;
    case "特記事項":
      result += formatNoteRecord(record);
      break;
    case "体重":
      result += formatWeightRecord(record);
      break;
    case "口腔ケア":
      result += formatOralCareRecord(record);
      break;
    case "血糖値インスリン投与":
      result += formatBloodSugarRecord(record);
      break;
    default:
      result += formatGenericRecord(record);
    }

    result += "\n";
  }

  return result;
}

function formatMealRecord(record: PlanRecord): string {
  const mealTime = String(record["食事はいつのことですか？"] || "");
  const mainDish = String(record["主食の摂取量は何割ですか？"] || "");
  const sideDish = String(record["副食の摂取量は何割ですか？"] || "");
  const note = String(record["特記事項"] || "");
  const snack = String(record["間食は何を食べましたか？"] || "");
  let result = `${mealTime} 主食${mainDish}割 副食${sideDish}割`;
  if (snack) result += ` 間食:${snack}`;
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    result += ` (${note.slice(0, 30)})`;
  }
  return result;
}

function formatHydrationRecord(record: PlanRecord): string {
  const amount = String(record["水分量はいくらでしたか？"] || "");
  const note = String(record["特記事項"] || "");
  let result = `${amount}cc`;
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    result += ` (${note.slice(0, 30)})`;
  }
  return result;
}

function formatExcretionRecord(record: PlanRecord): string {
  const bowel = String(record["排便はありましたか？"] || "");
  const urine = String(record["排尿はありましたか？"] || "");
  const urineAmount = String(record["排尿量は何ccでしたか？"] || "");
  const note = String(record["特記事項"] || "");
  const parts: string[] = [];
  if (bowel) parts.push(bowel);
  if (urine) parts.push(`${urine}${urineAmount ? `(${urineAmount}cc)` : ""}`);
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    parts.push(note.slice(0, 30));
  }
  return parts.join(", ");
}

function formatVitalRecord(record: PlanRecord): string {
  const bpHigh = String(record["最高血圧（BP）はいくつでしたか？"] || "");
  const bpLow = String(record["最低血圧（BP）はいくつでしたか？"] || "");
  const temp = String(record["体温（KT）はいくつでしたか？"] || "");
  const pulse = String(record["脈拍（P）はいくつでしたか？"] || "");
  const spo2 = String(record["酸素飽和度（SpO2）はいくつですか？"] || "");
  const parts: string[] = [];
  if (bpHigh && bpLow) parts.push(`BP${bpHigh}/${bpLow}`);
  if (temp) parts.push(`KT${temp}℃`);
  if (pulse) parts.push(`P${pulse}`);
  if (spo2) parts.push(`SpO2${spo2}%`);
  return parts.join(" ");
}

function formatMedicationRecord(record: PlanRecord): string {
  const time = String(record["内服はいつのことですか？"] || "");
  const tonpuku = String(record["何時に頓服薬を飲まれましたか？"] || "");
  const note = String(record["特記事項"] || "");
  let result = time;
  if (tonpuku) result += ` 頓服:${tonpuku}`;
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    result += ` (${note.slice(0, 30)})`;
  }
  return result;
}

function formatNoteRecord(record: PlanRecord): string {
  const content = String(record["特記事項"] || "");
  if (content && content !== "【ケアに関すること】\n\n【ACPiece】\n") {
    return content.slice(0, 50);
  }
  return "";
}

function formatWeightRecord(record: PlanRecord): string {
  const weight = String(record["何キロでしたか？"] || "");
  const note = String(record["特記事項"] || "");
  let result = weight ? `${weight}kg` : "";
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    result += ` (${note.slice(0, 30)})`;
  }
  return result;
}

function formatOralCareRecord(record: PlanRecord): string {
  const time = String(record["口腔ケアはいつのことですか？"] || "");
  const note = String(record["特記事項"] || "");
  let result = time;
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    result += ` (${note.slice(0, 30)})`;
  }
  return result;
}

function formatBloodSugarRecord(record: PlanRecord): string {
  const bloodSugar = String(record["血糖値は？"] || "");
  const insulinUnit = String(record["インスリン投与単位は？"] || "");
  const insulinTime = String(record["インスリン投与時間は？"] || "");
  const measureTime = String(record["測定時間は？"] || "");
  const note = String(record["特記事項"] || "");
  const parts: string[] = [];
  if (measureTime) parts.push(`測定:${measureTime}`);
  if (bloodSugar) parts.push(`血糖値:${bloodSugar}`);
  if (insulinUnit) parts.push(`インスリン:${insulinUnit}単位`);
  if (insulinTime) parts.push(`投与時間:${insulinTime}`);
  if (note && note !== "【ケアに関すること】\n\n【ACPiece】\n") {
    parts.push(note.slice(0, 20));
  }
  return parts.join(" ");
}

function formatGenericRecord(record: PlanRecord): string {
  // 日付とシート名以外の最初の3フィールドを表示
  const excludeKeys = ["date", "sheetName", "id", "recordId"];
  const keys = Object.keys(record).filter((k) => !excludeKeys.includes(k));
  const parts = [];
  for (const key of keys.slice(0, 3)) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") {
      parts.push(`${key}: ${String(value).slice(0, 20)}`);
    }
  }
  return parts.join(", ");
}

/**
 * フォローアップ質問を生成するためのプロンプト
 */
export function buildFollowUpPrompt(
  userMessage: string,
  assistantResponse: string,
  records: PlanRecord[]
): string {
  const sheetNames = [...new Set(records.map((r) => r.sheetName))];

  return `ユーザーの質問: ${userMessage}
あなたの回答: ${assistantResponse}

利用可能なデータ種別: ${sheetNames.join("、")}

上記の会話に基づいて、ユーザーが次に興味を持ちそうな質問を3つ提案してください。
JSONの配列形式で出力してください。
例: ["質問1", "質問2", "質問3"]`;
}
