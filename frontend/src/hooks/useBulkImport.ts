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

interface UseBulkImportReturn {
  // 状態
  parsedItems: ParsedBulkItem[];
  validItems: ParsedBulkItem[];
  errorItems: ParsedBulkItem[];
  duplicateItems: ParsedBulkItem[];
  isLoading: boolean;
  isImporting: boolean;
  importResult: BulkImportResult | null;
  error: string | null;

  // アクション
  parseFile: (file: File) => Promise<void>;
  importItems: () => Promise<BulkImportResult>;
  removeItem: (rowIndex: number) => void;
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

  // ファイルパース
  const parseFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);
      setImportResult(null);

      try {
        const items = await parseExcelFile(file);

        // 重複チェック
        const itemsWithDuplicateCheck = items.map(item => {
          if (item.errors.length > 0) {
            return item; // エラーがある場合は重複チェックしない
          }
          const { isDuplicate, duplicateInfo } = checkBulkItemDuplicate(
            item.parsed.itemName,
            item.parsed.servingDate,
            item.parsed.servingTimeSlot,
            existingItems
          );
          return { ...item, isDuplicate, duplicateInfo };
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

  // 一括登録
  const importItems = useCallback(async (): Promise<BulkImportResult> => {
    setIsImporting(true);
    setError(null);

    const itemsToImport = validItems;
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

      // スキップ分を追加
      for (const item of duplicateItems) {
        results.push({
          rowIndex: item.rowIndex,
          itemName: item.parsed.itemName,
          status: 'skipped',
        });
      }

      const result: BulkImportResult = {
        total: itemsToImport.length + duplicateItems.length,
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
  }, [validItems, duplicateItems, residentId, userId, isDemo]);

  // 行を除外
  const removeItem = useCallback((rowIndex: number) => {
    setParsedItems(prev => prev.filter(item => item.rowIndex !== rowIndex));
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
    isLoading,
    isImporting,
    importResult,
    error,
    parseFile,
    importItems,
    removeItem,
    reset,
  };
}
