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
  /** 通常Webhook URL（全記録通知先） */
  webhookUrl?: string;
  /** 重要Webhook URL（重要記録のみ追加通知先） */
  importantWebhookUrl?: string;
  /** 写真保存先Google DriveフォルダID */
  driveUploadFolderId?: string;
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
  webhookUrl?: string;
  importantWebhookUrl?: string;
  driveUploadFolderId?: string;
}

/**
 * Google Chat Webhook送信用の食事記録データ
 */
export interface MealRecordForChat {
  facility: string;
  residentName: string;
  staffName: string;
  mealTime: string;
  mainDishRatio?: string;
  sideDishRatio?: string;
  injectionType?: string;
  injectionAmount?: string;
  note?: string;
  postId: string;
}

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// CareItem Types (品物管理)
// docs/ITEM_MANAGEMENT_SPEC.md に基づく型定義
// =============================================================================

/** カテゴリ */
export type ItemCategory =
  | "fruit" // 果物
  | "snack" // お菓子・間食
  | "drink" // 飲み物
  | "dairy" // 乳製品
  | "prepared" // 調理済み食品
  | "supplement" // 栄養補助食品
  | "other"; // その他

/** 保存方法 */
export type StorageMethod =
  | "room_temp" // 常温
  | "refrigerated" // 冷蔵
  | "frozen"; // 冷凍

/** 提供方法 */
export type ServingMethod =
  | "as_is" // そのまま
  | "cut" // カット
  | "peeled" // 皮むき
  | "heated" // 温める
  | "cooled" // 冷やす
  | "blended" // ミキサー
  | "other"; // その他

/** 摂食状況 */
export type ConsumptionStatus =
  | "full" // 完食
  | "most" // ほぼ完食 (80%以上)
  | "half" // 半分程度 (50%程度)
  | "little" // 少量 (30%以下)
  | "none"; // 食べなかった

/** 品物ステータス */
export type ItemStatus =
  | "pending" // 未提供
  | "served" // 提供済み
  | "consumed" // 消費済み
  | "expired" // 期限切れ
  | "discarded"; // 廃棄

/**
 * 品物（Firestore: care_items/{itemId}）
 */
export interface CareItem {
  // 識別情報
  id: string;
  residentId: string;
  userId: string;

  // 品物基本情報（家族が入力）
  itemName: string;
  category: ItemCategory;
  sentDate: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  expirationDate?: string; // YYYY-MM-DD
  storageMethod?: StorageMethod;

  // 提供希望（家族が入力）
  servingMethod: ServingMethod;
  servingMethodDetail?: string;
  plannedServeDate?: string; // YYYY-MM-DD
  noteToStaff?: string;

  // 提供記録（スタッフが入力）
  actualServeDate?: string;
  servedQuantity?: number;
  servedBy?: string;

  // 摂食記録（スタッフが入力）
  consumptionRate?: number; // 0-100
  consumptionStatus?: ConsumptionStatus;
  consumptionNote?: string;
  recordedBy?: string;

  // 申し送り（スタッフ→家族）
  noteToFamily?: string;

  // ステータス・メタ情報
  status: ItemStatus;
  remainingQuantity: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 家族が入力する品物登録フォーム */
export interface CareItemInput {
  itemName: string;
  category: ItemCategory;
  sentDate: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
  storageMethod?: StorageMethod;
  servingMethod: ServingMethod;
  servingMethodDetail?: string;
  plannedServeDate?: string;
  noteToStaff?: string;
}

/** 品物登録リクエスト */
export interface SubmitCareItemRequest {
  residentId: string;
  userId: string;
  item: CareItemInput;
}

/** 品物登録レスポンス */
export interface SubmitCareItemResponse {
  itemId: string;
  createdAt: string;
}

/** 品物一覧取得リクエスト */
export interface GetCareItemsRequest {
  residentId?: string;
  userId?: string;
  status?: ItemStatus | ItemStatus[];
  category?: ItemCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/** 品物一覧取得レスポンス */
export interface GetCareItemsResponse {
  items: CareItem[];
  total: number;
  hasMore: boolean;
}

/** 品物更新リクエスト */
export interface UpdateCareItemRequest {
  itemId: string;
  updates: Partial<CareItem>;
}

/** 提供記録入力リクエスト */
export interface RecordServingRequest {
  itemId: string;
  actualServeDate: string;
  servedQuantity: number;
  servedBy: string;
}

/** 提供記録レスポンス */
export interface RecordServingResponse {
  itemId: string;
  remainingQuantity: number;
  status: ItemStatus;
}

/** 摂食記録入力リクエスト */
export interface RecordConsumptionRequest {
  itemId: string;
  consumptionStatus: ConsumptionStatus;
  consumptionRate?: number;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
}

/** 摂食記録レスポンス */
export interface RecordConsumptionResponse {
  itemId: string;
  status: ItemStatus;
}

/** 品物削除リクエスト */
export interface DeleteCareItemRequest {
  itemId: string;
}

// =============================================================================
// タスク管理 (Phase 8.2)
// =============================================================================

/** タスク種別 */
export type TaskType =
  | "expiration_warning" // 賞味期限警告
  | "serve_reminder" // 提供リマインダー
  | "restock_alert" // 在庫切れアラート
  | "care_instruction" // ケア指示確認
  | "custom"; // カスタムタスク

/** タスクステータス */
export type TaskStatus =
  | "pending" // 未着手
  | "in_progress" // 対応中
  | "completed" // 完了
  | "cancelled"; // キャンセル

/** タスク優先度 */
export type TaskPriority =
  | "low" // 低
  | "medium" // 中
  | "high" // 高
  | "urgent"; // 緊急

/** タスク（Firestore: tasks/{taskId}） */
export interface Task {
  // 識別情報
  id: string;
  residentId: string;

  // タスク内容
  title: string;
  description?: string;
  taskType: TaskType;

  // 関連データ
  relatedItemId?: string;
  relatedInstructionId?: string;

  // スケジュール
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm

  // ステータス・優先度
  status: TaskStatus;
  priority: TaskPriority;

  // 担当・実行
  assignee?: string;
  completedBy?: string;
  completionNote?: string;

  // 通知
  notificationSent: boolean;

  // 生成情報
  createdBy?: string;
  isAutoGenerated: boolean;

  // メタ情報
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
}

/** タスク作成リクエスト */
export interface CreateTaskRequest {
  residentId: string;
  title: string;
  description?: string;
  taskType?: TaskType;
  dueDate: string;
  dueTime?: string;
  priority: TaskPriority;
  assignee?: string;
  relatedItemId?: string;
  relatedInstructionId?: string;
  createdBy?: string;
}

/** タスク作成レスポンス */
export interface CreateTaskResponse {
  taskId: string;
  createdAt: string;
}

/** タスク一覧取得リクエスト */
export interface GetTasksRequest {
  residentId?: string;
  status?: TaskStatus | TaskStatus[];
  taskType?: TaskType;
  priority?: TaskPriority;
  dueDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  limit?: number;
  offset?: number;
  sortBy?: "dueDate" | "priority" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/** タスク件数 */
export interface TaskCounts {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

/** タスク一覧取得レスポンス */
export interface GetTasksResponse {
  tasks: Task[];
  total: number;
  counts: TaskCounts;
}

/** タスク更新リクエスト */
export interface UpdateTaskRequest {
  taskId: string;
  updates: {
    status?: TaskStatus;
    assignee?: string;
    completionNote?: string;
  };
  completedBy?: string;
}

/** タスク更新レスポンス */
export interface UpdateTaskResponse {
  taskId: string;
  status: TaskStatus;
  updatedAt: string;
}

/** タスク削除リクエスト */
export interface DeleteTaskRequest {
  taskId: string;
}

// =============================================================================
// 統計ダッシュボード関連型定義 (Phase 8.3)
// =============================================================================

/** 統計データ取得リクエスト */
export interface GetStatsRequest {
  residentId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  include?: ("items" | "consumption" | "meals" | "alerts")[];
}

/** アラート種別 */
export type AlertType =
  | "expiration_today"
  | "expiration_soon"
  | "low_stock"
  | "out_of_stock"
  | "consumption_decline"
  | "no_recent_record";

/** アラート重要度 */
export type AlertSeverity = "urgent" | "warning" | "info";

/** アラート */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  relatedItemId?: string;
  createdAt: string;
}

/** 品物状況サマリ */
export interface ItemStatsSummary {
  totalItems: number;
  pendingItems: number;
  servedItems: number;
  consumedItems: number;
  expiringToday: number;
  expiringIn3Days: number;
}

/** カテゴリ別分布 */
export interface CategoryDistribution {
  category: ItemCategory;
  count: number;
  percentage: number;
}

/** 賞味期限カレンダーエントリ */
export interface ExpirationCalendarEntry {
  date: string;
  items: {
    id: string;
    itemName: string;
    daysUntil: number;
  }[];
}

/** 品物統計データ */
export interface ItemStatsData {
  summary: ItemStatsSummary;
  categoryDistribution: CategoryDistribution[];
  expirationCalendar: ExpirationCalendarEntry[];
}

/** 摂食傾向サマリ */
export interface ConsumptionStatsSummary {
  averageRate: number;
  weeklyChange: number;
  totalRecords: number;
}

/** 品目ランキングアイテム */
export interface ItemRankingEntry {
  itemName: string;
  averageRate: number;
  count: number;
  suggestion?: string;
}

/** 摂食統計データ */
export interface ConsumptionStatsData {
  summary: ConsumptionStatsSummary;
  topItems: ItemRankingEntry[];
  bottomItems: ItemRankingEntry[];
}

/** 食事統計サマリ */
export interface MealStatsSummary {
  totalRecords: number;
  mainDish: {
    high: number;
    medium: number;
    low: number;
  };
  sideDish: {
    high: number;
    medium: number;
    low: number;
  };
}

/** 食事統計データ */
export interface MealStatsData {
  summary: MealStatsSummary;
}

/** 統計データ取得レスポンス */
export interface GetStatsResponse {
  period: {
    start: string;
    end: string;
  };
  itemStats?: ItemStatsData;
  consumptionStats?: ConsumptionStatsData;
  mealStats?: MealStatsData;
  alerts?: Alert[];
}

// =============================================================================
// AI連携 Types (Phase 8.4)
// docs/AI_INTEGRATION_SPEC.md に基づく型定義
// =============================================================================

/** AI品物提案リクエスト */
export interface AISuggestRequest {
  itemName: string;
  category?: ItemCategory;
}

/** AI品物提案レスポンス */
export interface AISuggestResponse {
  expirationDays: number;
  storageMethod: StorageMethod;
  servingMethods: ServingMethod[];
  notes?: string;
}

/** AI品物提案のデフォルト値（フォールバック用） */
export const DEFAULT_AI_SUGGESTION: AISuggestResponse = {
  expirationDays: 7,
  storageMethod: "refrigerated",
  servingMethods: ["as_is"],
  notes: undefined,
};
