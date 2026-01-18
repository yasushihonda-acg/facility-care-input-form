/**
 * Flow B: 食事記録入力関数
 * スタッフが食事記録をSheet Bに記録
 * docs/MEAL_INPUT_FORM_SPEC.md に基づく
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {appendMealRecordToSheetB} from "../services/sheetsService";
import {notifyMealRecord, sendToGoogleChat} from "../services/googleChatService";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {
  ApiResponse,
  SubmitMealRecordRequest,
  MealFormSettings,
  MealRecordForChat,
  ErrorCodes,
  SnackRecord,
  ChatMessage,
  ChatNotification,
  CareItem,
} from "../types";
import {
  createConsumptionLogsFromSnackRecords,
  generateSnackTextFromRecords,
} from "../services/consumptionLogService";
import {updateDailyRecordLog} from "../services/dailyRecordLogService";

/**
 * 食事記録レスポンス型
 */
interface SubmitMealRecordResponse {
  postId: string;
  sheetRow: number;
}

/**
 * Phase 19: 記録をチャットメッセージとして自動作成
 * @see docs/CHAT_INTEGRATION_SPEC.md セクション6
 *
 * snackRecords内のitemIdごとに、type='record'のメッセージを作成し、
 * 家族・スタッフがチャットスレッドで記録を確認できるようにする
 */
async function createRecordMessagesFromSnackRecords(
  snackRecords: SnackRecord[],
  staffName: string,
  residentId: string
): Promise<{createdCount: number; errors: string[]}> {
  const db = getFirestore();
  const errors: string[] = [];
  let createdCount = 0;

  // itemIdを持つレコードのみ処理（itemIdがない場合はスキップ）
  const recordsWithItemId = snackRecords.filter((record) => record.itemId);

  for (const record of recordsWithItemId) {
    try {
      const itemId = record.itemId!;
      const now = Timestamp.now();

      // 品物情報を取得
      const itemRef = db.collection("care_items").doc(itemId);
      const itemDoc = await itemRef.get();

      // 品物が存在しない場合はスキップ（削除済みなど）
      if (!itemDoc.exists) {
        const warnMsg = `Skipping record message: item ${itemId} does not exist`;
        functions.logger.warn(warnMsg);
        errors.push(warnMsg);
        continue;
      }

      const itemData = itemDoc.data() as CareItem | undefined;
      const itemName = itemData?.itemName || record.itemName || "品物";

      // 摂食状況を日本語に変換
      const consumptionStatusLabel = getConsumptionStatusLabel(
        record.consumptionStatus
      );

      // メッセージ内容を生成
      const content = generateRecordMessageContent(
        record,
        staffName,
        consumptionStatusLabel
      );

      // メッセージドキュメントを作成
      const messageRef = itemRef.collection("messages").doc();
      const message: ChatMessage = {
        id: messageRef.id,
        type: "record",
        senderType: "staff",
        senderName: staffName,
        content: content,
        recordData: record,
        readByStaff: true,
        readByFamily: false,
        createdAt: now,
      };

      // バッチ書き込み
      const batch = db.batch();

      // 1. メッセージを保存
      batch.set(messageRef, message);

      // 2. care_itemsのチャット関連フィールドを更新
      batch.update(itemRef, {
        hasMessages: true,
        lastMessageAt: now,
        lastMessagePreview: `📝 ${staffName}が提供記録を追加しました`,
        unreadCountFamily: FieldValue.increment(1),
        updatedAt: now,
      });

      // 3. 通知を作成（家族向け）
      const notificationRef = db
        .collection("residents")
        .doc(residentId)
        .collection("notifications")
        .doc();

      const notification: ChatNotification = {
        id: notificationRef.id,
        type: "record_added",
        title: `${itemName}の提供記録が追加されました`,
        body: `${staffName}: ${record.servedQuantity}${record.unit || "個"} ${consumptionStatusLabel}`,
        targetType: "family",
        read: false,
        linkTo: `/family/items/${itemId}/chat`,
        relatedItemId: itemId,
        relatedItemName: itemName,
        createdAt: now,
      };

      batch.set(notificationRef, notification);

      await batch.commit();
      createdCount++;

      functions.logger.info("Record message created", {
        itemId,
        itemName,
        messageId: messageRef.id,
      });
    } catch (error) {
      const errorMsg = `Failed to create record message for item ${record.itemId}: ${error}`;
      errors.push(errorMsg);
      functions.logger.warn(errorMsg);
    }
  }

  return {createdCount, errors};
}

/**
 * 摂食状況を日本語ラベルに変換
 */
function getConsumptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    full: "完食",
    most: "ほぼ完食",
    half: "半分",
    little: "少し",
    none: "手つかず",
  };
  return labels[status] || status;
}

/**
 * 記録メッセージの内容を生成
 */
function generateRecordMessageContent(
  record: SnackRecord,
  staffName: string,
  consumptionStatusLabel: string
): string {
  const parts: string[] = [
    "📝 提供記録",
    `${record.itemName} ${record.servedQuantity}${record.unit || "個"}`,
    `摂食状況: ${consumptionStatusLabel}`,
  ];

  if (record.note) {
    parts.push(`メモ: ${record.note}`);
  }

  if (record.noteToFamily) {
    parts.push(`家族への申し送り: ${record.noteToFamily}`);
  }

  parts.push(`記録者: ${staffName}`);

  return parts.join("\n");
}

/**
 * リクエストのバリデーション
 * docs/MEAL_INPUT_FORM_SPEC.md に基づく
 * Phase 13.0.4: recordMode='snack_only' 対応
 * docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2.5
 */
function validateRequest(
  body: unknown
): { valid: true; data: SubmitMealRecordRequest } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return {valid: false, error: "Request body is required"};
  }

  const req = body as Record<string, unknown>;
  const recordMode = (req.recordMode as string) || "full";

  // staffNameは常に必須
  if (!req.staffName || typeof req.staffName !== "string") {
    return {valid: false, error: "staffName is required"};
  }

  // snack_onlyモードの場合: snackRecordsが必須、他の必須フィールドはスキップ
  if (recordMode === "snack_only") {
    if (!req.snackRecords || !Array.isArray(req.snackRecords) ||
        req.snackRecords.length === 0) {
      return {valid: false, error: "snackRecords is required for snack_only mode"};
    }

    return {
      valid: true,
      data: {
        recordMode: "snack_only",
        staffName: req.staffName as string,
        facility: req.facility as string | undefined,
        residentName: req.residentName as string | undefined,
        snack: req.snack as string | undefined,
        note: req.note as string | undefined,
        snackRecords: req.snackRecords as SnackRecord[],
        residentId: req.residentId as string | undefined,
      },
    };
  }

  // fullモード: 従来通りの必須バリデーション
  if (!req.facility || typeof req.facility !== "string") {
    return {valid: false, error: "facility is required"};
  }

  if (!req.residentName || typeof req.residentName !== "string") {
    return {valid: false, error: "residentName is required"};
  }

  if (!req.dayServiceUsage ||
      !["利用中", "利用中ではない"].includes(req.dayServiceUsage as string)) {
    return {valid: false, error: "dayServiceUsage must be '利用中' or '利用中ではない'"};
  }

  if (!req.mealTime || !["朝", "昼", "夜"].includes(req.mealTime as string)) {
    return {valid: false, error: "mealTime must be '朝', '昼', or '夜'"};
  }

  if (!req.isImportant ||
      !["重要", "重要ではない"].includes(req.isImportant as string)) {
    return {valid: false, error: "isImportant must be '重要' or '重要ではない'"};
  }

  // 条件付き必須: デイサービス利用中の場合はデイサービス名が必須
  if (req.dayServiceUsage === "利用中" &&
      (!req.dayServiceName || typeof req.dayServiceName !== "string")) {
    return {valid: false, error: "dayServiceName is required when dayServiceUsage is '利用中'"};
  }

  return {
    valid: true,
    data: {
      recordMode: "full",
      staffName: req.staffName as string,
      facility: req.facility as string,
      residentName: req.residentName as string,
      dayServiceUsage: req.dayServiceUsage as "利用中" | "利用中ではない",
      mealTime: req.mealTime as "朝" | "昼" | "夜",
      isImportant: req.isImportant as "重要" | "重要ではない",
      dayServiceName: req.dayServiceName as string | undefined,
      mainDishRatio: req.mainDishRatio as string | undefined,
      sideDishRatio: req.sideDishRatio as string | undefined,
      injectionType: req.injectionType as string | undefined,
      injectionAmount: req.injectionAmount as string | undefined,
      snack: req.snack as string | undefined,
      note: req.note as string | undefined,
      // 間食記録連携用（オプショナル）
      snackRecords: req.snackRecords as SnackRecord[] | undefined,
      residentId: req.residentId as string | undefined,
      // Phase 17: 写真連携
      photoUrl: req.photoUrl as string | undefined,
    },
  };
}

/**
 * snack_only モード用 Webhook メッセージを生成
 * 食事記録と同じフォーマットで間食情報を投稿
 */
function buildSnackWebhookMessage(
  mealRecord: SubmitMealRecordRequest,
  postId: string
): string {
  const residentName = mealRecord.residentName || "";
  const facility = mealRecord.facility || "";

  // residentNameに既に(ID...)が含まれているかチェック
  const hasIdInName = /\(ID[^)]*\)/.test(residentName);

  let formattedName: string;
  if (hasIdInName) {
    // 既にIDが含まれている場合はそのまま使用
    formattedName = residentName;
  } else {
    // 「様」が含まれていなければ追加
    formattedName = residentName.includes("様") ?
      residentName :
      `${residentName}様`;
  }

  // 食事記録と同じフォーマットで組み立て
  const lines = [
    `【${facility}_${formattedName}】`,
    "#食事🍚",
    "",
    `記録者：${mealRecord.staffName}`,
    "",
    `間食：${mealRecord.snack || ""}`,
    "",
    `特記事項：${mealRecord.note || ""}`,
    "",
    "",
    `【投稿ID】：${postId}`,
  ];

  // 写真URLがあれば追加
  if (mealRecord.photoUrl) {
    lines.push("");
    lines.push(`📷 ${mealRecord.photoUrl}`);
  }

  return lines.join("\n");
}

/**
 * submitMealRecord 関数本体
 */
async function submitMealRecordHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use POST.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    // バリデーション
    const validation = validateRequest(req.body);
    if (!validation.valid) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.MISSING_REQUIRED_FIELD,
          message: validation.error,
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    const mealRecord = validation.data;

    // snackRecords がある場合は snack テキストを自動生成し、既存テキストと連結
    if (mealRecord.snackRecords && mealRecord.snackRecords.length > 0) {
      const generatedSnackText = generateSnackTextFromRecords(
        mealRecord.snackRecords
      );
      if (mealRecord.snack) {
        // 両方ある場合は連結（提供記録 + 補足）
        mealRecord.snack = `${generatedSnackText}。${mealRecord.snack}`;
      } else {
        mealRecord.snack = generatedSnackText;
      }
    }

    const isSnackOnlyMode = mealRecord.recordMode === "snack_only";

    functions.logger.info("submitMealRecord started", {
      staffName: mealRecord.staffName,
      residentName: mealRecord.residentName,
      facility: mealRecord.facility,
      mealTime: mealRecord.mealTime,
      recordMode: mealRecord.recordMode || "full",
      hasSnackRecords: !!mealRecord.snackRecords?.length,
    });

    // Sheet B に追記
    const {sheetRow, postId} = await appendMealRecordToSheetB(mealRecord);

    // Google Chat Webhook通知（非同期・エラーでも処理続行）
    try {
      // Firestoreから設定を取得
      const db = getFirestore();
      const settingsDoc = await db.collection("settings").doc("mealFormDefaults").get();
      const settings = settingsDoc.exists ?
        (settingsDoc.data() as MealFormSettings) :
        null;

      if (settings && (settings.webhookUrl || settings.importantWebhookUrl)) {
        // 重要フラグの判定
        const isImportant = mealRecord.isImportant === "重要";

        if (isSnackOnlyMode) {
          // snack_only モード: 間食記録用のメッセージを生成して送信
          const snackMessage = buildSnackWebhookMessage(mealRecord, postId);

          // 通常Webhookに送信
          if (settings.webhookUrl) {
            sendToGoogleChat(settings.webhookUrl, snackMessage).catch((err) => {
              functions.logger.warn("Snack webhook notification failed:", err);
            });
          }

          // 重要フラグが立っている場合は追加で重要Webhookにも送信
          if (isImportant && settings.importantWebhookUrl) {
            sendToGoogleChat(settings.importantWebhookUrl, snackMessage).catch((err) => {
              functions.logger.warn("Snack important webhook notification failed:", err);
            });
          }
        } else {
          // 通常モード: 食事記録用のメッセージを生成して送信
          const chatRecord: MealRecordForChat = {
            facility: mealRecord.facility || "",
            residentName: mealRecord.residentName || "",
            staffName: mealRecord.staffName,
            mealTime: mealRecord.mealTime || "朝",
            mainDishRatio: mealRecord.mainDishRatio,
            sideDishRatio: mealRecord.sideDishRatio,
            injectionType: mealRecord.injectionType,
            injectionAmount: mealRecord.injectionAmount,
            note: mealRecord.note,
            postId: postId,
            // Phase 17: 写真URL
            photoUrl: mealRecord.photoUrl,
          };

          // Webhook送信（非同期で実行、結果を待たない）
          notifyMealRecord(
            chatRecord,
            settings.webhookUrl,
            settings.importantWebhookUrl,
            isImportant
          ).catch((webhookError) => {
            functions.logger.warn("Webhook notification failed:", webhookError);
          });
        }
      }
    } catch (webhookError) {
      // Webhookエラーは記録成功には影響させない
      functions.logger.warn("Webhook setup failed:", webhookError);
    }

    // 間食記録から消費ログを作成（非同期・エラーでも処理続行）
    // Note: snack_only モードでは StaffRecordDialog が直接 recordConsumptionLog を
    // 呼び出すため、ここでの自動生成はスキップして二重記録を防止
    let consumptionLogResult: {createdCount: number; errors: string[]} | null =
      null;
    if (mealRecord.snackRecords && mealRecord.snackRecords.length > 0 &&
        mealRecord.recordMode !== "snack_only") {
      try {
        consumptionLogResult = await createConsumptionLogsFromSnackRecords(
          mealRecord.snackRecords,
          mealRecord.staffName,
          postId
        );
        functions.logger.info("Consumption logs created", {
          createdCount: consumptionLogResult.createdCount,
          errors: consumptionLogResult.errors,
        });
      } catch (consumptionError) {
        // 消費ログエラーは記録成功には影響させない
        functions.logger.warn("Consumption log creation failed:", consumptionError);
      }
    }

    // Phase 19: 記録をチャットメッセージとして自動作成
    // snackRecordsがあり、residentIdが指定されている場合のみ
    if (mealRecord.snackRecords && mealRecord.snackRecords.length > 0 &&
        mealRecord.residentId) {
      try {
        const recordMessageResult = await createRecordMessagesFromSnackRecords(
          mealRecord.snackRecords,
          mealRecord.staffName,
          mealRecord.residentId
        );
        functions.logger.info("Record messages created for chat", {
          createdCount: recordMessageResult.createdCount,
          errors: recordMessageResult.errors,
        });
      } catch (recordMessageError) {
        // チャットメッセージ作成エラーは記録成功には影響させない
        functions.logger.warn("Record message creation failed:", recordMessageError);
      }
    }

    const responseData: SubmitMealRecordResponse = {
      postId,
      sheetRow,
    };

    const response: ApiResponse<SubmitMealRecordResponse> = {
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    functions.logger.info("submitMealRecord completed", {
      postId,
      sheetRow,
      residentName: mealRecord.residentName,
    });

    // Phase 30: 日次記録ログ更新（非同期・エラーでも処理続行）
    updateDailyRecordLog("meal").catch((err) => {
      functions.logger.warn("submitMealRecord daily log update failed:", err);
    });

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("submitMealRecord error", error);

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: ErrorCodes.SHEETS_API_ERROR,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(response);
  }
}

/**
 * Cloud Functions エクスポート
 */
export const submitMealRecord = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(submitMealRecordHandler);
