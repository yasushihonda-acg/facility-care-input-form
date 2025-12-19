/**
 * チャット連携 API (Phase 18)
 * docs/CHAT_INTEGRATION_SPEC.md に基づく実装
 *
 * - sendMessage: メッセージ送信
 * - getMessages: メッセージ一覧取得
 * - markAsRead: 既読マーク
 * - getNotifications: 通知取得
 * - getActiveChatItems: アクティブチャット一覧取得
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  SendMessageRequest,
  SendMessageResponse,
  GetMessagesRequest,
  GetMessagesResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  GetNotificationsRequest,
  GetNotificationsResponse,
  GetActiveChatItemsRequest,
  GetActiveChatItemsResponse,
  ChatMessage,
  ChatNotification,
  CareItem,
  CareItemChatExtension,
  ApiResponse,
  ErrorCodes,
} from "../types";

const db = admin.firestore();
const REGION = "asia-northeast1";

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * 成功レスポンスを生成
 */
function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * エラーレスポンスを生成
 */
function errorResponse(
  code: string,
  message: string
): ApiResponse<undefined> {
  return {
    success: false,
    error: {code, message},
    timestamp: new Date().toISOString(),
  };
}

/**
 * メッセージのプレビューテキストを生成（最大30文字）
 */
function generatePreview(content: string): string {
  return content.length > 30 ? content.substring(0, 30) + "..." : content;
}

// =============================================================================
// sendMessage: メッセージ送信
// =============================================================================

export const sendMessage = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json(
        errorResponse(ErrorCodes.INVALID_REQUEST, "Method not allowed")
      );
      return;
    }

    try {
      const body: SendMessageRequest = req.body;

      // バリデーション
      if (!body.residentId || !body.itemId || !body.senderType ||
          !body.senderName || !body.content) {
        res.status(400).json(
          errorResponse(
            ErrorCodes.MISSING_REQUIRED_FIELD,
            "residentId, itemId, senderType, senderName, content are required"
          )
        );
        return;
      }

      const now = admin.firestore.Timestamp.now();
      const messageType = body.type || "text";

      // メッセージドキュメントを作成
      const messageRef = db
        .collection("care_items")
        .doc(body.itemId)
        .collection("messages")
        .doc();

      const message: ChatMessage = {
        id: messageRef.id,
        type: messageType,
        senderType: body.senderType,
        senderName: body.senderName,
        content: body.content,
        recordData: body.recordData,
        photoUrl: body.photoUrl,
        readByStaff: body.senderType === "staff",
        readByFamily: body.senderType === "family",
        createdAt: now,
      };

      // バッチ書き込み
      const batch = db.batch();

      // 1. メッセージを保存
      batch.set(messageRef, message);

      // 2. care_itemsのチャット関連フィールドを更新
      const itemRef = db.collection("care_items").doc(body.itemId);
      const unreadField = body.senderType === "staff" ?
        "unreadCountFamily" : "unreadCountStaff";

      batch.update(itemRef, {
        hasMessages: true,
        lastMessageAt: now,
        lastMessagePreview: generatePreview(body.content),
        [unreadField]: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });

      // 3. 通知を作成
      const itemDoc = await itemRef.get();
      const itemData = itemDoc.data() as CareItem | undefined;
      const itemName = itemData?.itemName || "品物";

      const notificationRef = db
        .collection("residents")
        .doc(body.residentId)
        .collection("notifications")
        .doc();

      const notification: ChatNotification = {
        id: notificationRef.id,
        type: "new_message",
        title: `${itemName}について新しいメッセージ`,
        body: `${body.senderName}: ${generatePreview(body.content)}`,
        targetType: body.senderType === "staff" ? "family" : "staff",
        read: false,
        linkTo: `/staff/family-messages/${body.itemId}/chat`,
        relatedItemId: body.itemId,
        relatedItemName: itemName,
        createdAt: now,
      };

      batch.set(notificationRef, notification);

      await batch.commit();

      const response: SendMessageResponse = {
        messageId: messageRef.id,
        createdAt: now.toDate().toISOString(),
      };

      res.status(200).json(successResponse(response));
    } catch (error) {
      console.error("sendMessage error:", error);
      res.status(500).json(
        errorResponse(ErrorCodes.FIRESTORE_ERROR, "Failed to send message")
      );
    }
  });

// =============================================================================
// getMessages: メッセージ一覧取得
// =============================================================================

export const getMessages = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json(
        errorResponse(ErrorCodes.INVALID_REQUEST, "Method not allowed")
      );
      return;
    }

    try {
      const {residentId, itemId, limit, before} =
        req.query as unknown as GetMessagesRequest;

      // バリデーション
      if (!residentId || !itemId) {
        res.status(400).json(
          errorResponse(
            ErrorCodes.MISSING_REQUIRED_FIELD,
            "residentId and itemId are required"
          )
        );
        return;
      }

      const queryLimit = Number(limit) || 50;

      // クエリ構築
      let query = db
        .collection("care_items")
        .doc(itemId)
        .collection("messages")
        .orderBy("createdAt", "desc")
        .limit(queryLimit + 1); // hasMore判定のため+1

      if (before) {
        const beforeTimestamp = admin.firestore.Timestamp.fromDate(
          new Date(before)
        );
        query = query.where("createdAt", "<", beforeTimestamp);
      }

      const snapshot = await query.get();

      const messages: ChatMessage[] = [];
      snapshot.docs.slice(0, queryLimit).forEach((doc) => {
        messages.push(doc.data() as ChatMessage);
      });

      const response: GetMessagesResponse = {
        messages,
        hasMore: snapshot.docs.length > queryLimit,
      };

      res.status(200).json(successResponse(response));
    } catch (error) {
      console.error("getMessages error:", error);
      res.status(500).json(
        errorResponse(ErrorCodes.FIRESTORE_ERROR, "Failed to get messages")
      );
    }
  });

// =============================================================================
// markAsRead: 既読マーク
// =============================================================================

export const markAsRead = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json(
        errorResponse(ErrorCodes.INVALID_REQUEST, "Method not allowed")
      );
      return;
    }

    try {
      const body: MarkAsReadRequest = req.body;

      // バリデーション
      if (!body.residentId || !body.itemId || !body.readerType) {
        res.status(400).json(
          errorResponse(
            ErrorCodes.MISSING_REQUIRED_FIELD,
            "residentId, itemId, readerType are required"
          )
        );
        return;
      }

      const readField = body.readerType === "staff" ?
        "readByStaff" : "readByFamily";

      // 未読メッセージを取得
      const messagesRef = db
        .collection("care_items")
        .doc(body.itemId)
        .collection("messages");

      const unreadQuery = messagesRef.where(readField, "==", false);
      const unreadSnapshot = await unreadQuery.get();

      if (unreadSnapshot.empty) {
        const response: MarkAsReadResponse = {markedCount: 0};
        res.status(200).json(successResponse(response));
        return;
      }

      // バッチで既読更新
      const batch = db.batch();
      let markedCount = 0;

      unreadSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {[readField]: true});
        markedCount++;
      });

      // care_itemsの未読カウントをリセット
      const itemRef = db.collection("care_items").doc(body.itemId);
      const unreadCountField = body.readerType === "staff" ?
        "unreadCountStaff" : "unreadCountFamily";
      batch.update(itemRef, {[unreadCountField]: 0});

      await batch.commit();

      const response: MarkAsReadResponse = {markedCount};
      res.status(200).json(successResponse(response));
    } catch (error) {
      console.error("markAsRead error:", error);
      res.status(500).json(
        errorResponse(ErrorCodes.FIRESTORE_ERROR, "Failed to mark as read")
      );
    }
  });

// =============================================================================
// getNotifications: 通知取得
// =============================================================================

export const getNotifications = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json(
        errorResponse(ErrorCodes.INVALID_REQUEST, "Method not allowed")
      );
      return;
    }

    try {
      const {residentId, targetType, limit, unreadOnly} =
        req.query as unknown as GetNotificationsRequest;

      // バリデーション
      if (!residentId || !targetType) {
        res.status(400).json(
          errorResponse(
            ErrorCodes.MISSING_REQUIRED_FIELD,
            "residentId and targetType are required"
          )
        );
        return;
      }

      const queryLimit = Number(limit) || 20;

      // クエリ構築
      let query = db
        .collection("residents")
        .doc(residentId)
        .collection("notifications")
        .where("targetType", "in", [targetType, "both"])
        .orderBy("createdAt", "desc")
        .limit(queryLimit);

      if (String(unreadOnly) === "true" || unreadOnly === true) {
        query = query.where("read", "==", false);
      }

      const snapshot = await query.get();

      const notifications: ChatNotification[] = [];
      let unreadCount = 0;

      snapshot.docs.forEach((doc) => {
        const notification = doc.data() as ChatNotification;
        notifications.push(notification);
        if (!notification.read) {
          unreadCount++;
        }
      });

      const response: GetNotificationsResponse = {
        notifications,
        unreadCount,
      };

      res.status(200).json(successResponse(response));
    } catch (error) {
      console.error("getNotifications error:", error);
      res.status(500).json(
        errorResponse(ErrorCodes.FIRESTORE_ERROR, "Failed to get notifications")
      );
    }
  });

// =============================================================================
// getActiveChatItems: アクティブチャット一覧取得
// =============================================================================

export const getActiveChatItems = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      res.status(405).json(
        errorResponse(ErrorCodes.INVALID_REQUEST, "Method not allowed")
      );
      return;
    }

    try {
      const {residentId, userType, limit} =
        req.query as unknown as GetActiveChatItemsRequest;

      // バリデーション
      if (!residentId || !userType) {
        res.status(400).json(
          errorResponse(
            ErrorCodes.MISSING_REQUIRED_FIELD,
            "residentId and userType are required"
          )
        );
        return;
      }

      const queryLimit = Number(limit) || 50;

      // hasMessages=true の品物を取得
      const query = db
        .collection("care_items")
        .where("residentId", "==", residentId)
        .where("hasMessages", "==", true)
        .orderBy("lastMessageAt", "desc")
        .limit(queryLimit);

      const snapshot = await query.get();

      const items: (CareItem & CareItemChatExtension)[] = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as CareItem & CareItemChatExtension;
        items.push(data);
      });

      const response: GetActiveChatItemsResponse = {
        items,
        total: items.length,
      };

      res.status(200).json(successResponse(response));
    } catch (error) {
      console.error("getActiveChatItems error:", error);
      res.status(500).json(
        errorResponse(
          ErrorCodes.FIRESTORE_ERROR,
          "Failed to get active chat items"
        )
      );
    }
  });
