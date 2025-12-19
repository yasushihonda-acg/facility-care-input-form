/**
 * Google Chat Webhook送信サービス
 *
 * 食事記録入力時にGoogle Chatスペースへ自動通知を送信する
 * 設計書: docs/GOOGLE_CHAT_WEBHOOK_SPEC.md
 */

import * as functions from "firebase-functions";
import {MealRecordForChat} from "../types";

/**
 * 食事記録をGoogle Chat形式のメッセージに変換
 *
 * メッセージテンプレート:
 * ```
 * 【{facility}_{residentName}様】
 * #食事🍚
 *
 * 記録者：{staffName}
 *
 * 摂取時間：{mealTime}
 *
 * 食事摂取方法：{intakeMethod}
 *
 * 主食摂取量：{mainDishRatio || '--'}
 *
 * 副食摂取量：{sideDishRatio || '--'}
 *
 * 特記事項：{note}
 *
 *
 * 【投稿ID】：{postId}
 * ```
 */
export function formatMealRecordMessage(record: MealRecordForChat): string {
  // ヘッダー: 【{facility}_{residentName}様】
  const header = `【${record.facility}_${record.residentName}様】`;

  // 食事摂取方法の決定ロジック
  // - injectionType が空 → 「経口」
  // - injectionType のみ → injectionType
  // - injectionType + injectionAmount → 「{injectionType}（{injectionAmount}）」
  let intakeMethod = "経口";
  if (record.injectionType) {
    intakeMethod = record.injectionAmount ?
      `${record.injectionType}（${record.injectionAmount}）` :
      record.injectionType;
  }

  // メッセージ本文を組み立て
  const lines = [
    header,
    "#食事🍚",
    "",
    `記録者：${record.staffName}`,
    "",
    `摂取時間：${record.mealTime}`,
    "",
    `食事摂取方法：${intakeMethod}`,
    "",
    `主食摂取量：${record.mainDishRatio || "--"}`,
    "",
    `副食摂取量：${record.sideDishRatio || "--"}`,
    "",
    `特記事項：${record.note || ""}`,
    "",
    "",
    `【投稿ID】：${record.postId}`,
  ];

  // Phase 17: 写真URLがあれば追加
  if (record.photoUrl) {
    lines.push("");
    lines.push(`📷 ${record.photoUrl}`);
  }

  return lines.join("\n");
}

/**
 * Google Chat WebhookにPOSTリクエストを送信
 *
 * @param webhookUrl - Google Chat Webhook URL
 * @param message - 送信するメッセージ本文
 * @returns 送信成功した場合はtrue、失敗した場合はfalse
 */
export async function sendToGoogleChat(
  webhookUrl: string,
  message: string
): Promise<boolean> {
  // URLの基本検証
  if (!webhookUrl || !webhookUrl.startsWith("https://chat.googleapis.com/")) {
    functions.logger.warn("[GoogleChat] Invalid webhook URL:", webhookUrl);
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json; charset=UTF-8"},
      body: JSON.stringify({text: message}),
    });

    if (response.ok) {
      functions.logger.info("[GoogleChat] Message sent successfully");
      return true;
    } else {
      const errorText = await response.text();
      functions.logger.error("[GoogleChat] Send failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }
  } catch (error) {
    functions.logger.error("[GoogleChat] Send error:", error);
    return false;
  }
}

/**
 * 食事記録をGoogle Chatに通知
 *
 * @param record - 食事記録データ
 * @param webhookUrl - 通常Webhook URL
 * @param importantWebhookUrl - 重要Webhook URL（オプション）
 * @param isImportant - 重要フラグ（trueの場合は追加で重要Webhookにも送信）
 */
export async function notifyMealRecord(
  record: MealRecordForChat,
  webhookUrl: string | undefined,
  importantWebhookUrl: string | undefined,
  isImportant: boolean
): Promise<void> {
  // Webhook URLが未設定の場合はスキップ
  if (!webhookUrl) {
    functions.logger.info("[GoogleChat] Webhook URL not configured, skipping notification");
    return;
  }

  // メッセージを生成
  const message = formatMealRecordMessage(record);

  // 通常Webhookに送信（全記録）
  const normalResult = await sendToGoogleChat(webhookUrl, message);
  functions.logger.info("[GoogleChat] Normal webhook result:", normalResult);

  // 重要フラグが立っている場合は追加で重要Webhookにも送信
  if (isImportant && importantWebhookUrl) {
    const importantResult = await sendToGoogleChat(importantWebhookUrl, message);
    functions.logger.info("[GoogleChat] Important webhook result:", importantResult);
  }
}
