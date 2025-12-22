/**
 * 未設定日サジェスト通知バナー
 * Phase 38.2: 期間変更・スケジュールタイプ除外トグル付き
 * Phase 38.3: MoE改善 - 常時表示、スケジュールパターン除外
 */

import { useState, useMemo } from 'react';
import { WEEKDAY_LABELS } from '../../types/careItem';
import type { UnscheduledDate } from '../../types/skipDate';
import { formatDateDisplay } from '../../utils/scheduleUtils';

interface UnscheduledDatesBannerProps {
  /** 未設定日リスト（除外フィルタ適用済み） */
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
  /** 「毎日」スケジュール除外フラグ */
  excludeDaily?: boolean;
  /** 「週ごと」スケジュール除外フラグ */
  excludeWeekly?: boolean;
  /** 「毎日」除外トグル変更時 */
  onExcludeDailyChange?: (value: boolean) => void;
  /** 「週ごと」除外トグル変更時 */
  onExcludeWeeklyChange?: (value: boolean) => void;
  /** 詳細展開状態（URL永続化用） */
  isExpanded?: boolean;
  /** 展開状態変更時 */
  onExpandChange?: (expanded: boolean) => void;
}

export function UnscheduledDatesBanner({
  unscheduledDates,
  onDateClick,
  onMarkAsSkip,
  onShowAll,
  onPeriodChange,
  currentPeriod = 2,
  maxVisible = 5,
  excludeDaily = false,
  excludeWeekly = false,
  onExcludeDailyChange,
  onExcludeWeeklyChange,
  isExpanded = false,
  onExpandChange,
}: UnscheduledDatesBannerProps) {
  const [showPeriodSelect, setShowPeriodSelect] = useState(false);

  // 表示する日付（先頭数件）
  const visibleDates = useMemo(() => {
    return unscheduledDates.slice(0, maxVisible);
  }, [unscheduledDates, maxVisible]);

  // 残りの件数
  const remainingCount = unscheduledDates.length - maxVisible;

  // 期間オプション
  const periodOptions = [
    { value: 1, label: '1ヶ月' },
    { value: 2, label: '2ヶ月' },
    { value: 3, label: '3ヶ月' },
  ];

  // 常時表示（0件でも表示）
  const hasUnscheduledDates = unscheduledDates.length > 0;

  return (
    <div className={`mx-4 mb-3 ${hasUnscheduledDates ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'} border rounded-lg overflow-visible`}>
      {/* ヘッダー */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className={`flex items-center gap-2 ${hasUnscheduledDates ? 'text-amber-800' : 'text-green-700'} font-medium text-sm`}>
              <span className="text-lg">{hasUnscheduledDates ? '📅' : '✅'}</span>
              <span>
                {hasUnscheduledDates
                  ? `未設定日 (${unscheduledDates.length}件)`
                  : '未設定日なし'}
              </span>
            </div>
            <p className={`text-xs ${hasUnscheduledDates ? 'text-amber-600' : 'text-green-600'} mt-1`}>
              {currentPeriod}ヶ月先までの範囲
            </p>
          </div>

          {/* コントロール */}
          <div className="flex items-center gap-2">
            {/* 期間選択 */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodSelect(!showPeriodSelect)}
                className={`px-2 py-1 text-xs ${hasUnscheduledDates ? 'text-amber-700 bg-amber-100 hover:bg-amber-200' : 'text-green-700 bg-green-100 hover:bg-green-200'} rounded transition-colors`}
              >
                {currentPeriod}ヶ月 ▼
              </button>
              {showPeriodSelect && (
                <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                  {periodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onPeriodChange?.(opt.value);
                        setShowPeriodSelect(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm whitespace-nowrap hover:bg-gray-100 ${
                        currentPeriod === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                      style={{ minWidth: '5rem' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 展開/折りたたみ（未設定日がある場合のみ） */}
            {hasUnscheduledDates && (
              <button
                onClick={() => onExpandChange?.(!isExpanded)}
                className="text-amber-700 text-xs underline shrink-0"
              >
                {isExpanded ? '閉じる' : '詳細'}
              </button>
            )}
          </div>
        </div>

        {/* スケジュールフィルター: 青=対象（計算に含む）、グレー+取消線=除外 */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-500">対象:</span>
          <button
            onClick={() => onExcludeDailyChange?.(!excludeDaily)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              excludeDaily
                ? 'bg-gray-200 text-gray-400 line-through'
                : 'bg-blue-500 text-white'
            }`}
            title={excludeDaily ? '毎日スケジュールを計算に含める' : '毎日スケジュールを除外する'}
          >
            毎日
          </button>
          <button
            onClick={() => onExcludeWeeklyChange?.(!excludeWeekly)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              excludeWeekly
                ? 'bg-gray-200 text-gray-400 line-through'
                : 'bg-blue-500 text-white'
            }`}
            title={excludeWeekly ? '週ごとスケジュールを計算に含める' : '週ごとスケジュールを除外する'}
          >
            週ごと
          </button>
        </div>
      </div>

      {/* 展開時: 日付リスト（未設定日がある場合のみ） */}
      {isExpanded && hasUnscheduledDates && (
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

      {/* 非展開時: コンパクト表示（未設定日がある場合のみ） */}
      {!isExpanded && hasUnscheduledDates && (
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
            {unscheduledDates.length > 4 && (
              <button
                onClick={onShowAll}
                className="text-xs text-amber-600 hover:text-amber-800"
              >
                他{unscheduledDates.length - 4}件
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UnscheduledDatesBanner;
