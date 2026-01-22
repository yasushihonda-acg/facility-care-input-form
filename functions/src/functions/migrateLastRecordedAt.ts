/**
 * 既存の品物データに lastRecordedAt を追加するマイグレーション関数
 *
 * 使用方法:
 * curl -X POST "https://asia-northeast1-facility-care-input-form.cloudfunctions.net/migrateLastRecordedAt"
 */

import * as functions from "firebase-functions/v1";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

const CARE_ITEMS_COLLECTION = "care_items";
const CONSUMPTION_LOGS_SUBCOLLECTION = "consumption_logs";

interface ConsumptionSummary {
  totalServed?: number;
  totalServedQuantity?: number;
  totalConsumedQuantity?: number;
  avgConsumptionRate?: number;
  lastServedDate?: string;
  lastServedBy?: string;
  lastRecordedAt?: string;
}

interface MigrationResult {
  success: boolean;
  updated: number;
  skipped: number;
  errors: number;
  details: string[];
}

export const migrateLastRecordedAt = functions
  .region("asia-northeast1")
  .runWith({
    memory: "512MB",
    timeoutSeconds: 300,
  })
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed. Use POST."});
      return;
    }

    functions.logger.info("🚀 lastRecordedAt マイグレーション開始...");

    const db = getFirestore();
    const result: MigrationResult = {
      success: true,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    try {
      // consumptionSummary があるが lastRecordedAt がない品物を取得
      const itemsSnapshot = await db.collection(CARE_ITEMS_COLLECTION).get();

      for (const itemDoc of itemsSnapshot.docs) {
        const itemData = itemDoc.data();
        const consumptionSummary = itemData.consumptionSummary as
          ConsumptionSummary | undefined;

        // consumptionSummary がない、または lastRecordedAt が既にある場合はスキップ
        if (!consumptionSummary || consumptionSummary.lastRecordedAt) {
          result.skipped++;
          continue;
        }

        // lastServedDate がない場合もスキップ（記録がない）
        if (!consumptionSummary.lastServedDate) {
          result.skipped++;
          continue;
        }

        try {
          // 最新の消費ログを取得
          const logsSnapshot = await itemDoc.ref
            .collection(CONSUMPTION_LOGS_SUBCOLLECTION)
            .orderBy("recordedAt", "desc")
            .limit(1)
            .get();

          let recordedAtString: string;

          if (logsSnapshot.empty) {
            // 消費ログがない場合は lastServedDate + 12:00 を仮の時刻として設定
            recordedAtString = `${consumptionSummary.lastServedDate}T12:00:00.000Z`;
            result.details.push(
              `${itemDoc.id}: フォールバック時刻 (${recordedAtString})`
            );
          } else {
            const latestLog = logsSnapshot.docs[0].data();
            const recordedAt = latestLog.recordedAt;

            // Timestamp を ISO 文字列に変換
            if (recordedAt instanceof Timestamp) {
              recordedAtString = recordedAt.toDate().toISOString();
            } else if (recordedAt?.toDate) {
              recordedAtString = recordedAt.toDate().toISOString();
            } else if (typeof recordedAt === "string") {
              recordedAtString = recordedAt;
            } else {
              // recordedAt がない場合はフォールバック
              recordedAtString =
                `${consumptionSummary.lastServedDate}T12:00:00.000Z`;
            }
            result.details.push(`${itemDoc.id}: ${recordedAtString}`);
          }

          // consumptionSummary に lastRecordedAt を追加
          await itemDoc.ref.update({
            "consumptionSummary.lastRecordedAt": recordedAtString,
          });

          result.updated++;
        } catch (error) {
          functions.logger.error(`❌ ${itemDoc.id}: エラー`, error);
          result.errors++;
          result.details.push(
            `${itemDoc.id}: エラー - ${
              error instanceof Error ? error.message : "Unknown"
            }`
          );
        }
      }

      functions.logger.info("📊 マイグレーション完了:", result);

      res.status(200).json({
        success: true,
        message: "マイグレーション完了",
        result: {
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors,
        },
        details: result.details,
      });
    } catch (error) {
      functions.logger.error("💥 マイグレーション失敗:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
