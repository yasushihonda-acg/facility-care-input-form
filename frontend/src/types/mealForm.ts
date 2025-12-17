// 食事入力フォームの型定義
// docs/MEAL_INPUT_FORM_SPEC.md に基づく
// docs/SNACK_RECORD_INTEGRATION_SPEC.md 間食記録連携対応

import type { ConsumptionStatus } from './careItem';

/**
 * 間食詳細記録（品物管理連携用）
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md
 */
export interface SnackRecord {
  itemId?: string;               // care_items のID（紐づけ用）
  itemName: string;              // 品物名（表示・Sheet B用）
  servedQuantity: number;        // 提供数
  unit?: string;                 // 単位（個、切れ等）
  consumptionStatus: ConsumptionStatus;  // full/most/half/little/none
  consumptionRate?: number;      // 0-100（オプション、statusから自動計算可）
  followedInstruction?: boolean; // 家族指示に従ったか
  instructionNote?: string;      // 指示対応メモ
  note?: string;                 // スタッフメモ
  noteToFamily?: string;         // 家族への申し送り
}

export interface MealInputForm {
  // 必須フィールド
  staffName: string;           // 入力者（あなた）は？
  facility: string;            // 利用者様のお住まいの施設は？
  residentName: string;        // 利用者名は？
  dayServiceUsage: '利用中' | '利用中ではない';  // デイサービスの利用中ですか？
  mealTime: '朝' | '昼' | '夜'; // 食事はいつのことですか？
  isImportant: '重要' | '重要ではない';  // 重要特記事項集計表に反映させますか？

  // 条件付き必須フィールド（dayServiceUsage='利用中'の場合必須）
  dayServiceName: string;      // どこのデイサービスですか？

  // 任意フィールド
  mainDishRatio?: string;      // 主食の摂取量は何割ですか？
  sideDishRatio?: string;      // 副食の摂取量は何割ですか？
  injectionType?: string;      // 注入の種類は？
  injectionTypeOther?: string; // その他の注入種類は？（injectionType='その他'の場合）
  injectionAmount?: string;    // 注入量は？
  snack?: string;              // 間食は何を食べましたか？
  note?: string;               // 特記事項
  photo?: File | null;         // 写真アップロード

  // 間食記録連携（Phase 9.0）
  snackRecords?: SnackRecord[]; // 間食詳細記録（品物管理連携）
  residentId?: string;         // 入居者ID（品物連携用）
}

// フォームの初期値
export const initialMealForm: MealInputForm = {
  staffName: '',
  facility: '',
  residentName: '',
  dayServiceUsage: '利用中ではない',
  dayServiceName: '',
  mealTime: '朝',
  isImportant: '重要ではない',
  mainDishRatio: '',
  sideDishRatio: '',
  injectionType: '',
  injectionTypeOther: '',
  injectionAmount: '',
  snack: '',
  note: '',
  photo: null,
};

// 選択肢の定義
export const FACILITIES = [
  'あおぞら荘',
  'ひまわり館',
  'さくら苑',
] as const;

export const RESIDENTS: Record<string, string[]> = {
  'あおぞら荘': ['山田 太郎', '鈴木 花子', '田中 一郎'],
  'ひまわり館': ['佐藤 次郎', '高橋 美咲', '伊藤 健太'],
  'さくら苑': ['渡辺 優子', '小林 誠', '加藤 恵'],
};

export const MEAL_TIMES = ['朝', '昼', '夜'] as const;

export const INTAKE_RATIOS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
] as const;

export const INJECTION_TYPES = [
  'エンシュア リキッド',
  'エンシュア H',
  'ラコールNF 半固形剤',
  'エネーボ',
  'アイソカルサポート',
  'イノラス',
  'ラコールNF',
  'エレンタール',
  'リーナレン',
  'その他',
] as const;

export const INJECTION_AMOUNTS = [
  '50cc',
  '100cc',
  '150cc',
  '200cc',
  '250cc',
  '300cc',
  '350cc',
  '400cc',
  '450cc',
  '500cc',
  '550cc',
  '600cc',
] as const;

/**
 * デイサービス選択肢（固定リスト）
 * 設計書: docs/DAY_SERVICE_OPTIONS_SPEC.md
 */
export const DAY_SERVICE_OPTIONS = [
  '武',
  '田上',
  '笹貫',
  '下荒田',
  '東千石',
  '南栄',
  '永吉',
  '七福の里',
] as const;

// グローバル初期値設定はFirestoreに保存され、APIから取得します
// 管理者は ?admin=true パラメータでアクセスして設定を変更できます
