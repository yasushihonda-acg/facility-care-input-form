/**
 * CorrelationScreenshotModal - スクリーンショット用の相関分析表示
 * モバイルで綺麗にスクショが撮れるよう、ナビなしのクリーンなレイアウト
 */

import { useState } from 'react';

// 表示用の日付文字列（YY/M/D形式）
function formatDisplayDate(dateKey: string): string {
  const parts = dateKey.split('/');
  if (parts.length < 3) return dateKey;
  const year2digit = String(parseInt(parts[0], 10)).slice(-2);
  return `${year2digit}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

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
  hasEffect: boolean;
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

  // 表示するデータ
  const displayData = itemCount === 'all'
    ? correlationData
    : correlationData.slice(0, itemCount);

  // 期間の算出
  const dateRange = correlationData.length > 0
    ? `${formatDisplayDate(correlationData[correlationData.length - 1].date)} 〜 ${formatDisplayDate(correlationData[0].date)}`
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
        <div className="flex items-center gap-4 text-sm">
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
        </div>
      </div>

      {/* サマリー */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">排便率（当日〜翌日）</p>
              <p className="text-3xl font-bold text-primary">{correlationRate}%</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{correlationData.filter(d => d.hasEffect).length} / {correlationData.length} 回</p>
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
                <th className="text-center p-2 font-medium">効果</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((row) => (
                <tr
                  key={row.date}
                  className={`border-b ${row.hasEffect ? '' : 'bg-red-50'}`}
                >
                  <td className="p-2 font-medium">{formatDisplayDate(row.date)}</td>
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
                  <td className="p-2 text-center">
                    {row.hasEffect ? (
                      <span className="text-green-600 font-bold">○</span>
                    ) : (
                      <span className="text-red-500 font-bold">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // 詳細付き表示
          <div className="space-y-3">
            {displayData.map((row) => (
              <div
                key={row.date}
                className={`rounded-lg border p-3 ${row.hasEffect ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}`}
              >
                {/* ヘッダー行 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{formatDisplayDate(row.date)}</span>
                  <span className={`font-bold ${row.hasEffect ? 'text-green-600' : 'text-red-500'}`}>
                    {row.hasEffect ? '○ 効果あり' : '✗ 効果なし'}
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
                </div>
              </div>
            ))}
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
