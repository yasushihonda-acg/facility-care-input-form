/**
 * POST /syncChatImages
 * Google ChatスペースからOAuth経由で画像リンクを取得しFirestoreに保存 (Phase 52)
 *
 * 画像はダウンロードせず、リンクのみを保存
 * Chat APIのdownloadUri/thumbnailUriはトークン付きで公開アクセス可能な場合がある
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore} from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {listSpaceMessages} from "../services/chatApiService";
import {
  ApiResponse,
  ErrorCodes,
  CarePhoto,
} from "../types";

// 利用者IDを正規表現で抽出（ID7282 形式）
const RESIDENT_ID_PATTERN = /\(ID(\d+)\)/;
const RESIDENT_ID_PATTERN_ALT = /ID(\d+)/;

// 投稿IDパターン
const POST_ID_PATTERN = /【投稿ID】[：:]\s*(\w+)/;

// タグパターン（#特記事項📝, #重要⚠️ など）
const TAG_PATTERN = /#[^\s#]+/g;

// 記録者パターン
const STAFF_NAME_PATTERN = /記録者[：:]\s*([^\n]+)/;

interface SyncChatImagesRequest {
  spaceId: string;
  residentId: string;
  limit?: number;
}

interface SyncResult {
  synced: number;
  skipped: number;
  total: number;
  photos: CarePhoto[];
}

/**
 * メッセージから利用者IDを抽出
 */
function extractResidentId(text: string): string | undefined {
  const match = text.match(RESIDENT_ID_PATTERN);
  if (match) return match[1];

  const matchAlt = text.match(RESIDENT_ID_PATTERN_ALT);
  if (matchAlt) return matchAlt[1];

  return undefined;
}

/**
 * メッセージから記録者名を抽出
 */
function extractStaffName(text: string): string | undefined {
  const match = text.match(STAFF_NAME_PATTERN);
  return match ? match[1].trim() : undefined;
}

/**
 * メッセージから投稿IDを抽出
 */
function extractPostId(text: string): string | undefined {
  const match = text.match(POST_ID_PATTERN);
  return match ? match[1] : undefined;
}

/**
 * メッセージからタグを抽出
 */
function extractTags(text: string): string[] {
  return text.match(TAG_PATTERN) || [];
}

/**
 * syncChatImages 関数本体
 * 画像リンクのみをFirestoreに保存（ダウンロードなし）
 */
async function syncChatImagesHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

    // Authorizationヘッダーからアクセストークン取得
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.UNAUTHORIZED,
          message: "Authorization header with Bearer token is required",
        },
        timestamp,
      };
      res.status(401).json(response);
      return;
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const body = req.body as SyncChatImagesRequest;
    const {spaceId, residentId, limit = 100} = body;

    if (!spaceId || !residentId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "spaceId and residentId are required",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    functions.logger.info(
      `[syncChatImages] Starting sync for resident ${residentId} from space ${spaceId}`
    );

    // Firebase Admin初期化
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    const db = getFirestore();

    // 既存の画像をチェック（chatMessageIdで重複排除）
    const existingSnapshot = await db
      .collection("care_photos")
      .where("residentId", "==", residentId)
      .where("source", "==", "google_chat")
      .get();

    const existingMessageIds = new Set<string>();
    existingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.chatMessageId) {
        existingMessageIds.add(data.chatMessageId);
      }
    });

    functions.logger.info(
      `[syncChatImages] Found ${existingMessageIds.size} existing chat images`
    );

    // Chat APIからメッセージ取得
    const {messages} = await listSpaceMessages(
      spaceId,
      accessToken,
      undefined,
      limit
    );

    functions.logger.info(`[syncChatImages] Fetched ${messages.length} messages from Chat API`);

    let synced = 0;
    let skipped = 0;
    const newPhotos: CarePhoto[] = [];

    // デバッグ用カウンター
    let noAttachmentCount = 0;
    let noResidentIdMatchCount = 0;
    let imageAttachmentCount = 0;
    const extractedResidentIds: string[] = [];

    // 各メッセージを処理
    for (const msg of messages) {
      // 添付ファイルがない場合はスキップ
      if (!msg.attachment || msg.attachment.length === 0) {
        noAttachmentCount++;
        continue;
      }

      // メッセージテキストから利用者IDを確認
      const msgResidentId = msg.text ? extractResidentId(msg.text) : undefined;

      // デバッグ: 最初の10件の抽出結果をログ
      if (extractedResidentIds.length < 10) {
        extractedResidentIds.push(
          `text="${(msg.text || "").substring(0, 50)}..." → extracted="${msgResidentId || "null"}"`
        );
      }

      if (!msgResidentId || msgResidentId !== residentId) {
        noResidentIdMatchCount++;
        continue;
      }

      // メタデータ抽出
      const staffName = msg.text ? extractStaffName(msg.text) : undefined;
      const postId = msg.text ? extractPostId(msg.text) : undefined;
      const tags = msg.text ? extractTags(msg.text) : [];

      // 各添付ファイルを処理
      for (const attachment of msg.attachment) {
        // 画像以外はスキップ
        if (!attachment.contentType?.startsWith("image/")) continue;

        imageAttachmentCount++;

        const messageId = msg.name || `msg_${Date.now()}`;

        // 既に保存済みならスキップ
        if (existingMessageIds.has(messageId)) {
          skipped++;
          continue;
        }

        // 画像URLを取得（downloadUri優先、なければthumbnailUri）
        const imageUrl = attachment.downloadUri ||
          attachment.thumbnailUri ||
          (attachment.driveDataRef?.driveFileId ?
            `https://drive.google.com/uc?id=${attachment.driveDataRef.driveFileId}&export=view` :
            "");

        if (!imageUrl) {
          functions.logger.warn(`[syncChatImages] No URL for attachment in message ${messageId}`);
          continue;
        }

        // Firestoreにメタデータを保存（画像はダウンロードしない）
        const photoRef = db.collection("care_photos").doc();
        const photoId = photoRef.id;

        const date = new Date(msg.createTime || Date.now());
        const dateStr = date.toISOString().split("T")[0];

        const carePhoto: CarePhoto & {
          chatMessageId: string;
          chatTags?: string[];
          chatContent?: string;
        } = {
          photoId,
          residentId,
          date: dateStr,
          mealTime: "snack",
          photoUrl: imageUrl,
          storagePath: "", // リンクのみなのでstoragePath不要
          fileName: attachment.contentName || `chat_${photoId}`,
          mimeType: attachment.contentType || "image/jpeg",
          fileSize: 0, // リンクのみなのでサイズ不明
          staffId: "chat_import",
          staffName,
          uploadedAt: new Date().toISOString(),
          postId,
          source: "google_chat",
          chatMessageId: messageId,
          chatTags: tags,
          chatContent: msg.text || undefined,
        };

        await photoRef.set(carePhoto);

        newPhotos.push(carePhoto);
        synced++;

        functions.logger.info(
          `[syncChatImages] Saved image link: ${photoId}, URL: ${imageUrl.substring(0, 50)}...`
        );
      }
    }

    // 全ての画像を取得して返す
    const allPhotosSnapshot = await db
      .collection("care_photos")
      .where("residentId", "==", residentId)
      .where("source", "==", "google_chat")
      .orderBy("uploadedAt", "desc")
      .limit(200)
      .get();

    const allPhotos = allPhotosSnapshot.docs.map(
      (doc) => doc.data() as CarePhoto
    );

    // デバッグサマリー
    functions.logger.info("[syncChatImages] Debug Summary:", {
      totalMessages: messages.length,
      noAttachmentCount,
      messagesWithAttachments: messages.length - noAttachmentCount,
      noResidentIdMatchCount,
      imageAttachmentCount,
      targetResidentId: residentId,
      sampleExtractedIds: extractedResidentIds,
    });

    functions.logger.info(
      `[syncChatImages] Sync complete: ${synced} synced, ${skipped} skipped`
    );

    const result: SyncResult = {
      synced,
      skipped,
      total: allPhotos.length,
      photos: allPhotos,
    };

    const response: ApiResponse<SyncResult> = {
      success: true,
      data: result,
      timestamp,
    };

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("[syncChatImages] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    let userMessage = errorMessage;
    let statusCode = 500;

    if (errorMessage.includes("PERMISSION_DENIED")) {
      userMessage =
        "チャットスペースへのアクセス権限がありません。ログイン中のアカウントがスペースのメンバーか確認してください。";
      statusCode = 403;
    } else if (errorMessage.includes("NOT_FOUND")) {
      userMessage =
        "指定されたチャットスペースが見つかりません。スペースIDを確認してください。";
      statusCode = 404;
    } else if (
      errorMessage.includes("UNAUTHENTICATED") ||
      errorMessage.includes("invalid_token")
    ) {
      userMessage =
        "認証トークンが無効または期限切れです。再度ログインしてください。";
      statusCode = 401;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "SYNC_ERROR",
        message: userMessage,
      },
      timestamp,
    };

    res.status(statusCode).json(response);
  }
}

export const syncChatImages = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60, // リンクのみなので短くできる
    memory: "256MB",
  })
  .https.onRequest(syncChatImagesHandler);
