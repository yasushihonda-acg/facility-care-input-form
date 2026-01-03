/**
 * POST /syncChatImages
 * Google ChatスペースからOAuth経由で画像を取得しFirestoreに保存 (Phase 52)
 *
 * Chat画像をcare_photosコレクションに保存することで、
 * Chatスペースにアクセスできないユーザーでも閲覧可能にする
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
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

const STORAGE_BUCKET = "facility-care-input-form.appspot.com";

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
 * 画像URLから画像をダウンロード
 */
async function downloadImage(
  imageUrl: string,
  accessToken: string
): Promise<{buffer: Buffer; contentType: string} | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      functions.logger.warn(`Failed to download image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {buffer, contentType};
  } catch (error) {
    functions.logger.error("Error downloading image:", error);
    return null;
  }
}

/**
 * 画像をFirebase Storageにアップロード
 */
async function uploadToStorage(
  buffer: Buffer,
  contentType: string,
  residentId: string,
  messageId: string,
  timestamp: string
): Promise<{photoUrl: string; storagePath: string; fileName: string}> {
  // Firebase Admin SDKが初期化されていなければ初期化
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const bucket = getStorage().bucket(STORAGE_BUCKET);

  // ファイル名生成
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const extension = contentType.includes("png") ? ".png" : ".jpg";
  const safeMessageId = messageId.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `chat_${residentId}_${safeMessageId}${extension}`;
  const storagePath = `care-photos/${year}/${month}/${fileName}`;

  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        residentId,
        source: "google_chat",
        originalMessageId: messageId,
        date: `${year}-${month}-${day}`,
      },
    },
  });

  // 公開URLを生成
  const baseUrl = "https://firebasestorage.googleapis.com/v0/b";
  const encodedPath = encodeURIComponent(storagePath);
  const photoUrl = `${baseUrl}/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;

  return {photoUrl, storagePath, fileName};
}

/**
 * syncChatImages 関数本体
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

    const db = getFirestore();

    // 既存の画像をチェック（messageIdで重複排除）
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

    let synced = 0;
    let skipped = 0;
    const newPhotos: CarePhoto[] = [];

    // 各メッセージを処理
    for (const msg of messages) {
      // 添付ファイルがない場合はスキップ
      if (!msg.attachment || msg.attachment.length === 0) continue;

      // メッセージテキストから利用者IDを確認
      const msgResidentId = msg.text ? extractResidentId(msg.text) : undefined;
      if (!msgResidentId || msgResidentId !== residentId) continue;

      // メタデータ抽出
      const staffName = msg.text ? extractStaffName(msg.text) : undefined;
      const postId = msg.text ? extractPostId(msg.text) : undefined;
      const tags = msg.text ? extractTags(msg.text) : [];

      // 各添付ファイルを処理
      for (const attachment of msg.attachment) {
        // 画像以外はスキップ
        if (!attachment.contentType?.startsWith("image/")) continue;

        const messageId = msg.name || `msg_${Date.now()}`;

        // 既に保存済みならスキップ
        if (existingMessageIds.has(messageId)) {
          skipped++;
          continue;
        }

        // 画像URLを取得
        let imageUrl = "";
        if (attachment.attachmentDataRef?.resourceName) {
          imageUrl = `https://chat.googleapis.com/v1/${attachment.attachmentDataRef.resourceName}?alt=media`;
        } else if (attachment.downloadUri) {
          imageUrl = attachment.downloadUri;
        } else if (attachment.driveDataRef?.driveFileId) {
          imageUrl = `https://drive.google.com/uc?id=${attachment.driveDataRef.driveFileId}&export=view`;
        }

        if (!imageUrl) continue;

        // 画像をダウンロード
        const downloaded = await downloadImage(imageUrl, accessToken);
        if (!downloaded) {
          functions.logger.warn(`Failed to download: ${imageUrl}`);
          continue;
        }

        // Firebase Storageにアップロード
        const {photoUrl, storagePath, fileName} = await uploadToStorage(
          downloaded.buffer,
          downloaded.contentType,
          residentId,
          messageId,
          msg.createTime || new Date().toISOString()
        );

        // Firestoreにメタデータを保存
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
          mealTime: "snack", // Chatからの画像はsnackとして分類
          photoUrl,
          storagePath,
          fileName,
          mimeType: downloaded.contentType,
          fileSize: downloaded.buffer.length,
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

        functions.logger.info(`[syncChatImages] Saved image: ${photoId}`);
      }
    }

    // 全ての画像を取得して返す
    const allPhotosSnapshot = await db
      .collection("care_photos")
      .where("residentId", "==", residentId)
      .orderBy("uploadedAt", "desc")
      .limit(200)
      .get();

    const allPhotos = allPhotosSnapshot.docs.map(
      (doc) => doc.data() as CarePhoto
    );

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
    timeoutSeconds: 300, // 5分（画像ダウンロード・アップロードに時間がかかる）
    memory: "1GB",
  })
  .https.onRequest(syncChatImagesHandler);
