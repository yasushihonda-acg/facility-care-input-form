/**
 * CorrelationDetailModal - 相関分析の詳細モーダル
 * マグミット服用日の詳細情報（内服、排便・排尿、特記事項）を表示
 */

import { useEffect, useRef, useMemo } from 'react';
import type { PlanDataRecord } from '../../types';

// CorrelationDataPoint型（CorrelationTab.tsxと同じ）
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

interface CorrelationDetailModalProps {
  correlationData: CorrelationDataPoint;
  medicationRecords: PlanDataRecord[];
  excretionRecords: PlanDataRecord[];
  includeThirdDay: boolean;
  onClose: () => void;
}

// 日付キー抽出関数
function getDateKey(timestamp: string): string {
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!match) return '';
  return `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`;
}

// 日付をN日進める
function getDatePlusN(dateKey: string, days: number): string {
  const parts = dateKey.split('/');
  if (parts.length < 3) return '';
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

// 翌日の日付キー取得（後方互換）
function getNextDate(dateKey: string): string {
  return getDatePlusN(dateKey, 1);
}

// 3段階判定の型
type EffectLevel = 'effect' | 'delayed' | 'none';

// 3段階判定を計算
function getEffectLevel(d: CorrelationDataPoint, includeThirdDay: boolean): EffectLevel {
  if (d.hasBowelSameDay || d.hasBowelNextDay) return 'effect';  // ○
  if (includeThirdDay && d.hasBowelTwoDaysLater) return 'delayed';  // △
  return 'none';  // ✗
}

// 時刻を抽出
function extractTime(timestamp: string): string {
  const match = timestamp.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '-';
}

export function CorrelationDetailModal({
  correlationData,
  medicationRecords,
  excretionRecords,
  includeThirdDay,
  onClose,
}: CorrelationDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const effectLevel = getEffectLevel(correlationData, includeThirdDay);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 背景クリックで閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const targetDate = correlationData.date;
  const nextDate = getNextDate(targetDate);
  const twoDaysLaterDate = getDatePlusN(targetDate, 2);

  // 当日のマグミット関連内服レコード
  const sameDayMedication = useMemo(() => {
    return medicationRecords.filter(r => {
      const dateKey = getDateKey(r.timestamp);
      if (dateKey !== targetDate) return false;
      const timing = r.data['内服はいつのことですか？'] || '';
      if (!timing.includes('頓服')) return false;
      const values = Object.values(r.data);
      return values.some(v =>
        v && (v.includes('マグミット') || v.includes('ﾏｸﾞﾐｯﾄ') ||
              v.includes('まぐみっと') || v.includes('酸化マグネシウム'))
      );
    });
  }, [medicationRecords, targetDate]);

  // 当日の排便レコード（排便ありのみ）
  const sameDayExcretion = useMemo(() => {
    return excretionRecords
      .filter(r => {
        if (getDateKey(r.timestamp) !== targetDate) return false;
        // 排便ありのレコードのみ
        return r.data['排便はありましたか？']?.includes('あり');
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [excretionRecords, targetDate]);

  // 翌日の排便レコード（排便ありのみ）
  const nextDayExcretion = useMemo(() => {
    return excretionRecords
      .filter(r => {
        if (getDateKey(r.timestamp) !== nextDate) return false;
        // 排便ありのレコードのみ
        return r.data['排便はありましたか？']?.includes('あり');
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [excretionRecords, nextDate]);

  // 2日後の排便レコード（排便ありのみ）
  const twoDaysLaterExcretion = useMemo(() => {
    return excretionRecords
      .filter(r => {
        if (getDateKey(r.timestamp) !== twoDaysLaterDate) return false;
        // 排便ありのレコードのみ
        return r.data['排便はありましたか？']?.includes('あり');
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [excretionRecords, twoDaysLaterDate]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl animate-modal-in max-h-[85vh] flex flex-col"
        style={{ width: '95%' }}
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span>💊</span>
              <span>マグミット服用日の詳細</span>
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {correlationData.displayDate}
              {effectLevel === 'effect' ? (
                <span className="ml-2 text-green-600 font-medium">○ 効果あり</span>
              ) : effectLevel === 'delayed' ? (
                <span className="ml-2 text-yellow-600 font-medium">△ 遅延効果</span>
              ) : (
                <span className="ml-2 text-red-500 font-medium">× 効果なし</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {/* 内服セクション */}
          <RecordSection
            icon="💊"
            title="内服記録（マグミット）"
            subtitle={correlationData.displayDate}
          >
            {sameDayMedication.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2 px-4">記録なし</p>
            ) : (
              <div className="px-4 py-2 text-sm">
                <span className="font-medium">
                  頓服時刻: {sameDayMedication.map(r => r.data['何時に頓服薬を飲まれましたか？'] || extractTime(r.timestamp)).join(', ')}
                </span>
              </div>
            )}
          </RecordSection>

          {/* 当日の排便セクション */}
          <RecordSection
            icon="🚽"
            title="排便記録（当日）"
            subtitle={correlationData.displayDate}
          >
            {sameDayExcretion.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2 px-4">排便なし</p>
            ) : (
              sameDayExcretion.map((r, idx) => (
                <BowelRecordItem key={idx} record={r} />
              ))
            )}
          </RecordSection>

          {/* 翌日の排便セクション */}
          <RecordSection
            icon="🚽"
            title="排便記録（翌日）"
            subtitle={correlationData.nextDayDisplayDate}
          >
            {nextDayExcretion.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-2 px-4">排便なし</p>
            ) : (
              nextDayExcretion.map((r, idx) => (
                <BowelRecordItem key={idx} record={r} />
              ))
            )}
          </RecordSection>

          {/* 2日後の排便セクション（3日目含む場合のみ） */}
          {includeThirdDay && (
            <RecordSection
              icon="🚽"
              title="排便記録（2日後）"
              subtitle={correlationData.twoDaysLaterDisplayDate}
            >
              {twoDaysLaterExcretion.length === 0 ? (
                <p className="text-sm text-gray-400 italic py-2 px-4">排便なし</p>
              ) : (
                twoDaysLaterExcretion.map((r, idx) => (
                  <BowelRecordItem key={idx} record={r} />
                ))
              )}
            </RecordSection>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <span className="text-xs text-gray-400">
            データ対象: {correlationData.date} - {includeThirdDay ? twoDaysLaterDate : nextDate}
          </span>
        </div>
      </div>

      {/* アニメーション */}
      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

// セクション表示用サブコンポーネント
interface RecordSectionProps {
  icon: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function RecordSection({ icon, title, subtitle, children }: RecordSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="font-medium text-gray-700 flex items-center gap-2">
          <span>{icon}</span>
          <span>{title}</span>
          <span className="text-xs text-gray-400 font-normal ml-auto">{subtitle}</span>
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {children}
      </div>
    </div>
  );
}

// 排便レコード表示コンポーネント
function BowelRecordItem({ record }: { record: PlanDataRecord }) {
  const note = record.data['特記事項'];
  // 排便の詳細（「あり」以外の情報があれば表示）
  const bowelDetail = record.data['排便はありましたか？'];
  const detailText = bowelDetail && bowelDetail !== 'あり' ? bowelDetail.replace('あり', '').trim() : '';

  return (
    <div className="px-4 py-2 hover:bg-gray-50 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{extractTime(record.timestamp)}</span>
        <span className="text-gray-400">|</span>
        <span className="text-green-600 font-medium">排便あり</span>
        {detailText && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600">{detailText}</span>
          </>
        )}
        <span className="text-gray-400">|</span>
        <span className="text-gray-500">{record.staffName || '-'}</span>
      </div>
      {note && (
        <p className="mt-1 text-gray-600 bg-yellow-50 px-2 py-1 rounded text-xs">
          特記: {note}
        </p>
      )}
    </div>
  );
}
