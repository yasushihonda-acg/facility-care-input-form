/**
 * 間食セクションコンポーネント
 * 品物リスト表示と提供記録入力を統合
 *
 * @see docs/SNACK_RECORD_INTEGRATION_SPEC.md セクション5
 */

import { useMemo, useCallback } from 'react';
import type { CareItem } from '../../types/careItem';
import type { SnackRecord } from '../../types/mealForm';
import { useCareItems } from '../../hooks/useCareItems';
import { FamilyItemList } from './FamilyItemList';
import { SnackRecordCard } from './SnackRecordCard';

interface SnackSectionProps {
  /** 入居者ID（品物フィルタリング用） */
  residentId?: string;
  /** 選択された間食記録 */
  snackRecords: SnackRecord[];
  /** 間食記録が変更されたときのコールバック */
  onSnackRecordsChange: (records: SnackRecord[]) => void;
  /** 自由テキスト（従来互換） */
  freeText: string;
  /** 自由テキスト変更コールバック */
  onFreeTextChange: (text: string) => void;
}

export function SnackSection({
  residentId,
  snackRecords,
  onSnackRecordsChange,
  freeText,
  onFreeTextChange,
}: SnackSectionProps) {
  // 品物リストを取得（在庫ありのみ）
  const { data, isLoading, error } = useCareItems({
    residentId,
    status: ['pending', 'in_progress'],
    limit: 50,
  });

  const items = data?.items ?? [];

  // 選択済みアイテムIDリスト
  const selectedItemIds = useMemo(
    () => snackRecords.filter(r => r.itemId).map(r => r.itemId!),
    [snackRecords]
  );

  // itemIdから家族指示を取得するマップ
  const itemInstructionMap = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.noteToStaff) {
        map.set(item.id, item.noteToStaff);
      }
    });
    return map;
  }, [items]);

  /**
   * 品物を選択/選択解除
   */
  const handleItemSelect = (item: CareItem) => {
    const existingIndex = snackRecords.findIndex(r => r.itemId === item.id);

    if (existingIndex >= 0) {
      // 既に選択済み → 解除
      const newRecords = [...snackRecords];
      newRecords.splice(existingIndex, 1);
      onSnackRecordsChange(newRecords);
    } else {
      // 新規選択 → 追加（デフォルト値で）
      const newRecord: SnackRecord = {
        itemId: item.id,
        itemName: item.itemName,
        servedQuantity: 1,
        unit: item.unit,
        consumptionStatus: 'full', // デフォルト: 完食
        followedInstruction: !!item.noteToStaff, // 指示がある場合はデフォルトでチェック
      };
      onSnackRecordsChange([...snackRecords, newRecord]);
    }
  };

  /**
   * レコードを更新
   */
  const handleRecordChange = useCallback(
    (index: number, updates: Partial<SnackRecord>) => {
      const newRecords = [...snackRecords];
      newRecords[index] = { ...newRecords[index], ...updates };
      onSnackRecordsChange(newRecords);
    },
    [snackRecords, onSnackRecordsChange]
  );

  /**
   * レコードを削除
   */
  const handleRecordRemove = useCallback(
    (index: number) => {
      const newRecords = [...snackRecords];
      newRecords.splice(index, 1);
      onSnackRecordsChange(newRecords);
    },
    [snackRecords, onSnackRecordsChange]
  );

  // 品物がない場合は従来の自由テキスト入力のみ表示
  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      {/* セクションヘッダー */}
      <div className="flex items-center gap-2">
        <span className="text-lg">🍪</span>
        <h3 className="font-medium text-gray-800">間食について</h3>
      </div>

      {/* 品物リスト（品物がある場合のみ表示） */}
      {hasItems && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 font-medium">
            【家族からの品物】在庫があるもの
          </p>
          <FamilyItemList
            items={items}
            selectedItemIds={selectedItemIds}
            onItemSelect={handleItemSelect}
            isLoading={isLoading}
            error={error as Error | null}
          />
        </div>
      )}

      {/* 提供記録入力カード */}
      {snackRecords.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">
            【今回の提供記録】{snackRecords.length}件
          </p>
          {snackRecords.map((record, index) => (
            <SnackRecordCard
              key={record.itemId || index}
              record={record}
              index={index}
              familyInstruction={record.itemId ? itemInstructionMap.get(record.itemId) : undefined}
              onChange={handleRecordChange}
              onRemove={handleRecordRemove}
            />
          ))}
        </div>
      )}

      {/* 自由テキスト入力（従来互換） */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          間食について補足（自由記入）
        </label>
        <input
          type="text"
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="その他の間食について記入"
        />
      </div>

      {/* ローディング中の表示 */}
      {isLoading && !hasItems && (
        <div className="p-4 text-center text-gray-500 text-sm">
          品物情報を読み込み中...
        </div>
      )}
    </div>
  );
}
