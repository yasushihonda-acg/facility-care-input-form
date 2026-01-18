/**
 * CorrelationScreenshotModal - スクリーンショット用の相関分析表示
 * モバイルで綺麗にスクショが撮れるよう、ナビなしのクリーンなレイアウト
 */

import { useState, useMemo } from 'react';
import { getDisplayDate } from './CorrelationTab';

interface CorrelationDataPoint {
  date: string;
  displayDate: string;
  hasMagnesium: boolean;
  magnesiumTime: string;
  magnesiumNote: string;
  hasBowelSameDay: boolean;
  bowelCountSameDay: number;
  bowelTimesSameDay: string;
  hasBowelNextDay: boolean;
  bowelCountNextDay: number;
  bowelTimesNextDay: string;
  nextDayDisplayDate: string;
  // 2日後（3日目）
  hasBowelTwoDaysLater: boolean;
  bowelCountTwoDaysLater: number;
  bowelTimesTwoDaysLater: string;
  twoDaysLaterDisplayDate: string;
  hasEffect: boolean;
}

// 3段階判定の型
type EffectLevel = 'effect' | 'delayed' | 'none';

// 3段階判定を計算
function getEffectLevel(d: CorrelationDataPoint, includeThirdDay: boolean): EffectLevel {
  if (d.hasBowelSameDay || d.hasBowelNextDay) return 'effect';  // ○
  if (includeThirdDay && d.hasBowelTwoDaysLater) return 'delayed';  // △
  return 'none';  // ✗
}

interface CorrelationScreenshotModalProps {
  correlationData: CorrelationDataPoint[];
  correlationRate: number;
  sameDayRate: number;
  onClose: () => void;
}

type DisplayMode = 'list' | 'detail';
type ItemCount = 5 | 10 | 20 | 'all';

export function CorrelationScreenshotModal({
  correlationData,
  correlationRate,
  sameDayRate,
  onClose,
}: CorrelationScreenshotModalProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('list');
  const [itemCount, setItemCount] = useState<ItemCount>(10);
  const [includeThirdDay, setIncludeThirdDay] = useState(false);

  // 3日目含む場合の相関率を再計算
  const effectiveRate = useMemo(() => {
    if (!includeThirdDay) return correlationRate;
    if (correlationData.length === 0) return 0;
    const withEffect = correlationData.filter(d =>
      getEffectLevel(d, true) !== 'none'
    ).length;
    return Math.round((withEffect / correlationData.length) * 100);
  }, [correlationData, correlationRate, includeThirdDay]);

  // 効果ありの件数（3日目含む場合は再計算）
  const effectCount = useMemo(() => {
    if (!includeThirdDay) {
      return correlationData.filter(d => d.hasEffect).length;
    }
    return correlationData.filter(d =>
      getEffectLevel(d, true) !== 'none'
    ).length;
  }, [correlationData, includeThirdDay]);

  // 表示するデータ
  const displayData = itemCount === 'all'
    ? correlationData
    : correlationData.slice(0, itemCount);

  // 期間の算出
  const dateRange = correlationData.length > 0
    ? `${getDisplayDate(correlationData[correlationData.length - 1].date)} 〜 ${getDisplayDate(correlationData[0].date)}`
    : '';

  // 生成日時
  const generatedAt = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // ESCキーで閉じる
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white overflow-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>💊</span>
            <span>マグミット × 排便 相関</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
        {dateRange && (
          <p className="text-sm text-gray-500 mt-1">{dateRange}</p>
        )}
      </div>

      {/* 切替UI */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">表示:</span>
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="list">一覧</option>
              <option value="detail">詳細付き</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">件数:</span>
            <select
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value === 'all' ? 'all' : Number(e.target.value) as ItemCount)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value={5}>5件</option>
              <option value={10}>10件</option>
              <option value={20}>20件</option>
              <option value="all">全件</option>
            </select>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeThirdDay}
              onChange={(e) => setIncludeThirdDay(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-gray-600">3日目も含める</span>
          </label>
        </div>
      </div>

      {/* サマリー */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                排便率（当日〜{includeThirdDay ? '2日後' : '翌日'}）
              </p>
              <p className="text-3xl font-bold text-primary">{effectiveRate}%</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{effectCount} / {correlationData.length} 回</p>
              <p className="text-xs text-gray-400">当日のみ: {sameDayRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* データ表示 */}
      <div className="px-4 pb-4">
        {displayMode === 'list' ? (
          // 一覧表示
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-2 font-medium">服用日</th>
                <th className="text-left p-2 font-medium">時刻</th>
                <th className="text-left p-2 font-medium">当日</th>
                <th className="text-left p-2 font-medium">翌日</th>
                {includeThirdDay && (
                  <th className="text-left p-2 font-medium">2日後</th>
                )}
                <th className="text-center p-2 font-medium">効果</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((row) => {
                const effectLevel = getEffectLevel(row, includeThirdDay);
                const bgClass = effectLevel === 'none' ? 'bg-red-50' :
                                effectLevel === 'delayed' ? 'bg-yellow-50' : '';
                return (
                  <tr
                    key={row.date}
                    className={`border-b ${bgClass}`}
                  >
                    <td className="p-2 font-medium">{getDisplayDate(row.date)}</td>
                    <td className="p-2 text-gray-600">{row.magnesiumTime || '-'}</td>
                    <td className="p-2">
                      {row.hasBowelSameDay ? (
                        <span className="text-green-600">
                          ✓ {row.bowelTimesSameDay || 'あり'}
                          {row.bowelCountSameDay > 1 && ` (${row.bowelCountSameDay}回)`}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2">
                      {row.hasBowelNextDay ? (
                        <span className="text-blue-600">
                          ✓ {row.bowelTimesNextDay || 'あり'}
                          {row.bowelCountNextDay > 1 && ` (${row.bowelCountNextDay}回)`}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {includeThirdDay && (
                      <td className="p-2">
                        {row.hasBowelTwoDaysLater ? (
                          <span className="text-purple-600">
                            ✓ {row.bowelTimesTwoDaysLater || 'あり'}
                            {row.bowelCountTwoDaysLater > 1 && ` (${row.bowelCountTwoDaysLater}回)`}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    <td className="p-2 text-center">
                      {effectLevel === 'effect' ? (
                        <span className="text-green-600 font-bold">○</span>
                      ) : effectLevel === 'delayed' ? (
                        <span className="text-yellow-600 font-bold">△</span>
                      ) : (
                        <span className="text-red-500 font-bold">✗</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          // 詳細付き表示
          <div className="space-y-3">
            {displayData.map((row) => {
              const effectLevel = getEffectLevel(row, includeThirdDay);
              const borderClass = effectLevel === 'none' ? 'border-red-200 bg-red-50' :
                                  effectLevel === 'delayed' ? 'border-yellow-200 bg-yellow-50' :
                                  'border-gray-200 bg-white';
              const effectText = effectLevel === 'effect' ? '○ 効果あり' :
                                 effectLevel === 'delayed' ? '△ 遅延効果' :
                                 '✗ 効果なし';
              const effectColor = effectLevel === 'effect' ? 'text-green-600' :
                                  effectLevel === 'delayed' ? 'text-yellow-600' :
                                  'text-red-500';
              return (
                <div
                  key={row.date}
                  className={`rounded-lg border p-3 ${borderClass}`}
                >
                  {/* ヘッダー行 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{getDisplayDate(row.date)}</span>
                    <span className={`font-bold ${effectColor}`}>
                      {effectText}
                    </span>
                  </div>

                  {/* 服用情報 */}
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span>💊</span>
                      <span className="text-gray-700">
                        {row.magnesiumTime || '時刻不明'} マグミット服用
                      </span>
                    </div>

                    {/* 当日の排便 */}
                    {row.hasBowelSameDay ? (
                      <div className="flex items-center gap-2">
                        <span>🚽</span>
                        <span className="text-green-600">
                          当日 {row.bowelTimesSameDay || ''} 排便あり
                          {row.bowelCountSameDay > 1 && ` (${row.bowelCountSameDay}回)`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>🚽</span>
                        <span className="text-gray-400">当日 排便なし</span>
                      </div>
                    )}

                    {/* 翌日の排便 */}
                    {row.hasBowelNextDay ? (
                      <div className="flex items-center gap-2">
                        <span>🚽</span>
                        <span className="text-blue-600">
                          翌日 {row.bowelTimesNextDay || ''} 排便あり
                          {row.bowelCountNextDay > 1 && ` (${row.bowelCountNextDay}回)`}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>🚽</span>
                        <span className="text-gray-400">翌日 排便なし</span>
                      </div>
                    )}

                    {/* 2日後の排便（3日目含む場合のみ） */}
                    {includeThirdDay && (
                      row.hasBowelTwoDaysLater ? (
                        <div className="flex items-center gap-2">
                          <span>🚽</span>
                          <span className="text-purple-600">
                            2日後 {row.bowelTimesTwoDaysLater || ''} 排便あり
                            {row.bowelCountTwoDaysLater > 1 && ` (${row.bowelCountTwoDaysLater}回)`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>🚽</span>
                          <span className="text-gray-400">2日後 排便なし</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
        生成: {generatedAt}
      </div>
    </div>
  );
}
