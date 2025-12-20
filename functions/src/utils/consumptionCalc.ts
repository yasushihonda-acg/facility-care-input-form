/**
 * 消費量計算ユーティリティ
 * Phase 15.7: 残り対応による在庫・統計の分離計算
 * @see docs/STAFF_RECORD_FORM_SPEC.md セクション10
 */

import type {RemainingHandling} from "../types";

/**
 * 消費量計算結果
 */
export interface ConsumptionAmounts {
  /** 統計用：実際に食べた量 */
  consumedQuantity: number;
  /** 在庫用：在庫から引く量 */
  inventoryDeducted: number;
  /** 廃棄量（破棄時のみ） */
  wastedQuantity: number;
}

/**
 * 残り対応に基づいて消費量を計算
 *
 * 計算ルール:
 * - 破棄した (discarded): 提供量全てを在庫から引く、廃棄量を記録
 * - 保存した (stored): 食べた分のみ在庫から引く
 * - その他 (other): 食べた分のみ在庫から引く（保存と同じ扱い）
 * - 完食 (rate=100): 提供量全てを消費
 *
 * @param servedQuantity 提供量
 * @param consumptionRate 摂食率 (0-100)
 * @param remainingHandling 残り対応（未指定時は 'stored' 扱い）
 * @returns 計算結果
 */
export function calculateConsumptionAmounts(
  servedQuantity: number,
  consumptionRate: number,
  remainingHandling?: RemainingHandling
): ConsumptionAmounts {
  // 実際に食べた量（統計用）
  const consumedQuantity = (consumptionRate / 100) * servedQuantity;

  // 残った量
  const remainingQuantity = servedQuantity - consumedQuantity;

  // 在庫から引く量（残り対応で分岐）
  let inventoryDeducted: number;
  let wastedQuantity: number;

  if (consumptionRate >= 100) {
    // 完食：全量消費
    inventoryDeducted = servedQuantity;
    wastedQuantity = 0;
  } else if (remainingHandling === "discarded") {
    // 破棄：提供量全てを在庫から引く
    inventoryDeducted = servedQuantity;
    wastedQuantity = remainingQuantity;
  } else {
    // 保存・その他・未指定：食べた分のみ在庫から引く
    inventoryDeducted = consumedQuantity;
    wastedQuantity = 0;
  }

  return {
    consumedQuantity: Math.round(consumedQuantity * 100) / 100,
    inventoryDeducted: Math.round(inventoryDeducted * 100) / 100,
    wastedQuantity: Math.round(wastedQuantity * 100) / 100,
  };
}

/**
 * 記録後の残量を計算
 *
 * @param currentQuantity 現在の残量
 * @param servedQuantity 提供量
 * @param consumptionRate 摂食率 (0-100)
 * @param remainingHandling 残り対応
 * @returns 記録後の残量
 */
export function calculateQuantityAfter(
  currentQuantity: number,
  servedQuantity: number,
  consumptionRate: number,
  remainingHandling?: RemainingHandling
): number {
  const {inventoryDeducted} = calculateConsumptionAmounts(
    servedQuantity,
    consumptionRate,
    remainingHandling
  );
  const quantityAfter = currentQuantity - inventoryDeducted;
  return Math.round(quantityAfter * 100) / 100;
}
