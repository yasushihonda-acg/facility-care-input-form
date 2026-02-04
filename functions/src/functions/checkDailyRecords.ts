/**
 * Phase 30 / 30.1: 入力無し通知
 *
 * 毎時0分に実行され、設定された通知時刻（recordCheckHour）と現在時刻を比較。
 * 一致する場合のみ、その日の食事記録・水分記録の入力有無をチェック。
 * どちらかが未入力の場合、設定されたWebhook URLに通知を送信。
 *
 * 設計書: docs/FAMILY_NOTIFY_SPEC.md
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
import {getTodayString} from "../utils/scheduleUtils";

/** デフォルト通知時刻（16時） */
const DEFAULT_CHECK_HOUR = 16;

/**
 * 現在の時（JST）を取得
 */
function getCurrentHourJST(): number {
  const now = new Date();
  // JSTに変換（UTC+9）
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jstNow.getUTCHours();
}

/**
 * 毎時0分に実行: 設定された時刻に記録入力チェック
 *
 * Cloud Scheduler + Pub/Sub トリガー
 * スケジュール: 毎時0分 (Phase 30.1で変更)
 */
export const checkDailyRecords = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .pubsub.schedule("0 * * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    const currentHour = getCurrentHourJST();

    functions.logger.info("checkDailyRecords started", {
      eventId: context.eventId,
      timestamp: context.timestamp,
      currentHourJST: currentHour,
    });

    const db = getFirestore();

    // 設定からWebhook URLと通知時刻を取得
    const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
    const settings = settingsDoc.exists ?
      (settingsDoc.data() as MealFormSettings) : null;

    // 設定された通知時刻を取得（デフォルト: 16時）
    const checkHour = settings?.recordCheckHour ?? DEFAULT_CHECK_HOUR;

    // 現在時刻が設定された通知時刻と一致しない場合はスキップ
    if (currentHour !== checkHour) {
      functions.logger.info("checkDailyRecords: Not the configured hour, skipping", {
        currentHour,
        checkHour,
      });
      return {notified: false, reason: "not_check_hour"};
    }

    if (!settings?.familyNotifyWebhookUrl) {
      functions.logger.info("checkDailyRecords: No webhook configured", {
        currentHour,
      });
      return {notified: false, reason: "no_webhook_configured"};
    }

    const today = getTodayString();

    // 日次ログを確認
    const logData = await getDailyRecordLog(today);
    const hasMealRecord = logData?.hasMealRecord ?? false;
    const hasHydrationRecord = logData?.hasHydrationRecord ?? false;

    // どちらかの記録がある場合は通知不要（両方ない場合のみ通知）
    if (hasMealRecord || hasHydrationRecord) {
      functions.logger.info("checkDailyRecords: Some records present", {
        date: today,
        hasMealRecord,
        hasHydrationRecord,
      });
      return {notified: false, reason: "some_records_present"};
    }

    // 通知送信
    const message = formatNoRecordNotification(today, hasMealRecord, hasHydrationRecord, checkHour);
    const result = await sendToGoogleChat(settings.familyNotifyWebhookUrl, message);

    functions.logger.info("checkDailyRecords completed", {
      date: today,
      notified: true,
      hasMealRecord,
      hasHydrationRecord,
      checkHour,
      webhookResult: result,
    });

    return {
      notified: true,
      date: today,
      hasMealRecord,
      hasHydrationRecord,
      checkHour,
      webhookResult: result,
    };
  });
