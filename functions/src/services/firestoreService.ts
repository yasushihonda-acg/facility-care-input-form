/**
 * Firestore サービス
 * Flow A (記録同期) と Flow C (家族要望) のデータ操作
 */

import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {COLLECTIONS} from "../config/sheets";
import {
  PlanData,
  FamilyRequest,
  SubmitFamilyRequestRequest,
  GetFamilyRequestsRequest,
} from "../types";

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
 * 記録データを Firestore に保存（洗い替え・バッチ分割対応）
 * Sheet A から同期されたデータを保存
 *
 * @param sheetName シート名
 * @param records 保存するレコード配列
 */
export async function syncPlanData(
  sheetName: string,
  records: Omit<PlanData, "syncedAt">[]
): Promise<number> {
  const db = getFirestore();
  const collection = db.collection(COLLECTIONS.PLAN_DATA);

  // 1. 既存データを削除（バッチ分割）
  const existingDocs = await collection
    .where("sheetName", "==", sheetName)
    .get();

  if (existingDocs.docs.length > 0) {
    const deleteChunks = chunkArray(existingDocs.docs, BATCH_SIZE);
    const docCount = existingDocs.docs.length;
    console.log(`Deleting ${docCount} docs in ${deleteChunks.length} batches: ${sheetName}`);

    for (let i = 0; i < deleteChunks.length; i++) {
      const batch = db.batch();
      deleteChunks[i].forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Delete batch ${i + 1}/${deleteChunks.length} completed for ${sheetName}`);
    }
  }

  // 2. 新しいデータを追加（バッチ分割）
  const syncedAt = Timestamp.now();
  const insertChunks = chunkArray(records, BATCH_SIZE);
  console.log(`Inserting ${records.length} records in ${insertChunks.length} batches for ${sheetName}`);

  for (let i = 0; i < insertChunks.length; i++) {
    const batch = db.batch();
    insertChunks[i].forEach((record) => {
      const docRef = collection.doc();
      batch.set(docRef, {
        ...record,
        sheetName,
        syncedAt,
      });
    });
    await batch.commit();
    console.log(`Insert batch ${i + 1}/${insertChunks.length} completed for ${sheetName}`);
  }

  return records.length;
}

/**
 * 記録データ取得オプション
 */
interface GetPlanDataOptions {
  sheetName?: string;
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

  // タイムスタンプ降順でソート
  query = query.orderBy("timestamp", "desc");

  // 取得件数制限
  const limit = options.limit || 1000;
  query = query.limit(limit);

  const snapshot = await query.get();
  const records: PlanDataWithId[] = [];
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

  return {
    records,
    totalCount: records.length,
    lastSyncedAt,
  };
}

// =============================================================================
// Flow C: Family Requests (家族要望)
// =============================================================================

/**
 * 家族要望を保存
 *
 * @param request 家族要望リクエスト
 * @return 生成されたリクエストID
 */
export async function createFamilyRequest(
  request: SubmitFamilyRequestRequest
): Promise<string> {
  const db = getFirestore();
  const collection = db.collection(COLLECTIONS.FAMILY_REQUESTS);

  const now = Timestamp.now();
  const requestId = generateRequestId(request.userId);

  const familyRequest: Omit<FamilyRequest, "id"> = {
    userId: request.userId,
    residentId: request.residentId,
    category: request.category,
    content: request.content,
    priority: request.priority,
    status: "pending",
    attachments: request.attachments || [],
    createdAt: now,
    updatedAt: now,
  };

  await collection.doc(requestId).set({
    ...familyRequest,
    id: requestId,
  });

  return requestId;
}

/**
 * 家族要望を取得
 *
 * @param request 取得条件
 */
export async function getFamilyRequests(request: GetFamilyRequestsRequest): Promise<{
  requests: FamilyRequest[];
  totalCount: number;
}> {
  const db = getFirestore();
  let query: admin.firestore.Query = db.collection(COLLECTIONS.FAMILY_REQUESTS);

  if (request.userId) {
    query = query.where("userId", "==", request.userId);
  }

  if (request.residentId) {
    query = query.where("residentId", "==", request.residentId);
  }

  if (request.status) {
    query = query.where("status", "==", request.status);
  }

  query = query.orderBy("createdAt", "desc");

  const limit = request.limit || 50;
  query = query.limit(limit);

  const snapshot = await query.get();
  const requests: FamilyRequest[] = [];

  snapshot.docs.forEach((doc) => {
    requests.push(doc.data() as FamilyRequest);
  });

  return {
    requests,
    totalCount: requests.length,
  };
}

/**
 * 家族要望のステータスを更新
 *
 * @param requestId リクエストID
 * @param status 新しいステータス
 */
export async function updateFamilyRequestStatus(
  requestId: string,
  status: "pending" | "reviewed" | "implemented"
): Promise<void> {
  const db = getFirestore();
  const docRef = db.collection(COLLECTIONS.FAMILY_REQUESTS).doc(requestId);

  await docRef.update({
    status,
    updatedAt: Timestamp.now(),
  });
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * リクエストIDを生成
 * フォーマット: REQ_{userId}_{YYYYMMDD}_{HHmmss}
 */
function generateRequestId(userId: string): string {
  const now = new Date();
  const dateStr = now
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  return `REQ_${userId}_${dateStr}`;
}

/**
 * 推定レビュー日を計算（2営業日後）
 */
export function calculateEstimatedReviewDate(): string {
  const now = new Date();
  let daysToAdd = 2;
  const resultDate = new Date(now);

  while (daysToAdd > 0) {
    resultDate.setDate(resultDate.getDate() + 1);
    const dayOfWeek = resultDate.getDay();
    // 土日をスキップ
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysToAdd--;
    }
  }

  return resultDate.toISOString().split("T")[0];
}
