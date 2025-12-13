/**
 * スプレッドシート設定
 * BUSINESS_RULES.md に基づくシート別アクセス制御を定義
 */

/**
 * Sheet A: 記録の結果（Read-Only Source）
 * - Flow A: 記録参照フローで使用
 * - 操作: 読み取りのみ（書き込み禁止）
 */
export const SHEET_A = {
  id: "1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w",
  name: "Sheet A（記録の結果）",
  url: "https://docs.google.com/spreadsheets/d/1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w/edit",
  permissions: {
    read: true,
    write: false,
    append: false,
    update: false,
    delete: false,
  },
} as const;

/**
 * Sheet A のシート順序定義
 * スプレッドシートのタブ順序に一致させる
 * フロントエンドでの表示順序もこれに準拠する
 */
export const SHEET_A_ORDER: string[] = [
  "食事",
  "水分摂取量",
  "排便・排尿",
  "バイタル",
  "口腔ケア",
  "内服",
  "特記事項",
  "血糖値インスリン投与",
  "往診録",
  "体重",
  "カンファレンス録",
];

/**
 * Sheet B: 実績入力先（Write-Only Destination）
 * - Flow B: 実績入力フローで使用
 * - 操作: 追記のみ（読み取り・更新禁止）
 * - 特殊仕様: Bot連携ハック適用（BUSINESS_RULES.md 参照）
 */
export const SHEET_B = {
  id: "1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0",
  name: "Sheet B（実績入力先）",
  url: "https://docs.google.com/spreadsheets/d/1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0/edit",
  permissions: {
    read: false,
    write: false,
    append: true,
    update: false,
    delete: false,
  },
} as const;

/**
 * Sheet B の列定義
 * Bot連携ハック対応のため、列位置を明示的に定義
 */
export const SHEET_B_COLUMNS = {
  TIMESTAMP: 0, // A列: タイムスタンプ
  STAFF_ID: 1, // B列: スタッフID
  RESIDENT_ID: 2, // C列: 入居者ID
  MEAL_CONTENT: 3, // D列: 食事内容
  SNACK_CONTENT: 4, // E列: 間食内容（通常用）
  HYDRATION_AMOUNT: 5, // F列: 水分摂取量
  SPECIAL_NOTES: 6, // G列: 特記事項（Bot連携ハック用）
  IMPORTANCE: 7, // H列: 重要度（Bot連携ハック用）
  IMAGE_URL: 8, // I列: 画像URL
  NOTES: 9, // J列: 備考
} as const;

/**
 * Bot連携ハック用の定数
 * 間食入力時に使用される値
 */
export const BOT_HACK = {
  /** 重要度列にセットする値（既存GAS Botがこの値を検知） */
  IMPORTANCE_FLAG: "重要",
  /** 特記事項に付与するプレフィックス */
  SNACK_PREFIX: "【間食】",
} as const;

/**
 * Firestore コレクション名
 */
export const COLLECTIONS = {
  /** Flow A: 同期された記録データ */
  PLAN_DATA: "plan_data",
  /** Flow C: 家族要望 */
  FAMILY_REQUESTS: "family_requests",
  /** 同期メタデータ（最終同期日時管理） */
  SYNC_METADATA: "sync_metadata",
} as const;

/**
 * Google Drive フォルダ設定
 * 画像連携で使用
 */
export const DRIVE_CONFIG = {
  /** ルートフォルダ名 */
  ROOT_FOLDER_NAME: "CareRecordImages",
  /** フォルダ構成: {ROOT}/{YYYY}/{MM}/ */
  DATE_FORMAT: {
    YEAR: "YYYY",
    MONTH: "MM",
  },
} as const;

/**
 * Cloud Functions 共通設定
 */
export const FUNCTIONS_CONFIG = {
  /** デプロイリージョン */
  REGION: "asia-northeast1",
  /** サービスアカウント */
  SERVICE_ACCOUNT: "facility-care-sa@facility-care-input-form.iam.gserviceaccount.com",
} as const;
