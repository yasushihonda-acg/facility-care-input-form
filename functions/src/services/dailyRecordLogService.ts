/**
 * 日次記録ログサービス
 *
 * Phase 30: 16時入力無し通知のためのログ管理
 * 食事記録・水分記録の入力有無をFirestoreで追跡
 */

import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";
import {DailyRecordLog} from "../types";

const DAILY_RECORD_LOGS_COLLECTION = "daily_record_logs";

/**
 * 日付をYYYY-MM-DD形式で取得（JST）
 */
function getTodayDateString(): string {
  const now = new Date();
  // JSTに変換（UTC+9）
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstNow.toISOString().split("T")[0];
}

/**
 * 日次記録ログを更新
 *
 * 食事記録または水分記録が入力された時に呼び出し、
 * 該当日の入力有無フラグを更新する
 *
 * @param recordType - 'meal' または 'hydration'
 */
export async function updateDailyRecordLog(
  recordType: "meal" | "hydration"
): Promise<void> {
  try {
    const db = getFirestore();
    const today = getTodayDateString();
    const docRef = db.collection(DAILY_RECORD_LOGS_COLLECTION).doc(today);

    const now = new Date().toISOString();

    const updateData: Partial<DailyRecordLog> = {
      date: today,
      updatedAt: now,
    };

    if (recordType === "meal") {
      updateData.hasMealRecord = true;
      updateData.lastMealAt = now;
    } else {
      updateData.hasHydrationRecord = true;
      updateData.lastHydrationAt = now;
    }

    // マージ保存（既存データを保持しつつ更新）
    await docRef.set(updateData, {merge: true});

    functions.logger.info(`[DailyRecordLog] Updated for ${recordType}`, {
      date: today,
      recordType,
    });
  } catch (error) {
    // ログ更新失敗は記録の成功に影響しない
    functions.logger.warn("[DailyRecordLog] Update failed:", error);
  }
}

/**
 * 指定日の日次記録ログを取得
 *
 * @param date - 対象日付 (YYYY-MM-DD)
 * @returns 日次記録ログ、存在しない場合はnull
 */
export async function getDailyRecordLog(
  date: string
): Promise<DailyRecordLog | null> {
  try {
    const db = getFirestore();
    const docRef = db.collection(DAILY_RECORD_LOGS_COLLECTION).doc(date);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as DailyRecordLog;
  } catch (error) {
    functions.logger.error("[DailyRecordLog] Get failed:", error);
    return null;
  }
}
