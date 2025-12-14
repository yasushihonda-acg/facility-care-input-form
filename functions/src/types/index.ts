/**
 * 型定義ファイル
 * API仕様書 (docs/API_SPEC.md) に基づく型定義
 */

import {Timestamp} from "firebase-admin/firestore";

// =============================================================================
// Request Types
// =============================================================================

export interface SyncPlanDataRequest {
  triggeredBy?: "manual" | "scheduled";
  /**
   * 差分同期フラグ
   * - true: 差分同期（新規レコードのみ追加、削除なし）
   * - false/undefined: 完全同期（洗い替え）
   */
  incremental?: boolean;
}

/**
 * 食事入力フォームのリクエスト型
 * docs/MEAL_INPUT_FORM_SPEC.md に基づく
 */
export interface SubmitMealRecordRequest {
  // 必須フィールド
  staffName: string; // 入力者（あなた）は？
  facility: string; // 利用者様のお住まいの施設は？
  residentName: string; // 利用者名は？
  dayServiceUsage: "利用中" | "利用中ではない"; // デイサービスの利用中ですか？
  mealTime: "朝" | "昼" | "夜"; // 食事はいつのことですか？
  isImportant: "重要" | "重要ではない"; // 重要特記事項集計表に反映させますか？

  // 条件付き必須フィールド（dayServiceUsage='利用中'の場合必須）
  dayServiceName?: string; // どこのデイサービスですか？

  // 任意フィールド
  mainDishRatio?: string; // 主食の摂取量は何割ですか？
  sideDishRatio?: string; // 副食の摂取量は何割ですか？
  injectionType?: string; // 注入の種類は？
  injectionAmount?: string; // 注入量は？
  snack?: string; // 間食は何を食べましたか？
  note?: string; // 特記事項
  // photo は別途アップロードAPI経由
}

/**
 * @deprecated 旧型定義（後方互換性のため残存）
 */
export interface SubmitCareRecordRequest {
  staffId: string;
  residentId: string;
  recordType: "meal" | "snack" | "hydration";
  content: string;
  quantity?: string;
  timestamp: string;
  imageUrl?: string;
  notes?: string;
}

export interface SubmitFamilyRequestRequest {
  userId: string;
  residentId: string;
  category:
    | "meal"
    | "daily_life"
    | "medical"
    | "recreation"
    | "communication"
    | "other";
  content: string;
  priority: "low" | "medium" | "high";
  attachments?: string[];
}

export interface UploadCareImageRequest {
  staffId: string;
  residentId: string;
  recordType?: string;
}

export interface GetPlanDataRequest {
  residentId?: string;
  limit?: number;
}

export interface GetFamilyRequestsRequest {
  userId?: string;
  residentId?: string;
  status?: "pending" | "reviewed" | "implemented";
  limit?: number;
}

// =============================================================================
// Response Types
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface SyncPlanDataResponse {
  syncedSheets: string[];
  totalRecords: number;
  syncDuration: number;
}

export interface SubmitCareRecordResponse {
  recordId: string;
  sheetRow: number;
  botNotificationTriggered: boolean;
}

export interface SubmitFamilyRequestResponse {
  requestId: string;
  status: "pending";
  estimatedReviewDate: string;
}

export interface UploadCareImageResponse {
  fileId: string;
  fileName: string;
  publicUrl: string;
  thumbnailUrl: string;
}

/**
 * シート別の集計情報
 */
export interface SheetSummary {
  sheetName: string;
  recordCount: number;
  headers: string[];
}

/**
 * 汎用レコード型（シート構造に依存しない）
 * 列名をキーとしたデータを保持
 */
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

export interface GetPlanDataResponse {
  sheets: SheetSummary[];
  records: PlanDataRecord[];
  totalCount: number;
  lastSyncedAt: string;
}

export interface FamilyRequestRecord {
  requestId: string;
  userId: string;
  residentId: string;
  category: string;
  content: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "implemented";
  createdAt: string;
  updatedAt: string;
}

export interface GetFamilyRequestsResponse {
  requests: FamilyRequestRecord[];
  totalCount: number;
}

// =============================================================================
// Firestore Document Types
// =============================================================================

/**
 * Flow A: 記録参照フロー用データ
 * Sheet A から同期されたデータ（汎用型）
 *
 * シート構造に依存せず、列名をキーとしてデータを保持
 */
export interface PlanData {
  sheetName: string;
  /** A列: タイムスタンプ */
  timestamp: string;
  /** B列: 入力者名（スタッフ） */
  staffName: string;
  /** C列: 利用者名（一部シートはD列） */
  residentName: string;
  /** D列以降: 列名→値のマップ（列ヘッダーがキー） */
  data: Record<string, string>;
  /** 元データ配列 */
  rawRow: string[];
  /** ヘッダー行（列名一覧） */
  headers: string[];
  /** Firestore同期日時 */
  syncedAt: Timestamp;
}

/**
 * Flow C: 家族要望フロー用データ
 */
export interface FamilyRequest {
  id: string;
  userId: string;
  residentId: string;
  category:
    | "meal"
    | "daily_life"
    | "medical"
    | "recreation"
    | "communication"
    | "other";
  content: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "implemented";
  attachments?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =============================================================================
// Sheet Row Types (for building spreadsheet rows)
// =============================================================================

/**
 * Flow B: 食事記録用の行データ
 * Sheet B「フォームの回答 1」シートに追記される行
 * docs/SHEET_B_STRUCTURE.md に基づく15カラム構成
 */
export interface MealRecordRow {
  timestamp: string; // A列: タイムスタンプ（自動記録）
  staffName: string; // B列: あなたの名前は？
  residentName: string; // C列: ご利用者様のお名前は？
  mealTime: string; // D列: 食事はいつのことですか？
  mainDishRatio: string; // E列: 主食の摂取量は何割ですか？
  sideDishRatio: string; // F列: 副食の摂取量は何割ですか？
  injectionAmount: string; // G列: 注入量は何ccですか？
  snack: string; // H列: 間食は何を食べましたか？
  specialNotes: string; // I列: 特記事項
  isImportant: string; // J列: 重要特記事項集計表に反映させますか？
  facility: string; // K列: 施設
  dayServiceUsage: string; // L列: デイ利用有無
  injectionType: string; // M列: 注入の種類
  postId: string; // N列: 投稿ID
  dayServiceName: string; // O列: どこのデイサービスですか？
}

/**
 * @deprecated 旧型定義（後方互換性のため残存）
 */
export interface CareRecordRow {
  timestamp: string;
  staffId: string;
  residentId: string;
  mealContent: string;
  snackContent: string;
  hydrationAmount: string;
  specialNotes: string;
  importance: string;
  imageUrl: string;
  notes: string;
}

// =============================================================================
// Error Codes
// =============================================================================

export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  SHEETS_API_ERROR: "SHEETS_API_ERROR",
  FIRESTORE_ERROR: "FIRESTORE_ERROR",
  DRIVE_API_ERROR: "DRIVE_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const;

// =============================================================================
// Global Settings Types (for meal form defaults)
// =============================================================================

/**
 * 食事入力フォームのグローバル初期値設定
 * 全ユーザーに等しく適用される
 */
export interface MealFormSettings {
  /** デフォルト施設 */
  defaultFacility: string;
  /** デフォルト利用者名 */
  defaultResidentName: string;
  /** デフォルトデイサービス */
  defaultDayServiceName: string;
  /** 最終更新日時 */
  updatedAt: string;
}

/**
 * 設定更新リクエスト
 * admin=true のクエリパラメータが必須
 */
export interface UpdateMealFormSettingsRequest {
  defaultFacility?: string;
  defaultResidentName?: string;
  defaultDayServiceName?: string;
}

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
