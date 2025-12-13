/**
 * Google Sheets API サービス
 * BUSINESS_RULES.md に基づくシート別アクセス制御を実装
 */

import {google, sheets_v4} from "googleapis";
import {SHEET_A, SHEET_B, BOT_HACK} from "../config/sheets";
import {SubmitCareRecordRequest, CareRecordRow} from "../types";

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
 * Sheet B にケア記録を追記
 * Bot連携ハック対応済み
 *
 * @param request ケア記録リクエスト
 * @return 追記された行番号
 */
export async function appendCareRecordToSheetB(
  request: SubmitCareRecordRequest
): Promise<{ sheetRow: number; botNotificationTriggered: boolean }> {
  const client = await getSheetsClient();

  // 行データを構築（Bot連携ハック適用）
  const row = buildCareRecordRow(request);

  const response = await client.spreadsheets.values.append({
    spreadsheetId: SHEET_B.id,
    range: "Sheet1!A:J", // 追記先範囲
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

  // Bot通知がトリガーされたかどうか（間食の場合）
  const botNotificationTriggered = request.recordType === "snack";

  return {sheetRow, botNotificationTriggered};
}

/**
 * ケア記録リクエストから行データを構築
 * Bot連携ハック実装（BUSINESS_RULES.md 参照）
 *
 * @param request ケア記録リクエスト
 * @return シートに追記する行データ
 */
function buildCareRecordRow(request: SubmitCareRecordRequest): CareRecordRow {
  const row: CareRecordRow = {
    timestamp: request.timestamp,
    staffId: request.staffId,
    residentId: request.residentId,
    mealContent: "",
    snackContent: "",
    hydrationAmount: "",
    specialNotes: "",
    importance: "",
    imageUrl: request.imageUrl || "",
    notes: request.notes || "",
  };

  if (request.recordType === "snack") {
    // ===== BOT連携ハック =====
    // 間食の場合は専用列ではなく特記事項に入れ、
    // 重要度を "重要" にセットしてBot通知をトリガー
    // 参照: BUSINESS_RULES.md 2.2節
    row.specialNotes = `${BOT_HACK.SNACK_PREFIX}${request.content}`;
    row.importance = BOT_HACK.IMPORTANCE_FLAG;
    // ========================
  } else if (request.recordType === "meal") {
    row.mealContent = request.content;
  } else if (request.recordType === "hydration") {
    row.hydrationAmount = request.content;
  }

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
 * Sheet B の更新は禁止（Append のみ許可）
 * BUSINESS_RULES.md: Sheet B は Write-Only Destination
 */
export async function updateSheetB(): Promise<never> {
  throw new Error(
    "FORBIDDEN: Sheet B is append-only. Updating existing rows is not allowed. See BUSINESS_RULES.md"
  );
}
