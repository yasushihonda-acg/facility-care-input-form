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
    default:
      result += formatGenericRecord(record);
    }

    result += "\n";
  }

  return result;
}

function formatMealRecord(record: PlanRecord): string {
  const mealTime = record["食事時間帯"] || record["mealTime"] || "";
  const mainDish = record["主食"] || record["mainDishRatio"] || "";
  const sideDish = record["副食"] || record["sideDishRatio"] || "";
  return `${mealTime} 主食${mainDish}% 副食${sideDish}%`;
}

function formatHydrationRecord(record: PlanRecord): string {
  const amount = record["摂取量"] || record["amount"] || "";
  const time = record["時刻"] || record["time"] || "";
  return `${time} ${amount}`;
}

function formatExcretionRecord(record: PlanRecord): string {
  const type = record["種別"] || record["type"] || "";
  const time = record["時刻"] || record["time"] || "";
  const note = record["備考"] || record["note"] || "";
  return `${time} ${type}${note ? ` (${note})` : ""}`;
}

function formatVitalRecord(record: PlanRecord): string {
  const bp = record["血圧"] || record["bloodPressure"] || "";
  const temp = record["体温"] || record["temperature"] || "";
  const pulse = record["脈拍"] || record["pulse"] || "";
  const parts = [];
  if (bp) parts.push(`血圧${bp}`);
  if (temp) parts.push(`体温${temp}℃`);
  if (pulse) parts.push(`脈拍${pulse}`);
  return parts.join(" ");
}

function formatMedicationRecord(record: PlanRecord): string {
  const name = record["薬品名"] || record["name"] || "";
  const time = record["時刻"] || record["time"] || "";
  const status = record["服用状況"] || record["status"] || "";
  return `${time} ${name} ${status}`;
}

function formatNoteRecord(record: PlanRecord): string {
  const content = record["内容"] || record["content"] ||
    record["特記事項"] || "";
  return String(content).slice(0, 50);
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
