/**
 * 一括登録プレビューコンポーネント
 * パース結果の一覧表示とエラー・重複の表示
 */

import type { ParsedBulkItem } from '../../types/bulkImport';
import {
  SERVING_TIME_SLOT_LABELS,
  CATEGORY_LABELS,
  SERVING_METHOD_LABELS,
  STORAGE_METHOD_LABELS,
  getRemainingHandlingInstructionLabel,
} from '../../types/careItem';

interface BulkImportPreviewProps {
  items: ParsedBulkItem[];
  onRemoveItem?: (rowIndex: number) => void;
}

type ItemStatus = 'valid' | 'error' | 'duplicate';

function getItemStatus(item: ParsedBulkItem): ItemStatus {
  if (item.errors.length > 0) return 'error';
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

export function BulkImportPreview({ items, onRemoveItem }: BulkImportPreviewProps) {
  const validCount = items.filter(item => item.errors.length === 0 && !item.isDuplicate).length;
  const errorCount = items.filter(item => item.errors.length > 0).length;
  const duplicateCount = items.filter(item => item.isDuplicate).length;
  const warningCount = items.filter(item => item.warnings && item.warnings.length > 0).length;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        データがありません。Excelファイルにデータを入力してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
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

      {/* テーブル */}
      <div className="overflow-x-auto border rounded-lg max-h-96">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
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
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                賞味期限
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                保存方法
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                申し送り
              </th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                処置
              </th>
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
              return (
                <tr key={item.rowIndex} className={getRowBgColor(status)}>
                  {/* 行番号 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {item.rowIndex}
                  </td>
                  {/* 状態 */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                    {status === 'error' && item.errors.length > 0 && (
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
                    {item.warnings && item.warnings.length > 0 && (
                      <div className="mt-1 text-xs text-orange-600 max-w-48">
                        {item.warnings.map((warn, i) => (
                          <div key={i}>⚠️ {warn.message}</div>
                        ))}
                      </div>
                    )}
                  </td>
                  {/* 品物名 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {p.itemName || <span className="text-gray-400 italic">未入力</span>}
                  </td>
                  {/* カテゴリ */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.category ? CATEGORY_LABELS[p.category] : <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 数量 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.quantity !== undefined ? p.quantity : <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 単位 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.unit || <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 提供方法 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.servingMethod ? SERVING_METHOD_LABELS[p.servingMethod] : <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 提供日 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.servingDate || <span className="text-gray-400 italic">未入力</span>}
                  </td>
                  {/* タイミング */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.servingTimeSlot ? SERVING_TIME_SLOT_LABELS[p.servingTimeSlot] : <span className="text-gray-400 italic">未入力</span>}
                  </td>
                  {/* 賞味期限 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.expirationDate || <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 保存方法 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {p.storageMethod ? STORAGE_METHOD_LABELS[p.storageMethod] : <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 申し送り */}
                  <td className="px-3 py-2 text-sm text-gray-600 max-w-32 truncate" title={p.noteToStaff}>
                    {p.noteToStaff || <span className="text-gray-400 italic">-</span>}
                  </td>
                  {/* 処置 */}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                    {getRemainingHandlingInstructionLabel(p.remainingHandlingInstruction)}
                  </td>
                  {/* 操作 */}
                  {onRemoveItem && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => onRemoveItem(item.rowIndex)}
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
          有効: 登録可能な品物です
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
