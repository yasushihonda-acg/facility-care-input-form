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
export interface SubmitMealRecordRequest {
  staffName: string;
  facility: string;
  residentName: string;
  dayServiceUsage: '利用中' | '利用中ではない';
  mealTime: '朝' | '昼' | '夜';
  isImportant: '重要' | '重要ではない';
  dayServiceName?: string;
  mainDishRatio?: string;
  sideDishRatio?: string;
  injectionType?: string;
  injectionAmount?: string;
  snack?: string;
  note?: string;
}

// submitMealRecord response
export interface SubmitMealRecordResponse {
  postId: string;
  sheetRow: number;
}

// 食事入力フォームのグローバル初期値設定
export interface MealFormSettings {
  defaultFacility: string;
  defaultResidentName: string;
  defaultDayServiceName: string;
  updatedAt: string;
}

// 設定更新リクエスト
export interface UpdateMealFormSettingsRequest {
  defaultFacility?: string;
  defaultResidentName?: string;
  defaultDayServiceName?: string;
}
