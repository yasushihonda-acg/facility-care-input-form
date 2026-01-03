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

// Firebase Storage URLパターン（shiota-test-9またはfacility-care-input-form）
// eslint-disable-next-line max-len
const FIREBASE_STORAGE_URL_PATTERN = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/[^?\s]+\?alt=media(?:&token=[^?\s]+)?/g;

// Google Proxy URLパターン（Chat経由の画像）
// eslint-disable-next-line max-len
const GOOGLE_PROXY_URL_PATTERN = /https:\/\/lh3\.googleusercontent\.com\/[^\s"'<>]+/g;

// 汎用画像URLパターン（jpg, jpeg, png, gif, webp）
// eslint-disable-next-line max-len
const GENERIC_IMAGE_URL_PATTERN = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s"'<>]*)?/gi;

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
 * API filterでフィルタリングするため現在未使用
 */
function _extractResidentId(text: string): string | undefined {
  const match = text.match(RESIDENT_ID_PATTERN);
  if (match) return match[1];

  const matchAlt = text.match(RESIDENT_ID_PATTERN_ALT);
  if (matchAlt) return matchAlt[1];

  return undefined;
}
void _extractResidentId; // 未使用警告回避

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
 * メッセージからFirebase Storage URLを抽出
 */
function extractStorageUrls(text: string): string[] {
  return text.match(FIREBASE_STORAGE_URL_PATTERN) || [];
}

/**
 * メッセージからGoogle Proxy URLを抽出
 */
function extractProxyUrls(text: string): string[] {
  return text.match(GOOGLE_PROXY_URL_PATTERN) || [];
}

/**
 * メッセージから汎用画像URLを抽出
 */
function extractGenericImageUrls(text: string): string[] {
  return text.match(GENERIC_IMAGE_URL_PATTERN) || [];
}

/**
 * attachmentから画像URLを抽出
 * Chat APIのattachmentは thumbnailUri / downloadUri を持つ
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrlsFromAttachments(attachments: any[]): string[] {
  const urls: string[] = [];
  if (!attachments || !Array.isArray(attachments)) return urls;

  for (const attachment of attachments) {
    // thumbnailUri が優先（軽量）
    if (attachment?.thumbnailUri) {
      urls.push(attachment.thumbnailUri);
    }
    // downloadUri も収集（フォールバック用）
    if (attachment?.downloadUri) {
      urls.push(attachment.downloadUri);
    }
  }

  return urls;
}

/**
 * cardsV2から画像URLを抽出
 * JSON.stringifyしてから正規表現でURLを抽出（構造に依存しない堅牢な方式）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrlsFromCards(cardsV2: any[]): string[] {
  if (!cardsV2 || !Array.isArray(cardsV2) || cardsV2.length === 0) return [];

  try {
    const cardString = JSON.stringify(cardsV2);

    // Firebase Storage URLを抽出
    const storageUrls = cardString.match(
      /https?:\/\/firebasestorage\.googleapis\.com[^\s"'\\]*/g
    ) || [];

    // 一般的な画像URLも抽出（jpg, png, gif, webp）
    const imageUrls = cardString.match(
      /https?:\/\/[^\s"'\\]+\.(jpg|jpeg|png|gif|webp)/gi
    ) || [];

    // 重複を除去
    return [...new Set([...storageUrls, ...imageUrls])];
  } catch (e) {
    return [];
  }
}

/**
 * すべての画像URLを抽出
 * 優先順位: Firebase Storage > cardsV2 > attachment > Google Proxy > Generic
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAllImageUrls(text: string, cardsV2?: any[], attachments?: any[]): {
  storageUrls: string[];
  proxyUrls: string[];
  genericUrls: string[];
  cardUrls: string[];
  attachmentUrls: string[];
  allUrls: string[];
} {
  const storageUrls = extractStorageUrls(text);
  const proxyUrls = extractProxyUrls(text);
  const genericUrls = extractGenericImageUrls(text);
  const cardUrls = extractImageUrlsFromCards(cardsV2 || []);
  const attachmentUrls = extractImageUrlsFromAttachments(attachments || []);

  // 重複を除去して結合
  const allUrls = [...new Set([
    ...storageUrls,
    ...cardUrls,
    ...attachmentUrls,
    ...proxyUrls,
    ...genericUrls,
  ])];

  return {storageUrls, proxyUrls, genericUrls, cardUrls, attachmentUrls, allUrls};
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
    // Note: Chat APIはテキスト検索フィルタをサポートしていないため全件取得
    const {messages} = await listSpaceMessages(
      spaceId,
      accessToken,
      undefined,
      limit,
      undefined // filterはcreateTime/thread.nameのみサポート
    );

    functions.logger.info(`[syncChatImages] Fetched ${messages.length} messages from Chat API`);

    let synced = 0;
    let skipped = 0;
    const newPhotos: CarePhoto[] = [];

    // デバッグ用カウンター
    let messagesWithAnyUrls = 0;
    let storageUrlCount = 0;
    let proxyUrlCount = 0;
    let genericUrlCount = 0;
    let cardUrlCount = 0;
    let attachmentUrlCount = 0;
    let matchedResidentMessages = 0;

    // デバッグ: 最初の10件のメッセージ内容をログ出力
    const sampleMessages: Array<{
      name: string;
      textPreview: string;
      urls: ReturnType<typeof extractAllImageUrls>;
      hasId: boolean;
    }> = [];

    // ID{residentId}を含むメッセージを抽出してログ出力
    const targetIdPattern = `ID${residentId}`;
    const matchingMessages = messages.filter((m) =>
      (m.text || "").includes(targetIdPattern)
    );
    functions.logger.info(
      `[syncChatImages] Found ${matchingMessages.length} messages containing ${targetIdPattern}`
    );

    // マッチしたメッセージの詳細を出力（最大5件、テキスト内容を表示）
    for (let idx = 0; idx < Math.min(5, matchingMessages.length); idx++) {
      const msg = matchingMessages[idx];
      const textPreview = msg.text?.substring(0, 800) || "(no text)";
      functions.logger.info(
        `[syncChatImages] Matched ${idx + 1} text: ${textPreview}`
      );
    }

    // 📷を含むメッセージを検索（画像付き投稿）
    const photoMessages = messages.filter((m) =>
      (m.text || "").includes("📷")
    );
    functions.logger.info(
      `[syncChatImages] Found ${photoMessages.length} messages containing 📷 emoji`
    );

    // Firebase Storage URLを含むメッセージを検索（📷なしの画像も含む）
    const storageUrlMessages = messages.filter((m) =>
      (m.text || "").includes("firebasestorage.googleapis.com")
    );
    functions.logger.info(
      `[syncChatImages] Found ${storageUrlMessages.length} messages containing Firebase Storage URL in text`
    );

    // cardsV2を持つメッセージを検索（カード形式の投稿）
    const cardMessages = messages.filter((m) =>
      m.cardsV2 && m.cardsV2.length > 0
    );
    functions.logger.info(
      `[syncChatImages] Found ${cardMessages.length} messages with cardsV2`
    );

    // cardsV2メッセージの詳細をログ出力（最大5件）
    for (let idx = 0; idx < Math.min(5, cardMessages.length); idx++) {
      const msg = cardMessages[idx];
      const cardUrls = extractImageUrlsFromCards(msg.cardsV2 || []);
      functions.logger.info(`[syncChatImages] Card Message ${idx + 1}:`, {
        name: msg.name,
        createTime: msg.createTime,
        textPreview: msg.text?.substring(0, 200),
        cardsV2Count: msg.cardsV2?.length || 0,
        extractedCardUrls: cardUrls,
        hasTargetId: (msg.text || "").includes(`ID${residentId}`),
      });
    }

    // attachmentを持つメッセージを検索（直接添付された画像）
    const attachmentMessages = messages.filter((m) =>
      m.attachment && m.attachment.length > 0
    );
    functions.logger.info(
      `[syncChatImages] Found ${attachmentMessages.length} messages with attachments`
    );

    // attachmentメッセージの詳細をログ出力（最大5件）
    for (let idx = 0; idx < Math.min(5, attachmentMessages.length); idx++) {
      const msg = attachmentMessages[idx];
      const attUrls = extractImageUrlsFromAttachments(msg.attachment || []);
      functions.logger.info(`[syncChatImages] Attachment Message ${idx + 1}:`, {
        name: msg.name,
        createTime: msg.createTime,
        textPreview: msg.text?.substring(0, 200),
        attachmentCount: msg.attachment?.length || 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attachmentDetails: msg.attachment?.map((a: any) => ({
          name: a.name,
          contentName: a.contentName,
          contentType: a.contentType,
          hasThumbnail: !!a.thumbnailUri,
          hasDownload: !!a.downloadUri,
        })),
        extractedAttachmentUrls: attUrls,
        hasTargetId: (msg.text || "").includes(`ID${residentId}`),
      });
    }

    // Firebase Storage URLメッセージの詳細をログ出力
    for (let idx = 0; idx < Math.min(10, storageUrlMessages.length); idx++) {
      const msg = storageUrlMessages[idx];
      functions.logger.info(`[syncChatImages] Storage URL Message ${idx + 1}:`, {
        name: msg.name,
        createTime: msg.createTime,
        textPreview: msg.text?.substring(0, 1000),
        hasTargetId: (msg.text || "").includes(`ID${residentId}`),
      });
    }

    // 📷メッセージの詳細もログ出力（最大5件）
    for (let idx = 0; idx < Math.min(5, photoMessages.length); idx++) {
      const msg = photoMessages[idx];
      functions.logger.info(`[syncChatImages] Photo Message ${idx + 1}:`, {
        name: msg.name,
        createTime: msg.createTime,
        textPreview: msg.text?.substring(0, 800),
        hasStorageUrl: (msg.text || "").includes("firebasestorage.googleapis.com"),
      });
    }

    // 最初の5件のメッセージも出力（ID関係なく構造確認用）
    functions.logger.info("[syncChatImages] First 5 messages (any ID):");
    for (let idx = 0; idx < Math.min(5, messages.length); idx++) {
      const msg = messages[idx];
      functions.logger.info(`[syncChatImages] Sample Message ${idx + 1}:`, {
        name: msg.name,
        createTime: msg.createTime,
        textPreview: msg.text?.substring(0, 300),
        allKeys: Object.keys(msg),
      });
    }

    // 各メッセージを処理 - すべての画像URLパターンを探す
    for (const msg of messages) {
      const text = msg.text || "";
      const formattedText = msg.formattedText || "";
      const combinedText = `${text} ${formattedText}`;

      // すべての画像URLを抽出（テキスト + cardsV2 + attachment）
      const urls = extractAllImageUrls(combinedText, msg.cardsV2, msg.attachment);

      // サンプルログ用（URLを含むメッセージのみ記録）
      if (sampleMessages.length < 20 && urls.allUrls.length > 0) {
        sampleMessages.push({
          name: msg.name || "unknown",
          textPreview: text.substring(0, 500),
          urls,
          hasId: text.includes(`ID${residentId}`),
        });
      }

      if (urls.allUrls.length === 0) continue;

      messagesWithAnyUrls++;
      storageUrlCount += urls.storageUrls.length;
      proxyUrlCount += urls.proxyUrls.length;
      genericUrlCount += urls.genericUrls.length;
      cardUrlCount += urls.cardUrls.length;
      attachmentUrlCount += urls.attachmentUrls.length;

      // メッセージテキストから利用者IDを確認
      if (!text.includes(`ID${residentId}`)) continue;
      matchedResidentMessages++;

      // メタデータ抽出
      const staffName = extractStaffName(text);
      const postId = extractPostId(text);
      const tags = extractTags(text);

      // 優先順位: Firebase Storage > cardsV2 > attachment > Google Proxy > Generic
      const imageUrls = urls.storageUrls.length > 0 ?
        urls.storageUrls :
        urls.cardUrls.length > 0 ?
          urls.cardUrls :
          urls.attachmentUrls.length > 0 ?
            urls.attachmentUrls :
            urls.proxyUrls.length > 0 ?
              urls.proxyUrls :
              urls.genericUrls;

      // 各URLを処理
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const messageId = `${msg.name || "unknown"}_img${i}`;

        // 既に保存済みならスキップ
        if (existingMessageIds.has(messageId)) {
          skipped++;
          continue;
        }

        // Firestoreにメタデータを保存
        const photoRef = db.collection("care_photos").doc();
        const photoId = photoRef.id;

        const date = new Date(msg.createTime || Date.now());
        const dateStr = date.toISOString().split("T")[0];

        // URLからファイル名を抽出（エンコードされたパスをデコード）
        let fileName = `chat_${photoId}.jpg`;
        try {
          const urlPath = new URL(imageUrl).pathname;
          const encodedFileName = urlPath.split("/o/")[1]?.split("?")[0];
          if (encodedFileName) {
            fileName = decodeURIComponent(encodedFileName).split("/").pop() || fileName;
          }
        } catch {
          // URL解析失敗時はデフォルトファイル名を使用
        }

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
          fileName,
          mimeType: "image/jpeg", // Storage URLからは判断できないためデフォルト
          fileSize: 0, // リンクのみなのでサイズ不明
          staffId: "chat_import",
          staffName,
          uploadedAt: new Date().toISOString(),
          postId,
          source: "google_chat",
          chatMessageId: messageId,
          chatTags: tags,
          chatContent: text.substring(0, 500), // 長いテキストは切り詰め
        };

        await photoRef.set(carePhoto);

        newPhotos.push(carePhoto);
        synced++;

        functions.logger.info(
          `[syncChatImages] Saved image link: ${photoId}, URL: ${imageUrl.substring(0, 80)}...`
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
      messagesWithAnyUrls,
      storageUrlCount,
      proxyUrlCount,
      genericUrlCount,
      cardUrlCount,
      attachmentUrlCount,
      matchedResidentMessages,
      synced,
      skipped,
      targetResidentId: residentId,
    });

    // サンプルメッセージをログ出力（URLの有無を確認するため）
    functions.logger.info("[syncChatImages] Sample Messages:", {
      count: sampleMessages.length,
      samples: sampleMessages.slice(0, 5).map((s) => ({
        name: s.name,
        textPreview: s.textPreview.substring(0, 200),
        hasId: s.hasId,
        urlCounts: {
          storage: s.urls.storageUrls.length,
          proxy: s.urls.proxyUrls.length,
          generic: s.urls.genericUrls.length,
        },
        sampleUrls: s.urls.allUrls.slice(0, 2),
      })),
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
