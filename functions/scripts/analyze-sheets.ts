/**
 * Sheet A のシート構造を解析するスクリプト
 * 各シートのヘッダー行と最初の数行を取得してドキュメント化
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const SHEET_A_ID = "1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w";
const KEY_FILE = path.join(__dirname, "../../keys/sa-key.json");

async function main() {
  // サービスアカウント認証
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  // 全シート名を取得
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_A_ID,
    fields: "sheets.properties.title",
  });

  const sheetNames = spreadsheet.data.sheets
    ?.map((s) => s.properties?.title)
    .filter((t): t is string => !!t) || [];

  console.log(`\n=== Sheet A 構造解析 ===\n`);
  console.log(`シート数: ${sheetNames.length}`);
  console.log(`シート名一覧: ${sheetNames.join(", ")}\n`);

  const report: string[] = [];
  report.push("# Sheet A（記録の結果）データ構造仕様書\n");
  report.push(`**スプレッドシートID**: \`${SHEET_A_ID}\`\n`);
  report.push(`**解析日時**: ${new Date().toISOString()}\n`);
  report.push(`**シート数**: ${sheetNames.length}\n`);
  report.push("---\n");

  for (const sheetName of sheetNames) {
    console.log(`\n--- ${sheetName} ---`);
    report.push(`## ${sheetName}\n`);

    try {
      // ヘッダー行と最初の5行を取得
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_A_ID,
        range: `${sheetName}!A1:Z6`, // 最初の6行、A-Z列
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        console.log("  (空のシート)");
        report.push("*空のシート*\n\n");
        continue;
      }

      const header = rows[0] || [];
      const dataRows = rows.slice(1);

      console.log(`  列数: ${header.length}`);
      console.log(`  ヘッダー: ${header.join(" | ")}`);

      report.push(`### 列定義\n`);
      report.push(`| 列 | ヘッダー名 | サンプル値 |\n`);
      report.push(`|---|---|---|\n`);

      header.forEach((h, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        const sampleValues = dataRows
          .slice(0, 3)
          .map((r) => r[idx] || "")
          .filter((v) => v)
          .slice(0, 2)
          .join(", ");
        report.push(`| ${colLetter} | ${h || "(空)"} | ${sampleValues.substring(0, 50)} |\n`);
      });

      report.push(`\n**行数**: ${dataRows.length}+ 行\n\n`);
      report.push("---\n");

    } catch (error) {
      console.log(`  エラー: ${error}`);
      report.push(`*エラー: データ取得失敗*\n\n`);
    }
  }

  // レポートをファイルに出力
  const outputPath = path.join(__dirname, "../../docs/SHEET_A_STRUCTURE.md");
  fs.writeFileSync(outputPath, report.join(""));
  console.log(`\n\nレポート出力: ${outputPath}`);
}

main().catch(console.error);
