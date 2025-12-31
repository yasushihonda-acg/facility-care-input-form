/**
 * CorrelationTab - 相関分析タブ
 * マグミット × 排便 の相関を表示
 */

import { useMemo } from 'react';
import { useSheetRecords } from '../../hooks/usePlanData';
import { LoadingSpinner } from '../LoadingSpinner';
import type { PlanDataRecord } from '../../types';

interface CorrelationTabProps {
  year: number;
  month: number | null;
}

// 日付でフィルタ
function filterByYearMonth(records: PlanDataRecord[], year: number, month: number | null) {
  return records.filter(record => {
    if (!record.timestamp) return false;
    const match = record.timestamp.match(/^(\d{4})\/(\d{1,2})/);
    if (!match) return false;
    const recordYear = parseInt(match[1], 10);
    const recordMonth = parseInt(match[2], 10);
    if (recordYear !== year) return false;
    if (month !== null && recordMonth !== month) return false;
    return true;
  });
}

// タイムスタンプから日付文字列を取得（YYYY/MM/DD形式）
function getDateKey(timestamp: string): string {
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!match) return '';
  // ゼロパディングして比較しやすくする
  return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

// 表示用の日付文字列（M/D形式）
function getDisplayDate(dateKey: string): string {
  const parts = dateKey.split('/');
  if (parts.length < 3) return dateKey;
  return `${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`;
}

// マグミットを含むレコードの日付を抽出
function extractMagnesiumDates(specialNotes: PlanDataRecord[]): Map<string, { time: string; note: string }> {
  const dates = new Map<string, { time: string; note: string }>();

  specialNotes.forEach(record => {
    // data内の全フィールドを検索
    const values = Object.values(record.data);
    const hasmagnesium = values.some(v =>
      v && (v.includes('マグミット') || v.includes('まぐみっと') || v.includes('酸化マグネシウム'))
    );

    if (hasmagnesium) {
      const dateKey = getDateKey(record.timestamp);
      if (dateKey) {
        // 時刻を抽出
        const timeMatch = record.timestamp.match(/(\d{1,2}:\d{2})/);
        const time = timeMatch ? timeMatch[1] : '';
        // 特記事項の内容を取得
        const noteContent = record.data['特記事項'] || '';
        dates.set(dateKey, { time, note: noteContent });
      }
    }
  });

  return dates;
}

// 日付ごとの排便データを集計
interface BowelData {
  hasBowel: boolean;
  count: number;
  details: string[];
}

function aggregateBowelData(excretionRecords: PlanDataRecord[]): Map<string, BowelData> {
  const dataMap = new Map<string, BowelData>();

  excretionRecords.forEach(record => {
    const dateKey = getDateKey(record.timestamp);
    if (!dateKey) return;

    const existing = dataMap.get(dateKey) || {
      hasBowel: false,
      count: 0,
      details: [],
    };

    const hasBowel = record.data['排便はありましたか？'];
    if (hasBowel && hasBowel.includes('あり')) {
      existing.hasBowel = true;
      existing.count += 1;

      // 詳細情報があれば追加
      const detail = Object.entries(record.data)
        .filter(([key]) => key.includes('便') && !key.includes('排便はありましたか'))
        .map(([, val]) => val)
        .filter(Boolean)
        .join(', ');
      if (detail) {
        existing.details.push(detail);
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
  hasBowel: boolean;
  bowelCount: number;
  bowelDetails: string;
}

export function CorrelationTab({ year, month }: CorrelationTabProps) {
  // 特記事項と排便・排尿シートのデータを取得
  const { records: specialNotes, isLoading: notesLoading } = useSheetRecords('特記事項');
  const { records: excretionRecords, isLoading: excretionLoading } = useSheetRecords('排便・排尿');

  const isLoading = notesLoading || excretionLoading;

  // フィルタリング
  const filteredNotes = useMemo(() =>
    filterByYearMonth(specialNotes, year, month),
    [specialNotes, year, month]
  );

  const filteredExcretion = useMemo(() =>
    filterByYearMonth(excretionRecords, year, month),
    [excretionRecords, year, month]
  );

  // マグミット日付の抽出
  const magnesiumDates = useMemo(() =>
    extractMagnesiumDates(filteredNotes),
    [filteredNotes]
  );

  // 排便データの集計
  const bowelData = useMemo(() =>
    aggregateBowelData(filteredExcretion),
    [filteredExcretion]
  );

  // 相関データの生成
  const correlationData = useMemo(() => {
    const data: CorrelationDataPoint[] = [];

    // マグミット服用日をベースにデータを生成
    magnesiumDates.forEach((magInfo, dateKey) => {
      const bowel = bowelData.get(dateKey);
      data.push({
        date: dateKey,
        displayDate: getDisplayDate(dateKey),
        hasMagnesium: true,
        magnesiumTime: magInfo.time,
        magnesiumNote: magInfo.note,
        hasBowel: bowel?.hasBowel || false,
        bowelCount: bowel?.count || 0,
        bowelDetails: bowel?.details.join(' / ') || '',
      });
    });

    // 日付でソート（新しい順）
    return data.sort((a, b) => b.date.localeCompare(a.date));
  }, [magnesiumDates, bowelData]);

  // 相関率の計算
  const correlationRate = useMemo(() => {
    if (correlationData.length === 0) return 0;
    const withBowel = correlationData.filter(d => d.hasBowel).length;
    return Math.round((withBowel / correlationData.length) * 100);
  }, [correlationData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner message="相関データを分析中..." />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {/* マグミット × 排便 */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>💊</span>
          <span>マグミット × 排便 の相関</span>
        </h3>

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
                  <p className="text-sm text-gray-600">マグミット服用後の排便率</p>
                  <p className="text-3xl font-bold text-primary">{correlationRate}%</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>{correlationData.filter(d => d.hasBowel).length} / {correlationData.length} 日</p>
                  <p>排便あり / マグミット服用日</p>
                </div>
              </div>
            </div>

            {/* データテーブル */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-3 font-medium">日付</th>
                    <th className="text-left p-3 font-medium">マグミット</th>
                    <th className="text-left p-3 font-medium">排便</th>
                    <th className="text-left p-3 font-medium hidden sm:table-cell">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {correlationData.map((row) => (
                    <tr key={row.date} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{row.displayDate}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <span>✓</span>
                          <span>{row.magnesiumTime || '服用'}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        {row.hasBowel ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <span>✓</span>
                            <span>あり{row.bowelCount > 1 ? ` (${row.bowelCount}回)` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">なし</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500 text-xs hidden sm:table-cell max-w-xs truncate">
                        {row.magnesiumNote || row.bowelDetails || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 今後の拡張用プレースホルダー */}
      <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
        <p className="text-center text-gray-400 text-sm">
          今後、他の相関分析（水分×排尿、バイタル×内服など）を追加予定
        </p>
      </div>
    </div>
  );
}
