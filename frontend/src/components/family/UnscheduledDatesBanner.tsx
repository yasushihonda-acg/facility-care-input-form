/**
 * 未設定日サジェスト通知バナー
 * Phase 38.2: 期間変更・除外フィルタ付き
 *
 * @see docs/archive/PHASE_38_2_ITEM_MANAGEMENT_REDESIGN.md
 */

import { useState, useMemo } from 'react';
import { WEEKDAY_LABELS } from '../../types/careItem';
import type { UnscheduledDate } from '../../types/skipDate';
import { formatDateDisplay } from '../../utils/scheduleUtils';

interface UnscheduledDatesBannerProps {
  /** 未設定日リスト（全件） */
  unscheduledDates: UnscheduledDate[];
  /** 日付クリック時（品物登録へ遷移） */
  onDateClick: (date: string) => void;
  /** 「提供なし」設定時 */
  onMarkAsSkip: (date: string) => void;
  /** 詳細を見るクリック時 */
  onShowAll: () => void;
  /** 期間変更時（月数） */
  onPeriodChange?: (months: number) => void;
  /** 現在の期間（月数） */
  currentPeriod?: number;
  /** 最大表示件数 */
  maxVisible?: number;
}

type ExcludeFilter = 'none' | 'daily' | 'weekly';

export function UnscheduledDatesBanner({
  unscheduledDates,
  onDateClick,
  onMarkAsSkip,
  onShowAll,
  onPeriodChange,
  currentPeriod = 2,
  maxVisible = 5,
}: UnscheduledDatesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [excludeFilter, setExcludeFilter] = useState<ExcludeFilter>('none');
  const [showPeriodSelect, setShowPeriodSelect] = useState(false);

  // 除外フィルタ適用後の日付リスト
  const filteredDates = useMemo(() => {
    if (excludeFilter === 'none') {
      return unscheduledDates;
    }

    return unscheduledDates.filter((ud) => {
      if (excludeFilter === 'daily') {
        // 毎日除外: 平日のみ表示（週末だけ残す）
        return ud.isWeekend;
      }
      if (excludeFilter === 'weekly') {
        // 週次除外: 週末を除外（平日のみ表示）
        return !ud.isWeekend;
      }
      return true;
    });
  }, [unscheduledDates, excludeFilter]);

  // 表示する日付（先頭数件）
  const visibleDates = useMemo(() => {
    return filteredDates.slice(0, maxVisible);
  }, [filteredDates, maxVisible]);

  // 残りの件数
  const remainingCount = filteredDates.length - maxVisible;

  // 未設定日がない場合は非表示
  if (filteredDates.length === 0) {
    if (unscheduledDates.length === 0) {
      return null;
    }
    // 除外フィルタで全て除外された場合
    return (
      <div className="mx-4 mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-green-700 text-sm">
          <span className="text-lg">✅</span>
          <span>未設定日はありません（除外フィルタ適用中）</span>
          <button
            onClick={() => setExcludeFilter('none')}
            className="ml-auto text-xs underline hover:text-green-800"
          >
            フィルタ解除
          </button>
        </div>
      </div>
    );
  }

  // 期間オプション
  const periodOptions = [
    { value: 1, label: '1ヶ月' },
    { value: 2, label: '2ヶ月' },
    { value: 3, label: '3ヶ月' },
  ];

  return (
    <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
              <span className="text-lg">📅</span>
              <span>未設定日 ({filteredDates.length}件)</span>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {currentPeriod}ヶ月先までの範囲
            </p>
          </div>

          {/* コントロール */}
          <div className="flex items-center gap-2">
            {/* 期間選択 */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodSelect(!showPeriodSelect)}
                className="px-2 py-1 text-xs text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition-colors"
              >
                {currentPeriod}ヶ月 ▼
              </button>
              {showPeriodSelect && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {periodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onPeriodChange?.(opt.value);
                        setShowPeriodSelect(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        currentPeriod === opt.value ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 展開/折りたたみ */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-700 text-xs underline shrink-0"
            >
              {isExpanded ? '閉じる' : '詳細'}
            </button>
          </div>
        </div>

        {/* 除外フィルタボタン */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setExcludeFilter(excludeFilter === 'daily' ? 'none' : 'daily')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              excludeFilter === 'daily'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            毎日除外
          </button>
          <button
            onClick={() => setExcludeFilter(excludeFilter === 'weekly' ? 'none' : 'weekly')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              excludeFilter === 'weekly'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            週末除外
          </button>
        </div>
      </div>

      {/* 展開時: 日付リスト */}
      {isExpanded && (
        <div className="border-t border-amber-200 px-4 py-3 space-y-2">
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
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {visibleDates.slice(0, 4).map((ud) => (
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
            {filteredDates.length > 4 && (
              <button
                onClick={onShowAll}
                className="text-xs text-amber-600 hover:text-amber-800"
              >
                他{filteredDates.length - 4}件
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UnscheduledDatesBanner;
