/**
 * 家族向け機能の型定義
 * @see docs/FAMILY_UX_DESIGN.md
 */

/** 食事タイミング */
export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** 食事タイミング日本語表示 */
export const MEAL_TIME_LABELS: Record<MealTime, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

/** 食事タイミングアイコン */
export const MEAL_TIME_ICONS: Record<MealTime, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪',
};

/** 食事タイミング標準時間 */
export const MEAL_TIME_HOURS: Record<MealTime, string> = {
  breakfast: '7:30',
  lunch: '12:00',
  dinner: '18:00',
  snack: '15:00',
};

/** 条件トリガー */
export type ConditionTrigger = 'leftover' | 'poor_condition' | 'no_appetite' | 'after_rehab';

/** 条件トリガー日本語表示 */
export const CONDITION_TRIGGER_LABELS: Record<ConditionTrigger, string> = {
  leftover: '残食あり',
  poor_condition: '体調不良',
  no_appetite: '食欲なし',
  after_rehab: 'リハビリ後',
};

/** 条件アクション */
export type ConditionAction = 'reserve_snack' | 'reduce_amount' | 'cancel' | 'alternative';

/** 条件アクション日本語表示 */
export const CONDITION_ACTION_LABELS: Record<ConditionAction, string> = {
  reserve_snack: 'おやつに回す',
  reduce_amount: '量を減らす',
  cancel: '提供を中止',
  alternative: '代替メニューに変更',
};

/** 条件ロジック */
export interface CareCondition {
  trigger: ConditionTrigger;
  action: ConditionAction;
}

/** ケア指示の優先度 */
export type CarePriority = 'normal' | 'critical';

/** 優先度日本語表示 */
export const CARE_PRIORITY_LABELS: Record<CarePriority, string> = {
  normal: '通常',
  critical: '絶対厳守',
};

/** ケア指示のステータス */
export type CareStatus = 'pending' | 'acknowledged' | 'completed';

/** ステータス日本語表示 */
export const CARE_STATUS_LABELS: Record<CareStatus, string> = {
  pending: '未確認',
  acknowledged: '確認済み',
  completed: '完了',
};

/**
 * 構造化されたケア指示（CareInstruction）
 * FAXの代替となる詳細な指示を管理
 */
export interface CareInstruction {
  id: string;
  userId: string;              // ご家族ID
  residentId: string;          // 入居者ID

  // 対象指定
  targetDate: string;          // "2025-12-14"
  mealTime: MealTime;

  // メニュー・指示内容
  menuName: string;            // "キウイ"
  processingDetail: string;    // 詳細指示（必須・長文OK）

  // 条件付きロジック（オプション）
  conditions?: CareCondition[];

  // 優先度
  priority: CarePriority;      // critical = 絶対厳守

  // ステータス
  status: CareStatus;

  // メタ情報（Timestamp型はデモではstring日時で代用）
  createdAt: string;
  updatedAt: string;
}

/** プリセット設定 */
export interface CarePreset {
  id: string;
  name: string;                // "キウイ8等分"
  processingDetail: string;    // 詳細指示内容
  icon?: string;               // オプションアイコン
}

/** タイムラインアイテムのステータス */
export type TimelineStatus = 'completed' | 'provided' | 'pending' | 'has_instruction';

/** タイムラインステータス表示設定 */
export const TIMELINE_STATUS_CONFIG: Record<TimelineStatus, { icon: string; label: string; color: string }> = {
  completed: { icon: '✅', label: '完了', color: 'text-green-600' },
  provided: { icon: '✅', label: '提供済み', color: 'text-green-600' },
  pending: { icon: '⏳', label: '未提供', color: 'text-gray-500' },
  has_instruction: { icon: '📋', label: '指示あり', color: 'text-blue-600' },
};

/**
 * タイムライン表示用アイテム
 * View C（家族ホーム）で使用
 */
export interface TimelineItem {
  id: string;
  date: string;                // "2025-12-14"
  mealTime: MealTime;
  status: TimelineStatus;

  // 実績データ（Flow B）
  mainDishAmount?: string;     // "8割"
  sideDishAmount?: string;     // "7割"
  staffName?: string;          // 記録者名
  recordedAt?: string;         // 記録日時
  photoUrl?: string;           // 写真URL
  note?: string;               // 備考

  // 指示データ（Flow C）
  instruction?: CareInstruction;

  // 重要フラグ（間食Bot連携）
  isImportant?: boolean;
}

/**
 * エビデンス対比表示用データ
 * View A（エビデンス・モニター）で使用
 */
export interface EvidenceData {
  // 対象
  date: string;
  mealTime: MealTime;

  // Plan（指示）側
  plan?: {
    menuName: string;
    processingDetail: string;
    priority: CarePriority;
    conditions?: CareCondition[];
  };

  // Result（実績）側
  result?: {
    photoUrl?: string;
    staffName: string;
    recordedAt: string;
    mainDishAmount: string;
    sideDishAmount: string;
    note?: string;
  };
}

/** 入居者情報（デモ用簡易型） */
export interface Resident {
  id: string;
  name: string;
  roomNumber?: string;
}

/** 家族ユーザー情報（デモ用簡易型） */
export interface FamilyUser {
  id: string;
  name: string;
  residentId: string;          // 関連する入居者ID
}
