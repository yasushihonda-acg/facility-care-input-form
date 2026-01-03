// 型定義再エクスポート
export * from './consumptionLog';
export * from './chat';
export * from './staffNote';

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

// Sheet summary (from backend)
export interface SheetSummary {
  sheetName: string;
  recordCount: number;
  headers: string[];
}

// Plan data record (from backend)
export interface PlanDataRecord {
  id: string;
  sheetName: string;
  /** A列: タイムスタンプ */
  timestamp: string;
  /** B列: 入力者名（スタッフ） */
  staffName: string;
  /** C列: 利用者名（一部シートはD列） */
  residentName: string;
  /** D列以降: 列名→値のマップ */
  data: Record<string, string>;
  /** 元データ配列（デバッグ・互換性用） */
  rawRow: string[];
  syncedAt: string;
}

// getPlanData response
export interface GetPlanDataResponse {
  sheets: SheetSummary[];
  records: PlanDataRecord[];
  totalCount: number;
  lastSyncedAt: string;
}

// syncPlanData response
export interface SyncPlanDataResponse {
  syncedSheets: string[];
  totalRecords: number;
  syncDuration: number;
}

// Sync state
export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

// submitMealRecord request
// Phase 13.0.4: recordMode追加でsnack_only対応
import type { SnackRecord } from './mealForm';
export type { SnackRecord } from './mealForm';

export interface SubmitMealRecordRequest {
  // === Phase 13.0.4: 記録モード ===
  // 'full': 通常の食事記録（デフォルト）
  // 'snack_only': 品物から記録タブ用（間食のみ記録）
  recordMode?: 'full' | 'snack_only';

  // 必須フィールド（recordMode='snack_only'の場合はstaffNameのみ必須）
  staffName: string;
  facility?: string;
  residentName?: string;
  dayServiceUsage?: '利用中' | '利用中ではない';
  mealTime?: '朝' | '昼' | '夜';
  isImportant?: '重要' | '重要ではない';

  // 条件付き必須フィールド
  dayServiceName?: string;

  // 任意フィールド
  mainDishRatio?: string;
  sideDishRatio?: string;
  injectionType?: string;
  injectionAmount?: string;
  snack?: string;
  note?: string;

  // === 間食記録連携用（オプショナル）===
  snackRecords?: SnackRecord[];
  residentId?: string;

  // === Phase 17: 写真連携 ===
  photoUrl?: string;
}

// submitMealRecord response
export interface SubmitMealRecordResponse {
  postId: string;
  sheetRow: number;
}

// =============================================================================
// Phase 51: Google Chat画像閲覧設定
// =============================================================================

/**
 * 画像閲覧設定（Google Chatスペースからの取得用）
 */
export interface ChatImageSettings {
  /** 対象利用者ID（例: "7282"）- ID7282のような形式から数字部分のみ */
  residentId: string;
  /** Google ChatスペースID（例: "AAAAL1Foxd8"）- SpaceURLの末尾部分 */
  spaceId: string;
}

/**
 * Google Chatから取得した画像メッセージ
 */
export interface ChatImageMessage {
  /** メッセージID */
  messageId: string;
  /** 利用者ID */
  residentId: string;
  /** 投稿日時（ISO8601） */
  timestamp: string;
  /** 画像URL */
  imageUrl: string;
  /** サムネイルURL（存在する場合） */
  thumbnailUrl?: string;
  /** コンテンツタイプ（例: image/jpeg） */
  contentType: string;
  /** ファイル名 */
  fileName?: string;
  /** 関連するテキストメッセージ（近接時刻で紐付け） */
  relatedTextMessage?: {
    /** メッセージ本文 */
    content: string;
    /** 投稿ID（例: NTC20260103061218028942） */
    postId?: string;
    /** 記録者名 */
    staffName?: string;
    /** タグ（例: ["#特記事項📝", "#重要⚠️"]） */
    tags?: string[];
  };
}

/**
 * getChatImages APIリクエスト
 */
export interface GetChatImagesRequest {
  spaceId: string;
  residentId: string;
  pageToken?: string;
  limit?: number;
}

/**
 * getChatImages APIレスポンス
 */
export interface GetChatImagesResponse {
  images: ChatImageMessage[];
  nextPageToken?: string;
  totalCount?: number;
}

// 食事入力フォームのグローバル初期値設定
export interface MealFormSettings {
  defaultFacility: string;
  defaultResidentName: string;
  defaultDayServiceName: string;
  /** 通常Webhook URL（全記録通知先） */
  webhookUrl?: string;
  /** 重要Webhook URL（重要記録のみ追加通知先） */
  importantWebhookUrl?: string;
  /** 家族操作・入力無し通知用Webhook URL (Phase 30) */
  familyNotifyWebhookUrl?: string;
  /** 記録チェック通知時間（0-23、デフォルト16）(Phase 30.1) */
  recordCheckHour?: number;
  /** 非表示シート名の配列 (Phase 50) */
  hiddenSheets?: string[];
  /** 画像閲覧設定 (Phase 51) */
  chatImageSettings?: ChatImageSettings;
  updatedAt: string;
}

// 設定更新リクエスト
export interface UpdateMealFormSettingsRequest {
  defaultFacility?: string;
  defaultResidentName?: string;
  defaultDayServiceName?: string;
  webhookUrl?: string;
  importantWebhookUrl?: string;
  familyNotifyWebhookUrl?: string;
  recordCheckHour?: number;
  hiddenSheets?: string[];
  /** 画像閲覧設定 (Phase 51) */
  chatImageSettings?: ChatImageSettings;
}

// =============================================================================
// Phase 17: Firebase Storage 写真連携
// =============================================================================

/**
 * 写真メタデータ（Firestore care_photos コレクション）
 */
export interface CarePhoto {
  photoId: string;
  residentId: string;
  date: string;         // YYYY-MM-DD
  mealTime: string;     // breakfast/lunch/dinner/snack
  photoUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  staffId: string;
  staffName?: string;
  uploadedAt: string;
  postId?: string;
}

/**
 * 画像アップロードリクエスト
 */
export interface UploadCareImageRequest {
  staffId: string;
  residentId: string;
  mealTime?: string;
  date?: string;
  staffName?: string;
  image: File;
}

/**
 * 画像アップロードレスポンス
 */
export interface UploadCareImageResponse {
  photoId: string;
  fileName: string;
  photoUrl: string;
  storagePath: string;
}

/**
 * 写真取得リクエスト
 */
export interface GetCarePhotosRequest {
  residentId: string;
  date: string;
  mealTime?: string;
}

/**
 * 写真取得レスポンス
 */
export interface GetCarePhotosResponse {
  photos: CarePhoto[];
}
