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

  functions.logger.info(
    `[ChatApiService] Fetched ${response.data.messages?.length || 0} messages`
  );

  return {
    messages: response.data.messages || [],
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
