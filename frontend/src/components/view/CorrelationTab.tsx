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
  times: string[];
  details: string[];
  notes: string[];  // 排便・排尿シートの特記事項
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

      // 排便の詳細（「あり（〇〇）」の形式から抽出）
      if (hasBowel !== 'あり') {
        existing.details.push(hasBowel);
      }

      // 排便・排尿シートの特記事項を追加
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
  // 当日の排便
  hasBowelSameDay: boolean;
  bowelCountSameDay: number;
  bowelTimesSameDay: string;
  bowelNotesSameDay: string;
  // 翌日の排便
  hasBowelNextDay: boolean;
  bowelCountNextDay: number;
  bowelTimesNextDay: string;
  bowelNotesNextDay: string;
  nextDayDate: string;
  nextDayDisplayDate: string;
  // 判定結果（当日または翌日に排便あり）
  hasEffect: boolean;
}

export function CorrelationTab({ year, month }: CorrelationTabProps) {
  // 特記事項と排便・排尿シートのデータを取得（年フィルタ付き - オンデマンド読み込み）
  const { records: specialNotes, isLoading: notesLoading } = useSheetRecords({
    sheetName: '特記事項',
    year,
  });
  const { records: excretionRecords, isLoading: excretionLoading } = useSheetRecords({
    sheetName: '排便・排尿',
    year,
  });

  const isLoading = notesLoading || excretionLoading;

  // フィルタリング（月フィルタのみ - サーバーサイドで年フィルタ済み）
  const filteredNotes = useMemo(() =>
    filterByYearMonth(specialNotes, year, month),
    [specialNotes, year, month]
  );

  // マグミット日付の抽出
  const magnesiumDates = useMemo(() =>
    extractMagnesiumDates(filteredNotes),
    [filteredNotes]
  );

  // 排便データの集計（サーバーサイドで年フィルタ済み）
  // 注: 12/31→1/1の年またぎは翌年データが含まれないため検出されない場合あり
  const bowelData = useMemo(() =>
    aggregateBowelData(excretionRecords),
    [excretionRecords]
  );

  // 相関データの生成（当日＋翌日チェック）
  const correlationData = useMemo(() => {
    const data: CorrelationDataPoint[] = [];

    // マグミット服用日をベースにデータを生成
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
        // 当日
        hasBowelSameDay,
        bowelCountSameDay: bowelSameDay?.count || 0,
        bowelTimesSameDay: bowelSameDay?.times.join(', ') || '',
        bowelNotesSameDay: bowelSameDay?.notes.join(' / ') || '',
        // 翌日
        hasBowelNextDay,
        bowelCountNextDay: bowelNextDay?.count || 0,
        bowelTimesNextDay: bowelNextDay?.times.join(', ') || '',
        bowelNotesNextDay: bowelNextDay?.notes.join(' / ') || '',
        nextDayDate: nextDateKey,
        nextDayDisplayDate: getDisplayDate(nextDateKey),
        // 効果判定（当日または翌日に排便あり）
        hasEffect: hasBowelSameDay || hasBowelNextDay,
      });
    });

    // 日付でソート（新しい順）
    return data.sort((a, b) => b.date.localeCompare(a.date));
  }, [magnesiumDates, bowelData]);

  // 相関率の計算（当日または翌日に排便ありの割合）
  const correlationRate = useMemo(() => {
    if (correlationData.length === 0) return 0;
    const withEffect = correlationData.filter(d => d.hasEffect).length;
    return Math.round((withEffect / correlationData.length) * 100);
  }, [correlationData]);

  // 当日のみの相関率（参考値）
  const sameDayRate = useMemo(() => {
    if (correlationData.length === 0) return 0;
    const sameDayOnly = correlationData.filter(d => d.hasBowelSameDay).length;
    return Math.round((sameDayOnly / correlationData.length) * 100);
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
                  {correlationData.map((row) => (
                    <tr key={row.date} className={`border-b hover:bg-gray-50 ${row.hasEffect ? '' : 'bg-red-50'}`}>
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

            {/* 注釈 */}
            <p className="text-xs text-gray-400 mt-4">
              ※ マグミット（酸化マグネシウム）は服用後8〜12時間で効果が出るため、翌日までの排便を確認しています
            </p>
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
