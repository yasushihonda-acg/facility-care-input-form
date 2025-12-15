/**
 * 家族ビュー用: 食事シートからResult取得フック
 * @see docs/PLAN_RESULT_MANAGEMENT.md
 */

import { useMemo } from 'react';
import { usePlanData } from './usePlanData';
import type { MealTime, MealResult } from '../types/family';
import type { PlanDataRecord } from '../types';
import {
  extractDateFromTimestamp,
  getMealTimeFromRecord,
} from '../utils/mealTimeMapping';

export interface UseFamilyMealRecordsOptions {
  /** 対象日（YYYY-MM-DD形式） */
  date: string;
  /** 食事タイミング（省略時は全タイミング） */
  mealTime?: MealTime;
  /** 入居者名（部分一致フィルタ） */
  residentName?: string;
}

export interface UseFamilyMealRecordsResult {
  /** フィルタ済みの食事実績 */
  records: MealResult[];
  /** ローディング中 */
  isLoading: boolean;
  /** エラー */
  error: Error | null;
}

/**
 * PlanDataRecord → MealResult変換
 */
function transformToMealResult(record: PlanDataRecord): MealResult {
  return {
    id: record.id,
    staffName: record.staffName,
    recordedAt: record.timestamp,
    mealTime: getMealTimeFromRecord(record) || undefined,
    mainDishAmount: record.data['主食の摂取量は何割ですか？'] || '',
    sideDishAmount: record.data['副食の摂取量は何割ですか？'] || '',
    snack: record.data['間食は何を食べましたか？'] || undefined,
    note: record.data['特記事項'] || undefined,
    isImportant: record.data['重要特記事項集計表に反映させますか？'] === '重要',
    photoUrl: undefined, // 写真URLは将来対応
  };
}

/**
 * 家族ビュー用: 食事シートから実績データを取得するフック
 *
 * @param options - フィルタオプション
 * @returns フィルタ済みの食事実績、ローディング状態、エラー
 *
 * @example
 * ```tsx
 * const { records, isLoading } = useFamilyMealRecords({
 *   date: '2025-12-14',
 *   mealTime: 'lunch',
 * });
 * ```
 */
export function useFamilyMealRecords(
  options: UseFamilyMealRecordsOptions
): UseFamilyMealRecordsResult {
  const { data, isLoading, error } = usePlanData('食事');

  const records = useMemo(() => {
    if (!data?.data?.records) return [];

    return data.data.records
      .filter((record) => {
        // 日付フィルタ
        const recordDate = extractDateFromTimestamp(record.timestamp);
        if (recordDate !== options.date) return false;

        // 食事時間フィルタ（指定時のみ）
        if (options.mealTime) {
          const recordMealTime = getMealTimeFromRecord(record);
          if (recordMealTime !== options.mealTime) return false;
        }

        // 入居者名フィルタ（指定時のみ、部分一致）
        if (options.residentName) {
          if (!record.residentName.includes(options.residentName)) return false;
        }

        return true;
      })
      .map(transformToMealResult);
  }, [data, options.date, options.mealTime, options.residentName]);

  return {
    records,
    isLoading,
    error: error ?? null,
  };
}

/**
 * 指定日の全食事記録を取得（タイムライン用）
 */
export function useDailyMealRecords(
  date: string,
  residentName?: string
): UseFamilyMealRecordsResult {
  return useFamilyMealRecords({
    date,
    residentName,
  });
}
