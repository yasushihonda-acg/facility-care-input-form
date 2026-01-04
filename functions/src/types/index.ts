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
/**
 * 間食詳細記録
 * docs/SNACK_RECORD_INTEGRATION_SPEC.md に基づく
 */
export interface SnackRecord {
  // 品物識別
  itemId?: string; // care_items のID（紐づけ用）
  itemName: string; // 品物名（表示・Sheet B用）

  // 提供情報
  servedQuantity: number; // 提供数
  unit?: string; // 単位（個、切れ等）

  // 摂食情報
  consumptionStatus: ConsumptionStatus; // full/most/half/little/none
  consumptionRate?: number; // 0-100（オプション、statusから自動計算可）

  // Phase 15.7: 残り対応
  remainingHandling?: RemainingHandling;
  remainingHandlingOther?: string;

  // 家族指示対応
  followedInstruction?: boolean; // 家族指示に従ったか
  instructionNote?: string; // 指示対応メモ

  // その他
  note?: string; // スタッフメモ
  noteToFamily?: string; // 家族への申し送り
}

export interface SubmitMealRecordRequest {
  // === Phase 13.0.4: 記録モード ===
  // 'full': 通常の食事記録（デフォルト）
  // 'snack_only': 品物から記録タブ用（間食のみ記録）
  // docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2.5
  recordMode?: "full" | "snack_only";

  // 必須フィールド（recordMode='snack_only'の場合はstaffNameのみ必須）
  staffName: string; // 入力者（あなた）は？
  facility?: string; // 利用者様のお住まいの施設は？
  residentName?: string; // 利用者名は？
  dayServiceUsage?: "利用中" | "利用中ではない"; // デイサービスの利用中ですか？
  mealTime?: "朝" | "昼" | "夜"; // 食事はいつのことですか？
  isImportant?: "重要" | "重要ではない"; // 重要特記事項集計表に反映させますか？

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

  // === 間食記録連携用（オプショナル）===
  // docs/SNACK_RECORD_INTEGRATION_SPEC.md
  snackRecords?: SnackRecord[]; // 間食詳細記録
  residentId?: string; // 入居者ID（品物連携用）

  // === Phase 17: 写真連携 ===
  // docs/FIREBASE_STORAGE_MIGRATION_SPEC.md
  photoUrl?: string; // Firebase Storage 公開URL（Webhook送信用）
}

/**
 * Phase 29: 水分記録リクエスト
 * docs/STAFF_RECORD_FORM_SPEC.md セクション7.3
 */
export interface SubmitHydrationRecordRequest {
  staffName: string; // スタッフ名
  residentName: string; // 利用者名
  residentId?: string; // 利用者ID（品物連携用）
  hydrationAmount: number; // 水分量(cc)
  note?: string; // 特記事項
  isImportant: "重要" | "重要ではない";
  facility: string; // 施設
  dayServiceUsage: "利用中" | "利用中ではない";
  dayServiceName?: string; // デイサービス名
  // 品物連携用（オプション）
  itemId?: string;
  itemName?: string;
  servedQuantity?: number;
  unit?: string;
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

export interface UploadCareImageRequest {
  staffId: string;
  residentId: string;
  recordType?: string;
}

export interface GetPlanDataRequest {
  residentId?: string;
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

/**
 * 画像アップロードレスポンス
 * Phase 17: Firebase Storage移行後の新レスポンス形式
 */
export interface UploadCareImageResponse {
  /** Firestore care_photos ドキュメントID */
  photoId: string;
  /** ファイル名 */
  fileName: string;
  /** Firebase Storage 公開URL */
  photoUrl: string;
  /** Storage内のパス */
  storagePath: string;
}

/**
 * 写真のソース（取得元）
 * Phase 52で追加
 */
export type CarePhotoSource = "direct_upload" | "google_chat";

/**
 * 写真メタデータ（Firestore care_photos コレクション）
 * @see docs/FIREBASE_STORAGE_MIGRATION_SPEC.md
 */
export interface CarePhoto {
  photoId: string;
  residentId: string;
  /** YYYY-MM-DD */
  date: string;
  /** breakfast/lunch/dinner/snack */
  mealTime: string;
  photoUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  staffId: string;
  staffName?: string;
  uploadedAt: string;
  postId?: string;
  /** 写真のソース（Phase 52追加、後方互換のためオプション） */
  source?: CarePhotoSource;
  /** Chat APIメッセージID（Phase 52.3追加） */
  chatMessageId?: string;
  /** Chatメッセージのタグ（#特記事項📝 など） */
  chatTags?: string[];
  /** Chatメッセージの内容（UI表示用テキスト） */
  chatContent?: string;
}

/**
 * 写真取得リクエスト
 */
export interface GetCarePhotosRequest {
  residentId: string;
  /** YYYY-MM-DD */
  date: string;
  /** オプション */
  mealTime?: string;
}

/**
 * 写真取得レスポンス
 */
export interface GetCarePhotosResponse {
  photos: CarePhoto[];
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
  /** タイムスタンプから抽出した年（Firestoreクエリ用） */
  year?: number;
  /** タイムスタンプから抽出した月（Firestoreクエリ用） */
  month?: number;
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
  /** 家族操作・入力無し通知用Webhook URL (Phase 30) */
  familyNotifyWebhookUrl?: string;
  /** 記録チェック通知時間（0-23、デフォルト16）(Phase 30.1) */
  recordCheckHour?: number;
  /** 非表示シート名の配列 (Phase 50) */
  hiddenSheets?: string[];
  /** 画像閲覧設定 (Phase 51) */
  chatImageSettings?: ChatImageSettings;
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
  familyNotifyWebhookUrl?: string;
  recordCheckHour?: number;
  hiddenSheets?: string[];
  /** 画像閲覧設定 (Phase 51) */
  chatImageSettings?: ChatImageSettings;
}

// =============================================================================
// 日次記録ログ Types (Phase 30)
// =============================================================================

/**
 * 日次記録ログ
 * Firestore: daily_record_logs/{YYYY-MM-DD}
 * 16時入力無し通知判定用
 */
export interface DailyRecordLog {
  /** 日付 (YYYY-MM-DD) */
  date: string;
  /** 食事記録があるか */
  hasMealRecord: boolean;
  /** 水分記録があるか */
  hasHydrationRecord: boolean;
  /** 最終食事記録タイムスタンプ */
  lastMealAt?: string;
  /** 最終水分記録タイムスタンプ */
  lastHydrationAt?: string;
  /** 更新日時 */
  updatedAt: string;
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
  // Phase 17: 写真URL（Webhook送信用）
  photoUrl?: string;
}

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// CareItem Types (品物管理)
// docs/ITEM_MANAGEMENT_SPEC.md に基づく型定義
// =============================================================================

/** カテゴリ（Phase 31: 7→2に簡素化） */
export type ItemCategory = "food" | "drink";

/** 保存方法 */
export type StorageMethod =
  | "room_temp" // 常温
  | "refrigerated" // 冷蔵
  | "frozen"; // 冷凍

/** 提供方法（Phase 28で整理: cooled/blended削除） */
export type ServingMethod =
  | "as_is" // そのまま
  | "cut" // カット
  | "peeled" // 皮むき
  | "heated" // 温める
  | "other"; // その他


// 残った場合の処置指示
export type RemainingHandlingInstruction =
  | "none" // 指示なし
  | "discarded" // 破棄してください
  | "stored"; // 保存してください

/** 残り対応の実績ログ（スタッフが記録） */
export interface RemainingHandlingLog {
  /** ログID（RHL_{timestamp}_{random}） */
  id: string;
  /** 対応種別 */
  handling: "discarded" | "stored";
  /** 対応した数量 */
  quantity: number;
  /** メモ */
  note?: string;
  /** 記録者 */
  recordedBy: string;
  /** 記録日時（ISO8601） */
  recordedAt: string;
}

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
  | "in_progress" // 提供中（一部消費、残量あり）
  | "served" // 提供済み（旧: 互換性のため残す）
  | "consumed" // 消費完了
  | "expired" // 期限切れ
  | "pending_discard" // 廃棄指示中（Phase 49: 家族→スタッフ通知中）
  | "discarded"; // 廃棄完了

/** 消費サマリー（CareItemに埋め込み） */
export interface ConsumptionSummary {
  totalServed: number; // 累計提供回数
  totalServedQuantity: number; // 累計提供量
  totalConsumedQuantity: number; // 累計消費量
  avgConsumptionRate: number; // 平均摂食率
  lastServedDate?: string; // 最終提供日
  lastServedBy?: string; // 最終提供者
}

/**
 * 品物（Firestore: care_items/{itemId}）
 */
export interface CareItem {
  // 識別情報
  id: string;
  residentId: string;
  userId: string;

  // 食品マスタ参照（将来用）
  foodMasterId?: string;

  // 品物基本情報（家族が入力）
  itemName: string;
  /** 統計用の基準品目名（例: 「森永プリン」→「プリン」）。未設定時はitemNameを使用 */
  normalizedName?: string;
  category: ItemCategory;
  sentDate?: string; // YYYY-MM-DD（オプショナル - UI非表示）
  quantity: number; // 旧: 互換性のため残す
  unit: string;
  expirationDate?: string; // YYYY-MM-DD
  storageMethod?: StorageMethod;

  // 在庫情報（Phase 9.2 追加）
  initialQuantity?: number; // 初期数量
  currentQuantity?: number; // 現在の残量★自動更新

  // 提供希望（家族が入力）
  servingMethod: ServingMethod;
  servingMethodDetail?: string;
  preferredServingSchedule?: string; // 提供希望スケジュール（テキスト・後方互換）
  plannedServeDate?: string; // YYYY-MM-DD（後方互換）
  servingSchedule?: ServingSchedule; // 構造化スケジュール（Phase 13.1）
  noteToStaff?: string;

  // 提供記録（スタッフが入力）- 旧: 互換性のため残す
  actualServeDate?: string;
  servedQuantity?: number;
  servedBy?: string;

  // 摂食記録（スタッフが入力）- 旧: 互換性のため残す
  consumptionRate?: number; // 0-100
  consumptionStatus?: ConsumptionStatus;
  consumptionNote?: string;
  recordedBy?: string;

  // 申し送り（スタッフ→家族）
  noteToFamily?: string;

  // 集計キャッシュ（Phase 9.2 追加）
  consumptionSummary?: ConsumptionSummary;

  // ステータス・メタ情報
  status: ItemStatus;
  remainingQuantity: number; // 旧: 互換性のため残す
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Phase 38.2: 廃棄関連（オプション）
  discardedAt?: string; // 廃棄日時（ISO8601）
  discardedBy?: string; // 廃棄実行者
  discardReason?: string; // 廃棄理由

  // Phase 49: 廃棄指示フロー（家族→スタッフ）
  discardRequestedAt?: string; // 廃棄指示日時（ISO8601）
  discardRequestedBy?: string; // 廃棄指示者（家族）

  // 残り対応の実績履歴
  remainingHandlingLogs?: RemainingHandlingLog[];
}

/** 家族が入力する品物登録フォーム */
export interface CareItemInput {
  itemName: string;
  /** 統計用の基準品目名（例: 「森永プリン」→「プリン」）。未設定時はitemNameを使用 */
  normalizedName?: string;
  category: ItemCategory;
  sentDate?: string; // オプショナル - UI非表示
  quantity: number;
  unit: string;
  expirationDate?: string;
  storageMethod?: StorageMethod;
  servingMethod: ServingMethod;
  servingMethodDetail?: string;
  plannedServeDate?: string;
  servingSchedule?: ServingSchedule; // 構造化スケジュール（Phase 13.1）
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
  itemId?: string; // 単一品物取得用
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
// 消費ログ (Phase 9.2)
// =============================================================================

/** 食事時間帯 */
export type MealTime = "breakfast" | "lunch" | "dinner" | "snack";

/** 残った分への対応 (Phase 15.6) */
export type RemainingHandling = "discarded" | "stored" | "other";

/**
 * 消費ログ（Firestore: care_items/{itemId}/consumption_logs/{logId}）
 */
export interface ConsumptionLog {
  // 識別情報
  id: string;
  itemId: string;

  // 提供情報
  servedDate: string; // YYYY-MM-DD
  servedTime?: string; // HH:mm
  mealTime?: MealTime;
  servedQuantity: number;
  servedBy: string;

  // 摂食情報
  consumedQuantity: number;
  consumptionRate: number; // 0-100
  consumptionStatus: ConsumptionStatus;

  // Phase 15.7: 残り対応による在庫・統計分離
  remainingHandling?: RemainingHandling;
  remainingHandlingOther?: string;
  inventoryDeducted?: number; // 在庫から引いた量
  wastedQuantity?: number; // 廃棄量（破棄時のみ）

  // 残量情報
  quantityBefore: number;
  quantityAfter: number;

  // 特記事項・申し送り
  consumptionNote?: string;
  noteToFamily?: string;

  // 家族指示対応（間食記録連携用）
  followedInstruction?: boolean; // 家族指示に従ったか
  instructionNote?: string; // 指示対応メモ
  linkedMealRecordId?: string; // 食事記録の投稿ID（Sheet Bとの紐づけ）
  sourceType?: "meal_form" | "item_detail" | "task"; // 記録元

  // メタ情報
  recordedBy: string;
  recordedAt: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

/** 消費ログ記録リクエスト */
export interface RecordConsumptionLogRequest {
  itemId: string;
  servedDate: string; // YYYY-MM-DD
  servedTime?: string; // HH:mm
  mealTime?: MealTime;
  servedQuantity: number;
  servedBy: string;
  consumedQuantity: number;
  consumptionStatus: ConsumptionStatus;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
  // Phase 15.7: 残り対応
  remainingHandling?: RemainingHandling;
  remainingHandlingOther?: string;
}

/** 消費ログ記録レスポンス */
export interface RecordConsumptionLogResponse {
  logId: string;
  itemId: string;
  currentQuantity: number; // 更新後の残量
  status: ItemStatus; // 更新後のステータス
  // Phase 15.7: 追加フィールド
  inventoryDeducted?: number; // 在庫から引いた量
  wastedQuantity?: number; // 廃棄量
}

/** 消費ログ一覧取得リクエスト */
export interface GetConsumptionLogsRequest {
  itemId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/** 消費ログ一覧取得レスポンス */
export interface GetConsumptionLogsResponse {
  logs: ConsumptionLog[];
  total: number;
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
  | "custom" // カスタムタスク
  | "item_created" // 品物新規登録（Phase 55）
  | "item_updated" // 品物編集（Phase 55）
  | "item_deleted"; // 品物削除（Phase 55）

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

// =============================================================================
// AI分析 Types (Phase 8.4 - aiAnalyze)
// docs/AI_INTEGRATION_SPEC.md セクション3.2 に基づく型定義
// =============================================================================

/** 分析タイプ */
export type AIAnalysisType = "consumption" | "prediction" | "care_suggestion";

/** 分析用摂食レコード（入力用簡略化形式） */
export interface AIConsumptionRecord {
  date: string;
  itemName: string;
  category: string;
  rate: number;
}

/** 分析用食事レコード（入力用簡略化形式） */
export interface AIMealRecord {
  date: string;
  mealTime: string;
  mainDishRate: number;
  sideDishRate: number;
}

/** AI分析リクエスト */
export interface AIAnalyzeRequest {
  residentId: string;
  analysisType: AIAnalysisType;
  period: {
    startDate: string;
    endDate: string;
  };
  data?: {
    consumptionRecords?: AIConsumptionRecord[];
    mealRecords?: AIMealRecord[];
    itemRecords?: CareItem[];
  };
}

/** 発見事項タイプ */
export type FindingType = "positive" | "negative" | "neutral";

/** 発見事項 */
export interface AIFinding {
  type: FindingType;
  title: string;
  description: string;
  metric?: {
    current: number;
    previous?: number;
    change?: number;
  };
}

/** 改善提案優先度 */
export type SuggestionPriority = "high" | "medium" | "low";

/** 改善提案 */
export interface AISuggestion {
  priority: SuggestionPriority;
  title: string;
  description: string;
  relatedItemName?: string;
}

/** AI分析結果データ */
export interface AIAnalysisData {
  analysisType: AIAnalysisType;
  summary: string;
  findings: AIFinding[];
  suggestions: AISuggestion[];
  alerts?: Alert[];
}

/** AI分析レスポンス */
export interface AIAnalyzeResponse {
  analysisType: AIAnalysisType;
  summary: string;
  findings: AIFinding[];
  suggestions: AISuggestion[];
}

/** AI分析のデフォルト値（フォールバック用） */
export const DEFAULT_AI_ANALYSIS: AIAnalyzeResponse = {
  analysisType: "consumption",
  summary: "データが不足しているため、詳細な分析ができませんでした。",
  findings: [],
  suggestions: [],
};

// =============================================================================
// プリセット統合 Types (Phase 8.5)
// docs/AI_INTEGRATION_SPEC.md セクション9 に基づく型定義
// =============================================================================

/** プリセットマッチタイプ */
export type PresetMatchType = "category" | "itemName" | "keyword";

/** プリセット候補取得リクエスト */
export interface GetPresetSuggestionsRequest {
  residentId: string;
  itemName: string;
  category?: ItemCategory;
}

/** プリセット候補（マッチ結果） */
export interface PresetSuggestion {
  presetId: string;
  presetName: string;
  matchReason: string;
  matchType: PresetMatchType;
  confidence: number;
  // 指示内容（品物登録フォームのservingMethodDetailに適用）
  processingDetail: string;
  // @deprecated 旧形式（後方互換性のため保持）
  instruction?: {
    title: string;
    content: string;
    servingMethod?: ServingMethod;
    servingDetail?: string;
  };
  source?: PresetSource; // 出所追跡（Phase 8.6追加）
}

/** プリセット候補取得レスポンス */
export interface GetPresetSuggestionsResponse {
  suggestions: PresetSuggestion[];
}

/** カテゴリラベル（Phase 31: 2カテゴリに簡素化） */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: "食べ物",
  drink: "飲み物",
};

/** 旧カテゴリを新カテゴリに変換（後方互換性用） */
export function migrateCategory(category: string): ItemCategory {
  if (category === "drink") return "drink";
  return "food";
}

/** カテゴリラベルを取得（旧カテゴリも対応） */
export function getCategoryLabel(category: string): string {
  const migrated = migrateCategory(category);
  return CATEGORY_LABELS[migrated];
}

// =============================================================================
// プリセット管理 Types (Phase 8.6)
// docs/PRESET_MANAGEMENT_SPEC.md に基づく型定義
// =============================================================================

/** プリセット出所 */
export type PresetSource = "manual" | "ai";

/** AI出所情報（AIから保存されたプリセット用） */
export interface AISourceInfo {
  originalItemName: string;
  originalSuggestion: {
    expirationDays: number;
    storageMethod: StorageMethod;
    servingMethods: ServingMethod[];
    notes?: string;
  };
  savedAt: string; // ISO8601
}

/**
 * ケア指示プリセット（Firestore: care_presets/{presetId}）
 * 家族が作成した「いつもの指示」パターン
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */
export interface CarePreset {
  // 識別情報
  id: string;
  residentId: string;

  // 基本情報
  name: string;
  icon?: string;

  // 品物登録フォームへの適用値
  itemCategory?: ItemCategory; // 食べ物/飲み物
  storageMethod?: StorageMethod; // 保存方法
  servingMethod?: ServingMethod; // 提供方法
  servingMethodDetail?: string; // 提供方法の詳細
  noteToStaff?: string; // スタッフへの申し送り
  remainingHandlingInstruction?: RemainingHandlingInstruction; // 残った場合の処置

  // @deprecated 旧フィールド（後方互換性）
  category?: string;
  processingDetail?: string; // → servingMethodDetailに統合
  instruction?: {
    content: string;
    servingMethod?: ServingMethod;
    servingDetail?: string;
  };

  // マッチング設定
  matchConfig: {
    keywords: string[];
    categories?: ItemCategory[];
    exactMatch?: boolean;
  };

  // 出所追跡
  source: PresetSource;
  aiSourceInfo?: AISourceInfo;

  // ステータス・統計
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;

  // メタ情報
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

/** プリセット作成入力 */
export interface CarePresetInput {
  name: string;
  icon?: string;

  // 品物フォームへの適用値
  itemCategory?: ItemCategory;
  storageMethod?: StorageMethod;
  servingMethod?: ServingMethod;
  servingMethodDetail?: string;
  noteToStaff?: string;
  remainingHandlingInstruction?: RemainingHandlingInstruction;

  // マッチング設定
  matchConfig: {
    keywords: string[];
    categories?: ItemCategory[];
    exactMatch?: boolean;
  };

  // @deprecated 旧フィールド（後方互換性）
  category?: string;
  processingDetail?: string;
  instruction?: {
    content: string;
    servingMethod?: ServingMethod;
    servingDetail?: string;
  };
}

// === プリセット管理 APIリクエスト/レスポンス型 ===

/** プリセット一覧取得リクエスト */
export interface GetPresetsRequest {
  residentId: string;
  category?: string;
  source?: PresetSource;
  activeOnly?: boolean;
}

/** プリセット一覧取得レスポンス */
export interface GetPresetsResponse {
  presets: CarePreset[];
}

/** プリセット作成リクエスト */
export interface CreatePresetRequest {
  residentId: string;
  userId: string;
  preset: CarePresetInput;
  source?: PresetSource;
}

/** プリセット作成レスポンス */
export interface CreatePresetResponse {
  presetId: string;
  createdAt: string;
}

/** プリセット更新リクエスト */
export interface UpdatePresetRequest {
  presetId: string;
  updates: Partial<CarePresetInput> & { isActive?: boolean };
}

/** プリセット更新レスポンス */
export interface UpdatePresetResponse {
  presetId: string;
  updatedAt: string;
}

/** プリセット削除リクエスト */
export interface DeletePresetRequest {
  presetId: string;
}

// =============================================================================
// AI自動ストック Types (Phase 8.7)
// docs/AI_INTEGRATION_SPEC.md セクション10 に基づく型定義
// =============================================================================

/** AI提案をプリセットとして保存リクエスト */
export interface SaveAISuggestionAsPresetRequest {
  residentId: string;
  userId: string;
  itemName: string;
  presetName: string;
  /** @deprecated カテゴリは廃止（後方互換性のため保持） */
  category?: string;
  icon?: string;
  aiSuggestion: AISuggestResponse;
  keywords?: string[];
  itemCategories?: ItemCategory[];
}

/** AI提案をプリセットとして保存レスポンス */
export interface SaveAISuggestionAsPresetResponse {
  presetId: string;
  createdAt: string;
}

// =============================================================================
// 禁止ルール Types (Phase 9.x)
// docs/ITEM_MANAGEMENT_SPEC.md セクション8 に基づく型定義
// =============================================================================

/**
 * 禁止ルール（提供禁止品目）
 * Firestore: residents/{residentId}/prohibitions/{prohibitionId}
 *
 * プリセット（品物の提供方法）とは別概念：
 * - プリセット: 「何を・どう提供するか」の指示
 * - 禁止ルール: 「何を提供しないか」の制約
 */
export interface ProhibitionRule {
  // 識別情報
  id: string;
  residentId: string;

  // ルール内容
  itemName: string; // 禁止品目名（例: 「七福のお菓子」）
  category?: ItemCategory; // カテゴリ（任意、絞り込み用）
  reason?: string; // 禁止理由（例: 「糖分過多のため」）

  // メタ情報
  createdBy: string; // 設定した家族ID
  createdAt: Timestamp; // 設定日時
  updatedAt: Timestamp; // 更新日時
  isActive: boolean; // 有効フラグ（無効化可能）
}

/** 禁止ルール作成入力 */
export interface ProhibitionRuleInput {
  itemName: string;
  category?: ItemCategory;
  reason?: string;
}

// === 禁止ルール APIリクエスト/レスポンス型 ===

/** 禁止ルール一覧取得リクエスト */
export interface GetProhibitionsRequest {
  residentId: string;
  activeOnly?: boolean;
}

/** 禁止ルール一覧取得レスポンス */
export interface GetProhibitionsResponse {
  prohibitions: ProhibitionRule[];
  total: number;
}

/** 禁止ルール作成リクエスト */
export interface CreateProhibitionRequest {
  residentId: string;
  userId: string;
  prohibition: ProhibitionRuleInput;
}

/** 禁止ルール作成レスポンス */
export interface CreateProhibitionResponse {
  prohibitionId: string;
  createdAt: string;
}

/** 禁止ルール更新リクエスト */
export interface UpdateProhibitionRequest {
  residentId: string;
  prohibitionId: string;
  updates: Partial<ProhibitionRuleInput> & { isActive?: boolean };
}

/** 禁止ルール更新レスポンス */
export interface UpdateProhibitionResponse {
  prohibitionId: string;
  updatedAt: string;
}

/** 禁止ルール削除リクエスト */
export interface DeleteProhibitionRequest {
  residentId: string;
  prohibitionId: string;
}

// =============================================================================
// 在庫サマリー Types (Phase 9.3)
// docs/INVENTORY_CONSUMPTION_SPEC.md セクション4.3 に基づく型定義
// =============================================================================

/** 在庫サマリーアイテム */
export interface InventorySummaryItem {
  // 品物基本情報
  itemId: string;
  itemName: string;
  category: ItemCategory;

  // 在庫状況
  initialQuantity: number;
  currentQuantity: number;
  unit: string;
  consumedQuantity: number;
  consumptionPercentage: number;

  // 期限情報
  expirationDate?: string;
  daysUntilExpiration?: number;
  isExpiringSoon: boolean;
  isExpired: boolean;

  // 摂食傾向
  avgConsumptionRate: number;
  totalServings: number;

  // ステータス
  status: ItemStatus;

  // 最新の申し送り
  latestNoteToFamily?: string;
  latestNoteDate?: string;
}

/** 在庫サマリー集計 */
export interface InventorySummaryTotals {
  totalItems: number;
  pendingCount: number;
  inProgressCount: number;
  consumedCount: number;
  expiredCount: number;
  expiringSoonCount: number;
}

/** 在庫サマリー取得リクエスト */
export interface GetInventorySummaryRequest {
  residentId?: string;
  status?: ItemStatus | ItemStatus[];
  includeExpiringSoon?: boolean;
}

/** 在庫サマリー取得レスポンス */
export interface GetInventorySummaryResponse {
  items: InventorySummaryItem[];
  totals: InventorySummaryTotals;
}

// =============================================================================
// 食品統計 Types (Phase 9.3)
// docs/INVENTORY_CONSUMPTION_SPEC.md セクション4.4 に基づく型定義
// =============================================================================

/** 食品ランキングアイテム */
export interface FoodRankingItem {
  foodName: string;
  avgConsumptionRate: number;
  totalServings: number;
  wastedQuantity?: number;
}

/** カテゴリ別統計 */
export interface CategoryStats {
  category: ItemCategory;
  avgConsumptionRate: number;
  totalItems: number;
  totalServings: number;
}

/** 食品統計取得リクエスト */
export interface GetFoodStatsRequest {
  residentId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

/** 食品統計取得レスポンス */
export interface GetFoodStatsResponse {
  mostPreferred: FoodRankingItem[];
  leastPreferred: FoodRankingItem[];
  categoryStats: CategoryStats[];
}

// =============================================================================
// 摂食傾向 Types (Phase 9.3)
// docs/STATS_DASHBOARD_SPEC.md セクション4 に基づく型定義
// =============================================================================

/** 摂食率推移データポイント */
export interface ConsumptionTrendPoint {
  date: string;
  averageRate: number;
  recordCount: number;
}

/** 摂食傾向統計データ（拡張版） */
export interface ConsumptionTrendData {
  // 摂食率推移
  trend: ConsumptionTrendPoint[];

  // 品目別ランキング
  topItems: ItemRankingEntry[];
  bottomItems: ItemRankingEntry[];

  // 食事摂取傾向（既存記録から）
  mealTrend?: {
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
  };

  // サマリ
  summary: ConsumptionStatsSummary;
}

// =============================================================================
// FoodMaster Types (Phase 11)
// docs/INVENTORY_CONSUMPTION_SPEC.md セクション2.2 に基づく型定義
// =============================================================================

/** 食品マスタ統計データ */
export interface FoodMasterStats {
  totalServed: number; // 累計提供回数
  totalConsumed: number; // 累計消費量
  avgConsumptionRate: number; // 平均摂食率（0-100）
  preferenceScore: number; // 好み度スコア（0-100）
  wasteRate: number; // 廃棄率（0-100）
  lastUpdated?: string; // ISO8601
}

/**
 * FoodMaster - 食品マスタ
 * 正規化された食品情報と統計データを管理
 * Firestore: food_masters/{foodId}
 */
export interface FoodMaster {
  // === 識別情報 ===
  id: string;

  // === 基本情報 ===
  name: string; // 正規化された食品名（例: "バナナ"）
  aliases: string[]; // 別名（"ばなな", "banana", "バナナ（フィリピン産）"）
  category: ItemCategory; // カテゴリ

  // === デフォルト値（AI提案のベース）===
  defaultUnit: string; // デフォルト単位（房、個、本、袋）
  defaultExpirationDays: number; // 平均賞味期限（日）
  defaultStorageMethod: StorageMethod; // 推奨保存方法
  defaultServingMethods: ServingMethod[]; // 推奨提供方法

  // === 注意事項 ===
  careNotes?: string; // ケア時の注意点（誤嚥リスク等）
  allergyInfo?: string; // アレルギー情報

  // === 統計データ（定期バッチで更新）===
  stats: FoodMasterStats;

  // === メタ情報 ===
  isActive: boolean; // 有効フラグ
  source: "manual" | "ai"; // 登録ソース（手動 or AI自動生成）
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

/** FoodMaster作成入力 */
export interface FoodMasterInput {
  name: string;
  aliases?: string[];
  category: ItemCategory;
  defaultUnit: string;
  defaultExpirationDays: number;
  defaultStorageMethod: StorageMethod;
  defaultServingMethods: ServingMethod[];
  careNotes?: string;
  allergyInfo?: string;
  source?: "manual" | "ai";
}

/** FoodMaster更新入力 */
export interface FoodMasterUpdateInput {
  name?: string;
  aliases?: string[];
  category?: ItemCategory;
  defaultUnit?: string;
  defaultExpirationDays?: number;
  defaultStorageMethod?: StorageMethod;
  defaultServingMethods?: ServingMethod[];
  careNotes?: string;
  allergyInfo?: string;
  isActive?: boolean;
}

/** FoodMaster検索リクエスト */
export interface SearchFoodMasterRequest {
  query: string; // 検索クエリ（名前・別名でマッチ）
  category?: ItemCategory; // カテゴリ絞り込み
  limit?: number; // 結果上限
}

/** FoodMaster一覧取得リクエスト */
export interface GetFoodMastersRequest {
  category?: ItemCategory;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/** FoodMaster一覧取得レスポンス */
export interface GetFoodMastersResponse {
  items: FoodMaster[];
  total: number;
  hasMore: boolean;
}

// =============================================================================
// スケジュール拡張 Types (Phase 13.1)
// docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3 に基づく型定義
// =============================================================================

/** 提供タイミング */
export type ServingTimeSlot =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "anytime";

/** スケジュールタイプ */
export type ScheduleType = "once" | "daily" | "weekly" | "specific_dates";

/**
 * 提供スケジュール
 * @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3.2
 */
export interface ServingSchedule {
  type: ScheduleType;

  /** type = 'once' の場合: 特定の日付 (YYYY-MM-DD) */
  date?: string;

  /** type = 'weekly' の場合: 曜日リスト (0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土) */
  weekdays?: number[];

  /** type = 'specific_dates' の場合: 複数日付リスト (YYYY-MM-DD[]) */
  dates?: string[];

  /** 共通: 開始日 (YYYY-MM-DD) - daily/weeklyタイプでのみ使用 */
  startDate?: string;

  /** 共通: 提供タイミング */
  timeSlot?: ServingTimeSlot;

  /** 共通: 補足（自由記述） */
  note?: string;
}

// =============================================================================
// チャット連携 Types (Phase 18)
// docs/CHAT_INTEGRATION_SPEC.md に基づく型定義
// =============================================================================

/** メッセージタイプ */
export type MessageType = "text" | "record" | "system";

/** 送信者タイプ */
export type SenderType = "staff" | "family";

/** 通知タイプ */
export type NotificationType = "new_message" | "record_added" | "item_expiring";

/** 通知対象タイプ */
export type NotificationTargetType = "staff" | "family" | "both";

/**
 * チャットメッセージ
 * Firestore: residents/{residentId}/items/{itemId}/messages/{messageId}
 */
export interface ChatMessage {
  // 識別情報
  id: string;
  type: MessageType;

  // 送信者情報
  senderType: SenderType;
  senderName: string;

  // メッセージ内容
  content: string;
  recordData?: SnackRecord; // type='record'の場合の記録データ

  // 既読管理
  readByStaff: boolean;
  readByFamily: boolean;

  // 関連データ（オプション）
  photoUrl?: string;
  linkedRecordId?: string; // 関連する記録ID

  // メタ情報
  createdAt: Timestamp;
}

/**
 * 品物のチャット拡張フィールド
 * CareItemに追加されるチャット関連フィールド
 */
export interface CareItemChatExtension {
  hasMessages: boolean; // チャットが開始されているか
  unreadCountStaff: number; // スタッフ未読数
  unreadCountFamily: number; // 家族未読数
  lastMessageAt?: Timestamp; // 最終メッセージ日時
  lastMessagePreview?: string; // 最終メッセージのプレビュー
}

/**
 * 通知
 * Firestore: residents/{residentId}/notifications/{notificationId}
 */
export interface ChatNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;

  targetType: NotificationTargetType;
  read: boolean;

  // リンク先
  linkTo: string; // e.g., '/staff/family-messages/item-123/chat'

  // 関連データ
  relatedItemId?: string;
  relatedItemName?: string;

  createdAt: Timestamp;
}

// === チャットAPI リクエスト/レスポンス型 ===

/** メッセージ送信リクエスト */
export interface SendMessageRequest {
  residentId: string;
  itemId: string;
  senderType: SenderType;
  senderName: string;
  content: string;
  type?: MessageType; // デフォルト: 'text'
  recordData?: SnackRecord;
  photoUrl?: string;
}

/** メッセージ送信レスポンス */
export interface SendMessageResponse {
  messageId: string;
  createdAt: string;
}

/** メッセージ取得リクエスト */
export interface GetMessagesRequest {
  residentId: string;
  itemId: string;
  limit?: number; // デフォルト: 50
  before?: string; // ページネーション用（ISO8601）
}

/** メッセージ取得レスポンス */
export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

/** 既読マークリクエスト */
export interface MarkAsReadRequest {
  residentId: string;
  itemId: string;
  readerType: SenderType;
}

/** 既読マークレスポンス */
export interface MarkAsReadResponse {
  markedCount: number;
}

/** 通知取得リクエスト */
export interface GetNotificationsRequest {
  residentId: string;
  targetType: SenderType;
  limit?: number; // デフォルト: 20
  unreadOnly?: boolean;
}

/** 通知取得レスポンス */
export interface GetNotificationsResponse {
  notifications: ChatNotification[];
  unreadCount: number;
}

/** アクティブチャット一覧取得リクエスト */
export interface GetActiveChatItemsRequest {
  residentId: string;
  userType: SenderType;
  limit?: number;
}

/** アクティブチャット一覧取得レスポンス */
export interface GetActiveChatItemsResponse {
  items: (CareItem & CareItemChatExtension)[];
  total: number;
}

// =============================================================================
// スタッフ注意事項 Types (Phase 40)
// スタッフ専用の注意事項管理機能
// =============================================================================

/** 注意事項の優先度 */
export type StaffNotePriority = "critical" | "warning" | "normal";

/** 注意事項の優先度設定 */
export const STAFF_NOTE_PRIORITIES: {
  value: StaffNotePriority;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}[] = [
  {value: "critical", label: "重要", icon: "🔴", color: "text-red-700", bgColor: "bg-red-50"},
  {value: "warning", label: "注意", icon: "⚠️", color: "text-yellow-700", bgColor: "bg-yellow-50"},
  {value: "normal", label: "通常", icon: "○", color: "text-green-700", bgColor: "bg-green-50"},
];

/**
 * スタッフ注意事項（Firestore: staffNotes/{noteId}）
 * スタッフ専用の注意事項・申し送り
 */
export interface StaffNote {
  // 識別情報
  id: string;

  // 内容
  content: string;
  priority: StaffNotePriority;

  // 期間設定（warning/normalのみ必須、criticalは不要）
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD

  // メタ情報
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** 注意事項作成入力 */
export interface StaffNoteInput {
  content: string;
  priority: StaffNotePriority;
  startDate?: string;
  endDate?: string;
  createdBy: string;
}

// === スタッフ注意事項 APIリクエスト/レスポンス型 ===

/** 注意事項一覧取得リクエスト */
export interface GetStaffNotesRequest {
  includeAll?: boolean; // 期間外も含めるか（デフォルト: false）
}

/** 注意事項一覧取得レスポンス */
export interface GetStaffNotesResponse {
  notes: StaffNote[];
  total: number;
}

/** 注意事項作成リクエスト */
export interface CreateStaffNoteRequest {
  content: string;
  priority: StaffNotePriority;
  startDate?: string;
  endDate?: string;
  createdBy: string;
}

/** 注意事項作成レスポンス */
export interface CreateStaffNoteResponse {
  noteId: string;
  createdAt: string;
}

/** 注意事項更新リクエスト */
export interface UpdateStaffNoteRequest {
  noteId: string;
  updates: {
    content?: string;
    priority?: StaffNotePriority;
    startDate?: string;
    endDate?: string;
  };
}

/** 注意事項更新レスポンス */
export interface UpdateStaffNoteResponse {
  noteId: string;
  updatedAt: string;
}

/** 注意事項削除リクエスト */
export interface DeleteStaffNoteRequest {
  noteId: string;
}

// =============================================================================
// AIチャットボット Types (Phase 45)
// =============================================================================

/** チャットメッセージ（会話履歴用） */
export interface RecordChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

/** チャットリクエスト */
export interface ChatWithRecordsRequest {
  message: string;
  context: {
    sheetName?: string;
    year?: number;
    month?: number | null;
  };
  conversationHistory?: RecordChatMessage[];
}

/** チャットレスポンス */
export interface ChatWithRecordsResponse {
  message: string;
  sources?: { sheetName: string; recordCount: number }[];
  suggestedQuestions?: string[];
}

// =============================================================================
// 階層的要約 Types (Phase 46)
// =============================================================================

/** 要約タイプ */
export type SummaryType = "daily" | "weekly" | "monthly";

/** シート別サマリー（Phase 46要約用） */
export interface SummarySheetInfo {
  sheetName: string;
  summary: string;
  recordCount: number;
}

/** 相関分析結果 */
export interface CorrelationResult {
  pattern: string; // "頓服→排便"
  observation: string; // "頓服服用翌日に排便あり: 3/3回"
  confidence: "high" | "medium" | "low";
}

/** 要約ドキュメント */
export interface PlanDataSummary {
  id: string; // "2025-12" (月次) / "2025-W52" (週次) / "2025-12-29" (日次)
  type: SummaryType;

  // 対象範囲
  periodStart: string; // ISO日付
  periodEnd: string;

  // 要約内容
  summary: string;
  keyInsights: string[];

  // シート別サマリー（オプション）
  sheetSummaries?: SummarySheetInfo[];

  // 相関分析結果（オプション）
  correlations?: CorrelationResult[];

  // 関連日付（詳細検索用）
  relatedDates: string[];

  // メタデータ
  sourceRecordCount: number;
  generatedAt: Timestamp;
  generatedBy: "gemini-flash" | "gemini-flash-lite";
}

/** 要約取得リクエスト */
export interface GetSummariesRequest {
  type?: SummaryType;
  from?: string; // ISO日付
  to?: string;
  limit?: number;
}

/** 要約取得レスポンス */
export interface GetSummariesResponse {
  summaries: PlanDataSummary[];
  totalCount: number;
}

/** 要約生成リクエスト */
export interface GenerateSummaryRequest {
  type: SummaryType;
  date: string; // YYYY-MM-DD / YYYY-Www / YYYY-MM
  forceRegenerate?: boolean;
}

/** 要約生成レスポンス */
export interface GenerateSummaryResponse {
  summary: PlanDataSummary;
  generated: boolean;
  processingTime: number;
}
