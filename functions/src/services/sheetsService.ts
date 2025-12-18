/**
 * Google Sheets API サービス
 * BUSINESS_RULES.md に基づくシート別アクセス制御を実装
 */

import {google, sheets_v4} from "googleapis";
import {SHEET_A, SHEET_B, SHEET_B_SHEET_NAME} from "../config/sheets";
import {SubmitMealRecordRequest, MealRecordRow} from "../types";

let sheetsClient: sheets_v4.Sheets | null = null;

/**
 * Sheets API クライアントを取得（シングルトン）
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) {
    return sheetsClient;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  sheetsClient = google.sheets({version: "v4", auth});
  return sheetsClient;
}

// =============================================================================
// Sheet A: Read-Only Operations
// =============================================================================

/**
 * Sheet A から全シート名を取得
 */
export async function getSheetASheetNames(): Promise<string[]> {
  const client = await getSheetsClient();

  const response = await client.spreadsheets.get({
    spreadsheetId: SHEET_A.id,
    fields: "sheets.properties.title",
  });

  const sheets = response.data.sheets || [];
  return sheets
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => !!title);
}

/**
 * Sheet A から特定のシートのデータを読み取り
 * @param sheetName シート名
 * @param range 範囲（例: "A2:E"）省略時は全データ
 */
export async function readFromSheetA(
  sheetName: string,
  range?: string
): Promise<string[][]> {
  const client = await getSheetsClient();

  const fullRange = range ? `${sheetName}!${range}` : sheetName;

  const response = await client.spreadsheets.values.get({
    spreadsheetId: SHEET_A.id,
    range: fullRange,
  });

  return (response.data.values as string[][]) || [];
}

/**
 * Sheet A への書き込みは禁止
 * BUSINESS_RULES.md: Sheet A は Read-Only Source
 */
export async function writeToSheetA(): Promise<never> {
  throw new Error(
    "FORBIDDEN: Sheet A is read-only. Writing is not allowed. See BUSINESS_RULES.md"
  );
}

// =============================================================================
// Sheet B: Write-Only Operations (Append Only)
// =============================================================================

/**
 * 投稿IDを生成
 * フォーマット: MEL{YYYYMMDDHHmmssSSS}{ランダム6桁}
 * 例: MEL20251214182118164542
 *
 * 既存システムの投稿ID形式に準拠:
 * - HYD: 水分補給, ORC: 排せつ, MED: 服薬, NTC: 申送り, WTM: 体温, CNF: 面会
 * - MEL: 食事
 */
function generatePostId(): string {
  const now = new Date();
  // JST時刻を取得（UTCに9時間加算）
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  // YYYYMMDDHHmmssSSS形式（17桁）
  const dateStr = jstNow.toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 17);
  // ランダム6桁
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return `MEL${dateStr}${random}`;
}

/**
 * Sheet B に食事記録を追記
 * docs/SHEET_B_STRUCTURE.md に基づく15カラム構成
 *
 * @param request 食事入力フォームリクエスト
 * @return 追記された行番号と投稿ID
 */
export async function appendMealRecordToSheetB(
  request: SubmitMealRecordRequest
): Promise<{ sheetRow: number; postId: string }> {
  const client = await getSheetsClient();

  // 行データを構築
  const row = buildMealRecordRow(request);

  const response = await client.spreadsheets.values.append({
    spreadsheetId: SHEET_B.id,
    range: `'${SHEET_B_SHEET_NAME}'!A:O`, // 15カラム（A〜O列）
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [Object.values(row)],
    },
  });

  // 追記された行番号を取得
  const updatedRange = response.data.updates?.updatedRange || "";
  const rowMatch = updatedRange.match(/(\d+)$/);
  const sheetRow = rowMatch ? parseInt(rowMatch[1], 10) : 0;

  return {sheetRow, postId: row.postId};
}

/**
 * 食事入力フォームリクエストから行データを構築
 * docs/SHEET_B_STRUCTURE.md に基づく15カラム構成
 *
 * @param request 食事入力フォームリクエスト
 * @return シートに追記する行データ
 */
function buildMealRecordRow(request: SubmitMealRecordRequest): MealRecordRow {
  const now = new Date();
  // タイムスタンプ形式: "2025/12/14 18:08:50"
  const timestamp = now.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).replace(/\//g, "/"); // 形式を確認: YYYY/MM/DD HH:mm:ss
  const postId = generatePostId();

  // 重要フラグの変換（"重要" → "はい", "重要ではない" → "いいえ"）
  // snack_onlyモードでは isImportant が undefined の場合がある
  const isImportantValue = request.isImportant === "重要" ? "はい" : "いいえ";

  // Phase 13.0.4: snack_onlyモード対応
  // snack_onlyモードでは facility, residentName, mealTime, dayServiceUsage が undefined の場合がある
  const row: MealRecordRow = {
    timestamp: timestamp, // A列
    staffName: request.staffName, // B列
    residentName: request.residentName || "", // C列
    mealTime: request.mealTime || "", // D列
    mainDishRatio: request.mainDishRatio || "", // E列
    sideDishRatio: request.sideDishRatio || "", // F列
    injectionAmount: request.injectionAmount || "", // G列
    snack: request.snack || "", // H列
    specialNotes: request.note || "", // I列
    isImportant: isImportantValue, // J列
    facility: request.facility || "", // K列
    dayServiceUsage: request.dayServiceUsage || "", // L列
    injectionType: request.injectionType || "", // M列
    postId: postId, // N列
    dayServiceName: request.dayServiceName || "", // O列
  };

  return row;
}

/**
 * Sheet B の読み取りは禁止
 * BUSINESS_RULES.md: Sheet B は Write-Only Destination
 */
export async function readFromSheetB(): Promise<never> {
  throw new Error(
    "FORBIDDEN: Sheet B is write-only. Reading is not allowed. See BUSINESS_RULES.md"
  );
}

/**
 * @deprecated 旧API（後方互換性のため残存）
 * 新しい食事記録には appendMealRecordToSheetB を使用してください
 */
export async function appendCareRecordToSheetB(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _record: unknown
): Promise<{ sheetRow: number; botNotificationTriggered: boolean }> {
  throw new Error(
    "DEPRECATED: Use appendMealRecordToSheetB for meal records. " +
    "This legacy API is no longer supported."
  );
}

/**
 * Sheet B の更新は禁止（Append のみ許可）
 * BUSINESS_RULES.md: Sheet B は Write-Only Destination
 */
export async function updateSheetB(): Promise<never> {
  throw new Error(
    "FORBIDDEN: Sheet B is append-only. Updating existing rows is not allowed. See BUSINESS_RULES.md"
  );
}
