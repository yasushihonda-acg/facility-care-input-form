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
import {chat_v1} from "googleapis";
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

// 記録者パターン（JSON内のエスケープ文字に対応）
// cardsV2をJSON.stringifyした場合、改行は\\nになるため、それ以外の文字をマッチ
const STAFF_NAME_PATTERN = /記録者\s*[：:]\s*([^"\\]+)/;

interface SyncChatImagesRequest {
  spaceId: string;
  residentId: string;
  limit?: number;
}

interface SyncResult {
  synced: number;
  updated: number; // 既存画像のメタデータ更新件数
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
 * メッセージからテキスト全体を取得（msg.text + cardsV2のJSON）
 * シンプルにJSON.stringifyして正規表現を直接適用できるようにする
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAllTextFromMessage(msg: {text?: string | null; cardsV2?: any[]}): string {
  let combinedText = msg.text || "";

  // cardsV2がある場合はJSON.stringifyして追加
  // 正規表現はこの文字列に対して直接適用可能
  if (msg.cardsV2 && Array.isArray(msg.cardsV2) && msg.cardsV2.length > 0) {
    combinedText += " " + JSON.stringify(msg.cardsV2);
  }

  return combinedText;
}

/**
 * cardsV2から人間が読みやすいテキストを抽出
 * JSON文字列ではなく、テキスト内容のみを返す
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractReadableTextFromCards(cardsV2: any[]): string {
  if (!cardsV2 || !Array.isArray(cardsV2) || cardsV2.length === 0) return "";

  const texts: string[] = [];

  try {
    const cardString = JSON.stringify(cardsV2);

    // "text":"..." のパターンを抽出
    const textMatches = cardString.match(/"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g) || [];

    for (const match of textMatches) {
      const valueMatch = match.match(/"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
      if (valueMatch && valueMatch[1]) {
        try {
          // JSONエスケープをデコード
          const decoded = JSON.parse(`"${valueMatch[1]}"`);
          if (decoded && decoded.trim()) {
            texts.push(decoded);
          }
        } catch {
          texts.push(valueMatch[1]);
        }
      }
    }
  } catch {
    // パース失敗時は空文字
  }

  return texts.join("\n");
}

/**
 * 表示用のチャット内容を取得（JSON文字列なしの読みやすい形式）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDisplayableContent(msg: {text?: string | null; cardsV2?: any[]}): string {
  const plainText = msg.text || "";
  const cardText = extractReadableTextFromCards(msg.cardsV2 || []);

  // 両方を結合（重複を避けるため、plainTextが空でない場合のみ改行で区切る）
  if (plainText && cardText) {
    return `${plainText}\n${cardText}`;
  }
  return plainText || cardText;
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

    // 既存の画像をチェック（chatMessageId + photoUrl で重複排除）
    const existingSnapshot = await db
      .collection("care_photos")
      .where("residentId", "==", residentId)
      .where("source", "==", "google_chat")
      .get();

    const existingMessageIds = new Set<string>();
    // URL → ドキュメント参照のマップ（メタデータ更新用）
    const existingPhotoUrlsMap = new Map<string, FirebaseFirestore.DocumentReference>();
    existingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.chatMessageId) {
        existingMessageIds.add(data.chatMessageId);
      }
      if (data.photoUrl) {
        existingPhotoUrlsMap.set(data.photoUrl, doc.ref);
      }
    });
    // 互換性のためSetも維持
    const existingPhotoUrls = new Set(existingPhotoUrlsMap.keys());

    functions.logger.info(
      `[syncChatImages] Found ${existingMessageIds.size} existing chat images, ${existingPhotoUrls.size} unique URLs`
    );

    // Chat APIからメッセージ取得（ページネーションで全件取得）
    // Note: Chat APIはテキスト検索フィルタをサポートしていないため全件取得
    const allMessages: chat_v1.Schema$Message[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const maxPages = Math.ceil(limit / 100); // limitに基づいてページ数を制限

    do {
      const result = await listSpaceMessages(
        spaceId,
        accessToken,
        pageToken,
        100, // ページあたり最大100件
        undefined // filterはcreateTime/thread.nameのみサポート
      );

      allMessages.push(...result.messages);
      pageToken = result.nextPageToken;
      pageCount++;

      functions.logger.info(
        `[syncChatImages] Page ${pageCount}: fetched ${result.messages.length} messages, ` +
        `total: ${allMessages.length}, hasMore: ${!!pageToken}`
      );

      // 指定されたlimitに達したら終了
      if (allMessages.length >= limit) break;
    } while (pageToken && pageCount < maxPages);

    const messages: chat_v1.Schema$Message[] = allMessages;
    functions.logger.info(
      `[syncChatImages] Fetched total ${messages.length} messages from Chat API (${pageCount} pages)`
    );

    let synced = 0;
    let updated = 0; // 既存画像のメタデータ更新カウント
    const skipped = 0; // 現在は更新ロジックのためスキップなし
    const newPhotos: CarePhoto[] = [];

    // 有効なURL（IDスレッドに属する画像）を収集
    // クリーンアップ時にこのセットに含まれないURLは削除対象
    const validPhotoUrls = new Set<string>();

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

    // ID{residentId}を含むメッセージを抽出（cardsV2内も含めてJSON全体を検索）
    const targetIdPattern = `ID${residentId}`;
    const matchingMessages = messages.filter((m) => {
      const rawJson = JSON.stringify(m);
      return rawJson.includes(targetIdPattern);
    });
    functions.logger.info(
      `[syncChatImages] Found ${matchingMessages.length} messages containing ${targetIdPattern} (in JSON)`
    );

    // IDメッセージのスレッド情報を収集
    const idThreads = new Set<string>();
    matchingMessages.forEach((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadName = (m as any).thread?.name;
      if (threadName) idThreads.add(threadName);
    });
    functions.logger.info(
      `[syncChatImages] ID messages span ${idThreads.size} unique threads`
    );

    // スレッドごとのIDメッセージ（ID7282を含むメッセージ）をマッピング
    // 画像保存時にIDメッセージからメタデータ（日付、記録者等）を取得するため
    // ※最古のメッセージではなく、IDを含むメッセージを優先
    const threadIdMessageMap = new Map<string, {
      text: string;
      displayableContent: string; // UI表示用（JSONなし）
      createTime: string;
      staffName?: string;
      postId?: string;
      tags: string[];
    }>();

    // IDを含むメッセージのみマップに登録
    for (const msg of matchingMessages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadName = (msg as any).thread?.name;
      if (!threadName) continue;

      // msg.text + cardsV2のJSON全体を結合（正規表現で直接検索可能）
      const combinedText = getAllTextFromMessage(msg);
      // UI表示用の読みやすいテキスト
      const displayableContent = getDisplayableContent(msg);
      const createTime = msg.createTime || "";

      // 同じスレッドに複数のIDメッセージがある場合は最古を採用
      const existing = threadIdMessageMap.get(threadName);
      if (!existing || createTime < existing.createTime) {
        threadIdMessageMap.set(threadName, {
          text: combinedText,
          displayableContent,
          createTime,
          staffName: extractStaffName(combinedText),
          postId: extractPostId(combinedText),
          tags: extractTags(combinedText),
        });
      }
    }

    functions.logger.info(
      `[syncChatImages] Built thread ID message map: ${threadIdMessageMap.size} threads with ID`
    );

    // デバッグ: 最初の3件のIDメッセージ内容を出力
    let debugCount = 0;
    for (const [threadName, meta] of threadIdMessageMap.entries()) {
      if (debugCount >= 3) break;
      functions.logger.info(`[syncChatImages] ID-Msg content ${debugCount + 1}:`, {
        thread: threadName,
        textPreview: meta.text.substring(0, 300),
        staffName: meta.staffName,
        postId: meta.postId,
        tags: meta.tags,
      });
      debugCount++;
    }

    // マッチしたメッセージの詳細を出力（最大5件、スレッド情報含む）
    for (let idx = 0; idx < Math.min(5, matchingMessages.length); idx++) {
      const msg = matchingMessages[idx];
      const rawJson = JSON.stringify(msg);
      const hasStorageUrl = rawJson.includes("firebasestorage.googleapis.com");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadName = (msg as any).thread?.name || "no-thread";
      functions.logger.info(
        `[syncChatImages] ID-Msg ${idx + 1}: thread=${threadName}, ` +
        `hasUrl=${hasStorageUrl}, time=${msg.createTime}`
      );
    }

    // 📷を含むメッセージを検索（JSON全体）
    const photoMessages = messages.filter((m) => {
      const rawJson = JSON.stringify(m);
      return rawJson.includes("📷");
    });
    functions.logger.info(
      `[syncChatImages] Found ${photoMessages.length} messages containing 📷 (in JSON)`
    );

    // Firebase Storage URLを含むメッセージを検索（JSON全体）
    const storageUrlMessages = messages.filter((m) => {
      const rawJson = JSON.stringify(m);
      return rawJson.includes("firebasestorage.googleapis.com");
    });
    functions.logger.info(
      `[syncChatImages] Found ${storageUrlMessages.length} messages containing Firebase Storage URL`
    );

    // Storage URLメッセージのスレッド情報を収集
    const urlThreads = new Set<string>();
    storageUrlMessages.forEach((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadName = (m as any).thread?.name;
      if (threadName) urlThreads.add(threadName);
    });
    functions.logger.info(
      `[syncChatImages] URL messages span ${urlThreads.size} unique threads`
    );

    // スレッドの重複を確認（IDメッセージとURLメッセージで共通のスレッド）
    const commonThreads = [...idThreads].filter((t) => urlThreads.has(t));
    functions.logger.info(
      `[syncChatImages] Common threads (ID + URL): ${commonThreads.length}`
    );

    // Storage URLメッセージの詳細をログ出力（最大5件、スレッド情報含む）
    for (let idx = 0; idx < Math.min(5, storageUrlMessages.length); idx++) {
      const msg = storageUrlMessages[idx];
      const rawJson = JSON.stringify(msg);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const threadName = (msg as any).thread?.name || "no-thread";
      const hasId = rawJson.includes(`ID${residentId}`);
      const urlMatch = rawJson.match(/https:\/\/firebasestorage\.googleapis\.com[^"'\s]*/);
      functions.logger.info(
        `[syncChatImages] URL-Msg ${idx + 1}: thread=${threadName}, ` +
        `hasId=${hasId}, time=${msg.createTime}, ` +
        `url=${urlMatch?.[0]?.substring(0, 60)}...`
      );
    }

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

    // 各メッセージを処理 - ID含むスレッドに属する画像のみ同期
    // スレッドベースフィルタリング: IDメッセージと同じスレッドにある画像のみ対象
    for (const msg of messages) {
      const text = msg.text || "";
      const formattedText = msg.formattedText || "";
      const combinedText = `${text} ${formattedText}`;

      // JSON全体から画像URLを検索（cardsV2内のURLも取得）
      const rawJson = JSON.stringify(msg);

      // すべての画像URLを抽出（テキスト + cardsV2 + attachment + JSON全体）
      const urls = extractAllImageUrls(combinedText, msg.cardsV2, msg.attachment);

      // JSON全体からFirebase Storage URLを追加検索
      const jsonStorageUrls = rawJson.match(
        /https?:\/\/firebasestorage\.googleapis\.com[^\s"'\\]*/g
      ) || [];
      const allJsonUrls = [...new Set([...urls.allUrls, ...jsonStorageUrls])];

      // サンプルログ用（URLを含むメッセージのみ記録）
      if (sampleMessages.length < 20 && allJsonUrls.length > 0) {
        sampleMessages.push({
          name: msg.name || "unknown",
          textPreview: text.substring(0, 500),
          urls: {...urls, allUrls: allJsonUrls},
          hasId: rawJson.includes(`ID${residentId}`),
        });
      }

      if (allJsonUrls.length === 0) continue;

      messagesWithAnyUrls++;
      storageUrlCount += jsonStorageUrls.length;
      proxyUrlCount += urls.proxyUrls.length;
      genericUrlCount += urls.genericUrls.length;
      cardUrlCount += urls.cardUrls.length;
      attachmentUrlCount += urls.attachmentUrls.length;

      // スレッドベースフィルタリング: IDメッセージと同じスレッドに属するか確認
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msgThreadName = (msg as any).thread?.name;
      if (!msgThreadName || !idThreads.has(msgThreadName)) {
        // IDを含むスレッドに属さない画像はスキップ
        continue;
      }
      matchedResidentMessages++;

      // メタデータ抽出: スレッドの親メッセージから取得（画像メッセージ自体には情報がない）
      // msgThreadName は上記のフィルタリングで既に取得済み
      const parentMeta = msgThreadName ? threadIdMessageMap.get(msgThreadName) : undefined;

      // 親メッセージのメタデータを優先、なければ現在のメッセージから取得
      const staffName = parentMeta?.staffName || extractStaffName(text);
      const postId = parentMeta?.postId || extractPostId(text);
      const tags = parentMeta?.tags || extractTags(text);
      // UI表示用（JSONなしの読みやすいテキスト）
      const parentDisplayableContent = parentMeta?.displayableContent || text;
      const parentCreateTime = parentMeta?.createTime || msg.createTime;

      // 優先順位: Firebase Storage URL（JSON全体から抽出）を優先
      // 次にcardsV2, attachment, Google Proxy, Genericの順
      const imageUrls = jsonStorageUrls.length > 0 ?
        jsonStorageUrls :
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

        // 有効なURLとしてマーク（クリーンアップ時に保持対象）
        validPhotoUrls.add(imageUrl);

        // 親メッセージの日時を使用（スレッド開始時刻 = 記録日時）
        const date = new Date(parentCreateTime || msg.createTime || Date.now());
        const dateStr = date.toISOString().split("T")[0];

        // 既存画像がある場合はメタデータを更新
        const existingDocRef = existingPhotoUrlsMap.get(imageUrl);
        if (existingDocRef) {
          // メタデータのみ更新（親メッセージから取得した情報で上書き）
          await existingDocRef.update({
            date: dateStr,
            staffName,
            postId,
            chatTags: tags,
            chatContent: parentDisplayableContent.substring(0, 500), // UI表示用テキスト
            chatMessageId: messageId,
            updatedAt: new Date().toISOString(), // 更新日時を記録
          });
          updated++;
          functions.logger.info(
            `[syncChatImages] Updated metadata: ${existingDocRef.id}, date=${dateStr}, staffName=${staffName}`
          );
          continue;
        }

        // 同一セッション内での重複も防ぐ（URLをセットに追加）
        existingPhotoUrls.add(imageUrl);

        // Firestoreにメタデータを保存（新規）
        const photoRef = db.collection("care_photos").doc();
        const photoId = photoRef.id;

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
          chatContent: parentDisplayableContent.substring(0, 500), // UI表示用テキスト
        };

        await photoRef.set(carePhoto);

        newPhotos.push(carePhoto);
        synced++;

        functions.logger.info(
          `[syncChatImages] Saved image link: ${photoId}, URL: ${imageUrl.substring(0, 80)}...`
        );
      }
    }

    // クリーンアップ: IDスレッドに属さない既存画像を削除
    // validPhotoUrls = 今回の同期で有効と判断されたURL（IDスレッドに属するもののみ）
    let deleted = 0;
    const deletePromises: Promise<void>[] = [];

    functions.logger.info(
      `[syncChatImages] Cleanup check: ${existingSnapshot.docs.length} existing, ${validPhotoUrls.size} valid URLs`
    );

    for (const doc of existingSnapshot.docs) {
      const data = doc.data();
      const photoUrl = data.photoUrl;

      // 有効なURLセットに含まれていない場合は削除
      if (photoUrl && !validPhotoUrls.has(photoUrl)) {
        deletePromises.push(
          doc.ref.delete().then(() => {
            deleted++;
            functions.logger.info(
              `[syncChatImages] Deleted orphan image: ${doc.id}, URL: ${photoUrl.substring(0, 60)}...`
            );
          })
        );
      }
    }

    // 並列で削除を実行
    await Promise.all(deletePromises);

    functions.logger.info(
      `[syncChatImages] Orphan cleanup complete: ${deleted} images deleted`
    );

    // 重複削除: 同じURLを持つドキュメントは最新1件のみ保持
    let duplicatesDeleted = 0;
    const duplicateDeletePromises: Promise<void>[] = [];

    // URLごとにドキュメントをグループ化
    const urlToDocsMap = new Map<string, Array<{
      id: string;
      ref: FirebaseFirestore.DocumentReference;
      uploadedAt: string;
    }>>();

    for (const doc of existingSnapshot.docs) {
      const data = doc.data();
      const photoUrl = data.photoUrl;
      const uploadedAt = data.uploadedAt || "";

      // 無効なURL（既に削除予定）はスキップ
      if (!photoUrl || !validPhotoUrls.has(photoUrl)) continue;

      if (!urlToDocsMap.has(photoUrl)) {
        urlToDocsMap.set(photoUrl, []);
      }
      urlToDocsMap.get(photoUrl)!.push({
        id: doc.id,
        ref: doc.ref,
        uploadedAt,
      });
    }

    // 重複があるURLを処理
    for (const [url, docs] of urlToDocsMap.entries()) {
      if (docs.length <= 1) continue;

      // uploadedAtで降順ソート（最新が先頭）
      docs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

      // 最新以外を削除
      for (let i = 1; i < docs.length; i++) {
        duplicateDeletePromises.push(
          docs[i].ref.delete().then(() => {
            duplicatesDeleted++;
            functions.logger.info(
              `[syncChatImages] Deleted duplicate: ${docs[i].id}, URL: ${url.substring(0, 60)}...`
            );
          })
        );
      }
    }

    await Promise.all(duplicateDeletePromises);

    functions.logger.info(
      `[syncChatImages] Duplicate cleanup complete: ${duplicatesDeleted} duplicates deleted`
    );

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
      `[syncChatImages] Sync complete: ${synced} synced, ${updated} updated, ${skipped} skipped`
    );

    const result: SyncResult = {
      synced,
      updated,
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
