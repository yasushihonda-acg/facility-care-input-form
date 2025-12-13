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
}

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

export interface PlanDataRecord {
  residentId: string;
  residentName: string;
  mealRestrictions: string[];
  instructions: string;
  conditionalBan: string;
  syncedAt: string;
}

export interface GetPlanDataResponse {
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
 * Sheet A から同期されたデータ
 */
export interface PlanData {
  residentId: string;
  residentName: string;
  sheetName: string;
  mealRestrictions: string[];
  /** 詳細指示（非定型テキスト - FAXデータ仕様により正規化禁止） */
  instructions: string;
  /** 条件付き禁止（非定型テキスト - FAXデータ仕様により正規化禁止） */
  conditionalBan: string;
  syncedAt: Timestamp;
  /** 元データ全体（スプレッドシートの列データ） */
  rawData: Record<string, string>;
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
 * Flow B: 実績入力フロー用の行データ
 * Sheet B に追記される行
 */
export interface CareRecordRow {
  timestamp: string;
  staffId: string;
  residentId: string;
  mealContent: string;
  snackContent: string;
  hydrationAmount: string;
  /** Bot連携ハック: 間食時に使用される特記事項列 */
  specialNotes: string;
  /** Bot連携ハック: 間食時に "重要" がセットされる */
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
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
