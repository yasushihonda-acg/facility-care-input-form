/**
 * Excel一括登録機能の型定義
 */

import type {
  ItemCategory,
  ServingMethod,
  StorageMethod,
  ServingTimeSlot,
  RemainingHandlingInstruction,
} from './careItem';

/** Excelテンプレートの列ヘッダー名 */
export const EXCEL_COLUMN_HEADERS = [
  '品物名',
  'カテゴリ',
  '数量',
  '単位',
  '提供方法',
  '提供日',
  '提供タイミング',
  '賞味期限',
  '保存方法',
  '申し送り',
  '残った場合の処置',
  '処置の条件',
] as const;

/** Excelテンプレートの行データ（日本語ラベル） */
export interface ExcelTemplateRow {
  品物名: string;
  カテゴリ: '食べ物' | '飲み物';
  数量?: number | string;
  単位?: string;
  提供方法: 'そのまま' | 'カット' | '皮むき' | '温める' | 'その他';
  提供日: string | number; // YYYY/MM/DD または Excelシリアル値
  提供タイミング: '朝食時' | '昼食時' | '夕食時' | 'おやつ時' | 'いつでも';
  賞味期限?: string | number;
  保存方法?: '常温' | '冷蔵' | '冷凍';
  申し送り?: string;
  残った場合の処置?: '指定なし' | '破棄してください' | '保存してください';
  処置の条件?: string;
}

/** バリデーションエラー */
export interface ValidationError {
  field: string;
  message: string;
}

/** バリデーション警告（自動修正された項目） */
export interface ValidationWarning {
  field: string;
  message: string;
  originalValue: string;
  correctedValue: string;
}

/** パース後の内部形式 */
export interface ParsedBulkItem {
  rowIndex: number;
  raw: Partial<ExcelTemplateRow>;
  parsed: {
    itemName: string;
    category: ItemCategory;
    quantity?: number;
    unit: string;
    servingMethod: ServingMethod;
    servingDate: string; // YYYY-MM-DD
    servingTimeSlot: ServingTimeSlot;
    expirationDate?: string;
    storageMethod?: StorageMethod;
    noteToStaff?: string;
    remainingHandlingInstruction?: RemainingHandlingInstruction;
    remainingHandlingCondition?: string;
  };
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isDuplicate: boolean;
  duplicateInfo?: {
    existingItemId: string;
    existingItemName: string;
  };
}

/** 一括登録の結果 */
export interface BulkImportResult {
  total: number;
  success: number;
  failed: number;
  skipped: number; // 重複スキップ
  results: BulkImportItemResult[];
}

/** 個別品物の登録結果 */
export interface BulkImportItemResult {
  rowIndex: number;
  itemName: string;
  status: 'success' | 'failed' | 'skipped';
  itemId?: string;
  error?: string;
}

/** ラベル変換マップ: カテゴリ */
export const CATEGORY_LABEL_TO_VALUE: Record<string, ItemCategory> = {
  '食べ物': 'food',
  '飲み物': 'drink',
};

/** ラベル変換マップ: 提供方法 */
export const SERVING_METHOD_LABEL_TO_VALUE: Record<string, ServingMethod> = {
  'そのまま': 'as_is',
  'カット': 'cut',
  '皮むき': 'peeled',
  '温める': 'heated',
  'その他': 'other',
};

/** ラベル変換マップ: 提供タイミング */
export const TIME_SLOT_LABEL_TO_VALUE: Record<string, ServingTimeSlot> = {
  '朝食時': 'breakfast',
  '昼食時': 'lunch',
  '夕食時': 'dinner',
  'おやつ時': 'snack',
  'いつでも': 'anytime',
};

/** ラベル変換マップ: 保存方法 */
export const STORAGE_METHOD_LABEL_TO_VALUE: Record<string, StorageMethod> = {
  '常温': 'room_temp',
  '冷蔵': 'refrigerated',
  '冷凍': 'frozen',
};

/** ラベル変換マップ: 残った場合の処置 */
export const HANDLING_LABEL_TO_VALUE: Record<string, RemainingHandlingInstruction> = {
  '指定なし': 'none',
  '破棄してください': 'discarded',
  '保存してください': 'stored',
};

/** ドロップダウン選択肢 */
export const DROPDOWN_OPTIONS = {
  category: ['食べ物', '飲み物'],
  servingMethod: ['そのまま', 'カット', '皮むき', '温める', 'その他'],
  timeSlot: ['朝食時', '昼食時', '夕食時', 'おやつ時', 'いつでも'],
  storageMethod: ['常温', '冷蔵', '冷凍'],
  handling: ['指定なし', '破棄してください', '保存してください'],
} as const;

// =============================================================================
// 画像一括登録 (Phase 68)
// =============================================================================

/** 画像解析リクエスト */
export interface AnalyzeScheduleImageRequest {
  image: string; // base64エンコード
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

/** 画像から抽出された品物 */
export interface ExtractedItem {
  itemName: string;
  category: ItemCategory;
  quantity?: number;
  unit?: string;
  servingDate: string; // YYYY-MM-DD
  servingTimeSlot: ServingTimeSlot;
  servingMethodDetail?: ServingMethod;
  noteToStaff?: string;
  confidence: 'high' | 'medium' | 'low';
}

/** 画像解析メタデータ */
export interface ImageAnalysisMetadata {
  dateRange: {
    start: string;
    end: string;
  };
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/** 画像解析レスポンス */
export interface AnalyzeScheduleImageResponse {
  items: ExtractedItem[];
  metadata: ImageAnalysisMetadata;
}

/** 画像一括登録用のパース済み品物 */
export interface ParsedImageItem {
  index: number;
  extracted: ExtractedItem;
  parsed: {
    itemName: string;
    category: ItemCategory;
    quantity?: number;
    unit: string;
    servingMethod: ServingMethod;
    servingDate: string;
    servingTimeSlot: ServingTimeSlot;
    noteToStaff?: string;
  };
  isDuplicate: boolean;
  duplicateInfo?: {
    existingItemId: string;
    existingItemName: string;
  };
}
