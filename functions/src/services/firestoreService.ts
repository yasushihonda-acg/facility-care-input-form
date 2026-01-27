/**
 * Firestore サービス
 * Flow A (記録同期) のデータ操作
 *
 * 同期方式:
 * - 差分同期 (incremental): 新規レコードのみ追加、削除なし（毎時0分 = 1時間間隔）
 * - 完全同期 (full): 洗い替えでデータ整合性担保（日次午前3時）
 *
 * 詳細は docs/archive/SYNC_CONCURRENCY.md 参照
 */

import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import * as crypto from "crypto";
import {COLLECTIONS} from "../config/sheets";
import {PlanData} from "../types";

/**
 * Firestore インスタンスを取得
 */
function getFirestore(): admin.firestore.Firestore {
  return admin.firestore();
}

// =============================================================================
// Flow A: Plan Data (記録同期)
// =============================================================================

/**
 * バッチサイズ（Firestore制限は500、安全マージンで400）
 */
const BATCH_SIZE = 400;

/**
 * 配列を指定サイズのチャンクに分割
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * タイムスタンプ文字列から年月を抽出
 * 形式: "2024/12/15 09:00" → { year: 2024, month: 12 }
 *
 * @param timestamp タイムスタンプ文字列
 * @returns { year, month } または null
 */
export function extractYearMonth(timestamp: string): { year: number; month: number } | null {
  if (!timestamp) return null;
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    month: parseInt(match[2], 10),
  };
}

/**
 * 決定論的ドキュメントIDを生成
 * 同一レコードは常に同じIDを生成 → 重複を原理的に排除
 *
 * @param sheetName シート名
 * @param timestamp タイムスタンプ文字列
 * @param staffName スタッフ名
 * @param residentName 入居者名
 * @returns MD5ハッシュベースの20文字ID
 */
export function generateDeterministicId(
  sheetName: string,
  timestamp: string,
  staffName: string,
  residentName: string
): string {
  const input = `${sheetName}_${timestamp}_${staffName}_${residentName}`;
  const hash = crypto.createHash("md5")
    .update(input)
    .digest("hex")
    .substring(0, 20);
  return hash;
}

/**
 * 同期メタデータを取得
 *
 * @param sheetName シート名
 * @returns 最終同期日時（存在しない場合はnull）
 */
export async function getSyncMetadata(
  sheetName: string
): Promise<{lastSyncedAt: Timestamp | null; recordCount: number}> {
  const db = getFirestore();
  const docRef = db.collection(COLLECTIONS.SYNC_METADATA).doc(sheetName);
  const doc = await docRef.get();

  if (!doc.exists) {
    return {lastSyncedAt: null, recordCount: 0};
  }

  const data = doc.data();
  return {
    lastSyncedAt: data?.lastSyncedAt || null,
    recordCount: data?.recordCount || 0,
  };
}

/**
 * 同期メタデータを更新
 *
 * @param sheetName シート名
 * @param recordCount 同期したレコード数
 * @param syncType 同期タイプ（incremental/full）
 */
export async function updateSyncMetadata(
  sheetName: string,
  recordCount: number,
  syncType: "incremental" | "full"
): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection(COLLECTIONS.SYNC_METADATA).doc(sheetName);

  await docRef.set({
    sheetName,
    lastSyncedAt: Timestamp.now(),
    recordCount,
    syncType,
    updatedAt: Timestamp.now(),
  }, {merge: true});
}

/**
 * 記録データを Firestore に完全同期（洗い替え・バッチ分割対応）
 * 日次の完全同期で使用。既存データを削除後、全データを再挿入。
 * 決定論的IDを使用するため、重複は原理的に発生しない。
 *
 * @param sheetName シート名
 * @param records 保存するレコード配列
 */
export async function syncPlanDataFull(
  sheetName: string,
  records: Omit<PlanData, "syncedAt">[]
): Promise<number> {
  const db = getFirestore();
  const collection = db.collection(COLLECTIONS.PLAN_DATA);

  // 1. 新しいデータを追加（決定論的ID・バッチ分割）
  // ※ 先に追加することで、途中失敗時もデータが残る
  const syncedAt = Timestamp.now();
  const insertChunks = chunkArray(records, BATCH_SIZE);
  const insertedIds = new Set<string>();

  console.log(`[FULL] Inserting ${records.length} records in ${insertChunks.length} batches for ${sheetName}`);

  for (let i = 0; i < insertChunks.length; i++) {
    const batch = db.batch();
    insertChunks[i].forEach((record) => {
      // 決定論的ID生成
      const docId = generateDeterministicId(
        sheetName,
        record.timestamp,
        record.staffName,
        record.residentName
      );
      insertedIds.add(docId);
      const docRef = collection.doc(docId);
      // 年月を抽出
      const yearMonth = extractYearMonth(record.timestamp);
      batch.set(docRef, {
        ...record,
        sheetName,
        syncedAt,
        year: yearMonth?.year || null,
        month: yearMonth?.month || null,
      });
    });
    await batch.commit();
    console.log(`[FULL] Insert batch ${i + 1}/${insertChunks.length} completed for ${sheetName}`);
  }

  // 2. 追加成功後、古いデータを削除（シートから消えたレコードのみ）
  // ※ 追加が全て成功してから削除するため、途中失敗時はデータが残る
  const existingDocs = await collection
    .where("sheetName", "==", sheetName)
    .get();

  const docsToDelete = existingDocs.docs.filter((doc) => !insertedIds.has(doc.id));

  if (docsToDelete.length > 0) {
    const deleteChunks = chunkArray(docsToDelete, BATCH_SIZE);
    console.log(`[FULL] Deleting ${docsToDelete.length} stale docs in ${deleteChunks.length} batches: ${sheetName}`);

    for (let i = 0; i < deleteChunks.length; i++) {
      const batch = db.batch();
      deleteChunks[i].forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`[FULL] Delete batch ${i + 1}/${deleteChunks.length} completed for ${sheetName}`);
    }
  } else {
    console.log(`[FULL] No stale docs to delete for ${sheetName}`);
  }

  // 3. メタデータ更新
  await updateSyncMetadata(sheetName, records.length, "full");

  return records.length;
}

/**
 * 記録データを Firestore に差分同期（追記のみ・削除なし）
 * 毎時0分（1時間間隔）の差分同期で使用。新規レコードのみ追加。
 * 決定論的IDを使用し、merge: trueで既存レコードは上書き（実質的に重複なし）。
 *
 * @param sheetName シート名
 * @param records 保存するレコード配列
 * @returns 新規追加されたレコード数
 */
export async function syncPlanDataIncremental(
  sheetName: string,
  records: Omit<PlanData, "syncedAt">[]
): Promise<{inserted: number; skipped: number}> {
  const db = getFirestore();
  const collection = db.collection(COLLECTIONS.PLAN_DATA);

  const syncedAt = Timestamp.now();
  const insertChunks = chunkArray(records, BATCH_SIZE);
  let insertedCount = 0;

  console.log(`[INCREMENTAL] Upserting ${records.length} records in ${insertChunks.length} batches for ${sheetName}`);

  for (let i = 0; i < insertChunks.length; i++) {
    const batch = db.batch();
    insertChunks[i].forEach((record) => {
      // 決定論的ID生成
      const docId = generateDeterministicId(
        sheetName,
        record.timestamp,
        record.staffName,
        record.residentName
      );
      const docRef = collection.doc(docId);
      // 年月を抽出
      const yearMonth = extractYearMonth(record.timestamp);
      // merge: true で既存なら上書き、なければ新規作成
      batch.set(docRef, {
        ...record,
        sheetName,
        syncedAt,
        year: yearMonth?.year || null,
        month: yearMonth?.month || null,
      }, {merge: true});
      insertedCount++;
    });
    await batch.commit();
    console.log(`[INCREMENTAL] Upsert batch ${i + 1}/${insertChunks.length} completed for ${sheetName}`);
  }

  // メタデータ更新
  await updateSyncMetadata(sheetName, records.length, "incremental");

  return {inserted: insertedCount, skipped: 0};
}

/**
 * 記録データを Firestore に保存（互換性維持用ラッパー）
 * incrementalパラメータで同期方式を切り替え
 *
 * @param sheetName シート名
 * @param records 保存するレコード配列
 * @param incremental 差分同期フラグ（true: 差分、false: 完全）
 */
export async function syncPlanData(
  sheetName: string,
  records: Omit<PlanData, "syncedAt">[],
  incremental = false
): Promise<number> {
  if (incremental) {
    const result = await syncPlanDataIncremental(sheetName, records);
    return result.inserted;
  } else {
    return await syncPlanDataFull(sheetName, records);
  }
}

/**
 * 記録データ取得オプション
 */
interface GetPlanDataOptions {
  sheetName?: string;
  /** 年で絞り込み（例: 2024） */
  year?: number;
  /** 月で絞り込み（1-12）。year指定時のみ有効 */
  month?: number;
  /** 取得件数上限（year/month指定時は無制限） */
  limit?: number;
}

/**
 * 記録データ取得結果（IDを含む）
 */
interface PlanDataWithId extends PlanData {
  id: string;
}

/**
 * 記録データを取得
 *
 * @param options 取得条件
 */
export async function getPlanData(
  options: GetPlanDataOptions = {}
): Promise<{
  records: PlanDataWithId[];
  totalCount: number;
  lastSyncedAt: string;
}> {
  const db = getFirestore();
  let query: admin.firestore.Query = db.collection(COLLECTIONS.PLAN_DATA);

  // シート名でフィルタ
  if (options.sheetName) {
    query = query.where("sheetName", "==", options.sheetName);
  }

  // 年でフィルタ（Firestoreインデックスクエリ）
  const hasYearFilter = typeof options.year === "number";
  const hasMonthFilter = typeof options.month === "number";

  if (hasYearFilter) {
    query = query.where("year", "==", options.year);
  }
  if (hasYearFilter && hasMonthFilter) {
    query = query.where("month", "==", options.month);
  }

  // タイムスタンプ降順でソート
  query = query.orderBy("timestamp", "desc");

  // 取得件数制限（年月指定時は無制限）
  if (!hasYearFilter) {
    const limit = options.limit || 1000;
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  let records: PlanDataWithId[] = [];
  let lastSyncedAt = "";

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as PlanData;
    records.push({
      ...data,
      id: doc.id,
    });

    // 最新の同期日時を記録
    if (data.syncedAt) {
      const syncedAtStr = data.syncedAt.toDate().toISOString();
      if (!lastSyncedAt || syncedAtStr > lastSyncedAt) {
        lastSyncedAt = syncedAtStr;
      }
    }
  });

  // フォールバック: 既存データにyear/monthフィールドがない場合のクライアントサイドフィルタ
  // 次回完全同期後は不要になる
  if (hasYearFilter && records.length === 0) {
    console.log("[getPlanData] Fallback: year/month fields not found, using timestamp filter");
    // limitなしで再クエリしてクライアントサイドフィルタ
    let fallbackQuery: admin.firestore.Query = db.collection(COLLECTIONS.PLAN_DATA);
    if (options.sheetName) {
      fallbackQuery = fallbackQuery.where("sheetName", "==", options.sheetName);
    }
    fallbackQuery = fallbackQuery.orderBy("timestamp", "desc");

    const fallbackSnapshot = await fallbackQuery.get();
    records = [];
    fallbackSnapshot.docs.forEach((doc) => {
      const data = doc.data() as PlanData;
      // タイムスタンプから年月を抽出してフィルタ
      const yearMonth = extractYearMonth(data.timestamp);
      if (yearMonth) {
        const matchYear = options.year === yearMonth.year;
        const matchMonth = !hasMonthFilter || options.month === yearMonth.month;
        if (matchYear && matchMonth) {
          records.push({...data, id: doc.id});
          if (data.syncedAt) {
            const syncedAtStr = data.syncedAt.toDate().toISOString();
            if (!lastSyncedAt || syncedAtStr > lastSyncedAt) {
              lastSyncedAt = syncedAtStr;
            }
          }
        }
      }
    });
  }

  return {
    records,
    totalCount: records.length,
    lastSyncedAt,
  };
}

