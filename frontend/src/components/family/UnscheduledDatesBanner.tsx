/**
 * 未設定日サジェスト通知バナー
 * Phase 38: 品物管理の上部に表示する通知
 */

import { useState, useMemo } from 'react';
import { WEEKDAY_LABELS } from '../../types/careItem';
import type { UnscheduledDate } from '../../types/skipDate';
import { formatDateDisplay } from '../../utils/scheduleUtils';

interface UnscheduledDatesBannerProps {
  /** 未設定日リスト */
  unscheduledDates: UnscheduledDate[];
  /** 日付クリック時（品物登録へ遷移） */
  onDateClick: (date: string) => void;
  /** 「提供なし」設定時 */
  onMarkAsSkip: (date: string) => void;
  /** 詳細を見るクリック時 */
  onShowAll: () => void;
  /** 最大表示件数 */
  maxVisible?: number;
}

export function UnscheduledDatesBanner({
  unscheduledDates,
  onDateClick,
  onMarkAsSkip,
  onShowAll,
  maxVisible = 3,
}: UnscheduledDatesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 表示する日付（先頭数件）
  const visibleDates = useMemo(() => {
    return unscheduledDates.slice(0, maxVisible);
  }, [unscheduledDates, maxVisible]);

  // 残りの件数
  const remainingCount = unscheduledDates.length - maxVisible;

  // 未設定日がない場合は非表示
  if (unscheduledDates.length === 0) {
    return null;
  }

  // 最終設定日（最も遠い日）を取得
  const lastDate = unscheduledDates[unscheduledDates.length - 1];
  const lastDateDisplay = lastDate ? formatDateDisplay(lastDate.date) : '';

  return (
    <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
            <span className="text-lg">📅</span>
            <span>提供予定がない日があります</span>
          </div>
          <p className="text-xs text-amber-600 mt-1">
            {lastDateDisplay}までの範囲で{unscheduledDates.length}日間
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-amber-700 text-xs underline shrink-0"
        >
          {isExpanded ? '閉じる' : '詳細'}
        </button>
      </div>

      {/* 展開時: 日付リスト */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {visibleDates.map((ud) => (
            <div
              key={ud.date}
              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100"
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${ud.isWeekend ? 'text-red-600' : 'text-gray-700'}`}>
                  {formatDateDisplay(ud.date)}
                </span>
                <span className={`text-xs ${ud.isWeekend ? 'text-red-500' : 'text-gray-500'}`}>
                  ({WEEKDAY_LABELS[ud.dayOfWeek]})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onDateClick(ud.date)}
                  className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                >
                  登録
                </button>
                <button
                  onClick={() => onMarkAsSkip(ud.date)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  なし
                </button>
              </div>
            </div>
          ))}

          {/* 残りがある場合 */}
          {remainingCount > 0 && (
            <button
              onClick={onShowAll}
              className="w-full py-2 text-sm text-amber-700 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
            >
              他{remainingCount}件を見る →
            </button>
          )}
        </div>
      )}

      {/* 非展開時: コンパクト表示 */}
      {!isExpanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleDates.map((ud) => (
            <span
              key={ud.date}
              className={`text-xs px-2 py-0.5 rounded-full ${
                ud.isWeekend
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {formatDateDisplay(ud.date)}({WEEKDAY_LABELS[ud.dayOfWeek]})
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-xs text-amber-600">他{remainingCount}件</span>
          )}
        </div>
      )}
    </div>
  );
}

export default UnscheduledDatesBanner;
