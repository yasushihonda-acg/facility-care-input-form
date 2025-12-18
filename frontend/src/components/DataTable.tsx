import { useState, useMemo } from 'react';
import type { PlanDataRecord } from '../types';
import { DetailModal } from './DetailModal';
import { getSheetColumns, type ColumnDef } from '../config/tableColumns';

interface DataTableProps {
  records: PlanDataRecord[];
  headers: string[];
  sheetName: string;
}

type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;

export function DataTable({ records, headers, sheetName }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // ソートカラムはoriginalHeaderで管理（デフォルトはタイムスタンプ）
  const [sortColumn, setSortColumn] = useState<string>('タイムスタンプ');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<PlanDataRecord | null>(null);

  // シート別の表示カラム設定を取得
  const columnConfig = useMemo(() => getSheetColumns(sheetName), [sheetName]);

  // フィルタリング（スタッフ名で検索）
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(record =>
      record.staffName?.toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  // 現在のソートカラムの設定を取得
  const currentSortColumnConfig = useMemo(() => {
    return columnConfig.find(col => col.originalHeader === sortColumn);
  }, [columnConfig, sortColumn]);

  // ソート
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      // ソート対象のカラム値を取得
      let valueA: string = '';
      let valueB: string = '';

      if (sortColumn === 'タイムスタンプ') {
        valueA = a.timestamp || '';
        valueB = b.timestamp || '';
      } else if (sortColumn === 'あなたの名前は？') {
        valueA = a.staffName || '';
        valueB = b.staffName || '';
      } else {
        valueA = a.data[sortColumn] || '';
        valueB = b.data[sortColumn] || '';
      }

      // sortTypeに基づいてソート
      const sortType = currentSortColumnConfig?.sortType || 'string';
      let comparison = 0;

      switch (sortType) {
        case 'number': {
          // 数値ソート（空文字は0扱い）
          const numA = parseFloat(valueA) || 0;
          const numB = parseFloat(valueB) || 0;
          comparison = numA - numB;
          break;
        }
        case 'date':
          // 日付ソート（文字列比較でOK: YYYY/MM/DD HH:MM:SS形式）
          comparison = valueA.localeCompare(valueB, 'ja');
          break;
        default:
          // 文字列ソート
          comparison = valueA.localeCompare(valueB, 'ja');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortColumn, sortDirection, currentSortColumnConfig]);

  // ページネーション
  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedRecords, currentPage]);

  // ページ変更時にリセット
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // 検索クリア・閉じる
  const handleCloseSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
    setCurrentPage(1);
  };

  // 任意カラムでのソート切り替え
  const handleSort = (originalHeader: string) => {
    if (sortColumn === originalHeader) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(originalHeader);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // ソートアイコン取得
  const getSortIcon = (originalHeader: string) => {
    if (sortColumn !== originalHeader) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // カラム設定からセル値を取得
  const getCellValue = (record: PlanDataRecord, column: ColumnDef): string => {
    const { originalHeader } = column;

    // タイムスタンプはrecord.timestampから取得
    if (originalHeader === 'タイムスタンプ') {
      return record.timestamp || '';
    }

    // スタッフ名はrecord.staffNameから取得
    if (originalHeader === 'あなたの名前は？') {
      return record.staffName || '';
    }

    // それ以外はrecord.dataから取得
    return record.data[originalHeader] || '';
  };

  // バッジ表示用のスタイルクラスを取得
  const getBadgeClass = (value: string, column: ColumnDef): string | null => {
    if (!column.badge) return null;
    if (!value.includes(column.badge.condition)) return null;

    const colorClasses: Record<string, string> = {
      red: 'bg-red-100 text-red-700 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
    };

    return colorClasses[column.badge.color] || null;
  };

  // セル表示値をフォーマット（truncate対応）
  const formatCellValue = (value: string, column: ColumnDef): string => {
    if (!value) return '-';
    if (column.truncate && value.length > column.truncate) {
      return value.slice(0, column.truncate) + '...';
    }
    return value;
  };

  return (
    <div className="flex flex-col h-full">
      {/* ソートバー + 検索トグル */}
      <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-200">
        {/* 検索トグルボタン */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className={`
            p-2 rounded-lg transition-colors
            ${isSearchOpen || searchQuery
              ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }
          `}
          title="検索"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* ソートドロップダウン */}
        <select
          value={`${sortColumn}-${sortDirection}`}
          onChange={(e) => {
            const lastDash = e.target.value.lastIndexOf('-');
            const col = e.target.value.slice(0, lastDash);
            const dir = e.target.value.slice(lastDash + 1) as SortDirection;
            setSortColumn(col);
            setSortDirection(dir);
            setCurrentPage(1);
          }}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {columnConfig.map((col) => (
            <>
              <option key={`${col.originalHeader}-desc`} value={`${col.originalHeader}-desc`}>
                {col.displayLabel} (降順)
              </option>
              <option key={`${col.originalHeader}-asc`} value={`${col.originalHeader}-asc`}>
                {col.displayLabel} (昇順)
              </option>
            </>
          ))}
        </select>

        {/* 件数表示 */}
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {filteredRecords.length}件
        </span>
      </div>

      {/* 折りたたみ式検索バー */}
      {isSearchOpen && (
        <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="キーワードで検索..."
              autoFocus
              className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleCloseSearch}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
            title="閉じる"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 検索結果件数（検索中のみ） */}
      {searchQuery && (
        <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs flex items-center justify-between">
          <span>「{searchQuery}」の検索結果: {filteredRecords.length}件</span>
          {filteredRecords.length === 0 && (
            <span className="text-blue-500">該当するデータがありません</span>
          )}
        </div>
      )}

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100">
              {columnConfig.map((column) => (
                <th
                  key={column.originalHeader}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                  style={{
                    width: column.width === 'flex-1' ? 'auto' : column.width,
                    minWidth: column.width === 'flex-1' ? '120px' : column.width
                  }}
                >
                  <button
                    onClick={() => handleSort(column.originalHeader)}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    {column.displayLabel}
                    <span className="text-gray-400">{getSortIcon(column.originalHeader)}</span>
                  </button>
                </th>
              ))}
              <th
                className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200"
                style={{ width: '50px' }}
              >
                詳細
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((record, idx) => (
              <tr
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className={`
                  cursor-pointer hover:bg-blue-50 transition-colors
                  ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                `}
              >
                {columnConfig.map((column) => {
                  const value = getCellValue(record, column);
                  const badgeClass = getBadgeClass(value, column);
                  const displayValue = formatCellValue(value, column);

                  return (
                    <td
                      key={column.originalHeader}
                      className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 whitespace-nowrap"
                      style={{
                        width: column.width === 'flex-1' ? 'auto' : column.width,
                        maxWidth: column.width === 'flex-1' ? '300px' : column.width
                      }}
                    >
                      {badgeClass ? (
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${badgeClass}`}>
                          {displayValue}
                        </span>
                      ) : (
                        <span className="truncate block">{displayValue}</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-sm border-b border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRecord(record);
                    }}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? '検索条件に一致するデータがありません' : 'データがありません'}
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← 前へ
          </button>
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages} ページ
            <span className="text-xs text-gray-400 ml-2">
              ({sortedRecords.length}件中 {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sortedRecords.length)}件)
            </span>
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ →
          </button>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          sheetName={sheetName}
          headers={headers}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}
