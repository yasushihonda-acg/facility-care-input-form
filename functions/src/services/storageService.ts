/**
 * Firebase Storage サービス
 * ケア写真のアップロード・管理
 * @see docs/FIREBASE_STORAGE_MIGRATION_SPEC.md
 */

import * as admin from "firebase-admin";
import {getStorage} from "firebase-admin/storage";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import * as functions from "firebase-functions";

/**
 * Storage保存先パス設定
 */
const STORAGE_CONFIG = {
  BUCKET_NAME: "facility-care-input-form.appspot.com",
  CARE_PHOTOS_PATH: "care-photos",
};

/**
 * 写真のソース（取得元）
 * Phase 52で追加
 */
export type CarePhotoSource = "direct_upload" | "google_chat";

/**
 * 写真メタデータ（Firestore care_photos コレクション）
 */
export interface CarePhotoMetadata {
  photoId: string;
  residentId: string;
  date: string; // YYYY-MM-DD
  mealTime: string; // breakfast/lunch/dinner/snack
  photoUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  staffId: string;
  staffName?: string;
  uploadedAt: string;
  postId?: string;
  /** 写真のソース（Phase 52追加） */
  source: CarePhotoSource;
}

/**
 * アップロード結果
 */
export interface StorageUploadResult {
  photoId: string;
  fileName: string;
  photoUrl: string;
  storagePath: string;
}

/**
 * ファイル名を生成
 * @param residentId 入居者ID
 * @param extension ファイル拡張子
 * @returns ユニークなファイル名
 */
export function generateStorageFileName(
  residentId: string,
  extension: string
): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHmmss
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${residentId}_${dateStr}_${randomSuffix}${extension}`;
}

/**
 * MIMEタイプから拡張子を取得
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
  };
  return mimeToExt[mimeType] || ".jpg";
}

/**
 * Firebase Storage に写真をアップロードし、Firestoreにメタデータを保存
 * @param source - 写真のソース（Phase 52追加、デフォルト: direct_upload）
 */
export async function uploadCarePhotoToStorage(
  buffer: Buffer,
  mimeType: string,
  residentId: string,
  staffId: string,
  mealTime: string = "snack",
  date?: string,
  staffName?: string,
  source: CarePhotoSource = "direct_upload"
): Promise<StorageUploadResult> {
  // 日付デフォルト: 今日
  const targetDate = date || new Date().toISOString().split("T")[0];

  // ファイル名生成
  const extension = getExtensionFromMimeType(mimeType);
  const fileName = generateStorageFileName(residentId, extension);

  // Storage パス: care-photos/{YYYY}/{MM}/{filename}
  const year = targetDate.substring(0, 4);
  const month = targetDate.substring(5, 7);
  const storagePath = `${STORAGE_CONFIG.CARE_PHOTOS_PATH}/${year}/${month}/${fileName}`;

  // Firebase Admin SDKが初期化されていなければ初期化
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }

  const bucket = getStorage().bucket(STORAGE_CONFIG.BUCKET_NAME);
  const file = bucket.file(storagePath);

  // アップロード
  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        residentId,
        staffId,
        mealTime,
        date: targetDate,
      },
    },
  });

  // 公開URLを取得（makePublic不要、storage.rulesで公開設定済み）
  const baseUrl = "https://firebasestorage.googleapis.com/v0/b";
  const encodedPath = encodeURIComponent(storagePath);
  const photoUrl = `${baseUrl}/${STORAGE_CONFIG.BUCKET_NAME}/o/${encodedPath}?alt=media`;

  // Firestore に写真メタデータを保存
  const db = getFirestore();
  const photoRef = db.collection("care_photos").doc();
  const photoId = photoRef.id;

  const metadata: CarePhotoMetadata = {
    photoId,
    residentId,
    date: targetDate,
    mealTime,
    photoUrl,
    storagePath,
    fileName,
    mimeType,
    fileSize: buffer.length,
    staffId,
    staffName,
    uploadedAt: new Date().toISOString(),
    source,
  };

  await photoRef.set({
    ...metadata,
    createdAt: FieldValue.serverTimestamp(),
  });

  functions.logger.info("Care photo uploaded to Storage", {
    photoId,
    storagePath,
    fileSize: buffer.length,
  });

  return {
    photoId,
    fileName,
    photoUrl,
    storagePath,
  };
}

/**
 * 写真メタデータを取得
 */
export async function getCarePhotos(
  residentId: string,
  date: string,
  mealTime?: string
): Promise<CarePhotoMetadata[]> {
  const db = getFirestore();

  let query = db
    .collection("care_photos")
    .where("residentId", "==", residentId)
    .where("date", "==", date);

  if (mealTime) {
    query = query.where("mealTime", "==", mealTime);
  }

  const snapshot = await query.orderBy("uploadedAt", "desc").get();

  return snapshot.docs.map((doc) => doc.data() as CarePhotoMetadata);
}
