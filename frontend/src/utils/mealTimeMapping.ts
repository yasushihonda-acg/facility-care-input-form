/**
 * 食事時間マッピングユーティリティ
 * 食事シートの値と家族ビューのMealTimeを相互変換
 * @see docs/PLAN_RESULT_MANAGEMENT.md
 */

import type { MealTime } from '../types/family';
import type { PlanDataRecord } from '../types';

/**
 * 食事シートの値 → MealTime
 * Sheet A/Bの「食事はいつのことですか？」の値をMealTimeに変換
 */
export const MEAL_TIME_FROM_SHEET: Record<string, MealTime> = {
  '朝': 'breakfast',
  '昼': 'lunch',
  '夜': 'dinner',
};

/**
 * MealTime → 食事シートの値
 */
export const MEAL_TIME_TO_SHEET: Record<MealTime, string> = {
  'breakfast': '朝',
  'lunch': '昼',
  'dinner': '夜',
  'snack': '間食',
};

/**
 * タイムスタンプから日付を抽出
 * @param timestamp - "YYYY/MM/DD HH:mm:ss" 形式
 * @returns "YYYY-MM-DD" 形式、パース失敗時は空文字
 * @example
 * extractDateFromTimestamp("2025/12/14 12:15:00") // "2025-12-14"
 */
export function extractDateFromTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * PlanDataRecordからMealTimeを取得
 * @param record - 食事シートのレコード
 * @returns MealTime、取得できない場合はnull
 */
export function getMealTimeFromRecord(record: PlanDataRecord): MealTime | null {
  const sheetValue = record.data['食事はいつのことですか？'];
  if (!sheetValue) return null;
  return MEAL_TIME_FROM_SHEET[sheetValue] || null;
}

/**
 * タイムスタンプから時刻部分を抽出
 * @param timestamp - "YYYY/MM/DD HH:mm:ss" 形式
 * @returns "HH:mm" 形式
 */
export function extractTimeFromTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  const match = timestamp.match(/(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return '';
  const [, hour, minute] = match;
  return `${hour.padStart(2, '0')}:${minute}`;
}

/**
 * YYYY-MM-DD形式の日付をYYYY/M/D形式に変換
 * @param isoDate - "YYYY-MM-DD" 形式
 * @returns "YYYY/M/D" 形式（Sheet形式での検索用）
 */
export function toSheetDateFormat(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, year, month, day] = match;
  return `${year}/${parseInt(month, 10)}/${parseInt(day, 10)}`;
}
