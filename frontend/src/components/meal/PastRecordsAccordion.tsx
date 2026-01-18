/**
 * PastRecordsAccordion - 過去記録閲覧コンポーネント
 *
 * 機能:
 * - アコーディオン開閉
 * - 検索（品物名、日付）
 * - 並び順切り替え（新しい順、古い順、品物名あいうえお順）
 * - 過去記録カード表示
 * - 編集ボタン
 * - 品物IDのページネーション（50件ずつ読み込み）
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllConsumptionLogs } from '../../api';
import type { ConsumptionLog } from '../../types/consumptionLog';
import type { CareItem } from '../../types/careItem';
import { getCategoryIcon, migrateCategory } from '../../types/careItem';
import { useDemoMode } from '../../hooks/useDemoMode';
import { getMonthsAgoString, getYesterdayString } from '../../utils/scheduleUtils';

// 並び順の種類
type SortOrder = 'newest' | 'oldest' | 'itemName';

// 1回のリクエストで取得する品物数
const ITEMS_PER_PAGE = 50;

interface PastRecordsAccordionProps {
  /** 品物リスト（品物名取得用） */
  items: CareItem[];
  /** 編集ボタンクリック時のハンドラ */
  onEditClick: (log: ConsumptionLog, item: CareItem) => void;
}

export function PastRecordsAccordion({ items, onEditClick }: PastRecordsAccordionProps) {
  const isDemo = useDemoMode();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // ページネーション用の状態
  const [itemsLoaded, setItemsLoaded] = useState(ITEMS_PER_PAGE); // 何件の品物を読み込んだか
  const [additionalLogs, setAdditionalLogs] = useState<ConsumptionLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 品物IDから品物情報を取得するMap
  const itemMap = useMemo(() => {
    const map = new Map<string, CareItem>();
    items.forEach(item => map.set(item.id, item));
    return map;
  }, [items]);

  // 全品物IDリスト
  const allItemIds = useMemo(() => items.map(item => item.id), [items]);

  // 最初に読み込む品物IDリスト（最初の50件）
  const initialItemIds = useMemo(() => allItemIds.slice(0, ITEMS_PER_PAGE), [allItemIds]);

  // さらに読み込むべき品物があるか
  const hasMoreItems = allItemIds.length > itemsLoaded;

  // 過去ログ取得（アコーディオンが開いている時のみ、最初の50品物）
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pastConsumptionLogs', initialItemIds],
    queryFn: async () => {
      if (isDemo) {
        return { logs: [], total: 0 };
      }
      if (initialItemIds.length === 0) {
        return { logs: [], total: 0 };
      }
      const response = await getAllConsumptionLogs({
        itemIds: initialItemIds,
        startDate: getMonthsAgoString(1),
        endDate: getYesterdayString(),
        limit: 100,
      });
      return response.data ?? { logs: [], total: 0 };
    },
    enabled: isOpen && !isDemo && initialItemIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  // ログデータをメモ化
  const baseLogs = useMemo(() => data?.logs ?? [], [data?.logs]);

  // 基本ログと追加ログをマージ（重複除外）
  const logs = useMemo(() => {
    const existingIds = new Set(baseLogs.map(log => log.id));
    const merged = [...baseLogs];
    for (const log of additionalLogs) {
      if (!existingIds.has(log.id)) {
        merged.push(log);
        existingIds.add(log.id);
      }
    }
    return merged;
  }, [baseLogs, additionalLogs]);

  // 追加の品物のログを読み込む
  const loadMoreItems = useCallback(async () => {
    if (isLoadingMore || !hasMoreItems || isDemo) return;

    setIsLoadingMore(true);
    try {
      const nextItemIds = allItemIds.slice(itemsLoaded, itemsLoaded + ITEMS_PER_PAGE);
      if (nextItemIds.length === 0) return;

      const response = await getAllConsumptionLogs({
        itemIds: nextItemIds,
        startDate: getMonthsAgoString(1),
        endDate: getYesterdayString(),
        limit: 100,
      });

      if (response.data) {
        const newLogs = response.data.logs;
        if (newLogs.length > 0) {
          setAdditionalLogs(prev => [...prev, ...newLogs]);
        }
        setItemsLoaded(prev => prev + ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Failed to load more items:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreItems, isDemo, allItemIds, itemsLoaded]);

  // ログと品物情報を結合してフィルタ・ソート
  const filteredAndSortedLogs = useMemo(() => {
    let result = logs.map(log => ({
      log,
      item: itemMap.get(log.itemId),
    })).filter(({ item }) => item !== undefined);

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(({ log, item }) => {
        // 品物名で検索
        if (item?.itemName.toLowerCase().includes(query)) return true;
        // 日付で検索（YYYY-MM-DD または MM/DD 形式）
        if (log.servedDate.includes(query)) return true;
        // 日本語日付形式（例: 1月10日）
        const dateMatch = query.match(/(\d{1,2})月(\d{1,2})日?/);
        if (dateMatch) {
          const month = dateMatch[1].padStart(2, '0');
          const day = dateMatch[2].padStart(2, '0');
          if (log.servedDate.includes(`-${month}-${day}`)) return true;
        }
        return false;
      });
    }

    // ソート
    result.sort((a, b) => {
      switch (sortOrder) {
        case 'newest': {
          const dateCompareNew = b.log.servedDate.localeCompare(a.log.servedDate);
          if (dateCompareNew !== 0) return dateCompareNew;
          return (b.log.recordedAt || '').localeCompare(a.log.recordedAt || '');
        }
        case 'oldest': {
          const dateCompareOld = a.log.servedDate.localeCompare(b.log.servedDate);
          if (dateCompareOld !== 0) return dateCompareOld;
          return (a.log.recordedAt || '').localeCompare(b.log.recordedAt || '');
        }
        case 'itemName': {
          const nameCompare = (a.item?.itemName || '').localeCompare(b.item?.itemName || '', 'ja');
          if (nameCompare !== 0) return nameCompare;
          return b.log.servedDate.localeCompare(a.log.servedDate);
        }
        default:
          return 0;
      }
    });

    return result;
  }, [logs, itemMap, searchQuery, sortOrder]);

  // アコーディオンを開いた時にデータを再取得
  useEffect(() => {
    if (isOpen && !isDemo && initialItemIds.length > 0) {
      refetch();
    }
  }, [isOpen, isDemo, initialItemIds.length, refetch]);

  // アコーディオンを閉じた時に追加読み込み状態をリセット
  useEffect(() => {
    if (!isOpen) {
      setItemsLoaded(ITEMS_PER_PAGE);
      setAdditionalLogs([]);
    }
  }, [isOpen]);

  return (
    <div className="mt-6">
      {/* アコーディオンヘッダー */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-600">
            {isOpen ? '▼' : '▶'}
          </span>
          <span className="font-medium text-gray-700">過去の記録</span>
          {!isOpen && logs.length > 0 && (
            <span className="text-xs bg-gray-300 text-gray-700 px-2 py-0.5 rounded-full">
              {logs.length}件
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {isOpen ? '閉じる' : '開いて確認・編集'}
        </span>
      </button>

      {/* アコーディオン本体 */}
      {isOpen && (
        <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          {/* 検索・ソートUI */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* 検索窓 */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="品物名・日付で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
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

            {/* 並び順 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">並び順:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
                <option value="itemName">品物名順</option>
              </select>
            </div>
          </div>

          {/* ローディング */}
          {isLoading && (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              読み込み中...
            </div>
          )}

          {/* エラー */}
          {error && (
            <div className="text-center py-8 text-red-500">
              データの取得に失敗しました
              <button
                onClick={() => refetch()}
                className="ml-2 text-primary underline"
              >
                再試行
              </button>
            </div>
          )}

          {/* デモモードの説明 */}
          {isDemo && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">📋</div>
              <p>デモモードでは過去記録は表示されません</p>
            </div>
          )}

          {/* 記録なし */}
          {!isLoading && !error && !isDemo && filteredAndSortedLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">📋</div>
              <p>
                {searchQuery.trim()
                  ? '検索条件に一致する記録がありません'
                  : '過去1ヶ月の記録がありません'}
              </p>
            </div>
          )}

          {/* 記録リスト */}
          {!isLoading && !error && !isDemo && filteredAndSortedLogs.length > 0 && (
            <div className="space-y-3">
              {filteredAndSortedLogs.map(({ log, item }) => (
                <PastRecordCard
                  key={log.id}
                  log={log}
                  item={item!}
                  onEditClick={() => onEditClick(log, item!)}
                />
              ))}
            </div>
          )}

          {/* 件数表示 */}
          {!isLoading && !error && !isDemo && filteredAndSortedLogs.length > 0 && (
            <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-200">
              {searchQuery.trim() ? (
                <>
                  検索結果: {filteredAndSortedLogs.length}件
                  <span className="mx-2">|</span>
                  全{logs.length}件中
                </>
              ) : (
                <>
                  過去1ヶ月: {filteredAndSortedLogs.length}件
                  {hasMoreItems && (
                    <span className="text-gray-400 ml-1">
                      ({Math.min(itemsLoaded, allItemIds.length)}/{allItemIds.length}品物)
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {/* さらに表示ボタン */}
          {!isLoading && !error && !isDemo && hasMoreItems && (
            <button
              onClick={loadMoreItems}
              disabled={isLoadingMore}
              className="w-full py-3 text-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
            >
              {isLoadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  読み込み中...
                </span>
              ) : (
                `📋 さらに表示 (残り${allItemIds.length - itemsLoaded}品物)`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 過去記録カードコンポーネント
interface PastRecordCardProps {
  log: ConsumptionLog;
  item: CareItem;
  onEditClick: () => void;
}

function PastRecordCard({ log, item, onEditClick }: PastRecordCardProps) {
  const date = new Date(log.servedDate);
  const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
  const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

  // 摂食率に応じた色
  const getRateColor = (rate: number): string => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 水分カテゴリかどうか
  const isDrink = migrateCategory(item.category) === 'drink';

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 日付と品物名 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-600">
              {formattedDate}({dayOfWeek})
            </span>
            <span className="font-bold text-gray-800">
              {getCategoryIcon(item.category)} {item.itemName}
            </span>
          </div>

          {/* 記録詳細 */}
          <div className="mt-1 text-sm text-gray-600 flex flex-wrap items-center gap-2">
            <span className={`font-medium ${getRateColor(log.consumptionRate)}`}>
              摂食率 {log.consumptionRate}%
            </span>
            {isDrink && log.hydrationAmount && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-blue-600">
                  💧 {log.hydrationAmount}ml
                </span>
              </>
            )}
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              {log.servedBy}
            </span>
            {log.servedTime && (
              <span className="text-gray-400 text-xs">
                {log.servedTime}
              </span>
            )}
          </div>

          {/* 特記事項 */}
          {log.consumptionNote && (
            <div className="mt-1 text-sm text-gray-600 italic">
              💬 {log.consumptionNote}
            </div>
          )}
        </div>

        {/* 編集ボタン（水分記録のみ） */}
        {isDrink && (
          <button
            onClick={onEditClick}
            className="ml-3 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
          >
            <span>✏️</span>
            <span>編集</span>
          </button>
        )}
      </div>
    </div>
  );
}
