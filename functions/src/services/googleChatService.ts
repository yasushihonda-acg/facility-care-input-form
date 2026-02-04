/**
 * Google Chat Webhook送信サービス
 *
 * 食事記録入力時にGoogle Chatスペースへ自動通知を送信する
 * 設計書: docs/GOOGLE_CHAT_WEBHOOK_SPEC.md
 */

import * as functions from "firebase-functions";
import {MealRecordForChat, ItemCategory} from "../types";

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
  // residentNameに既に(ID...)が含まれているかチェック
  const hasIdInName = /\(ID[^)]*\)/.test(record.residentName);

  let formattedName: string;
  if (hasIdInName) {
    // 既にIDが含まれている場合はそのまま使用
    formattedName = record.residentName;
  } else {
    // 「様」が含まれていなければ追加
    formattedName = record.residentName.includes("様") ?
      record.residentName :
      `${record.residentName}様`;
  }

  // ヘッダー: 【{facility}_{formattedName}】
  const header = `【${record.facility}_${formattedName}】`;

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
 * 指数バックオフでスリープ
 * @param attempt - 試行回数（0始まり）
 * @param baseDelayMs - 基本遅延時間（ミリ秒）
 */
async function exponentialBackoff(attempt: number, baseDelayMs = 1000): Promise<void> {
  const delay = baseDelayMs * Math.pow(2, attempt);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Google Chat WebhookにPOSTリクエストを送信
 * リトライ機能付き（429/5xx エラー時に指数バックオフ）
 *
 * @param webhookUrl - Google Chat Webhook URL
 * @param message - 送信するメッセージ本文
 * @param options - オプション設定
 * @returns 送信成功した場合はtrue、失敗した場合はfalse
 */
export async function sendToGoogleChat(
  webhookUrl: string,
  message: string,
  options: { maxRetries?: number; timeoutMs?: number } = {}
): Promise<boolean> {
  const {maxRetries = 3, timeoutMs = 5000} = options;

  // URLの基本検証
  if (!webhookUrl || !webhookUrl.startsWith("https://chat.googleapis.com/")) {
    functions.logger.warn("[GoogleChat] Invalid webhook URL:", webhookUrl);
    return false;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // AbortControllerでタイムアウトを実装
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json; charset=UTF-8"},
        body: JSON.stringify({text: message}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        functions.logger.info("[GoogleChat] Message sent successfully");
        return true;
      }

      // 429 (Rate Limit) または 5xx (Server Error) はリトライ対象
      const isRetryable = response.status === 429 || response.status >= 500;

      if (isRetryable && attempt < maxRetries) {
        functions.logger.warn(`[GoogleChat] Retryable error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          status: response.status,
          statusText: response.statusText,
        });
        await exponentialBackoff(attempt);
        continue;
      }

      // リトライ不可または最終試行
      const errorText = await response.text();
      functions.logger.error("[GoogleChat] Send failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        attempt: attempt + 1,
      });
      return false;
    } catch (error) {
      // タイムアウトまたはネットワークエラー
      const isTimeout = error instanceof Error && error.name === "AbortError";

      if (attempt < maxRetries) {
        const errType = isTimeout ? "Timeout" : "Network error";
        functions.logger.warn(
          `[GoogleChat] ${errType} (attempt ${attempt + 1}/${maxRetries + 1}):`,
          error
        );
        await exponentialBackoff(attempt);
        continue;
      }

      functions.logger.error("[GoogleChat] Send error after retries:", error);
      return false;
    }
  }

  return false;
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

// =============================================================================
// Phase 30: 家族操作・入力無し通知
// =============================================================================

/** カテゴリラベルマッピング（Phase 31: 2カテゴリに簡素化） */
const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: "食べ物",
  drink: "飲み物",
};

/** 旧カテゴリを新カテゴリに変換 */
function migrateCategory(category: string): ItemCategory {
  if (category === "drink") return "drink";
  return "food";
}

/**
 * 品物操作データ型
 */
export interface CareItemNotifyData {
  itemName: string;
  category: ItemCategory;
  quantity?: number; // undefined = 数量管理しない
  unit: string;
  expirationDate?: string;
  noteToStaff?: string;
}

/**
 * 品物操作通知メッセージを生成
 *
 * @param action - 操作種別 ('register' | 'update' | 'delete')
 * @param item - 品物データ
 * @param userId - 操作者ID
 */
export function formatCareItemNotification(
  action: "register" | "update" | "delete",
  item: CareItemNotifyData,
  userId: string
): string {
  const actionLabels = {
    register: "品物登録📦",
    update: "品物編集✏️",
    delete: "品物削除🗑️",
  };
  const userLabels = {
    register: "登録者",
    update: "編集者",
    delete: "削除者",
  };
  const actionLabel = actionLabels[action];
  const userLabel = userLabels[action];
  const categoryLabel = CATEGORY_LABELS[migrateCategory(item.category)] || item.category;

  const now = new Date();
  const jstTime = now.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 数量管理しない場合は「在庫あり」と表示
  const quantityText = item.quantity != null ?
    `数量: ${item.quantity}${item.unit}` :
    "数量: 在庫あり（数量管理なし）";

  const lines = [
    `#${actionLabel}`,
    "",
    `【${item.itemName}】`,
    `カテゴリ: ${categoryLabel}`,
    quantityText,
  ];

  // 削除時は賞味期限・伝達事項は表示しない
  if (action !== "delete") {
    if (item.expirationDate) {
      lines.push(`賞味期限: ${item.expirationDate}`);
    }

    if (item.noteToStaff) {
      lines.push(`スタッフへの伝達事項: ${item.noteToStaff}`);
    }
  }

  lines.push("");
  lines.push(`${userLabel}: ${userId}`);
  lines.push(`時刻: ${jstTime}`);

  return lines.join("\n");
}

/**
 * 入力無し通知を送信すべきかを判定
 *
 * @param hasMealRecord - 食事記録があるか
 * @param hasHydrationRecord - 水分記録があるか
 * @returns true = 通知すべき（両方ない場合）
 */
export function shouldSendNoRecordNotification(
  hasMealRecord: boolean,
  hasHydrationRecord: boolean
): boolean {
  // どちらかの記録があれば通知不要（両方ない場合のみ通知）
  return !hasMealRecord && !hasHydrationRecord;
}

/**
 * 入力無し通知メッセージを生成
 *
 * @param date - 対象日付 (YYYY-MM-DD)
 * @param hasMealRecord - 食事記録があるか
 * @param hasHydrationRecord - 水分記録があるか
 * @param checkHour - チェック時刻（0-23、デフォルト16）(Phase 30.1で追加)
 */
export function formatNoRecordNotification(
  date: string,
  hasMealRecord: boolean,
  hasHydrationRecord: boolean,
  checkHour: number = 16
): string {
  const lines = [
    "#入力無し警告⚠️",
    "",
    `【${date}】の記録が未入力です`,
    "",
  ];

  if (!hasMealRecord) {
    lines.push("- 食事記録: 未入力");
  }
  if (!hasHydrationRecord) {
    lines.push("- 水分記録: 未入力");
  }

  lines.push("");
  lines.push(`※ ${checkHour}:00時点の確認`);

  return lines.join("\n");
}

// =============================================================================
// Phase 69.3: 一括登録サマリ通知
// =============================================================================

/**
 * 一括登録結果データ型
 */
export interface BulkImportNotifyData {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  items: Array<{itemName: string; status: "success" | "failed" | "skipped"}>;
}

/**
 * 一括登録サマリ通知メッセージを生成
 *
 * @param data - 一括登録結果
 * @param userId - 操作者ID
 */
export function formatBulkImportNotification(
  data: BulkImportNotifyData,
  userId: string
): string {
  const now = new Date();
  const jstTime = now.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const lines = [
    "#品物一括登録📦",
    "",
    "【登録結果】",
    `成功: ${data.success}件`,
  ];

  if (data.failed > 0) {
    lines.push(`失敗: ${data.failed}件 ⚠️`);
  }
  if (data.skipped > 0) {
    lines.push(`スキップ（重複）: ${data.skipped}件`);
  }

  // 成功した品物の一覧（最大10件）
  const successItems = data.items.filter((i) => i.status === "success");
  if (successItems.length > 0) {
    lines.push("");
    lines.push("【登録品物】");
    const displayItems = successItems.slice(0, 10);
    displayItems.forEach((item) => {
      lines.push(`・${item.itemName}`);
    });
    if (successItems.length > 10) {
      lines.push(`...他 ${successItems.length - 10}件`);
    }
  }

  // 失敗した品物の一覧
  const failedItems = data.items.filter((i) => i.status === "failed");
  if (failedItems.length > 0) {
    lines.push("");
    lines.push("【登録失敗】");
    failedItems.forEach((item) => {
      lines.push(`・${item.itemName}`);
    });
  }

  lines.push("");
  lines.push(`登録者: ${userId}`);
  lines.push(`時刻: ${jstTime}`);

  return lines.join("\n");
}
