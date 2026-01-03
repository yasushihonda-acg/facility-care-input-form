/**
 * GET /getChatImages
 * Google Chatスペースから画像付きメッセージを取得 (Phase 51)
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import {listSpaceMessages} from "../services/chatApiService";
import {
  ApiResponse,
  GetChatImagesResponse,
  ChatImageMessage,
  ErrorCodes,
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

/**
 * メッセージから記録者名を抽出
 */
function extractStaffName(text: string): string | undefined {
  const match = text.match(STAFF_NAME_PATTERN);
  return match ? match[1].trim() : undefined;
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
 * テキストメッセージ情報を格納する型
 */
interface TextMessageInfo {
  content: string;
  postId?: string;
  staffName?: string;
  tags?: string[];
  createTime: string;
}

/**
 * メッセージをフィルタ・変換して画像メッセージを抽出
 */
function processMessages(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[],
  targetResidentId: string
): ChatImageMessage[] {
  const results: ChatImageMessage[] = [];
  const textMessageMap = new Map<string, TextMessageInfo>();

  // 1. テキストメッセージをマップに格納（投稿IDまたは時刻でインデックス）
  for (const msg of messages) {
    if (!msg.text) continue;

    const msgResidentId = extractResidentId(msg.text);
    if (!msgResidentId || msgResidentId !== targetResidentId) continue;

    const postIdMatch = msg.text.match(POST_ID_PATTERN);
    const key = postIdMatch ? postIdMatch[1] : msg.createTime;

    textMessageMap.set(key, {
      content: msg.text,
      postId: postIdMatch ? postIdMatch[1] : undefined,
      staffName: extractStaffName(msg.text),
      tags: msg.text.match(TAG_PATTERN) || [],
      createTime: msg.createTime,
    });
  }

  // 2. 画像メッセージを処理
  for (const msg of messages) {
    // 添付ファイルがない場合はスキップ
    if (!msg.attachment || msg.attachment.length === 0) continue;

    // メッセージテキストから利用者IDを確認
    const msgResidentId = msg.text ? extractResidentId(msg.text) : undefined;
    if (!msgResidentId || msgResidentId !== targetResidentId) continue;

    // 各添付ファイルを処理
    for (const attachment of msg.attachment) {
      // 画像以外はスキップ
      if (!attachment.contentType?.startsWith("image/")) continue;

      // 画像URLを取得（attachmentDataRef または downloadUri）
      let imageUrl = "";
      if (attachment.attachmentDataRef?.resourceName) {
        // リソース名からURLを構築（実際のURLは取得が必要な場合がある）
        imageUrl = `https://chat.googleapis.com/v1/${attachment.attachmentDataRef.resourceName}?alt=media`;
      } else if (attachment.downloadUri) {
        imageUrl = attachment.downloadUri;
      } else if (attachment.driveDataRef?.driveFileId) {
        // Google Driveファイルの場合
        imageUrl = `https://drive.google.com/uc?id=${attachment.driveDataRef.driveFileId}&export=view`;
      }

      if (!imageUrl) continue;

      // 関連するテキストメッセージを検索（時刻近接で紐付け）
      const relatedText = findRelatedTextMessage(msg, textMessageMap);

      const imageMessage: ChatImageMessage = {
        messageId: msg.name || `msg_${Date.now()}`,
        residentId: targetResidentId,
        timestamp: msg.createTime,
        imageUrl,
        thumbnailUrl: attachment.thumbnailUri,
        contentType: attachment.contentType,
        fileName: attachment.contentName,
        relatedTextMessage: relatedText,
      };

      results.push(imageMessage);
    }
  }

  // 日時降順でソート
  return results.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * 画像メッセージに関連するテキストメッセージを検索
 * 5分以内に投稿されたテキストメッセージを関連付け
 */
function findRelatedTextMessage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageMsg: any,
  textMap: Map<string, TextMessageInfo>
): ChatImageMessage["relatedTextMessage"] | undefined {
  const imageTime = new Date(imageMsg.createTime).getTime();

  // 時刻が近いテキストメッセージを検索（5分以内）
  for (const [, textMsg] of textMap) {
    const textTime = new Date(textMsg.createTime).getTime();
    // 画像は通常テキストの後に投稿されるので、textTime < imageTime を優先
    if (imageTime - textTime >= 0 && imageTime - textTime < 5 * 60 * 1000) {
      return {
        content: textMsg.content,
        postId: textMsg.postId,
        staffName: textMsg.staffName,
        tags: textMsg.tags,
      };
    }
  }

  return undefined;
}

/**
 * getChatImages 関数本体
 * Phase 52: OAuth対応 - AuthorizationヘッダーからアクセストークンO取得
 */
async function getChatImagesHandler(
  req: Request,
  res: Response
): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // CORS対応（Authorizationヘッダーを許可）
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "GET") {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: "Method not allowed. Use GET.",
        },
        timestamp,
      };
      res.status(405).json(response);
      return;
    }

    // Phase 52: Authorizationヘッダーからアクセストークン取得
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

    // クエリパラメータの取得
    const spaceId = req.query.spaceId as string | undefined;
    const residentId = req.query.residentId as string | undefined;
    const pageToken = req.query.pageToken as string | undefined;
    const limitStr = req.query.limit as string | undefined;

    // 必須パラメータのチェック
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

    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    functions.logger.info(
      `[getChatImages] Fetching images for resident ${residentId} from space ${spaceId}`
    );

    // Chat APIからメッセージ取得（OAuthトークン使用）
    const {messages, nextPageToken} = await listSpaceMessages(
      spaceId,
      accessToken,
      pageToken,
      limit
    );

    // メッセージをフィルタ・処理
    const images = processMessages(messages, residentId);

    functions.logger.info(
      `[getChatImages] Found ${images.length} images for resident ${residentId}`
    );

    const response: ApiResponse<GetChatImagesResponse> = {
      success: true,
      data: {
        images,
        nextPageToken,
        totalCount: images.length,
      },
      timestamp,
    };

    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("[getChatImages] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Chat API特有のエラーハンドリング
    let userMessage = errorMessage;
    let statusCode = 500;

    if (errorMessage.includes("PERMISSION_DENIED")) {
      userMessage =
        "チャットスペースへのアクセス権限がありません。ログイン中のアカウントがスペースのメンバーか確認してください。";
    } else if (errorMessage.includes("NOT_FOUND")) {
      userMessage =
        "指定されたチャットスペースが見つかりません。スペースIDを確認してください。";
    } else if (errorMessage.includes("UNAUTHENTICATED") ||
               errorMessage.includes("invalid_token")) {
      userMessage =
        "認証トークンが無効または期限切れです。再度ログインしてください。";
      statusCode = 401;
    } else if (errorMessage.includes("invalid_grant")) {
      userMessage =
        "アクセストークンが期限切れです。再度ログインしてください。";
      statusCode = 401;
    }

    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "CHAT_API_ERROR",
        message: userMessage,
      },
      timestamp,
    };

    res.status(statusCode).json(response);
  }
}

export const getChatImages = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onRequest(getChatImagesHandler);
