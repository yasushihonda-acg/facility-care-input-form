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
