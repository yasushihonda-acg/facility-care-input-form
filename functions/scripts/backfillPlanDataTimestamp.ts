/**
 * Phase 70: timestampAt バックフィルスクリプト
 *
 * 既存の plan_data ドキュメントに timestampAt フィールドを追加する。
 * 文字列の timestamp フィールドを Firestore Timestamp 型に変換して保存。
 *
 * 使用方法:
 *   # ドライラン（変更なし、確認のみ）
 *   DRY_RUN=true npx ts-node scripts/backfillPlanDataTimestamp.ts
 *
 *   # 本番実行（100件のみ）
 *   DRY_RUN=false LIMIT=100 npx ts-node scripts/backfillPlanDataTimestamp.ts
 *
 *   # 本番実行（全件）
 *   DRY_RUN=false npx ts-node scripts/backfillPlanDataTimestamp.ts
 *
 * 環境変数:
 *   - DRY_RUN: true（デフォルト）= 変更なし、false = 実際に更新
 *   - BATCH_SIZE: バッチサイズ（デフォルト: 400）
 *   - LIMIT: 処理件数上限（デフォルト: 0 = 無制限）
 *   - GOOGLE_APPLICATION_CREDENTIALS: サービスアカウントキーのパス
 */

/* eslint-disable no-console */
import * as admin from "firebase-admin";
import {FieldPath, Timestamp} from "firebase-admin/firestore";

// 設定
const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 400);
const DRY_RUN = process.env.DRY_RUN !== "false";
const LIMIT = Number(process.env.LIMIT ?? 0);
const COLLECTION_NAME = "plan_data";

// JST固定オフセット（Asia/Tokyo = UTC+9）
const JST_OFFSET_MINUTES = 9 * 60;

/**
 * 記録データのtimestamp文字列をDateに変換
 * 対応形式:
 * - "YYYY/MM/DD HH:mm:ss"
 * - "YYYY/MM/DD HH:mm"
 * - "YYYY-MM-DD HH:mm:ss"
 * - "YYYY-MM-DD"
 */
function parsePlanTimestampToDate(timestamp: string): Date | null {
  if (!timestamp) return null;
  const trimmed = timestamp.trim();

  const match = trimmed.match(
    /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");

  // 入力はJSTなのでUTCに変換
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, second)
    - JST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMs);
}

/**
 * タイムスタンプ文字列から年月を抽出
 */
function extractYearMonth(timestamp: string): { year: number; month: number } | null {
  if (!timestamp) return null;
  const match = timestamp.match(/^(\d{4})[/-](\d{1,2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
  };
}

interface PlanDataDoc {
  timestamp?: string;
  timestampAt?: Timestamp;
  year?: number;
  month?: number;
}

async function run(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Phase 70: timestampAt Backfill Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will update documents)"}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Limit: ${LIMIT || "unlimited"}`);
  console.log("");

  // Firebase Admin 初期化
  admin.initializeApp();
  const db = admin.firestore();

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let lastDocId: string | null = null;

  const startTime = Date.now();

  while (true) {
    // クエリ構築
    let query = db.collection(COLLECTION_NAME)
      .orderBy(FieldPath.documentId())
      .limit(BATCH_SIZE);

    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log("No more documents to process.");
      break;
    }

    const batch = db.batch();
    let batchUpdateCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data() as PlanDataDoc;

      // 既に timestampAt があり、year/month もある場合はスキップ
      if (data.timestampAt && data.year && data.month) {
        skipped++;
        continue;
      }

      const tsString = data.timestamp ?? "";
      const date = parsePlanTimestampToDate(tsString);
      const yearMonth = extractYearMonth(tsString);

      if (!date || !yearMonth) {
        console.warn(`[WARN] Parse failed: id=${doc.id}, timestamp="${tsString}"`);
        failed++;
        continue;
      }

      const updateData: Partial<PlanDataDoc> = {};

      // timestampAt がない場合のみ追加
      if (!data.timestampAt) {
        updateData.timestampAt = Timestamp.fromDate(date);
      }

      // year/month がない場合のみ追加
      if (!data.year) {
        updateData.year = yearMonth.year;
      }
      if (!data.month) {
        updateData.month = yearMonth.month;
      }

      if (Object.keys(updateData).length > 0) {
        batch.update(doc.ref, updateData);
        batchUpdateCount++;
        updated++;
      }
    }

    // バッチコミット
    if (batchUpdateCount > 0) {
      if (!DRY_RUN) {
        await batch.commit();
        console.log(`[COMMIT] Updated ${batchUpdateCount} documents`);
      } else {
        console.log(`[DRY_RUN] Would update ${batchUpdateCount} documents`);
      }
    }

    processed += snapshot.size;
    lastDocId = snapshot.docs[snapshot.docs.length - 1].id;
    console.log(`Progress: processed=${processed}, updated=${updated}, skipped=${skipped}, failed=${failed}`);

    // 上限チェック
    if (LIMIT && processed >= LIMIT) {
      console.log(`Reached limit of ${LIMIT} documents.`);
      break;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log("=".repeat(60));
  console.log("Summary");
  console.log("=".repeat(60));
  console.log(`Total processed: ${processed}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already has timestampAt): ${skipped}`);
  console.log(`Failed (parse error): ${failed}`);
  console.log(`Elapsed time: ${elapsed}s`);
  console.log("");

  if (DRY_RUN) {
    console.log("This was a DRY RUN. No documents were modified.");
    console.log("Run with DRY_RUN=false to apply changes.");
  } else {
    console.log("Backfill completed successfully.");
  }
}

run().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
