/**
 * CorrelationTab - 相関分析タブ
 * マグミット × 排便 の相関を表示（ページネーション対応）
 */

import { useState, useMemo } from 'react';
import { useSheetRecords } from '../../hooks/usePlanData';
import { LoadingSpinner } from '../LoadingSpinner';
import { CorrelationDetailModal } from './CorrelationDetailModal';
import { CorrelationScreenshotModal } from './CorrelationScreenshotModal';
import type { PlanDataRecord } from '../../types';

// 1ページあたりの表示件数
const ITEMS_PER_PAGE = 20;

// タイムスタンプから日付文字列を取得（YYYY/MM/DD形式）
function getDateKey(timestamp: string): string {
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!match) return '';
  // ゼロパディングして比較しやすくする
  return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

// 表示用の日付文字列（YY/M/D形式）- 年をまたぐデータ対応 + 横幅節約
// CorrelationScreenshotModalでも使用するためエクスポート
export function getDisplayDate(dateKey: string): string {
  const parts = dateKey.split('/');
  if (parts.length < 3) return dateKey;
  const year2digit = String(parseInt(parts[0], 10)).slice(-2); // 2桁年
  return `${year2digit}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

// 日付を1日進める
function getNextDate(dateKey: string): string {
  const parts = dateKey.split('/');
  if (parts.length < 3) return '';
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  date.setDate(date.getDate() + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// 内服シートからマグミット頓服の日付・時刻を抽出
function extractMagnesiumDates(medicationRecords: PlanDataRecord[]): Map<string, { time: string; note: string }> {
  const dates = new Map<string, { time: string; note: string }>();

  medicationRecords.forEach(record => {
    // 頓服タイミングのレコードのみ対象
    const timing = record.data['内服はいつのことですか？'] || '';
    if (!timing.includes('頓服')) return;

    // マグミットを含むかチェック（全角・半角カタカナ・ひらがな対応）
    const values = Object.values(record.data);
    const hasMagnesium = values.some(v =>
      v && (v.includes('マグミット') || v.includes('ﾏｸﾞﾐｯﾄ') || v.includes('まぐみっと') || v.includes('酸化マグネシウム'))
    );

    if (hasMagnesium) {
      const dateKey = getDateKey(record.timestamp);
      if (dateKey) {
        // 頓服時刻を「何時に頓服薬を飲まれましたか？」フィールドから取得
        const tonpukuTime = record.data['何時に頓服薬を飲まれましたか？'] || '';
        dates.set(dateKey, { time: tonpukuTime, note: '' });
      }
    }
  });

  return dates;
}

// 日付ごとの排便データを集計
interface BowelData {
  hasBowel: boolean;
  count: number;
  times: string[];
  details: string[];
  notes: string[];
}

function aggregateBowelData(excretionRecords: PlanDataRecord[]): Map<string, BowelData> {
  const dataMap = new Map<string, BowelData>();

  excretionRecords.forEach(record => {
    const dateKey = getDateKey(record.timestamp);
    if (!dateKey) return;

    const existing = dataMap.get(dateKey) || {
      hasBowel: false,
      count: 0,
      times: [],
      details: [],
      notes: [],
    };

    const hasBowel = record.data['排便はありましたか？'];
    if (hasBowel && hasBowel.includes('あり')) {
      existing.hasBowel = true;
      existing.count += 1;

      // 時間を追加
      const timeMatch = record.timestamp.match(/(\d{1,2}:\d{2})/);
      if (timeMatch) {
        existing.times.push(timeMatch[1]);
      }

      // 排便の詳細
      if (hasBowel !== 'あり') {
        existing.details.push(hasBowel);
      }

      // 特記事項を追加
      const note = record.data['特記事項'];
      if (note) {
        existing.notes.push(note);
      }
    }

    dataMap.set(dateKey, existing);
  });

  return dataMap;
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

// ページネーションコンポーネント
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  // 表示するページ番号を計算（最大5ページ表示）
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // 全ページ表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 先頭
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // 現在ページ周辺
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // 末尾
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      {/* 前へ */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-1.5 rounded-lg text-sm ${
          currentPage === 1
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        &lt;
      </button>

      {/* ページ番号 */}
      {getPageNumbers().map((page, index) => (
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`min-w-[36px] px-3 py-1.5 rounded-lg text-sm transition-all ${
              currentPage === page
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-2 text-gray-400">
            {page}
          </span>
        )
      ))}

      {/* 次へ */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-1.5 rounded-lg text-sm ${
          currentPage === totalPages
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        &gt;
      </button>
    </div>
  );
}

export function CorrelationTab() {
  // ページネーション状態
  const [currentPage, setCurrentPage] = useState(1);
  // 選択行の状態（詳細モーダル用）
  const [selectedRow, setSelectedRow] = useState<CorrelationDataPoint | null>(null);
  // スクショ用モーダル状態
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  // 内服と排便・排尿シートのデータを取得（全期間）
  const { records: medicationRecords, isLoading: medicationLoading } = useSheetRecords('内服');
  const { records: excretionRecords, isLoading: excretionLoading } = useSheetRecords('排便・排尿');

  const isLoading = medicationLoading || excretionLoading;

  // マグミット頓服の日付・時刻を抽出
  const magnesiumDates = useMemo(() =>
    extractMagnesiumDates(medicationRecords),
    [medicationRecords]
  );

  // 排便データの集計
  const bowelData = useMemo(() =>
    aggregateBowelData(excretionRecords),
    [excretionRecords]
  );

  // 相関データの生成（新しい順）
  const correlationData = useMemo(() => {
    const data: CorrelationDataPoint[] = [];

    magnesiumDates.forEach((magInfo, dateKey) => {
      const nextDateKey = getNextDate(dateKey);
      const bowelSameDay = bowelData.get(dateKey);
      const bowelNextDay = bowelData.get(nextDateKey);

      const hasBowelSameDay = bowelSameDay?.hasBowel || false;
      const hasBowelNextDay = bowelNextDay?.hasBowel || false;

      data.push({
        date: dateKey,
        displayDate: getDisplayDate(dateKey),
        hasMagnesium: true,
        magnesiumTime: magInfo.time,
        magnesiumNote: magInfo.note,
        hasBowelSameDay,
        bowelCountSameDay: bowelSameDay?.count || 0,
        bowelTimesSameDay: bowelSameDay?.times.join(', ') || '',
        hasBowelNextDay,
        bowelCountNextDay: bowelNextDay?.count || 0,
        bowelTimesNextDay: bowelNextDay?.times.join(', ') || '',
        nextDayDisplayDate: getDisplayDate(nextDateKey),
        hasEffect: hasBowelSameDay || hasBowelNextDay,
      });
    });

    // 日付でソート（新しい順）
    return data.sort((a, b) => b.date.localeCompare(a.date));
  }, [magnesiumDates, bowelData]);

  // ページネーション計算
  const totalPages = Math.ceil(correlationData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return correlationData.slice(start, start + ITEMS_PER_PAGE);
  }, [correlationData, currentPage]);

  // 相関率の計算（全データベース）
  const correlationRate = useMemo(() => {
    if (correlationData.length === 0) return 0;
    const withEffect = correlationData.filter(d => d.hasEffect).length;
    return Math.round((withEffect / correlationData.length) * 100);
  }, [correlationData]);

  const sameDayRate = useMemo(() => {
    if (correlationData.length === 0) return 0;
    const sameDayOnly = correlationData.filter(d => d.hasBowelSameDay).length;
    return Math.round((sameDayOnly / correlationData.length) * 100);
  }, [correlationData]);

  // ページ変更時にトップへスクロール
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message="相関データを分析中..." />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 space-y-6">
      {/* マグミット × 排便 */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>💊</span>
            <span>マグミット × 排便 の相関</span>
          </h3>
          {correlationData.length > 0 && (
            <button
              onClick={() => setShowScreenshotModal(true)}
              className="sm:hidden p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="スクリーンショット用表示"
              title="スクショ用表示"
            >
              📷
            </button>
          )}
        </div>

        {correlationData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">マグミットの記録が見つかりません</p>
            <p className="text-sm text-gray-400 mt-2">
              特記事項シートに「マグミット」を含む記録がある場合に表示されます
            </p>
          </div>
        ) : (
          <>
            {/* 相関率サマリ */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">服用後の排便率（当日〜翌日）</p>
                  <p className="text-3xl font-bold text-primary">{correlationRate}%</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{correlationData.filter(d => d.hasEffect).length} / {correlationData.length} 回</p>
                  <p className="text-xs text-gray-400">当日のみ: {sameDayRate}%</p>
                </div>
              </div>
            </div>

            {/* データテーブル */}
            <div className="overflow-x-auto">
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
                  {paginatedData.map((row) => (
                    <tr
                      key={row.date}
                      onClick={() => setSelectedRow(row)}
                      className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${row.hasEffect ? '' : 'bg-red-50'}`}
                    >
                      <td className="p-2 font-medium">{row.displayDate}</td>
                      <td className="p-2 text-gray-600">{row.magnesiumTime || '-'}</td>
                      <td className="p-2">
                        {row.hasBowelSameDay ? (
                          <span className="text-green-600">
                            ✓ {row.bowelTimesSameDay || 'あり'}
                            {row.bowelCountSameDay > 1 && ` (${row.bowelCountSameDay}回)`}
                          </span>
                        ) : (
                          <span className="text-gray-400">なし</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.hasBowelNextDay ? (
                          <span className="text-blue-600">
                            ✓ {row.nextDayDisplayDate} {row.bowelTimesNextDay || ''}
                            {row.bowelCountNextDay > 1 && ` (${row.bowelCountNextDay}回)`}
                          </span>
                        ) : (
                          <span className="text-gray-400">なし</span>
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
            </div>

            {/* ページネーション */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            {/* 注釈 */}
            <p className="text-xs text-gray-400 mt-4">
              ※ マグミット（酸化マグネシウム）は服用後8〜12時間で効果が出るため、翌日までの排便を確認しています
            </p>
          </>
        )}
      </div>

      {/* 詳細モーダル */}
      {selectedRow && (
        <CorrelationDetailModal
          correlationData={selectedRow}
          medicationRecords={medicationRecords}
          excretionRecords={excretionRecords}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* スクショ用モーダル */}
      {showScreenshotModal && (
        <CorrelationScreenshotModal
          correlationData={correlationData}
          correlationRate={correlationRate}
          sameDayRate={sameDayRate}
          onClose={() => setShowScreenshotModal(false)}
        />
      )}
    </div>
  );
}
