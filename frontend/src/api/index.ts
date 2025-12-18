import type {
  ApiResponse,
  SyncPlanDataResponse,
  GetPlanDataResponse,
  SubmitMealRecordRequest,
  SubmitMealRecordResponse,
  MealFormSettings,
  UpdateMealFormSettingsRequest,
} from '../types';

const API_BASE = 'https://asia-northeast1-facility-care-input-form.cloudfunctions.net';

export async function syncPlanData(): Promise<ApiResponse<SyncPlanDataResponse>> {
  const response = await fetch(`${API_BASE}/syncPlanData`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ triggeredBy: 'manual' }),
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getPlanData(sheetName?: string): Promise<ApiResponse<GetPlanDataResponse>> {
  const url = new URL(`${API_BASE}/getPlanData`);
  if (sheetName) {
    url.searchParams.set('sheetName', sheetName);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to get data: ${response.statusText}`);
  }

  return response.json();
}

export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/healthCheck`);
  return response.json();
}

export async function submitMealRecord(
  data: SubmitMealRecordRequest
): Promise<ApiResponse<SubmitMealRecordResponse>> {
  const response = await fetch(`${API_BASE}/submitMealRecord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Submit failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食事入力フォームのグローバル初期値設定を取得
 * 全ユーザーがアクセス可能
 */
export async function getMealFormSettings(): Promise<ApiResponse<MealFormSettings>> {
  const response = await fetch(`${API_BASE}/getMealFormSettings`);

  if (!response.ok) {
    throw new Error(`Failed to get settings: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食事入力フォームのグローバル初期値設定を更新
 * admin=true クエリパラメータが必須
 */
export async function updateMealFormSettings(
  data: UpdateMealFormSettingsRequest
): Promise<ApiResponse<MealFormSettings>> {
  const response = await fetch(`${API_BASE}/updateMealFormSettings?admin=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Update failed: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// 管理者テスト機能
// =============================================================================

export interface TestWebhookResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface TestDriveAccessResponse {
  success: boolean;
  message: string;
  folderName?: string;
  error?: string;
  advice?: string; // v1.1: 親切なアドバイス
}

/**
 * Webhook URLのテスト送信
 * 指定されたURLにテストメッセージを送信
 */
export async function testWebhook(webhookUrl: string): Promise<TestWebhookResponse> {
  const response = await fetch(`${API_BASE}/testWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl }),
  });

  const data = await response.json();
  return data as TestWebhookResponse;
}

/**
 * Google DriveフォルダIDのアクセステスト
 * 指定されたフォルダへのアクセス権限を確認
 */
export async function testDriveAccess(folderId: string): Promise<TestDriveAccessResponse> {
  const response = await fetch(`${API_BASE}/testDriveAccess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId }),
  });

  const data = await response.json();
  return data as TestDriveAccessResponse;
}

// =============================================================================
// 品物管理 API（Phase 8.1）
// =============================================================================

import type {
  CareItem,
  CareItemInput,
  SubmitCareItemResponse,
  GetCareItemsResponse,
  ItemStatus,
  ItemCategory,
} from '../types/careItem';

export type { CareItem, CareItemInput };

/**
 * 品物を登録（家族用）
 */
export async function submitCareItem(
  residentId: string,
  userId: string,
  item: CareItemInput
): Promise<ApiResponse<SubmitCareItemResponse>> {
  const response = await fetch(`${API_BASE}/submitCareItem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ residentId, userId, item }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Submit failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 品物一覧を取得
 */
export interface GetCareItemsParams {
  residentId?: string;
  userId?: string;
  status?: ItemStatus | ItemStatus[];
  category?: ItemCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export async function getCareItems(
  params: GetCareItemsParams = {}
): Promise<ApiResponse<GetCareItemsResponse>> {
  const url = new URL(`${API_BASE}/getCareItems`);

  if (params.residentId) url.searchParams.set('residentId', params.residentId);
  if (params.userId) url.searchParams.set('userId', params.userId);
  if (params.status) {
    if (Array.isArray(params.status)) {
      params.status.forEach(s => url.searchParams.append('status', s));
    } else {
      url.searchParams.set('status', params.status);
    }
  }
  if (params.category) url.searchParams.set('category', params.category);
  if (params.startDate) url.searchParams.set('startDate', params.startDate);
  if (params.endDate) url.searchParams.set('endDate', params.endDate);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.offset) url.searchParams.set('offset', params.offset.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get items: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 品物を更新
 */
export async function updateCareItem(
  itemId: string,
  updates: Partial<CareItem>
): Promise<ApiResponse<{ itemId: string; updatedAt: string }>> {
  const response = await fetch(`${API_BASE}/updateCareItem`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemId, updates }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Update failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 品物を削除
 */
export async function deleteCareItem(
  itemId: string
): Promise<ApiResponse<null>> {
  const response = await fetch(`${API_BASE}/deleteCareItem?itemId=${itemId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Delete failed: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// タスク管理 API（Phase 8.2）
// =============================================================================

import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  CreateTaskInput,
  UpdateTaskInput,
  GetTasksParams,
  GetTasksResponse,
  CreateTaskResponse,
  UpdateTaskResponse,
} from '../types/task';

export type { Task, TaskStatus, TaskPriority, TaskType, CreateTaskInput, UpdateTaskInput, GetTasksParams };

/**
 * タスクを作成
 */
export async function createTask(
  input: CreateTaskInput & { createdBy?: string }
): Promise<ApiResponse<CreateTaskResponse>> {
  const response = await fetch(`${API_BASE}/createTask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Create task failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * タスク一覧を取得
 */
export async function getTasks(
  params: GetTasksParams = {}
): Promise<ApiResponse<GetTasksResponse>> {
  const url = new URL(`${API_BASE}/getTasks`);

  if (params.residentId) url.searchParams.set('residentId', params.residentId);
  if (params.status) {
    if (Array.isArray(params.status)) {
      params.status.forEach(s => url.searchParams.append('status', s));
    } else {
      url.searchParams.set('status', params.status);
    }
  }
  if (params.taskType) url.searchParams.set('taskType', params.taskType);
  if (params.priority) url.searchParams.set('priority', params.priority);
  if (params.dueDate) url.searchParams.set('dueDate', params.dueDate);
  if (params.dueDateStart) url.searchParams.set('dueDateStart', params.dueDateStart);
  if (params.dueDateEnd) url.searchParams.set('dueDateEnd', params.dueDateEnd);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.offset) url.searchParams.set('offset', params.offset.toString());
  if (params.sortBy) url.searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) url.searchParams.set('sortOrder', params.sortOrder);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get tasks: ${response.statusText}`);
  }

  return response.json();
}

/**
 * タスクを更新
 */
export async function updateTask(
  taskId: string,
  updates: UpdateTaskInput,
  completedBy?: string
): Promise<ApiResponse<UpdateTaskResponse>> {
  const response = await fetch(`${API_BASE}/updateTask`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, updates, completedBy }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Update task failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * タスクを削除
 */
export async function deleteTask(
  taskId: string
): Promise<ApiResponse<null>> {
  const response = await fetch(`${API_BASE}/deleteTask?taskId=${taskId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Delete task failed: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// 統計ダッシュボード API（Phase 8.3）
// =============================================================================

import type {
  GetStatsRequest,
  GetStatsResponse,
} from '../types/stats';

export type { GetStatsRequest, GetStatsResponse };

/**
 * 統計データを取得
 */
export async function getStats(
  params: Partial<GetStatsRequest> = {}
): Promise<ApiResponse<GetStatsResponse>> {
  const url = new URL(`${API_BASE}/getStats`);

  if (params.residentId) url.searchParams.set('residentId', params.residentId);
  if (params.startDate) url.searchParams.set('startDate', params.startDate);
  if (params.endDate) url.searchParams.set('endDate', params.endDate);
  if (params.include && params.include.length > 0) {
    url.searchParams.set('include', params.include.join(','));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get stats: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// AI連携 API（Phase 8.4）
// =============================================================================

import type {
  AISuggestRequest,
  AISuggestResponse,
  AIAnalyzeRequest,
  AIAnalyzeResponse,
} from '../types/careItem';

export type { AISuggestRequest, AISuggestResponse, AIAnalyzeRequest, AIAnalyzeResponse };

/**
 * AI品物入力補助
 * 品物名から賞味期限・保存方法・提供方法を提案
 */
export async function aiSuggest(
  params: AISuggestRequest
): Promise<ApiResponse<AISuggestResponse>> {
  const response = await fetch(`${API_BASE}/aiSuggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AI suggest failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * AI摂食傾向分析
 * 摂食データから傾向・異常を分析し、改善提案を返却
 */
export async function aiAnalyze(
  params: AIAnalyzeRequest
): Promise<ApiResponse<AIAnalyzeResponse>> {
  const response = await fetch(`${API_BASE}/aiAnalyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `AI analyze failed: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// プリセット統合 API（Phase 8.5）
// =============================================================================

import type {
  GetPresetSuggestionsRequest,
  GetPresetSuggestionsResponse,
  PresetSuggestion,
} from '../types/careItem';

export type { GetPresetSuggestionsRequest, GetPresetSuggestionsResponse, PresetSuggestion };

/**
 * プリセット候補を取得
 * 品物名・カテゴリからマッチする「いつもの指示」を検索
 */
export async function getPresetSuggestions(
  params: GetPresetSuggestionsRequest
): Promise<GetPresetSuggestionsResponse> {
  const response = await fetch(`${API_BASE}/getPresetSuggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get preset suggestions: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// プリセット管理 CRUD API（Phase 8.6）
// =============================================================================

import type {
  CarePreset,
  CarePresetInput,
  PresetCategory,
  PresetSource,
  GetPresetsRequest,
  GetPresetsResponse,
  CreatePresetRequest,
  CreatePresetResponse,
  UpdatePresetRequest,
  UpdatePresetResponse,
  SaveAISuggestionAsPresetRequest,
  SaveAISuggestionAsPresetResponse,
} from '../types/careItem';

export type {
  CarePreset,
  CarePresetInput,
  PresetCategory,
  PresetSource,
};

/**
 * プリセット一覧を取得
 */
export async function getPresets(
  params: GetPresetsRequest
): Promise<ApiResponse<GetPresetsResponse>> {
  const url = new URL(`${API_BASE}/getPresets`);

  url.searchParams.set('residentId', params.residentId);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.source) url.searchParams.set('source', params.source);
  if (params.activeOnly !== undefined) {
    url.searchParams.set('activeOnly', String(params.activeOnly));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get presets: ${response.statusText}`);
  }

  return response.json();
}

/**
 * プリセットを作成
 */
export async function createPreset(
  params: CreatePresetRequest
): Promise<ApiResponse<CreatePresetResponse>> {
  const response = await fetch(`${API_BASE}/createPreset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create preset: ${response.statusText}`);
  }

  return response.json();
}

/**
 * プリセットを更新
 */
export async function updatePreset(
  params: UpdatePresetRequest
): Promise<ApiResponse<UpdatePresetResponse>> {
  const response = await fetch(`${API_BASE}/updatePreset`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update preset: ${response.statusText}`);
  }

  return response.json();
}

/**
 * プリセットを削除（論理削除）
 */
export async function deletePreset(
  presetId: string
): Promise<ApiResponse<null>> {
  const response = await fetch(`${API_BASE}/deletePreset?presetId=${presetId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete preset: ${response.statusText}`);
  }

  return response.json();
}

/**
 * AI提案をプリセットとして保存
 */
export async function saveAISuggestionAsPreset(
  params: SaveAISuggestionAsPresetRequest
): Promise<ApiResponse<SaveAISuggestionAsPresetResponse>> {
  const response = await fetch(`${API_BASE}/saveAISuggestionAsPreset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save AI suggestion: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// 消費ログ API（Phase 9.2）
// =============================================================================

import type {
  RecordConsumptionLogRequest,
  RecordConsumptionLogResponse,
  GetConsumptionLogsResponse,
  ConsumptionLog,
} from '../types/consumptionLog';

export type { ConsumptionLog, RecordConsumptionLogRequest, RecordConsumptionLogResponse };

/**
 * 消費ログを記録
 * スタッフが品物の提供・摂食を記録
 */
export async function recordConsumptionLog(
  params: RecordConsumptionLogRequest
): Promise<ApiResponse<RecordConsumptionLogResponse>> {
  const response = await fetch(`${API_BASE}/recordConsumptionLog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to record consumption: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 消費ログ一覧を取得
 */
export interface GetConsumptionLogsParams {
  itemId: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function getConsumptionLogs(
  params: GetConsumptionLogsParams
): Promise<ApiResponse<GetConsumptionLogsResponse>> {
  const url = new URL(`${API_BASE}/getConsumptionLogs`);

  url.searchParams.set('itemId', params.itemId);
  if (params.startDate) url.searchParams.set('startDate', params.startDate);
  if (params.endDate) url.searchParams.set('endDate', params.endDate);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get consumption logs: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// 禁止ルール CRUD API（Phase 9.x）
// =============================================================================

import type {
  ProhibitionRule,
  ProhibitionRuleInput,
  GetProhibitionsRequest,
  GetProhibitionsResponse,
  CreateProhibitionRequest,
  CreateProhibitionResponse,
  UpdateProhibitionRequest,
  UpdateProhibitionResponse,
} from '../types/careItem';

export type { ProhibitionRule, ProhibitionRuleInput };

/**
 * 禁止ルール一覧を取得
 */
export async function getProhibitions(
  params: GetProhibitionsRequest
): Promise<ApiResponse<GetProhibitionsResponse>> {
  const url = new URL(`${API_BASE}/getProhibitions`);

  url.searchParams.set('residentId', params.residentId);
  if (params.activeOnly !== undefined) {
    url.searchParams.set('activeOnly', String(params.activeOnly));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get prohibitions: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 禁止ルールを作成
 */
export async function createProhibition(
  params: CreateProhibitionRequest
): Promise<ApiResponse<CreateProhibitionResponse>> {
  const response = await fetch(`${API_BASE}/createProhibition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to create prohibition: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 禁止ルールを更新
 */
export async function updateProhibition(
  params: UpdateProhibitionRequest
): Promise<ApiResponse<UpdateProhibitionResponse>> {
  const response = await fetch(`${API_BASE}/updateProhibition`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update prohibition: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 禁止ルールを削除（論理削除）
 */
export async function deleteProhibition(
  residentId: string,
  prohibitionId: string
): Promise<ApiResponse<Record<string, never>>> {
  const url = new URL(`${API_BASE}/deleteProhibition`);
  url.searchParams.set('residentId', residentId);
  url.searchParams.set('prohibitionId', prohibitionId);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete prohibition: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// 在庫・食品統計 API（Phase 9.3）
// =============================================================================

import type {
  GetInventorySummaryResponse,
  GetFoodStatsResponse,
} from '../types/stats';

export type { GetInventorySummaryResponse, GetFoodStatsResponse };

/**
 * 在庫サマリーを取得
 */
export interface GetInventorySummaryParams {
  residentId?: string;
  status?: ItemStatus | ItemStatus[];
  includeExpiringSoon?: boolean;
}

export async function getInventorySummary(
  params: GetInventorySummaryParams = {}
): Promise<ApiResponse<GetInventorySummaryResponse>> {
  const url = new URL(`${API_BASE}/getInventorySummary`);

  if (params.residentId) url.searchParams.set('residentId', params.residentId);
  if (params.status) {
    if (Array.isArray(params.status)) {
      url.searchParams.set('status', params.status.join(','));
    } else {
      url.searchParams.set('status', params.status);
    }
  }
  if (params.includeExpiringSoon) {
    url.searchParams.set('includeExpiringSoon', 'true');
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get inventory summary: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食品統計を取得
 */
export interface GetFoodStatsParams {
  residentId?: string;
  limit?: number;
}

export async function getFoodStats(
  params: GetFoodStatsParams = {}
): Promise<ApiResponse<GetFoodStatsResponse>> {
  const url = new URL(`${API_BASE}/getFoodStats`);

  if (params.residentId) url.searchParams.set('residentId', params.residentId);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get food stats: ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// FoodMaster APIs (Phase 11)
// =============================================================================

import type {
  FoodMaster,
  GetFoodMastersRequest,
  GetFoodMastersResponse,
  SearchFoodMasterRequest,
  CreateFoodMasterRequest,
  CreateFoodMasterResponse,
  UpdateFoodMasterRequest,
  UpdateFoodMasterResponse,
  DeleteFoodMasterRequest,
} from '../types/careItem';

/**
 * 食品マスタ一覧を取得
 */
export async function getFoodMasters(
  params?: GetFoodMastersRequest
): Promise<ApiResponse<GetFoodMastersResponse>> {
  const url = new URL(`${API_BASE}/getFoodMasters`);

  if (params?.category) url.searchParams.set('category', params.category);
  if (params?.isActive !== undefined) {
    url.searchParams.set('isActive', String(params.isActive));
  }
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.offset) url.searchParams.set('offset', String(params.offset));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to get food masters: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食品マスタを検索（名前・別名でマッチ）
 */
export async function searchFoodMaster(
  params: SearchFoodMasterRequest
): Promise<ApiResponse<{ items: FoodMaster[]; total: number; found: boolean }>> {
  const url = new URL(`${API_BASE}/searchFoodMaster`);

  url.searchParams.set('query', params.query);
  if (params.category) url.searchParams.set('category', params.category);
  if (params.limit) url.searchParams.set('limit', String(params.limit));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to search food master: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食品マスタを作成
 */
export async function createFoodMaster(
  params: CreateFoodMasterRequest
): Promise<ApiResponse<CreateFoodMasterResponse>> {
  const response = await fetch(`${API_BASE}/createFoodMaster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params.foodMaster),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create food master: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食品マスタを更新
 */
export async function updateFoodMaster(
  params: UpdateFoodMasterRequest
): Promise<ApiResponse<UpdateFoodMasterResponse>> {
  const response = await fetch(`${API_BASE}/updateFoodMaster`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to update food master: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 食品マスタを削除
 */
export async function deleteFoodMaster(
  params: DeleteFoodMasterRequest
): Promise<ApiResponse<Record<string, never>>> {
  const response = await fetch(`${API_BASE}/deleteFoodMaster`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to delete food master: ${response.statusText}`);
  }

  return response.json();
}
