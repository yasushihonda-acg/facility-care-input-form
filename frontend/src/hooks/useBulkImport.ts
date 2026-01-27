/**
 * 一括登録用カスタムフック
 */

import { useState, useCallback, useMemo } from 'react';
import { submitCareItem } from '../api';
import { parseExcelFile } from '../utils/excelParser';
import { checkBulkItemDuplicate } from '../utils/duplicateCheck';
import type { CareItem, CareItemInput, RemainingHandlingCondition } from '../types/careItem';
import type { ParsedBulkItem, BulkImportResult, BulkImportItemResult } from '../types/bulkImport';

interface UseBulkImportOptions {
  residentId: string;
  userId: string;
  existingItems: CareItem[];
  isDemo?: boolean;
}

/** 品物の編集可能フィールド */
export interface EditableItemFields {
  itemName?: string;
  category?: 'food' | 'drink';
  quantity?: number;
  unit?: string;
  servingMethod?: 'as_is' | 'cut' | 'peeled' | 'heated' | 'other';
  servingDate?: string;
  servingTimeSlot?: 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'anytime';
  noteToStaff?: string;
}

interface UseBulkImportReturn {
  // 状態
  parsedItems: ParsedBulkItem[];
  validItems: ParsedBulkItem[];
  errorItems: ParsedBulkItem[];
  duplicateItems: ParsedBulkItem[];
  selectedItems: ParsedBulkItem[];
  isLoading: boolean;
  isImporting: boolean;
  importResult: BulkImportResult | null;
  error: string | null;

  // アクション
  parseFile: (file: File) => Promise<void>;
  importItems: () => Promise<BulkImportResult>;
  removeItem: (rowIndex: number) => void;
  updateItem: (rowIndex: number, fields: EditableItemFields) => void;
  toggleSelect: (rowIndex: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  reset: () => void;
}

/** 同時実行数制限付きPromise並列実行 */
async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = Promise.resolve().then(() => task()).then(result => {
      results.push(result);
    });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(e => e === p),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}


export function useBulkImport({
  residentId,
  userId,
  existingItems,
  isDemo = false,
}: UseBulkImportOptions): UseBulkImportReturn {
  const [parsedItems, setParsedItems] = useState<ParsedBulkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 分類
  const validItems = useMemo(
    () => parsedItems.filter(item => item.errors.length === 0 && !item.isDuplicate),
    [parsedItems]
  );

  const errorItems = useMemo(
    () => parsedItems.filter(item => item.errors.length > 0),
    [parsedItems]
  );

  const duplicateItems = useMemo(
    () => parsedItems.filter(item => item.isDuplicate),
    [parsedItems]
  );

  // 選択された品物（登録対象）
  const selectedItems = useMemo(
    () => validItems.filter(item => item.isSelected),
    [validItems]
  );

  // ファイルパース
  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setImportResult(null);

      try {
        const items = await parseExcelFile(file);

        // 重複チェック + 選択状態を初期化
        const itemsWithDuplicateCheck = items.map(item => {
          if (item.errors.length > 0) {
            return { ...item, isSelected: false }; // エラーがある場合は選択解除
          }
          const { isDuplicate, duplicateInfo } = checkBulkItemDuplicate(
            item.parsed.itemName,
            item.parsed.servingDate,
            item.parsed.servingTimeSlot,
            existingItems
          );
          return { ...item, isDuplicate, duplicateInfo, isSelected: !isDuplicate };
        });

        setParsedItems(itemsWithDuplicateCheck);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました');
        setParsedItems([]);
      } finally {
        setIsLoading(false);
      }
    },
    [existingItems]
  );

  // 一括登録（選択された品物のみ）
  const importItems = useCallback(async (): Promise<BulkImportResult> => {
    setIsImporting(true);
    setError(null);

    const itemsToImport = selectedItems;
    const skippedBySelection = validItems.filter(item => !item.isSelected);
    const results: BulkImportItemResult[] = [];

    try {
      if (isDemo) {
        // デモモード: モックレスポンス
        await new Promise(resolve => setTimeout(resolve, 1000));

        for (const item of itemsToImport) {
          results.push({
            rowIndex: item.rowIndex,
            itemName: item.parsed.itemName,
            status: 'success',
            itemId: `demo-bulk-${Date.now()}-${item.rowIndex}`,
          });
        }
      } else {
        // 本番モード: 並列でAPI呼び出し（同時5件制限）
        const tasks = itemsToImport.map(item => async (): Promise<BulkImportItemResult> => {
          try {
            // CareItemInputを構築
            const careItemInput: CareItemInput = {
              itemName: item.parsed.itemName,
              category: item.parsed.category,
              quantity: item.parsed.quantity,
              unit: item.parsed.unit,
              servingMethod: item.parsed.servingMethod,
              servingSchedule: {
                type: 'once',
                date: item.parsed.servingDate,
                timeSlot: item.parsed.servingTimeSlot,
              },
              expirationDate: item.parsed.expirationDate,
              storageMethod: item.parsed.storageMethod,
              noteToStaff: item.parsed.noteToStaff,
              remainingHandlingInstruction: item.parsed.remainingHandlingInstruction,
              remainingHandlingConditions: item.parsed.remainingHandlingCondition
                ? [{ condition: item.parsed.remainingHandlingCondition } as RemainingHandlingCondition]
                : undefined,
            };

            const response = await submitCareItem(residentId, userId, careItemInput);

            return {
              rowIndex: item.rowIndex,
              itemName: item.parsed.itemName,
              status: 'success',
              itemId: response.data?.itemId,
            };
          } catch (err) {
            return {
              rowIndex: item.rowIndex,
              itemName: item.parsed.itemName,
              status: 'failed',
              error: err instanceof Error ? err.message : '登録に失敗しました',
            };
          }
        });

        const taskResults = await pLimit(tasks, 5);
        results.push(...taskResults);
      }

      // スキップ分を追加（重複＋未選択）
      for (const item of duplicateItems) {
        results.push({
          rowIndex: item.rowIndex,
          itemName: item.parsed.itemName,
          status: 'skipped',
        });
      }
      for (const item of skippedBySelection) {
        results.push({
          rowIndex: item.rowIndex,
          itemName: item.parsed.itemName,
          status: 'skipped',
        });
      }

      const result: BulkImportResult = {
        total: itemsToImport.length + duplicateItems.length + skippedBySelection.length,
        success: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        results,
      };

      setImportResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '一括登録に失敗しました');
      throw err;
    } finally {
      setIsImporting(false);
    }
  }, [selectedItems, validItems, duplicateItems, residentId, userId, isDemo]);

  // 行を除外
  const removeItem = useCallback((rowIndex: number) => {
    setParsedItems(prev => prev.filter(item => item.rowIndex !== rowIndex));
  }, []);

  // 品物の編集
  const updateItem = useCallback((rowIndex: number, fields: EditableItemFields) => {
    setParsedItems(prev => prev.map(item => {
      if (item.rowIndex !== rowIndex) return item;

      const updatedParsed = { ...item.parsed };

      if (fields.itemName !== undefined) updatedParsed.itemName = fields.itemName;
      if (fields.category !== undefined) updatedParsed.category = fields.category;
      if (fields.quantity !== undefined) updatedParsed.quantity = fields.quantity;
      if (fields.unit !== undefined) updatedParsed.unit = fields.unit;
      if (fields.servingMethod !== undefined) updatedParsed.servingMethod = fields.servingMethod;
      if (fields.servingDate !== undefined) updatedParsed.servingDate = fields.servingDate;
      if (fields.servingTimeSlot !== undefined) updatedParsed.servingTimeSlot = fields.servingTimeSlot;
      if (fields.noteToStaff !== undefined) updatedParsed.noteToStaff = fields.noteToStaff;

      // 品物名・提供日・タイミングが変わったら重複を再チェック
      const needsDuplicateRecheck =
        fields.itemName !== undefined ||
        fields.servingDate !== undefined ||
        fields.servingTimeSlot !== undefined;

      if (needsDuplicateRecheck) {
        const { isDuplicate, duplicateInfo } = checkBulkItemDuplicate(
          updatedParsed.itemName,
          updatedParsed.servingDate,
          updatedParsed.servingTimeSlot,
          existingItems
        );
        return { ...item, parsed: updatedParsed, isDuplicate, duplicateInfo };
      }

      return { ...item, parsed: updatedParsed };
    }));
  }, [existingItems]);

  // 選択切り替え
  const toggleSelect = useCallback((rowIndex: number) => {
    setParsedItems(prev => prev.map(item =>
      item.rowIndex === rowIndex ? { ...item, isSelected: !item.isSelected } : item
    ));
  }, []);

  // 全選択（エラー・重複以外）
  const selectAll = useCallback(() => {
    setParsedItems(prev => prev.map(item =>
      (item.errors.length > 0 || item.isDuplicate) ? item : { ...item, isSelected: true }
    ));
  }, []);

  // 全選択解除
  const deselectAll = useCallback(() => {
    setParsedItems(prev => prev.map(item => ({ ...item, isSelected: false })));
  }, []);

  // リセット
  const reset = useCallback(() => {
    setParsedItems([]);
    setIsLoading(false);
    setIsImporting(false);
    setImportResult(null);
    setError(null);
  }, []);

  return {
    parsedItems,
    validItems,
    errorItems,
    duplicateItems,
    selectedItems,
    isLoading,
    isImporting,
    importResult,
    error,
    parseFile,
    importItems,
    removeItem,
    updateItem,
    toggleSelect,
    selectAll,
    deselectAll,
    reset,
  };
}
