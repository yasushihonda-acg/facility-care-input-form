/**
 * Phase 30: 16時入力無し通知
 *
 * 毎日16時に実行され、その日の食事記録・水分記録の入力有無をチェック。
 * どちらかが未入力の場合、設定されたWebhook URLに通知を送信。
 *
 * 設計書: docs/FAMILY_NOTIFY_SPEC.md（作成予定）
 */

import * as functions from "firebase-functions";
import {getFirestore} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {MealFormSettings} from "../types";
import {getDailyRecordLog} from "../services/dailyRecordLogService";
import {
  sendToGoogleChat,
  formatNoRecordNotification,
} from "../services/googleChatService";

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
 * 毎日16時に実行: その日の記録入力チェック
 *
 * Cloud Scheduler + Pub/Sub トリガー
 * スケジュール: 毎日16:00 JST
 */
export const checkDailyRecords = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .pubsub.schedule("0 16 * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    functions.logger.info("checkDailyRecords started", {
      eventId: context.eventId,
      timestamp: context.timestamp,
    });

    const db = getFirestore();
    const today = getTodayDateString();

    // 日次ログを確認
    const logData = await getDailyRecordLog(today);
    const hasMealRecord = logData?.hasMealRecord ?? false;
    const hasHydrationRecord = logData?.hasHydrationRecord ?? false;

    // 両方とも記録がある場合は通知不要
    if (hasMealRecord && hasHydrationRecord) {
      functions.logger.info("checkDailyRecords: All records present", {
        date: today,
        hasMealRecord,
        hasHydrationRecord,
      });
      return {notified: false, reason: "all_records_present"};
    }

    // 設定からWebhook URLを取得
    const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
    const settings = settingsDoc.exists ?
      (settingsDoc.data() as MealFormSettings) : null;

    if (!settings?.familyNotifyWebhookUrl) {
      functions.logger.info("checkDailyRecords: No webhook configured", {
        date: today,
      });
      return {notified: false, reason: "no_webhook_configured"};
    }

    // 通知送信
    const message = formatNoRecordNotification(today, hasMealRecord, hasHydrationRecord);
    const result = await sendToGoogleChat(settings.familyNotifyWebhookUrl, message);

    functions.logger.info("checkDailyRecords completed", {
      date: today,
      notified: true,
      hasMealRecord,
      hasHydrationRecord,
      webhookResult: result,
    });

    return {
      notified: true,
      date: today,
      hasMealRecord,
      hasHydrationRecord,
      webhookResult: result,
    };
  });
