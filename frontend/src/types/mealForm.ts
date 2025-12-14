// 食事入力フォームの型定義
// docs/MEAL_INPUT_FORM_SPEC.md に基づく

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

// デイサービス施設リスト
export const DAY_SERVICES = [
  'デイサービスあおぞら',
  'デイサービスひまわり',
  'デイサービスさくら',
  'その他',
] as const;

/**
 * グローバル初期値設定（全ユーザー共通）
 *
 * 注意: この値は全ユーザーに等しく適用されます。
 * 変更する場合はコードを修正してデプロイが必要です。
 *
 * 現在の設定:
 * - facility: 空（ユーザーが毎回選択）
 * - residentName: 空（施設選択後に選択）
 * - dayServiceName: 空（必要に応じて選択）
 */
export const GLOBAL_DEFAULTS = {
  /** デフォルト施設（空文字 = 未選択） */
  facility: '',
  /** デフォルト利用者名（空文字 = 未選択） */
  residentName: '',
  /** デフォルトデイサービス（空文字 = 未選択） */
  dayServiceName: '',
} as const;
