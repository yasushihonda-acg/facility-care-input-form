/**
 * Cloud Functions エントリポイント
 *
 * 介護施設向けコミュニケーションアプリ API
 * - Flow A: 記録同期 (Sheet A → Firestore)
 * - Flow B: 実績入力 (App → Sheet B)
 * - Flow C: 家族要望 (App → Firestore)
 */

import * as admin from "firebase-admin";

// Firebase Admin SDK 初期化
admin.initializeApp();

// =============================================================================
// Health Check
// =============================================================================

export {healthCheck} from "./functions/healthCheck";

// =============================================================================
// Flow A: 記録同期
// =============================================================================

export {syncPlanData} from "./functions/syncPlanData";

// =============================================================================
// Flow B: 実績入力
// =============================================================================

export {submitCareRecord} from "./functions/submitCareRecord";
export {submitMealRecord} from "./functions/submitMealRecord";

// =============================================================================
// Flow C: 家族要望
// =============================================================================

export {submitFamilyRequest} from "./functions/submitFamilyRequest";

// =============================================================================
// 画像連携
// =============================================================================

export {uploadCareImage} from "./functions/uploadCareImage";

// =============================================================================
// データ取得 (GET)
// =============================================================================

export {getPlanDataFunc as getPlanData} from "./functions/getPlanData";
export {getFamilyRequestsFunc as getFamilyRequests} from "./functions/getFamilyRequests";

// =============================================================================
// グローバル設定
// =============================================================================

export {getMealFormSettings, updateMealFormSettings} from "./functions/mealFormSettings";

// =============================================================================
// 管理者テスト機能
// =============================================================================

export {testWebhook} from "./functions/testWebhook";
export {testDriveAccess} from "./functions/testDriveAccess";

// =============================================================================
// 品物管理（Phase 8.1）
// =============================================================================

export {
  submitCareItem,
  getCareItems,
  updateCareItem,
  deleteCareItem,
} from "./functions/careItems";

// =============================================================================
// タスク管理（Phase 8.2）
// =============================================================================

export {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
} from "./functions/tasks";

// =============================================================================
// タスク自動生成（Phase 8.2.1）
// =============================================================================

export {
  generateDailyTasks,
  triggerTaskGeneration,
} from "./functions/taskGenerator";

// =============================================================================
// 統計ダッシュボード（Phase 8.3）
// =============================================================================

export {getStats} from "./functions/getStats";

// =============================================================================
// AI連携（Phase 8.4）
// =============================================================================

export {aiSuggest} from "./functions/aiSuggest";

// =============================================================================
// プリセット統合（Phase 8.5）
// =============================================================================

export {getPresetSuggestions} from "./functions/getPresetSuggestions";
