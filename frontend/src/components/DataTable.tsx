import { useState, useMemo } from 'react';
import type { PlanDataRecord } from '../types';
import { DetailModal } from './DetailModal';

interface DataTableProps {
  records: PlanDataRecord[];
  headers: string[];
  sheetName: string;
}

type SortField = 'timestamp' | 'staffName' | 'residentName';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;

export function DataTable({ records, headers, sheetName }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<PlanDataRecord | null>(null);

  // 表示するカラム（最初の数個を優先表示）
  const displayHeaders = useMemo(() => {
    // 常に表示する基本カラム
    const baseColumns = ['日時', 'スタッフ名', '入居者名'];
    // 残りのカラムから最大3つ追加
    const additionalColumns = headers
      .filter(h => !baseColumns.some(b => h.includes(b)))
      .slice(0, 3);
    return [...baseColumns, ...additionalColumns];
  }, [headers]);

  // フィルタリング
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(record =>
      record.staffName?.toLowerCase().includes(query) ||
      record.residentName?.toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  // ソート
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      let valueA: string = '';
      let valueB: string = '';

      switch (sortField) {
        case 'timestamp':
          valueA = a.timestamp || '';
          valueB = b.timestamp || '';
          break;
        case 'staffName':
          valueA = a.staffName || '';
          valueB = b.staffName || '';
          break;
        case 'residentName':
          valueA = a.residentName || '';
          valueB = b.residentName || '';
          break;
      }

      const comparison = valueA.localeCompare(valueB, 'ja');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRecords, sortField, sortDirection]);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getCellValue = (record: PlanDataRecord, header: string): string => {
    if (header === '日時' || header.includes('日時')) return record.timestamp || '';
    if (header === 'スタッフ名' || header.includes('スタッフ')) return record.staffName || '';
    if (header === '入居者名' || header.includes('入居者') || header.includes('利用者')) return record.residentName || '';
    return record.data[header] || '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* 検索・ソートバー */}
      <div className="flex flex-wrap gap-2 p-3 bg-white border-b border-gray-200">
        {/* 検索入力 */}
        <div className="flex-1 min-w-48">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="入居者名・スタッフ名で検索..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>
        </div>

        {/* ソートドロップダウン */}
        <select
          value={`${sortField}-${sortDirection}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('-') as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(dir);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="timestamp-desc">日時 (新しい順)</option>
          <option value="timestamp-asc">日時 (古い順)</option>
          <option value="residentName-asc">入居者名 (A-Z)</option>
          <option value="residentName-desc">入居者名 (Z-A)</option>
          <option value="staffName-asc">スタッフ名 (A-Z)</option>
          <option value="staffName-desc">スタッフ名 (Z-A)</option>
        </select>
      </div>

      {/* 検索結果件数 */}
      {searchQuery && (
        <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs">
          「{searchQuery}」の検索結果: {filteredRecords.length}件
        </div>
      )}

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-max border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-100">
              {displayHeaders.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap"
                >
                  {header.includes('日時') ? (
                    <button
                      onClick={() => handleSort('timestamp')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      {header} <span className="text-gray-400">{getSortIcon('timestamp')}</span>
                    </button>
                  ) : header.includes('スタッフ') ? (
                    <button
                      onClick={() => handleSort('staffName')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      {header} <span className="text-gray-400">{getSortIcon('staffName')}</span>
                    </button>
                  ) : header.includes('入居者') || header.includes('利用者') ? (
                    <button
                      onClick={() => handleSort('residentName')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      {header} <span className="text-gray-400">{getSortIcon('residentName')}</span>
                    </button>
                  ) : (
                    header
                  )}
                </th>
              ))}
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">
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
                {displayHeaders.map((header) => (
                  <td
                    key={header}
                    className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 whitespace-nowrap max-w-32 truncate"
                  >
                    {getCellValue(record, header) || '-'}
                  </td>
                ))}
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
