/**
 * Google Drive サービス
 * 画像アップロード・公開URL生成
 */

import {google, drive_v3} from "googleapis";
import {Readable} from "stream";
import {DRIVE_CONFIG} from "../config/sheets";

let driveClient: drive_v3.Drive | null = null;

/**
 * Drive API クライアントを取得（シングルトン）
 */
async function getDriveClient(): Promise<drive_v3.Drive> {
  if (driveClient) {
    return driveClient;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  driveClient = google.drive({version: "v3", auth});
  return driveClient;
}

/**
 * 画像をアップロードしてURLを取得
 *
 * @param fileBuffer 画像データ
 * @param fileName ファイル名
 * @param mimeType MIMEタイプ
 * @return アップロード結果
 */
export async function uploadImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{
  fileId: string;
  fileName: string;
  publicUrl: string;
  thumbnailUrl: string;
}> {
  const client = await getDriveClient();

  // 日付ベースのフォルダを取得または作成
  const folderId = await getOrCreateDateFolder();

  // ファイルをアップロード
  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: bufferToStream(fileBuffer),
  };

  const response = await client.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, name, webViewLink, thumbnailLink",
  });

  const fileId = response.data.id || "";

  // ファイルを公開設定にする
  await client.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    fileId,
    fileName: response.data.name || fileName,
    publicUrl: `https://drive.google.com/uc?id=${fileId}`,
    thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}`,
  };
}

/**
 * 日付ベースのフォルダを取得または作成
 * 構造: CareRecordImages/{YYYY}/{MM}/
 */
async function getOrCreateDateFolder(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");

  // ルートフォルダを取得または作成
  const rootFolderId = await getOrCreateFolder(
    DRIVE_CONFIG.ROOT_FOLDER_NAME,
    null
  );

  // 年フォルダを取得または作成
  const yearFolderId = await getOrCreateFolder(year, rootFolderId);

  // 月フォルダを取得または作成
  const monthFolderId = await getOrCreateFolder(month, yearFolderId);

  return monthFolderId;
}

/**
 * フォルダを取得または作成
 *
 * @param folderName フォルダ名
 * @param parentId 親フォルダID（nullの場合はルート）
 */
async function getOrCreateFolder(
  folderName: string,
  parentId: string | null
): Promise<string> {
  const client = await getDriveClient();

  // 既存のフォルダを検索
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const response = await client.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  const files = response.data.files || [];
  if (files.length > 0 && files[0].id) {
    return files[0].id;
  }

  // フォルダが存在しない場合は作成
  const folderMetadata: drive_v3.Schema$File = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    folderMetadata.parents = [parentId];
  }

  const createResponse = await client.files.create({
    requestBody: folderMetadata,
    fields: "id",
  });

  return createResponse.data.id || "";
}

/**
 * ファイル名を生成
 * フォーマット: {residentId}_{YYYYMMDD}_{HHmmss}.{extension}
 */
export function generateFileName(
  residentId: string,
  extension: string
): string {
  const now = new Date();
  const dateStr = now
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
  return `${residentId}_${dateStr}.${extension}`;
}

/**
 * MIMEタイプから拡張子を取得
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return mimeMap[mimeType] || "jpg";
}

/**
 * Buffer を ReadableStream に変換
 */
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
