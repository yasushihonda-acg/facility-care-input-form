/**
 * 消費ログ連携サービス
 * 食事記録からの消費ログ自動作成
 *
 * docs/SNACK_RECORD_INTEGRATION_SPEC.md に基づく
 */

import * as admin from "firebase-admin";
import {Timestamp, FieldValue} from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import {getTodayString} from "../utils/scheduleUtils";
import {
  SnackRecord,
  ConsumptionLog,
  ConsumptionStatus,
  CareItem,
} from "../types";

/**
 * 消費ステータスから摂食率を計算
 */
function getConsumptionRate(status: ConsumptionStatus): number {
  const rates: Record<ConsumptionStatus, number> = {
    full: 100,
    most: 80,
    half: 50,
    little: 30,
    none: 0,
  };
  return rates[status] ?? 50;
}

/**
 * Firestore インスタンスを取得
 */
function getFirestore(): admin.firestore.Firestore {
  return admin.firestore();
}

/**
 * 間食記録から消費ログを作成
 *
 * @param snackRecords - 間食詳細記録の配列
 * @param staffName - スタッフ名
 * @param linkedMealRecordId - 食事記録の投稿ID
 * @returns 作成されたログの数
 */
export async function createConsumptionLogsFromSnackRecords(
  snackRecords: SnackRecord[],
  staffName: string,
  linkedMealRecordId: string
): Promise<{createdCount: number; errors: string[]}> {
  const db = getFirestore();
  const today = getTodayString();
  const now = Timestamp.now();

  let createdCount = 0;
  const errors: string[] = [];

  for (const snackRecord of snackRecords) {
    // itemId がない場合はスキップ（品物連携なし）
    if (!snackRecord.itemId) {
      functions.logger.info(
        "Skipping snack record without itemId",
        {itemName: snackRecord.itemName}
      );
      continue;
    }

    try {
      // CareItem の存在確認と現在の残量取得
      const itemRef = db.collection("care_items").doc(snackRecord.itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        errors.push(`CareItem not found: ${snackRecord.itemId}`);
        continue;
      }

      const item = itemDoc.data() as CareItem;
      const currentQuantity = item.currentQuantity ?? item.quantity ?? 0;

      // 消費量を計算
      const consumptionRate = snackRecord.consumptionRate ??
        getConsumptionRate(snackRecord.consumptionStatus);
      const consumedQuantity =
        snackRecord.servedQuantity * (consumptionRate / 100);
      const quantityAfter = Math.max(0, currentQuantity - consumedQuantity);

      // ConsumptionLog を作成
      const logRef = itemRef.collection("consumption_logs").doc();
      const consumptionLog: Omit<ConsumptionLog, "id"> = {
        itemId: snackRecord.itemId,
        servedDate: today,
        mealTime: "snack",
        servedQuantity: snackRecord.servedQuantity,
        servedBy: staffName,
        consumedQuantity: consumedQuantity,
        consumptionRate: consumptionRate,
        consumptionStatus: snackRecord.consumptionStatus,
        quantityBefore: currentQuantity,
        quantityAfter: quantityAfter,
        consumptionNote: snackRecord.note,
        noteToFamily: snackRecord.noteToFamily,
        followedInstruction: snackRecord.followedInstruction,
        instructionNote: snackRecord.instructionNote,
        linkedMealRecordId: linkedMealRecordId,
        sourceType: "meal_form",
        recordedBy: staffName,
        recordedAt: now,
      };

      // トランザクションでログ作成と在庫更新
      await db.runTransaction(async (transaction) => {
        // 消費ログを作成
        transaction.set(logRef, {
          id: logRef.id,
          ...consumptionLog,
        });

        // CareItem の在庫と集計を更新
        const newStatus = quantityAfter <= 0 ? "consumed" : "in_progress";
        transaction.update(itemRef, {
          "currentQuantity": quantityAfter,
          "status": newStatus,
          "consumptionSummary.totalServed": FieldValue.increment(1),
          "consumptionSummary.totalServedQuantity":
            FieldValue.increment(snackRecord.servedQuantity),
          "consumptionSummary.totalConsumedQuantity":
            FieldValue.increment(consumedQuantity),
          "consumptionSummary.lastServedDate": today,
          "consumptionSummary.lastServedBy": staffName,
          "updatedAt": now,
        });
      });

      functions.logger.info("Created consumption log from snack record", {
        logId: logRef.id,
        itemId: snackRecord.itemId,
        itemName: snackRecord.itemName,
        consumedQuantity,
        quantityAfter,
      });

      createdCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ?
        error.message :
        "Unknown error";
      errors.push(`Error processing ${snackRecord.itemName}: ${errorMessage}`);
      functions.logger.error("Error creating consumption log", {
        itemId: snackRecord.itemId,
        error,
      });
    }
  }

  return {createdCount, errors};
}

/**
 * snackRecords からSheet B用のテキストを生成
 * 例: "羊羹 1切れ（半分）、チーズ 1個（完食）"
 */
export function generateSnackTextFromRecords(
  snackRecords: SnackRecord[]
): string {
  if (!snackRecords || snackRecords.length === 0) {
    return "";
  }

  const statusLabels: Record<ConsumptionStatus, string> = {
    full: "完食",
    most: "ほぼ完食",
    half: "半分",
    little: "少量",
    none: "食べず",
  };

  return snackRecords
    .map((record) => {
      const unit = record.unit ?? "個";
      const statusLabel = statusLabels[record.consumptionStatus] ?? "";
      return `${record.itemName} ${record.servedQuantity}${unit}（${statusLabel}）`;
    })
    .join("、");
}
