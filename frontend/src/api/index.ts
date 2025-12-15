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
