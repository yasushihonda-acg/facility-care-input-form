/**
 * 品物管理 型定義
 * @see docs/ITEM_MANAGEMENT_SPEC.md
 */

// === 列挙型 ===

// カテゴリ
export type ItemCategory =
  | 'fruit'       // 果物
  | 'snack'       // お菓子・間食
  | 'drink'       // 飲み物
  | 'dairy'       // 乳製品
  | 'prepared'    // 調理済み食品
  | 'supplement'  // 栄養補助食品
  | 'other';      // その他

export const ITEM_CATEGORIES: { value: ItemCategory; label: string; icon: string }[] = [
  { value: 'fruit', label: '果物', icon: '🍎' },
  { value: 'snack', label: 'お菓子・間食', icon: '🍪' },
  { value: 'drink', label: '飲み物', icon: '🥤' },
  { value: 'dairy', label: '乳製品', icon: '🥛' },
  { value: 'prepared', label: '調理済み食品', icon: '🍱' },
  { value: 'supplement', label: '栄養補助食品', icon: '💊' },
  { value: 'other', label: 'その他', icon: '📦' },
];

// 保存方法
export type StorageMethod =
  | 'room_temp'    // 常温
  | 'refrigerated' // 冷蔵
  | 'frozen';      // 冷凍

export const STORAGE_METHODS: { value: StorageMethod; label: string }[] = [
  { value: 'room_temp', label: '常温' },
  { value: 'refrigerated', label: '冷蔵' },
  { value: 'frozen', label: '冷凍' },
];

// 提供方法
export type ServingMethod =
  | 'as_is'      // そのまま
  | 'cut'        // カット
  | 'peeled'     // 皮むき
  | 'heated'     // 温める
  | 'cooled'     // 冷やす
  | 'blended'    // ミキサー
  | 'other';     // その他

export const SERVING_METHODS: { value: ServingMethod; label: string }[] = [
  { value: 'as_is', label: 'そのまま' },
  { value: 'cut', label: 'カット' },
  { value: 'peeled', label: '皮むき' },
  { value: 'heated', label: '温める' },
  { value: 'cooled', label: '冷やす' },
  { value: 'blended', label: 'ミキサー' },
  { value: 'other', label: 'その他' },
];

// 摂食状況
export type ConsumptionStatus =
  | 'full'     // 完食
  | 'most'     // ほぼ完食 (80%以上)
  | 'half'     // 半分程度 (50%程度)
  | 'little'   // 少量 (30%以下)
  | 'none';    // 食べなかった

export const CONSUMPTION_STATUSES: { value: ConsumptionStatus; label: string; rate: number }[] = [
  { value: 'full', label: '完食', rate: 100 },
  { value: 'most', label: 'ほぼ完食', rate: 80 },
  { value: 'half', label: '半分程度', rate: 50 },
  { value: 'little', label: '少量', rate: 30 },
  { value: 'none', label: '食べなかった', rate: 0 },
];

// ステータス
export type ItemStatus =
  | 'pending'    // 未提供（登録済み、まだ提供していない）
  | 'served'     // 提供済み（提供したが摂食記録なし）
  | 'consumed'   // 消費済み（摂食記録完了）
  | 'expired'    // 期限切れ
  | 'discarded'; // 廃棄

export const ITEM_STATUSES: { value: ItemStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: '未提供', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { value: 'served', label: '提供済み', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'consumed', label: '消費済み', color: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'expired', label: '期限切れ', color: 'text-red-700', bgColor: 'bg-red-100' },
  { value: 'discarded', label: '廃棄', color: 'text-gray-700', bgColor: 'bg-gray-100' },
];

// 単位
export const ITEM_UNITS: string[] = ['個', 'パック', '本', '袋', '箱', '枚', 'g', 'ml'];

// === インターフェース ===

// 品物（Firestore: care_items/{itemId}）
export interface CareItem {
  // 識別情報
  id: string;
  residentId: string;
  userId: string;

  // 品物基本情報（家族が入力）
  itemName: string;
  category: ItemCategory;
  sentDate: string;              // YYYY-MM-DD
  quantity: number;
  unit: string;
  expirationDate?: string;       // YYYY-MM-DD
  storageMethod?: StorageMethod;

  // 提供希望（家族が入力）
  servingMethod: ServingMethod;
  servingMethodDetail?: string;
  plannedServeDate?: string;     // YYYY-MM-DD
  noteToStaff?: string;

  // 提供記録（スタッフが入力）
  actualServeDate?: string;      // YYYY-MM-DD
  servedQuantity?: number;
  servedBy?: string;

  // 摂食記録（スタッフが入力）
  consumptionRate?: number;      // 0-100
  consumptionStatus?: ConsumptionStatus;
  consumptionNote?: string;
  recordedBy?: string;

  // 申し送り（スタッフ→家族）
  noteToFamily?: string;

  // ステータス・メタ情報
  status: ItemStatus;
  remainingQuantity: number;
  createdAt: string;             // ISO8601
  updatedAt: string;             // ISO8601
}

// 家族が入力する登録フォーム
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

// スタッフが入力する提供記録
export interface ServingRecordInput {
  itemId: string;
  actualServeDate: string;
  servedQuantity: number;
  servedBy: string;
}

// スタッフが入力する摂食記録
export interface ConsumptionRecordInput {
  itemId: string;
  consumptionStatus: ConsumptionStatus;
  consumptionRate?: number;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
}

// === APIリクエスト/レスポンス型 ===

export interface SubmitCareItemRequest {
  residentId: string;
  userId: string;
  item: CareItemInput;
}

export interface SubmitCareItemResponse {
  itemId: string;
  createdAt: string;
}

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

export interface GetCareItemsResponse {
  items: CareItem[];
  total: number;
  hasMore: boolean;
}

export interface UpdateCareItemRequest {
  itemId: string;
  updates: Partial<CareItem>;
}

export interface UpdateCareItemResponse {
  success: boolean;
  data?: {
    itemId: string;
    updatedAt: string;
  };
  error?: string;
}

export interface RecordServingRequest {
  itemId: string;
  actualServeDate: string;
  servedQuantity: number;
  servedBy: string;
}

export interface RecordServingResponse {
  success: boolean;
  data?: {
    itemId: string;
    remainingQuantity: number;
    status: ItemStatus;
  };
  error?: string;
}

export interface RecordConsumptionRequest {
  itemId: string;
  consumptionStatus: ConsumptionStatus;
  consumptionRate?: number;
  consumptionNote?: string;
  noteToFamily?: string;
  recordedBy: string;
}

export interface RecordConsumptionResponse {
  success: boolean;
  data?: {
    itemId: string;
    status: ItemStatus;
  };
  error?: string;
}

export interface DeleteCareItemRequest {
  itemId: string;
}

export interface DeleteCareItemResponse {
  success: boolean;
  error?: string;
}

// === ユーティリティ関数 ===

/**
 * カテゴリのラベルを取得
 */
export function getCategoryLabel(category: ItemCategory): string {
  return ITEM_CATEGORIES.find(c => c.value === category)?.label ?? category;
}

/**
 * カテゴリのアイコンを取得
 */
export function getCategoryIcon(category: ItemCategory): string {
  return ITEM_CATEGORIES.find(c => c.value === category)?.icon ?? '📦';
}

/**
 * ステータスのラベルを取得
 */
export function getStatusLabel(status: ItemStatus): string {
  return ITEM_STATUSES.find(s => s.value === status)?.label ?? status;
}

/**
 * ステータスの色クラスを取得
 */
export function getStatusColorClass(status: ItemStatus): { color: string; bgColor: string } {
  const statusConfig = ITEM_STATUSES.find(s => s.value === status);
  return {
    color: statusConfig?.color ?? 'text-gray-700',
    bgColor: statusConfig?.bgColor ?? 'bg-gray-100',
  };
}

/**
 * 賞味期限までの残り日数を計算
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 賞味期限の表示テキストを取得
 */
export function getExpirationDisplayText(expirationDate: string): string {
  const days = getDaysUntilExpiration(expirationDate);
  if (days < 0) {
    return `${Math.abs(days)}日前に期限切れ`;
  } else if (days === 0) {
    return '本日期限';
  } else if (days === 1) {
    return '明日期限';
  } else if (days <= 3) {
    return `あと${days}日`;
  } else {
    return `${expirationDate}`;
  }
}

/**
 * 日付をフォーマット（YYYY/MM/DD）
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// =============================================================================
// AI連携 (Phase 8.4)
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

/** 保存方法ラベルマップ（AI提案表示用） */
export const STORAGE_METHOD_LABELS: Record<StorageMethod, string> = {
  room_temp: '常温',
  refrigerated: '冷蔵',
  frozen: '冷凍',
};

/** 提供方法ラベルマップ（AI提案表示用） */
export const SERVING_METHOD_LABELS: Record<ServingMethod, string> = {
  as_is: 'そのまま',
  cut: 'カット',
  peeled: '皮むき',
  heated: '温める',
  cooled: '冷やす',
  blended: 'ミキサー',
  other: 'その他',
};

// =============================================================================
// プリセット統合 (Phase 8.5)
// =============================================================================

/** プリセットマッチタイプ */
export type PresetMatchType = 'category' | 'itemName' | 'keyword';

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
  instruction: {
    title: string;
    content: string;
    servingMethod?: ServingMethod;
    servingDetail?: string;
  };
}

/** プリセット候補取得レスポンス */
export interface GetPresetSuggestionsResponse {
  success: boolean;
  data?: {
    suggestions: PresetSuggestion[];
  };
  error?: string;
}

/** CareItemInput 拡張フィールド（指示の出所追跡） */
export type InstructionSource = 'ai' | 'preset' | 'manual' | 'mixed';

/** 拡張版 CareItemInput（プリセット適用情報付き） */
export interface CareItemInputExtended extends CareItemInput {
  appliedPresetIds?: string[];
  aiSuggestionApplied?: boolean;
  instructionSource?: InstructionSource;
}

/** カテゴリラベルマップ（プリセットマッチ理由表示用） */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  fruit: '果物',
  snack: 'お菓子・間食',
  drink: '飲み物',
  dairy: '乳製品',
  prepared: '調理済み食品',
  supplement: '栄養補助食品',
  other: 'その他',
};

// =============================================================================
// プリセット管理 (Phase 8.6)
// @see docs/PRESET_MANAGEMENT_SPEC.md
// =============================================================================

/** プリセットカテゴリ */
export type PresetCategory =
  | 'cut'        // カット・調理方法
  | 'serve'      // 提供方法・温度
  | 'ban'        // 禁止・制限
  | 'condition'; // 条件付き対応

export const PRESET_CATEGORIES: { value: PresetCategory; label: string; icon: string }[] = [
  { value: 'cut', label: 'カット・調理', icon: '🔪' },
  { value: 'serve', label: '提供方法', icon: '🍽️' },
  { value: 'ban', label: '禁止・制限', icon: '🚫' },
  { value: 'condition', label: '条件付き', icon: '⚠️' },
];

/** プリセット出所 */
export type PresetSource = 'manual' | 'ai';

export const PRESET_SOURCE_LABELS: Record<PresetSource, { label: string; icon: string; color: string }> = {
  manual: { label: '手動登録', icon: '📌', color: 'text-blue-600' },
  ai: { label: 'AI提案から保存', icon: '🤖', color: 'text-purple-600' },
};

/** AI出所情報（AIから保存されたプリセット用） */
export interface AISourceInfo {
  originalItemName: string;
  originalSuggestion: {
    expirationDays: number;
    storageMethod: StorageMethod;
    servingMethods: ServingMethod[];
    notes?: string;
  };
  savedAt: string;  // ISO8601
}

/**
 * プリセット（いつもの指示）
 * Firestore: care_presets/{presetId}
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */
export interface CarePreset {
  // 識別情報
  id: string;
  residentId: string;

  // 基本情報
  name: string;
  category: PresetCategory;
  icon?: string;

  // 指示内容
  instruction: {
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** プリセット作成入力 */
export interface CarePresetInput {
  name: string;
  category: PresetCategory;
  icon?: string;
  instruction: {
    content: string;
    servingMethod?: ServingMethod;
    servingDetail?: string;
  };
  matchConfig: {
    keywords: string[];
    categories?: ItemCategory[];
    exactMatch?: boolean;
  };
}

// === プリセット管理 APIリクエスト/レスポンス型 ===

export interface GetPresetsRequest {
  residentId: string;
  category?: PresetCategory;
  source?: PresetSource;
  activeOnly?: boolean;
}

export interface GetPresetsResponse {
  presets: CarePreset[];
  total: number;
}

export interface CreatePresetRequest {
  residentId: string;
  userId: string;
  preset: CarePresetInput;
  source?: PresetSource;
}

export interface CreatePresetResponse {
  presetId: string;
  createdAt: string;
}

export interface UpdatePresetRequest {
  presetId: string;
  updates: Partial<CarePresetInput> & { isActive?: boolean };
}

export interface UpdatePresetResponse {
  presetId: string;
  updatedAt: string;
}

export interface DeletePresetRequest {
  presetId: string;
}

export interface DeletePresetResponse {
  // 削除成功時は空（APIはsuccess:trueのみ返す）
}

// === AI自動ストック (Phase 8.7) ===

export interface SaveAISuggestionAsPresetRequest {
  residentId: string;
  userId: string;
  itemName: string;
  presetName: string;
  category: PresetCategory;
  icon?: string;
  aiSuggestion: AISuggestResponse;
  keywords?: string[];
  itemCategories?: ItemCategory[];
}

export interface SaveAISuggestionAsPresetResponse {
  presetId: string;
  createdAt: string;
}

// === ユーティリティ関数 ===

/**
 * プリセットカテゴリのラベルを取得
 */
export function getPresetCategoryLabel(category: PresetCategory): string {
  return PRESET_CATEGORIES.find(c => c.value === category)?.label ?? category;
}

/**
 * プリセットカテゴリのアイコンを取得
 */
export function getPresetCategoryIcon(category: PresetCategory): string {
  return PRESET_CATEGORIES.find(c => c.value === category)?.icon ?? '📋';
}

/**
 * プリセット出所のラベル情報を取得
 */
export function getPresetSourceInfo(source: PresetSource): { label: string; icon: string; color: string } {
  return PRESET_SOURCE_LABELS[source];
}

/**
 * 保存方法のラベルを取得
 */
export function getStorageLabel(method: StorageMethod): string {
  return STORAGE_METHOD_LABELS[method] ?? method;
}

/**
 * 提供方法のラベルを取得
 */
export function getServingMethodLabel(method: ServingMethod): string {
  return SERVING_METHOD_LABELS[method] ?? method;
}
