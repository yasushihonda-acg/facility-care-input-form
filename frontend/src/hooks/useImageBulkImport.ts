/**
 * 画像一括登録用カスタムフック (Phase 68)
 * Phase 69: 複数画像対応
 * 画像からの品物抽出と一括登録を管理
 */

import { useState, useCallback, useMemo } from 'react';
import pLimit from 'p-limit';
import { analyzeScheduleImages, submitCareItem, notifyBulkImport } from '../api';
import type { ImageData } from '../api';
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

interface UseImageBulkImportReturn {
  // 状態
  parsedItems: ParsedImageItem[];
  validItems: ParsedImageItem[];
  duplicateItems: ParsedImageItem[];
  selectedItems: ParsedImageItem[];
  metadata: ImageAnalysisMetadata | null;
  isAnalyzing: boolean;
  isImporting: boolean;
  importResult: BulkImportResult | null;
  error: string | null;

  // アクション
  /** 複数画像を解析（Phase 69） */
  analyzeImages: (images: ImageData[]) => Promise<void>;
  /** 後方互換: 単一画像を解析 */
  analyzeImage: (base64: string, mimeType: string) => Promise<void>;
  importItems: () => Promise<BulkImportResult>;
  removeItem: (index: number) => void;
  updateItem: (index: number, fields: EditableItemFields) => void;
  toggleSelect: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
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

  // 選択された品物（登録対象）
  const selectedItems = useMemo(
    () => validItems.filter(item => item.isSelected),
    [validItems]
  );

  /**
   * 抽出結果内の重複を検出
   * 同一日付・同一時間帯・同一品目の組み合わせが重複しているかチェック
   */
  const checkInternalDuplicates = useCallback(
    (items: ExtractedItem[]): Set<number> => {
      const seen = new Map<string, number>(); // key -> first index
      const duplicateIndices = new Set<number>();

      items.forEach((item, index) => {
        const key = `${item.itemName}|${item.servingDate}|${item.servingTimeSlot}`;
        if (seen.has(key)) {
          // 後のインデックスを重複としてマーク
          duplicateIndices.add(index);
        } else {
          seen.set(key, index);
        }
      });

      return duplicateIndices;
    },
    []
  );

  // 複数画像解析（Phase 69）
  const analyzeImagesImpl = useCallback(
    async (images: ImageData[]) => {
      setIsAnalyzing(true);
      setError(null);
      setImportResult(null);

      try {
        if (images.length === 0) {
          throw new Error('画像を選択してください');
        }

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
            warnings: images.length > 1 ? [`${images.length}枚の画像を解析しました`] : [],
          };
        } else {
          // 本番モード: API呼び出し（複数画像対応）
          const response = await analyzeScheduleImages(images);

          if (!response.success || !response.data) {
            throw new Error('画像の解析に失敗しました');
          }

          items = response.data.items;
          analysisMetadata = response.data.metadata;
        }

        // 抽出結果内の重複を検出
        const internalDuplicates = checkInternalDuplicates(items);

        // ParsedImageItemに変換
        const parsed: ParsedImageItem[] = items.map((item, index) => {
          const servingMethod = convertServingMethod(item.servingMethodDetail);

          // 既存品物との重複チェック
          const { isDuplicate: isExistingDuplicate, duplicateInfo } = checkBulkItemDuplicate(
            item.itemName,
            item.servingDate,
            item.servingTimeSlot,
            existingItems
          );

          // 抽出結果内の重複
          const isInternalDuplicate = internalDuplicates.has(index);

          return {
            index,
            extracted: item,
            parsed: {
              itemName: item.itemName,
              category: item.category,
              quantity: item.quantity && item.quantity >= 1 ? item.quantity : 1, // 1未満は1に
              unit: item.unit ?? '個',
              servingMethod,
              servingDate: item.servingDate,
              servingTimeSlot: item.servingTimeSlot,
              noteToStaff: item.noteToStaff,
            },
            // 既存品物との重複 または 抽出結果内の重複
            isDuplicate: isExistingDuplicate || isInternalDuplicate,
            duplicateInfo: isExistingDuplicate ? duplicateInfo : isInternalDuplicate ? {
              existingItemId: '',
              existingItemName: `抽出結果内で重複（${item.itemName}）`,
            } : undefined,
            isSelected: !isExistingDuplicate && !isInternalDuplicate, // 重複でなければ選択状態
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
    [existingItems, isDemo, checkInternalDuplicates]
  );

  // 後方互換: 単一画像解析
  const analyzeImage = useCallback(
    async (base64: string, mimeType: string) => {
      await analyzeImagesImpl([{
        image: base64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      }]);
    },
    [analyzeImagesImpl]
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
            rowIndex: item.index,
            itemName: item.parsed.itemName,
            status: 'success',
            itemId: `demo-image-${Date.now()}-${item.index}`,
          });
        }
      } else {
        // 本番モード: 並列でAPI呼び出し（同時5件制限）
        // npm p-limit を使用（自作実装のバグを回避）
        // Phase 69.3: 個別通知をスキップし、最後にサマリ通知を送信
        const limit = pLimit(5);
        const taskPromises = itemsToImport.map(item => limit(async (): Promise<BulkImportItemResult> => {
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

            // skipNotification: true で個別通知をスキップ
            const response = await submitCareItem(residentId, userId, careItemInput, {
              skipNotification: true,
            });

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
        }));

        const taskResults = await Promise.all(taskPromises);
        results.push(...taskResults);
      }

      // スキップ分を追加（重複＋未選択）
      for (const item of duplicateItems) {
        results.push({
          rowIndex: item.index,
          itemName: item.parsed.itemName,
          status: 'skipped',
        });
      }
      for (const item of skippedBySelection) {
        results.push({
          rowIndex: item.index,
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

      // Phase 69.3: 一括登録完了通知（サマリ）を送信
      // デモモードでなく、成功が1件以上ある場合のみ
      if (!isDemo && result.success > 0) {
        try {
          await notifyBulkImport(userId, {
            total: result.total,
            success: result.success,
            failed: result.failed,
            skipped: result.skipped,
            items: results.map(r => ({
              itemName: r.itemName,
              status: r.status,
            })),
          });
        } catch (notifyErr) {
          // 通知失敗は登録結果に影響しない
          console.warn('Bulk import notification failed:', notifyErr);
        }
      }

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
  const removeItem = useCallback((index: number) => {
    setParsedItems(prev => prev.filter(item => item.index !== index));
  }, []);

  // 品物の編集
  const updateItem = useCallback((index: number, fields: EditableItemFields) => {
    setParsedItems(prev => prev.map(item => {
      if (item.index !== index) return item;

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
  const toggleSelect = useCallback((index: number) => {
    setParsedItems(prev => prev.map(item =>
      item.index === index ? { ...item, isSelected: !item.isSelected } : item
    ));
  }, []);

  // 全選択
  const selectAll = useCallback(() => {
    setParsedItems(prev => prev.map(item =>
      item.isDuplicate ? item : { ...item, isSelected: true }
    ));
  }, []);

  // 全選択解除
  const deselectAll = useCallback(() => {
    setParsedItems(prev => prev.map(item => ({ ...item, isSelected: false })));
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
    selectedItems,
    metadata,
    isAnalyzing,
    isImporting,
    importResult,
    error,
    analyzeImages: analyzeImagesImpl,
    analyzeImage, // 後方互換
    importItems,
    removeItem,
    updateItem,
    toggleSelect,
    selectAll,
    deselectAll,
    reset,
  };
}
