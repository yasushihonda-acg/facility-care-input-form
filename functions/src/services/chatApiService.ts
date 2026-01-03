/**
 * Google Chat API サービス (Phase 51 + Phase 52 OAuth対応)
 * spaces.messages.list を使用してメッセージを取得
 *
 * Phase 52: ユーザーのOAuthトークンを使用したアクセスに対応
 * - サービスアカウントではスペースにアクセスできない（組織ポリシー制限）
 * - ログインユーザーのOAuthトークンでChat APIにアクセス
 */

import {google, chat_v1} from "googleapis";
import * as functions from "firebase-functions";

/**
 * OAuthアクセストークンを使用してChat APIクライアントを取得
 * @param accessToken - ユーザーのOAuthアクセストークン
 */
export function getChatClientWithOAuth(accessToken: string): chat_v1.Chat {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({access_token: accessToken});

  return google.chat({version: "v1", auth: oauth2Client});
}

/**
 * スペースからメッセージ一覧を取得（OAuth対応）
 * @param spaceId - Chat Space ID
 * @param accessToken - ユーザーのOAuthアクセストークン
 * @param pageToken - ページネーショントークン（オプション）
 * @param pageSize - 1ページあたりの取得件数（デフォルト: 100）
 */
export async function listSpaceMessages(
  spaceId: string,
  accessToken: string,
  pageToken?: string,
  pageSize: number = 100,
  filter?: string
): Promise<{
  messages: chat_v1.Schema$Message[];
  nextPageToken?: string;
}> {
  functions.logger.info(`[ChatApiService] Fetching messages from space: ${spaceId}`, {filter});

  const chat = getChatClientWithOAuth(accessToken);

  const response = await chat.spaces.messages.list({
    parent: `spaces/${spaceId}`,
    pageSize,
    pageToken,
    filter,
    // 最新のメッセージから取得
    orderBy: "createTime desc",
  });

  const messages = response.data.messages || [];

  functions.logger.info(
    `[ChatApiService] Fetched ${messages.length} messages`
  );

  // デバッグ: 最初の5件のメッセージの全フィールドをログ出力
  const sampleCount = Math.min(5, messages.length);
  for (let i = 0; i < sampleCount; i++) {
    const msg = messages[i];
    functions.logger.info(`[ChatApiService] Message ${i + 1} structure:`, {
      name: msg.name,
      allKeys: Object.keys(msg),
      hasText: !!msg.text,
      textLength: msg.text?.length || 0,
      textPreview: msg.text?.substring(0, 300),
      hasFormattedText: !!msg.formattedText,
      hasCards: !!(msg.cards && msg.cards.length > 0),
      hasCardsV2: !!(msg.cardsV2 && msg.cardsV2.length > 0),
      hasAttachment: !!(msg.attachment && msg.attachment.length > 0),
      attachmentCount: msg.attachment?.length || 0,
      hasAccessoryWidgets: !!(msg.accessoryWidgets && msg.accessoryWidgets.length > 0),
      sender: msg.sender,
      createTime: msg.createTime,
      // 添付ファイルの詳細
      attachmentDetails: msg.attachment?.map((a) => ({
        name: a.name,
        contentName: a.contentName,
        contentType: a.contentType,
        thumbnailUri: a.thumbnailUri,
        downloadUri: a.downloadUri,
        source: a.source,
      })),
    });
  }

  return {
    messages,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

/**
 * 添付ファイルの情報を取得（OAuth対応）
 * @param attachmentName - 添付ファイルのリソース名
 * @param accessToken - ユーザーのOAuthアクセストークン
 */
export async function getAttachmentInfo(
  attachmentName: string,
  accessToken: string
): Promise<chat_v1.Schema$Attachment | null> {
  const chat = getChatClientWithOAuth(accessToken);

  try {
    const response = await chat.spaces.messages.attachments.get({
      name: attachmentName,
    });
    return response.data;
  } catch (error) {
    functions.logger.error(
      "[ChatApiService] Failed to get attachment:",
      error
    );
    return null;
  }
}
