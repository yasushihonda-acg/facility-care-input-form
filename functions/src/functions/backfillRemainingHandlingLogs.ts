/**
 * 残り対応ログのバックフィル
 *
 * 既存のconsumption_logsからremainingHandling情報を読み取り、
 * careItemのremainingHandlingLogs配列に追加する
 *
 * 使い方:
 * 1. デプロイ後に一度だけ呼び出す
 * 2. 完了後はこの関数を削除またはコメントアウト
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {RemainingHandlingLog} from "../types";

const db = admin.firestore();
const REGION = "asia-northeast1";

interface BackfillResult {
  success: boolean;
  itemsProcessed: number;
  logsCreated: number;
  items: Array<{
    itemId: string;
    itemName: string;
    logsAdded: number;
  }>;
  errors: string[];
}

export const backfillRemainingHandlingLogs = functions
  .region(REGION)
  .runWith({timeoutSeconds: 540, memory: "512MB"})
  .https.onRequest(async (req, res) => {
    // CORSヘッダー
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "GET, POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    const result: BackfillResult = {
      success: true,
      itemsProcessed: 0,
      logsCreated: 0,
      items: [],
      errors: [],
    };

    try {
      // 全careItemsを取得
      const careItemsSnap = await db.collection("care_items").get();
      console.log(`Found ${careItemsSnap.size} care items`);

      for (const itemDoc of careItemsSnap.docs) {
        const itemData = itemDoc.data();
        const itemId = itemDoc.id;
        const itemName = itemData.name || "Unknown";

        result.itemsProcessed++;

        // consumption_logsサブコレクションを取得
        const logsSnap = await db
          .collection("care_items")
          .doc(itemId)
          .collection("consumption_logs")
          .orderBy("recordedAt", "asc")
          .get();

        // remainingHandlingがあるログを抽出
        const handlingLogs: RemainingHandlingLog[] = [];

        for (const logDoc of logsSnap.docs) {
          const logData = logDoc.data();

          if (
            logData.remainingHandling === "discarded" ||
            logData.remainingHandling === "stored"
          ) {
            // 既存のremainingHandlingLogsに同じIDがないか確認
            const existingLogs = itemData.remainingHandlingLogs || [];
            const alreadyExists = existingLogs.some(
              (l: RemainingHandlingLog) =>
                l.recordedAt === logData.recordedAt &&
                l.handling === logData.remainingHandling
            );

            if (!alreadyExists) {
              const remainingQuantity =
                (logData.servedQuantity || 0) - (logData.consumedQuantity || 0);

              const handlingLog: RemainingHandlingLog = {
                id: `RHL_backfill_${Date.now()}_${Math.random()
                  .toString(36)
                  .substring(2, 8)}`,
                handling: logData.remainingHandling,
                quantity: remainingQuantity > 0 ? remainingQuantity : 0,
                note: logData.remainingHandlingOther || undefined,
                recordedBy: logData.recordedBy || "unknown",
                recordedAt: logData.recordedAt,
              };

              handlingLogs.push(handlingLog);
            }
          }
        }

        // ログがあればcareItemを更新
        if (handlingLogs.length > 0) {
          const existingLogs = itemData.remainingHandlingLogs || [];
          const mergedLogs = [...existingLogs, ...handlingLogs];

          await db.collection("care_items").doc(itemId).update({
            remainingHandlingLogs: mergedLogs,
          });

          result.logsCreated += handlingLogs.length;
          result.items.push({
            itemId,
            itemName,
            logsAdded: handlingLogs.length,
          });

          console.log(
            `Updated ${itemName} (${itemId}): added ${handlingLogs.length} logs`
          );
        }
      }

      console.log(
        `Backfill complete: ${result.itemsProcessed} items processed, ` +
          `${result.logsCreated} logs created`
      );
    } catch (error) {
      result.success = false;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error("Backfill error:", error);
    }

    res.status(result.success ? 200 : 500).json(result);
  });
