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
  GetPlanDataRequest,
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
 * 記録データを Firestore に保存（洗い替え）
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
  const batch = db.batch();
  const collection = db.collection(COLLECTIONS.PLAN_DATA);

  // 既存データを削除（洗い替え）
  const existingDocs = await collection
    .where("sheetName", "==", sheetName)
    .get();

  existingDocs.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  // 新しいデータを追加
  const syncedAt = Timestamp.now();
  records.forEach((record) => {
    const docRef = collection.doc();
    batch.set(docRef, {
      ...record,
      sheetName,
      syncedAt,
    });
  });

  await batch.commit();
  return records.length;
}

/**
 * 記録データを取得
 *
 * @param request 取得条件
 */
export async function getPlanData(
  request: GetPlanDataRequest
): Promise<{ records: PlanData[]; totalCount: number; lastSyncedAt: string }> {
  const db = getFirestore();
  let query: admin.firestore.Query = db.collection(COLLECTIONS.PLAN_DATA);

  if (request.residentId) {
    query = query.where("residentId", "==", request.residentId);
  }

  query = query.orderBy("syncedAt", "desc");

  const limit = request.limit || 100;
  query = query.limit(limit);

  const snapshot = await query.get();
  const records: PlanData[] = [];
  let lastSyncedAt = "";

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as PlanData;
    records.push(data);

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
