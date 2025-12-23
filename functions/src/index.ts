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

// Firestore設定: undefined値を無視（オプショナルフィールド対応）
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});

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
export {submitHydrationRecord} from "./functions/submitHydrationRecord";

// =============================================================================
// 画像連携（Phase 17: Firebase Storage）
// =============================================================================

export {uploadCareImage} from "./functions/uploadCareImage";
export {getCarePhotos} from "./functions/getCarePhotos";

// =============================================================================
// データ取得 (GET)
// =============================================================================

export {getPlanDataFunc as getPlanData} from "./functions/getPlanData";

// =============================================================================
// グローバル設定
// =============================================================================

export {getMealFormSettings, updateMealFormSettings} from "./functions/mealFormSettings";

// =============================================================================
// 管理者テスト機能
// =============================================================================

export {testWebhook} from "./functions/testWebhook";

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
export {aiAnalyze} from "./functions/aiAnalyze";

// =============================================================================
// プリセット統合（Phase 8.5）
// =============================================================================

export {getPresetSuggestions} from "./functions/getPresetSuggestions";

// =============================================================================
// プリセット管理 CRUD（Phase 8.6）
// =============================================================================

export {
  getPresets,
  createPreset,
  updatePreset,
  deletePreset,
  saveAISuggestionAsPreset,
} from "./functions/presets";

// =============================================================================
// 消費ログ（Phase 9.2）
// =============================================================================

export {
  recordConsumptionLog,
  getConsumptionLogs,
} from "./functions/consumptionLogs";

// =============================================================================
// 禁止ルール（Phase 9.x）
// =============================================================================

export {
  getProhibitions,
  createProhibition,
  updateProhibition,
  deleteProhibition,
} from "./functions/prohibitions";

// =============================================================================
// 在庫・食品統計（Phase 9.3）
// =============================================================================

export {
  getInventorySummary,
  getFoodStats,
} from "./functions/inventoryStats";

// =============================================================================
// 食品マスタ（Phase 11）
// =============================================================================

export {
  getFoodMasters,
  searchFoodMaster,
  createFoodMaster,
  updateFoodMaster,
  deleteFoodMaster,
} from "./functions/foodMasters";

// =============================================================================
// チャット連携（Phase 18）
// =============================================================================

export {
  sendMessage,
  getMessages,
  markAsRead,
  getNotifications,
  getActiveChatItems,
} from "./functions/chat";

// =============================================================================
// 家族操作・入力無し通知（Phase 30）
// =============================================================================

export {checkDailyRecords} from "./functions/checkDailyRecords";

// =============================================================================
// スタッフ注意事項（Phase 40）
// =============================================================================

export {
  getStaffNotes,
  createStaffNote,
  updateStaffNote,
  deleteStaffNote,
} from "./functions/staffNotes";
