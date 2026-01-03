/**
 * Google Chat API サービス (Phase 51)
 * spaces.messages.list を使用してメッセージを取得
 */

import {google, chat_v1} from "googleapis";
import * as functions from "firebase-functions";

// Chat API用スコープ
const CHAT_SCOPES = [
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.messages.readonly",
];

let chatClient: chat_v1.Chat | null = null;

/**
 * Chat API クライアントを取得（シングルトン）
 */
async function getChatClient(): Promise<chat_v1.Chat> {
  if (chatClient) {
    return chatClient;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: CHAT_SCOPES,
  });

  chatClient = google.chat({version: "v1", auth});
  return chatClient;
}

/**
 * スペースからメッセージ一覧を取得
 */
export async function listSpaceMessages(
  spaceId: string,
  pageToken?: string,
  pageSize: number = 100
): Promise<{
  messages: chat_v1.Schema$Message[];
  nextPageToken?: string;
}> {
  const chat = await getChatClient();

  functions.logger.info(`[ChatApiService] Fetching messages from space: ${spaceId}`);

  const response = await chat.spaces.messages.list({
    parent: `spaces/${spaceId}`,
    pageSize,
    pageToken,
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
 * 添付ファイルの情報を取得
 */
export async function getAttachmentInfo(
  attachmentName: string
): Promise<chat_v1.Schema$Attachment | null> {
  const chat = await getChatClient();

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
