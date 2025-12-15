/**
 * View C: 家族ホーム（タイムライン）
 * 時系列で1日の食事提供状況を一覧表示
 * @see docs/FAMILY_UX_DESIGN.md
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { TimelineItem } from '../../components/family/TimelineItem';
import {
  DEMO_RESIDENT,
  getTimelineForDate,
  getTodayString,
  formatDateDisplay,
} from '../../data/demoFamilyData';

export function FamilyDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // 日付の前後移動
  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // タイムラインデータ取得
  const timelineItems = useMemo(() => {
    return getTimelineForDate(selectedDate);
  }, [selectedDate]);

  // 日付選択用の近隣日付生成
  const nearbyDates = useMemo(() => {
    const dates: string[] = [];
    const today = new Date(selectedDate);
    for (let i = -2; i <= 2; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  return (
    <Layout
      title="家族ホーム"
      subtitle={DEMO_RESIDENT.name + '様'}
      showBackButton={false}
      rightElement={
        <Link
          to="/family/request"
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
          aria-label="ケア指示を作成"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      }
    >
      <div className="pb-4">
        {/* 日付セレクター */}
        <div className="bg-white rounded-lg shadow-card p-3 mb-4">
          <p className="text-center text-sm text-gray-500 mb-2">
            {formatDateDisplay(selectedDate)}
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              aria-label="前の日"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>

            {/* 日付チップ */}
            <div className="flex gap-1 overflow-x-auto px-2">
              {nearbyDates.map((date) => {
                const d = new Date(date);
                const day = d.getDate();
                const isSelected = date === selectedDate;
                const isTodayDate = date === getTodayString();
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition
                      ${isSelected
                        ? 'bg-primary text-white'
                        : isTodayDate
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {day}
                    {isTodayDate && !isSelected && (
                      <span className="block text-[10px] text-blue-600">今日</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              aria-label="次の日"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* タイムライン */}
        <div className="space-y-3">
          {timelineItems.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>

        {/* ケア指示作成ボタン（FAB風） */}
        <Link
          to="/family/request"
          className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition z-30"
          aria-label="新しいケア指示を作成"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </div>
    </Layout>
  );
}
