/**
 * 画像一括登録用カスタムフック (Phase 68)
 * 画像からの品物抽出と一括登録を管理
 */

import { useState, useCallback, useMemo } from 'react';
import { analyzeScheduleImage, submitCareItem } from '../api';
import { checkBulkItemDuplicate } from '../utils/duplicateCheck';
import type { CareItem, CareItemInput } from '../types/careItem';
import type {
  ExtractedItem,
  ParsedImageItem,
  ImageAnalysisMetadata,
  BulkImportResult,
  BulkImportItemResult,
} from '../types/bulkImport';

interface UseImageBulkImportOptions {
  residentId: string;
  userId: string;
  existingItems: CareItem[];
  isDemo?: boolean;
}

interface UseImageBulkImportReturn {
  // 状態
  parsedItems: ParsedImageItem[];
  validItems: ParsedImageItem[];
  duplicateItems: ParsedImageItem[];
  metadata: ImageAnalysisMetadata | null;
  isAnalyzing: boolean;
  isImporting: boolean;
  importResult: BulkImportResult | null;
  error: string | null;

  // アクション
  analyzeImage: (base64: string, mimeType: string) => Promise<void>;
  importItems: () => Promise<BulkImportResult>;
  removeItem: (index: number) => void;
  reset: () => void;
}

/** servingMethodDetail から ServingMethod への変換 */
function convertServingMethod(
  detail?: string
): 'as_is' | 'cut' | 'peeled' | 'heated' | 'other' {
  const validMethods = ['as_is', 'cut', 'peeled', 'heated', 'other'] as const;
  if (detail && validMethods.includes(detail as typeof validMethods[number])) {
    return detail as typeof validMethods[number];
  }
  return 'as_is';
}

/** デモ用モックデータ */
function generateDemoExtractedItems(): ExtractedItem[] {
  const today = new Date();
  const formatDate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      itemName: 'バナナ',
      category: 'food',
      quantity: 2,
      unit: '本',
      servingDate: formatDate(today),
      servingTimeSlot: 'snack',
      servingMethodDetail: 'as_is',
      confidence: 'high',
    },
    {
      itemName: 'りんごジュース',
      category: 'drink',
      quantity: 1,
      unit: 'パック',
      servingDate: formatDate(today),
      servingTimeSlot: 'snack',
      confidence: 'high',
    },
    {
      itemName: 'みかん',
      category: 'food',
      quantity: 3,
      unit: '個',
      servingDate: formatDate(tomorrow),
      servingTimeSlot: 'snack',
      servingMethodDetail: 'peeled',
      noteToStaff: '皮をむいて提供',
      confidence: 'medium',
    },
  ];
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

export function useImageBulkImport({
  residentId,
  userId,
  existingItems,
  isDemo = false,
}: UseImageBulkImportOptions): UseImageBulkImportReturn {
  const [parsedItems, setParsedItems] = useState<ParsedImageItem[]>([]);
  const [metadata, setMetadata] = useState<ImageAnalysisMetadata | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 分類
  const validItems = useMemo(
    () => parsedItems.filter(item => !item.isDuplicate),
    [parsedItems]
  );

  const duplicateItems = useMemo(
    () => parsedItems.filter(item => item.isDuplicate),
    [parsedItems]
  );

  // 画像解析
  const analyzeImage = useCallback(
    async (base64: string, mimeType: string) => {
      setIsAnalyzing(true);
      setError(null);
      setImportResult(null);

      try {
        let items: ExtractedItem[];
        let analysisMetadata: ImageAnalysisMetadata;

        if (isDemo) {
          // デモモード: モックデータ
          await new Promise(resolve => setTimeout(resolve, 1500));
          items = generateDemoExtractedItems();
          const today = new Date().toISOString().split('T')[0];
          const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          analysisMetadata = {
            dateRange: { start: today, end: nextWeek },
            confidence: 'high',
            warnings: [],
          };
        } else {
          // 本番モード: API呼び出し
          const response = await analyzeScheduleImage({
            image: base64,
            mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
          });

          if (!response.success || !response.data) {
            throw new Error('画像の解析に失敗しました');
          }

          items = response.data.items;
          analysisMetadata = response.data.metadata;
        }

        // ParsedImageItemに変換
        const parsed: ParsedImageItem[] = items.map((item, index) => {
          const servingMethod = convertServingMethod(item.servingMethodDetail);

          // 重複チェック
          const { isDuplicate, duplicateInfo } = checkBulkItemDuplicate(
            item.itemName,
            item.servingDate,
            item.servingTimeSlot,
            existingItems
          );

          return {
            index,
            extracted: item,
            parsed: {
              itemName: item.itemName,
              category: item.category,
              quantity: item.quantity,
              unit: item.unit ?? '個',
              servingMethod,
              servingDate: item.servingDate,
              servingTimeSlot: item.servingTimeSlot,
              noteToStaff: item.noteToStaff,
            },
            isDuplicate,
            duplicateInfo,
          };
        });

        setParsedItems(parsed);
        setMetadata(analysisMetadata);

        // 警告がある場合
        if (analysisMetadata.warnings.length > 0) {
          console.warn('Image analysis warnings:', analysisMetadata.warnings);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '画像の解析に失敗しました');
        setParsedItems([]);
        setMetadata(null);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [existingItems, isDemo]
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
            rowIndex: item.index,
            itemName: item.parsed.itemName,
            status: 'success',
            itemId: `demo-image-${Date.now()}-${item.index}`,
          });
        }
      } else {
        // 本番モード: 並列でAPI呼び出し（同時5件制限）
        const tasks = itemsToImport.map(item => async (): Promise<BulkImportItemResult> => {
          try {
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
              noteToStaff: item.parsed.noteToStaff,
            };

            const response = await submitCareItem(residentId, userId, careItemInput);

            return {
              rowIndex: item.index,
              itemName: item.parsed.itemName,
              status: 'success',
              itemId: response.data?.itemId,
            };
          } catch (err) {
            return {
              rowIndex: item.index,
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
          rowIndex: item.index,
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
  const removeItem = useCallback((index: number) => {
    setParsedItems(prev => prev.filter(item => item.index !== index));
  }, []);

  // リセット
  const reset = useCallback(() => {
    setParsedItems([]);
    setMetadata(null);
    setIsAnalyzing(false);
    setIsImporting(false);
    setImportResult(null);
    setError(null);
  }, []);

  return {
    parsedItems,
    validItems,
    duplicateItems,
    metadata,
    isAnalyzing,
    isImporting,
    importResult,
    error,
    analyzeImage,
    importItems,
    removeItem,
    reset,
  };
}
