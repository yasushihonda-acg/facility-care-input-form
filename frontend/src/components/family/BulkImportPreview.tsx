/**
 * 一括登録プレビューコンポーネント
 * パース結果の一覧表示とエラー・重複の表示
 * Phase 68.1: 編集機能・チェックボックス選択機能を追加
 */

import { useState, useCallback } from 'react';
import type { ParsedBulkItem, ParsedImageItem } from '../../types/bulkImport';
import type { ServingMethod, ServingTimeSlot, ItemCategory } from '../../types/careItem';
import {
  SERVING_TIME_SLOT_LABELS,
  CATEGORY_LABELS,
  SERVING_METHOD_LABELS,
  STORAGE_METHOD_LABELS,
  getRemainingHandlingInstructionLabel,
} from '../../types/careItem';

/** 編集可能フィールド */
interface EditableFields {
  itemName?: string;
  category?: ItemCategory;
  quantity?: number;
  unit?: string;
  servingMethod?: ServingMethod;
  servingDate?: string;
  servingTimeSlot?: ServingTimeSlot;
  noteToStaff?: string;
}

interface BulkImportPreviewProps {
  items: (ParsedBulkItem | ParsedImageItem)[];
  onRemoveItem?: (rowIndex: number) => void;
  onUpdateItem?: (rowIndex: number, fields: EditableFields) => void;
  onToggleSelect?: (rowIndex: number) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  showSelection?: boolean;
}

type ItemStatus = 'valid' | 'error' | 'duplicate';

function getItemStatus(item: ParsedBulkItem | ParsedImageItem): ItemStatus {
  if ('errors' in item && item.errors.length > 0) return 'error';
  if (item.isDuplicate) return 'duplicate';
  return 'valid';
}

function getStatusLabel(status: ItemStatus): string {
  switch (status) {
    case 'valid':
      return '登録可能';
    case 'error':
      return 'エラー';
    case 'duplicate':
      return '重複（スキップ）';
  }
}

function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'valid':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'duplicate':
      return 'bg-yellow-100 text-yellow-800';
  }
}

function getRowBgColor(status: ItemStatus): string {
  switch (status) {
    case 'valid':
      return '';
    case 'error':
      return 'bg-red-50';
    case 'duplicate':
      return 'bg-yellow-50';
  }
}

function getRowIndex(item: ParsedBulkItem | ParsedImageItem): number {
  return 'rowIndex' in item ? item.rowIndex : item.index;
}

function isSelected(item: ParsedBulkItem | ParsedImageItem): boolean {
  return item.isSelected ?? false;
}

/** 編集可能テキストセル */
function EditableTextCell({
  value,
  onSave,
  disabled,
  placeholder = '-',
}: {
  value: string;
  onSave: (newValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  }, [editValue, value, onSave]);

  if (disabled) {
    return <span className="text-gray-400 italic">{value || placeholder}</span>;
  }

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditValue(value);
            setIsEditing(false);
          }
        }}
        className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-left w-full px-1 py-0.5 hover:bg-blue-50 rounded cursor-pointer group"
      title="クリックして編集"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
      <span className="ml-1 text-gray-300 group-hover:text-blue-400 text-xs">✎</span>
    </button>
  );
}

/** 編集可能数値セル */
function EditableNumberCell({
  value,
  onSave,
  disabled,
  placeholder = '-',
}: {
  value: number | undefined;
  onSave: (newValue: number | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() ?? '');

  const handleSave = useCallback(() => {
    setIsEditing(false);
    const numValue = editValue === '' ? undefined : parseFloat(editValue);
    if (numValue !== value) {
      onSave(numValue);
    }
  }, [editValue, value, onSave]);

  if (disabled) {
    return <span className="text-gray-400 italic">{value ?? placeholder}</span>;
  }

  if (isEditing) {
    return (
      <input
        type="number"
        step="0.1"
        min="0"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditValue(value?.toString() ?? '');
            setIsEditing(false);
          }
        }}
        className="w-16 px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-left w-full px-1 py-0.5 hover:bg-blue-50 rounded cursor-pointer group"
      title="クリックして編集"
    >
      {value ?? <span className="text-gray-400 italic">{placeholder}</span>}
      <span className="ml-1 text-gray-300 group-hover:text-blue-400 text-xs">✎</span>
    </button>
  );
}

/** 編集可能日付セル */
function EditableDateCell({
  value,
  onSave,
  disabled,
  placeholder = '-',
}: {
  value: string | undefined;
  onSave: (newValue: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  }, [editValue, value, onSave]);

  if (disabled) {
    return <span className="text-gray-400 italic">{value || placeholder}</span>;
  }

  if (isEditing) {
    return (
      <input
        type="date"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setEditValue(value ?? '');
            setIsEditing(false);
          }
        }}
        className="px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-left w-full px-1 py-0.5 hover:bg-blue-50 rounded cursor-pointer group"
      title="クリックして編集"
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
      <span className="ml-1 text-gray-300 group-hover:text-blue-400 text-xs">✎</span>
    </button>
  );
}

/** 編集可能セレクトセル */
function EditableSelectCell<T extends string>({
  value,
  options,
  labels,
  onSave,
  disabled,
}: {
  value: T | undefined;
  options: readonly T[];
  labels: Record<T, string>;
  onSave: (newValue: T) => void;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (disabled || !value) {
    return <span className="text-gray-400 italic">{value ? labels[value] : '-'}</span>;
  }

  if (isEditing) {
    return (
      <select
        value={value}
        onChange={(e) => {
          onSave(e.target.value as T);
          setIsEditing(false);
        }}
        onBlur={() => setIsEditing(false)}
        className="text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        autoFocus
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels[opt]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-left px-1 py-0.5 hover:bg-blue-50 rounded cursor-pointer group"
      title="クリックして編集"
    >
      {labels[value]}
      <span className="ml-1 text-gray-300 group-hover:text-blue-400 text-xs">▼</span>
    </button>
  );
}

export function BulkImportPreview({
  items,
  onRemoveItem,
  onUpdateItem,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  showSelection = true,
}: BulkImportPreviewProps) {
  const validCount = items.filter(item => getItemStatus(item) === 'valid').length;
  const errorCount = items.filter(item => getItemStatus(item) === 'error').length;
  const duplicateCount = items.filter(item => item.isDuplicate).length;
  const warningCount = items.filter(item => 'warnings' in item && item.warnings && item.warnings.length > 0).length;
  const selectedCount = items.filter(item => getItemStatus(item) === 'valid' && isSelected(item)).length;

  const allValidSelected = validCount > 0 && selectedCount === validCount;
  const someSelected = selectedCount > 0 && selectedCount < validCount;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        データがありません。ファイルにデータを入力してください。
      </div>
    );
  }

  const categoryOptions = ['food', 'drink'] as const;
  const servingMethodOptions = ['as_is', 'cut', 'peeled', 'heated', 'other'] as const;
  const timeSlotOptions = ['breakfast', 'lunch', 'snack', 'dinner', 'anytime'] as const;

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        {showSelection && (
          <div className="flex items-center gap-2 mr-4 pr-4 border-r border-gray-300">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">
              {selectedCount}
            </span>
            <span className="text-gray-700">選択中</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white text-sm font-bold rounded-full">
            {validCount}
          </span>
          <span className="text-gray-700">有効</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-sm font-bold rounded-full">
              {errorCount}
            </span>
            <span className="text-gray-700">エラー</span>
          </div>
        )}
        {duplicateCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-yellow-500 text-white text-sm font-bold rounded-full">
              {duplicateCount}
            </span>
            <span className="text-gray-700">重複</span>
          </div>
        )}
        {warningCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-sm font-bold rounded-full">
              {warningCount}
            </span>
            <span className="text-gray-700">自動修正</span>
          </div>
        )}
      </div>

      {/* 一括選択ボタン */}
      {showSelection && onSelectAll && onDeselectAll && (
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            disabled={allValidSelected}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            すべて選択
          </button>
          <button
            onClick={onDeselectAll}
            disabled={selectedCount === 0}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            選択解除
          </button>
        </div>
      )}

      {/* テーブル */}
      <div className="overflow-x-auto border rounded-lg max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {showSelection && onToggleSelect && (
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allValidSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={() => {
                      if (allValidSelected) {
                        onDeselectAll?.();
                      } else {
                        onSelectAll?.();
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    title="すべて選択/解除"
                  />
                </th>
              )}
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                行
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                状態
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                品物名
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                カテゴリ
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                数量
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                単位
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                提供方法
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                提供日
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                タイミング
              </th>
              {'expirationDate' in (items[0]?.parsed ?? {}) && (
                <>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    賞味期限
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    保存方法
                  </th>
                </>
              )}
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                申し送り
              </th>
              {'remainingHandlingInstruction' in (items[0]?.parsed ?? {}) && (
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  処置
                </th>
              )}
              {onRemoveItem && (
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => {
              const status = getItemStatus(item);
              const p = item.parsed;
              const rowIdx = getRowIndex(item);
              const selected = isSelected(item);
              const canEdit = status === 'valid' && onUpdateItem;

              return (
                <tr key={rowIdx} className={`${getRowBgColor(status)} ${!selected && status === 'valid' ? 'opacity-50' : ''}`}>
                  {/* チェックボックス */}
                  {showSelection && onToggleSelect && (
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={status !== 'valid'}
                        onChange={() => onToggleSelect(rowIdx)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-30"
                      />
                    </td>
                  )}
                  {/* 行番号 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {rowIdx}
                  </td>
                  {/* 状態 */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                    {status === 'error' && 'errors' in item && item.errors.length > 0 && (
                      <div className="mt-1 text-xs text-red-600 max-w-48">
                        {item.errors.map((err, i) => (
                          <div key={i}>{err.message}</div>
                        ))}
                      </div>
                    )}
                    {status === 'duplicate' && item.duplicateInfo && (
                      <div className="mt-1 text-xs text-yellow-700">
                        既存: {item.duplicateInfo.existingItemName}
                      </div>
                    )}
                    {'warnings' in item && item.warnings && item.warnings.length > 0 && (
                      <div className="mt-1 text-xs text-orange-600 max-w-48">
                        {item.warnings.map((warn, i) => (
                          <div key={i}>⚠️ {warn.message}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* 品物名 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 min-w-32">
                    {canEdit ? (
                      <EditableTextCell
                        value={p.itemName}
                        onSave={(v) => onUpdateItem(rowIdx, { itemName: v })}
                        placeholder="未入力"
                      />
                    ) : (
                      p.itemName || <span className="text-gray-400 italic">未入力</span>
                    )}
                  </td>
                  {/* カテゴリ */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {canEdit ? (
                      <EditableSelectCell
                        value={p.category}
                        options={categoryOptions}
                        labels={CATEGORY_LABELS}
                        onSave={(v) => onUpdateItem(rowIdx, { category: v })}
                      />
                    ) : p.category ? (
                      CATEGORY_LABELS[p.category]
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  {/* 数量 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {canEdit ? (
                      <EditableNumberCell
                        value={p.quantity}
                        onSave={(v) => onUpdateItem(rowIdx, { quantity: v })}
                      />
                    ) : (
                      p.quantity !== undefined ? p.quantity : <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  {/* 単位 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {canEdit ? (
                      <EditableTextCell
                        value={p.unit ?? ''}
                        onSave={(v) => onUpdateItem(rowIdx, { unit: v })}
                      />
                    ) : (
                      p.unit || <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  {/* 提供方法 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {canEdit ? (
                      <EditableSelectCell
                        value={p.servingMethod}
                        options={servingMethodOptions}
                        labels={SERVING_METHOD_LABELS}
                        onSave={(v) => onUpdateItem(rowIdx, { servingMethod: v })}
                      />
                    ) : p.servingMethod ? (
                      SERVING_METHOD_LABELS[p.servingMethod]
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  {/* 提供日 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {canEdit ? (
                      <EditableDateCell
                        value={p.servingDate}
                        onSave={(v) => onUpdateItem(rowIdx, { servingDate: v })}
                        placeholder="未入力"
                      />
                    ) : (
                      p.servingDate || <span className="text-gray-400 italic">未入力</span>
                    )}
                  </td>
                  {/* タイミング */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {canEdit ? (
                      <EditableSelectCell
                        value={p.servingTimeSlot}
                        options={timeSlotOptions}
                        labels={SERVING_TIME_SLOT_LABELS}
                        onSave={(v) => onUpdateItem(rowIdx, { servingTimeSlot: v })}
                      />
                    ) : p.servingTimeSlot ? (
                      SERVING_TIME_SLOT_LABELS[p.servingTimeSlot]
                    ) : (
                      <span className="text-gray-400 italic">未入力</span>
                    )}
                  </td>
                  {/* 賞味期限（Excelのみ） */}
                  {'expirationDate' in p && (
                    <>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {p.expirationDate || <span className="text-gray-400 italic">-</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                        {p.storageMethod ? STORAGE_METHOD_LABELS[p.storageMethod] : <span className="text-gray-400 italic">-</span>}
                      </td>
                    </>
                  )}
                  {/* 申し送り */}
                  <td className="px-3 py-2 text-sm text-gray-600 max-w-32 truncate" title={p.noteToStaff}>
                    {canEdit ? (
                      <EditableTextCell
                        value={p.noteToStaff ?? ''}
                        onSave={(v) => onUpdateItem(rowIdx, { noteToStaff: v })}
                      />
                    ) : (
                      p.noteToStaff || <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                  {/* 処置（Excelのみ） */}
                  {'remainingHandlingInstruction' in p && (
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                      {getRemainingHandlingInstructionLabel(p.remainingHandlingInstruction)}
                    </td>
                  )}
                  {/* 操作 */}
                  {onRemoveItem && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => onRemoveItem(rowIdx)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="この行を除外"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 説明 */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>
          <span className="inline-block w-3 h-3 bg-green-100 rounded mr-1"></span>
          有効: 登録可能な品物です（クリックで内容を編集できます）
        </p>
        <p>
          <span className="inline-block w-3 h-3 bg-red-100 rounded mr-1"></span>
          エラー: 入力内容に問題があります。修正してから再アップロードしてください
        </p>
        <p>
          <span className="inline-block w-3 h-3 bg-yellow-100 rounded mr-1"></span>
          重複: 同じ品物・提供日・タイミングの組み合わせが既に登録されています（スキップされます）
        </p>
        <p>
          <span className="inline-block w-3 h-3 bg-orange-100 rounded mr-1"></span>
          自動修正: 対応していない値が自動的に修正されました（登録可能）
        </p>
      </div>
    </div>
  );
}
