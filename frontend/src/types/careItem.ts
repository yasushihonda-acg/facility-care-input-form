/**
 * 品物管理 型定義
 * @see docs/ITEM_MANAGEMENT_SPEC.md
 */

// === 列挙型 ===

// カテゴリ（Phase 31: 7→2に簡素化）
export type ItemCategory = 'food' | 'drink';

export const ITEM_CATEGORIES: { value: ItemCategory; label: string; icon: string }[] = [
  { value: 'food', label: '食べ物', icon: '🍽️' },
  { value: 'drink', label: '飲み物', icon: '🥤' },
];

// 旧カテゴリ（後方互換性のため参考コメント）
// LegacyItemCategory = 'fruit' | 'snack' | 'dairy' | 'prepared' | 'supplement' | 'other'

/**
 * 旧カテゴリから新カテゴリへの変換（後方互換性）
 * Phase 31: fruit, snack, dairy, prepared, supplement, other → food
 */
export function migrateCategory(oldCategory: string): ItemCategory {
  if (oldCategory === 'drink') return 'drink';
  if (oldCategory === 'food') return 'food';
  // 旧カテゴリは全て food に変換
  return 'food';
}

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

// 提供方法（Phase 28で整理: cooled/blended削除）
export type ServingMethod =
  | 'as_is'      // そのまま
  | 'cut'        // カット
  | 'peeled'     // 皮むき
  | 'heated'     // 温める
  | 'other';     // その他

export const SERVING_METHODS: { value: ServingMethod; label: string }[] = [
  { value: 'as_is', label: 'そのまま' },
  { value: 'cut', label: 'カット' },
  { value: 'peeled', label: '皮むき' },
  { value: 'heated', label: '温める' },
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
  | 'pending'      // 未提供（登録済み、まだ提供していない）
  | 'in_progress'  // 提供中（一部消費、残量あり）★新規追加
  | 'served'       // 提供済み（旧: 互換性のため残す）
  | 'consumed'     // 消費完了（残量ゼロ）
  | 'expired'      // 期限切れ
  | 'discarded';   // 廃棄

export const ITEM_STATUSES: { value: ItemStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: '未提供', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { value: 'in_progress', label: '提供中', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'served', label: '提供済み', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { value: 'consumed', label: '消費完了', color: 'text-green-700', bgColor: 'bg-green-100' },
  { value: 'expired', label: '期限切れ', color: 'text-red-700', bgColor: 'bg-red-100' },
  { value: 'discarded', label: '廃棄', color: 'text-gray-700', bgColor: 'bg-gray-100' },
];

// 単位
export const ITEM_UNITS: string[] = ['個', 'パック', '本', '袋', '箱', '枚', 'g', 'ml'];

// =============================================================================
// 残ったものへの処置指示 (Phase 33)
// @see docs/REMAINING_HANDLING_INSTRUCTION_SPEC.md
// =============================================================================

/**
 * 残った場合の処置指示（家族が設定）
 * - discarded: 破棄してください
 * - stored: 保存してください
 * - none: 指定なし（スタッフ判断）
 */
export type RemainingHandlingInstruction = 'discarded' | 'stored' | 'none';

export const REMAINING_HANDLING_INSTRUCTION_OPTIONS: {
  value: RemainingHandlingInstruction;
  label: string;
  description: string;
}[] = [
  { value: 'none', label: '指定なし', description: 'スタッフの判断に任せます' },
  { value: 'discarded', label: '破棄してください', description: '残った場合は破棄してください' },
  { value: 'stored', label: '保存してください', description: '残った場合は保存してください' },
];

/**
 * 処置指示のラベルを取得
 */
export function getRemainingHandlingInstructionLabel(instruction: RemainingHandlingInstruction | undefined): string {
  if (!instruction || instruction === 'none') return '指定なし';
  return REMAINING_HANDLING_INSTRUCTION_OPTIONS.find(o => o.value === instruction)?.label ?? '指定なし';
}

// === インターフェース ===

// 品物（Firestore: care_items/{itemId}）
export interface CareItem {
  // 識別情報
  id: string;
  residentId: string;
  userId: string;

  // 食品マスタ参照（将来用）
  foodMasterId?: string;

  // 品物基本情報（家族が入力）
  itemName: string;
  category: ItemCategory;
  sentDate: string;              // YYYY-MM-DD
  quantity: number;              // 旧: 互換性のため残す
  unit: string;
  expirationDate?: string;       // YYYY-MM-DD
  storageMethod?: StorageMethod;

  // 在庫情報（Phase 9.2 追加）
  initialQuantity?: number;      // 初期数量（新規）
  currentQuantity?: number;      // 現在の残量（新規）★自動更新

  // 提供希望（家族が入力）
  servingMethod: ServingMethod;
  servingMethodDetail?: string;
  preferredServingSchedule?: string; // 提供希望スケジュール（テキスト・後方互換）
  plannedServeDate?: string;     // YYYY-MM-DD（後方互換）
  servingSchedule?: ServingSchedule; // 構造化スケジュール（Phase 13.1）
  noteToStaff?: string;

  // Phase 33: 残った場合の処置指示（家族が設定）
  remainingHandlingInstruction?: RemainingHandlingInstruction;

  // 提供記録（スタッフが入力）- 旧: 互換性のため残す
  actualServeDate?: string;      // YYYY-MM-DD
  servedQuantity?: number;
  servedBy?: string;

  // 摂食記録（スタッフが入力）- 旧: 互換性のため残す
  consumptionRate?: number;      // 0-100
  consumptionStatus?: ConsumptionStatus;
  consumptionNote?: string;
  recordedBy?: string;

  // 申し送り（スタッフ→家族）
  noteToFamily?: string;

  // 集計キャッシュ（Phase 9.2 追加）
  consumptionSummary?: {
    totalServed: number;         // 累計提供回数
    totalServedQuantity: number; // 累計提供量
    totalConsumedQuantity: number; // 累計消費量
    avgConsumptionRate: number;  // 平均摂食率
    lastServedDate?: string;     // 最終提供日
    lastServedBy?: string;       // 最終提供者
  };

  // ステータス・メタ情報
  status: ItemStatus;
  remainingQuantity: number;     // 旧: 互換性のため残す（currentQuantityと同期）
  createdAt: string;             // ISO8601
  updatedAt: string;             // ISO8601

  // Phase 38.2: 廃棄関連（オプション）
  discardedAt?: string;          // 廃棄日時（ISO8601）
  discardedBy?: string;          // 廃棄実行者
  discardReason?: string;        // 廃棄理由
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
  servingSchedule?: ServingSchedule; // 構造化スケジュール（Phase 13.1）
  noteToStaff?: string;
  // Phase 33: 残った場合の処置指示
  remainingHandlingInstruction?: RemainingHandlingInstruction;
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
 * カテゴリのラベルを取得（旧カテゴリにも対応）
 * Phase 31: 後方互換性のため、旧カテゴリは「食べ物」として扱う
 */
export function getCategoryLabel(category: string): string {
  const migrated = migrateCategory(category);
  return ITEM_CATEGORIES.find(c => c.value === migrated)?.label ?? '食べ物';
}

/**
 * カテゴリのアイコンを取得（旧カテゴリにも対応）
 * Phase 31: 後方互換性のため、旧カテゴリは食べ物アイコンを返す
 */
export function getCategoryIcon(category: string): string {
  const migrated = migrateCategory(category);
  return ITEM_CATEGORIES.find(c => c.value === migrated)?.icon ?? '🍽️';
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
  /** AI生成結果をFoodMasterに自動保存するか（本番モードのみtrue推奨） */
  saveToFoodMaster?: boolean;
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

/** 提供方法ラベルマップ（AI提案表示用）（Phase 28で整理: cooled/blended削除） */
export const SERVING_METHOD_LABELS: Record<ServingMethod, string> = {
  as_is: 'そのまま',
  cut: 'カット',
  peeled: '皮むき',
  heated: '温める',
  other: 'その他',
};

// =============================================================================
// AI分析 (Phase 8.4 - aiAnalyze)
// @see docs/AI_INTEGRATION_SPEC.md セクション3.2
// =============================================================================

/** 分析タイプ */
export type AIAnalysisType = 'consumption' | 'prediction' | 'care_suggestion';

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
  };
}

/** 発見事項タイプ */
export type FindingType = 'positive' | 'negative' | 'neutral';

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
export type SuggestionPriority = 'high' | 'medium' | 'low';

/** 改善提案 */
export interface AISuggestion {
  priority: SuggestionPriority;
  title: string;
  description: string;
  relatedItemName?: string;
}

/** AI分析レスポンス */
export interface AIAnalyzeResponse {
  analysisType: AIAnalysisType;
  summary: string;
  findings: AIFinding[];
  suggestions: AISuggestion[];
}

/** 発見事項タイプのラベル・色 */
export const FINDING_TYPE_CONFIG: Record<FindingType, { label: string; icon: string; color: string; bgColor: string }> = {
  positive: { label: '良い傾向', icon: '📈', color: 'text-green-700', bgColor: 'bg-green-50' },
  negative: { label: '注意が必要', icon: '📉', color: 'text-red-700', bgColor: 'bg-red-50' },
  neutral: { label: '情報', icon: '📊', color: 'text-gray-700', bgColor: 'bg-gray-50' },
};

/** 提案優先度のラベル・色 */
export const SUGGESTION_PRIORITY_CONFIG: Record<SuggestionPriority, { label: string; icon: string; color: string; bgColor: string }> = {
  high: { label: '優先度：高', icon: '🔴', color: 'text-red-700', bgColor: 'bg-red-50' },
  medium: { label: '優先度：中', icon: '🟡', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  low: { label: '優先度：低', icon: '🟢', color: 'text-green-700', bgColor: 'bg-green-50' },
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
  // 指示内容（品物登録フォームのservingMethodDetailに適用）
  processingDetail: string;
  // @deprecated 旧形式（後方互換性のため保持）
  instruction?: {
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

/** カテゴリラベルマップ（Phase 31: 2カテゴリに簡素化） */
export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  food: '食べ物',
  drink: '飲み物',
};

// =============================================================================
// プリセット管理 (Phase 8.6)
// @see docs/PRESET_MANAGEMENT_SPEC.md
// =============================================================================

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
  icon?: string;

  // 品物登録フォームへの適用値
  itemCategory?: ItemCategory;                           // 食べ物/飲み物
  storageMethod?: StorageMethod;                         // 保存方法
  servingMethod?: ServingMethod;                         // 提供方法
  servingMethodDetail?: string;                          // 提供方法の詳細
  noteToStaff?: string;                                  // スタッフへの申し送り
  remainingHandlingInstruction?: RemainingHandlingInstruction; // 残った場合の処置

  // @deprecated 旧フィールド（後方互換性）
  category?: string;
  processingDetail?: string;  // → servingMethodDetailに統合
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
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/** プリセット作成入力 */
export interface CarePresetInput {
  name: string;
  icon?: string;

  // 品物登録フォームへの適用値
  itemCategory?: ItemCategory;
  storageMethod?: StorageMethod;
  servingMethod?: ServingMethod;
  servingMethodDetail?: string;
  noteToStaff?: string;
  remainingHandlingInstruction?: RemainingHandlingInstruction;

  // @deprecated 旧フィールド（後方互換性）
  category?: string;
  processingDetail?: string;

  // マッチング設定
  matchConfig?: {
    keywords?: string[];
    categories?: ItemCategory[];
    exactMatch?: boolean;
  };
}

// === プリセット管理 APIリクエスト/レスポンス型 ===

export interface GetPresetsRequest {
  residentId: string;
  category?: string;
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

// 削除成功時は空（APIはsuccess:trueのみ返す）
export type DeletePresetResponse = Record<string, never>;

// === AI自動ストック (Phase 8.7) ===

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

export interface SaveAISuggestionAsPresetResponse {
  presetId: string;
  createdAt: string;
}

// === ユーティリティ関数 ===

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

// =============================================================================
// 禁止ルール (Phase 9.x)
// @see docs/ITEM_MANAGEMENT_SPEC.md セクション8
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
  itemName: string;              // 禁止品目名（例: 「七福のお菓子」）
  category?: ItemCategory;       // カテゴリ（任意、絞り込み用）
  reason?: string;               // 禁止理由（例: 「糖分過多のため」）

  // メタ情報
  createdBy: string;             // 設定した家族ID
  createdAt: string;             // ISO8601
  updatedAt: string;             // ISO8601
  isActive: boolean;             // 有効フラグ（無効化可能）
}

/** 禁止ルール作成入力 */
export interface ProhibitionRuleInput {
  itemName: string;
  category?: ItemCategory;
  reason?: string;
}

// === 禁止ルール APIリクエスト/レスポンス型 ===

export interface GetProhibitionsRequest {
  residentId: string;
  activeOnly?: boolean;
}

export interface GetProhibitionsResponse {
  prohibitions: ProhibitionRule[];
  total: number;
}

export interface CreateProhibitionRequest {
  residentId: string;
  userId: string;
  prohibition: ProhibitionRuleInput;
}

export interface CreateProhibitionResponse {
  prohibitionId: string;
  createdAt: string;
}

export interface UpdateProhibitionRequest {
  residentId: string;
  prohibitionId: string;
  updates: Partial<ProhibitionRuleInput> & { isActive?: boolean };
}

export interface UpdateProhibitionResponse {
  prohibitionId: string;
  updatedAt: string;
}

export interface DeleteProhibitionRequest {
  residentId: string;
  prohibitionId: string;
}

// 削除成功時は空
export type DeleteProhibitionResponse = Record<string, never>;

// =============================================================================
// FoodMaster Types (Phase 11)
// docs/INVENTORY_CONSUMPTION_SPEC.md セクション2.2 に基づく型定義
// =============================================================================

/** 食品マスタ統計データ */
export interface FoodMasterStats {
  totalServed: number;         // 累計提供回数
  totalConsumed: number;       // 累計消費量
  avgConsumptionRate: number;  // 平均摂食率（0-100）
  preferenceScore: number;     // 好み度スコア（0-100）
  wasteRate: number;           // 廃棄率（0-100）
  lastUpdated?: string;        // ISO8601
}

/**
 * FoodMaster - 食品マスタ
 * 正規化された食品情報と統計データを管理
 */
export interface FoodMaster {
  // === 識別情報 ===
  id: string;

  // === 基本情報 ===
  name: string;                        // 正規化された食品名（例: "バナナ"）
  aliases: string[];                   // 別名（"ばなな", "banana", "バナナ（フィリピン産）"）
  category: ItemCategory;              // カテゴリ

  // === デフォルト値（AI提案のベース）===
  defaultUnit: string;                 // デフォルト単位（房、個、本、袋）
  defaultExpirationDays: number;       // 平均賞味期限（日）
  defaultStorageMethod: StorageMethod; // 推奨保存方法
  defaultServingMethods: ServingMethod[]; // 推奨提供方法

  // === 注意事項 ===
  careNotes?: string;                  // ケア時の注意点（誤嚥リスク等）
  allergyInfo?: string;                // アレルギー情報

  // === 統計データ（定期バッチで更新）===
  stats: FoodMasterStats;

  // === メタ情報 ===
  isActive: boolean;                   // 有効フラグ
  source: 'manual' | 'ai';             // 登録ソース（手動 or AI自動生成）
  createdAt: string;                   // ISO8601
  updatedAt: string;                   // ISO8601
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
  source?: 'manual' | 'ai';
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

// === FoodMaster APIリクエスト/レスポンス型 ===

/** FoodMaster検索リクエスト */
export interface SearchFoodMasterRequest {
  query: string;              // 検索クエリ（名前・別名でマッチ）
  category?: ItemCategory;    // カテゴリ絞り込み
  limit?: number;             // 結果上限
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

/** FoodMaster作成リクエスト */
export interface CreateFoodMasterRequest {
  foodMaster: FoodMasterInput;
}

/** FoodMaster作成レスポンス */
export interface CreateFoodMasterResponse {
  foodMasterId: string;
  createdAt: string;
}

/** FoodMaster更新リクエスト */
export interface UpdateFoodMasterRequest {
  foodMasterId: string;
  updates: FoodMasterUpdateInput;
}

/** FoodMaster更新レスポンス */
export interface UpdateFoodMasterResponse {
  foodMasterId: string;
  updatedAt: string;
}

/** FoodMaster削除リクエスト */
export interface DeleteFoodMasterRequest {
  foodMasterId: string;
}

// 削除成功時は空
export type DeleteFoodMasterResponse = Record<string, never>;

/** FoodMaster検索レスポンス（aiSuggest連携用） */
export interface SearchFoodMasterResponse {
  found: boolean;
  foodMaster?: FoodMaster;
  suggestion?: {
    expirationDays: number;
    storageMethod: StorageMethod;
    servingMethods: ServingMethod[];
    notes?: string;
  };
}

// =============================================================================
// スケジュール拡張 (Phase 13.1)
// @see docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション3
// =============================================================================

/** 提供タイミング */
export type ServingTimeSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'anytime';

/** 提供タイミングのラベル */
export const SERVING_TIME_SLOT_LABELS: Record<ServingTimeSlot, string> = {
  breakfast: '朝食時',
  lunch: '昼食時',
  dinner: '夕食時',
  snack: 'おやつ時',
  anytime: 'いつでも',
};

/** 曜日ラベル（日曜始まり） */
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

/** スケジュールタイプ */
export type ScheduleType = 'once' | 'daily' | 'weekly' | 'specific_dates';

/** スケジュールタイプのラベル */
export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  once: '特定の日',
  daily: '毎日',
  weekly: '曜日指定',
  specific_dates: '複数日指定',
};

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
