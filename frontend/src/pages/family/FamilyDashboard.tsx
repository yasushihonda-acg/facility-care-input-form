/**
 * View C: 家族ホーム（タイムライン）
 * 時系列で1日の食事提供状況を一覧表示
 * @see docs/FAMILY_UX_DESIGN.md
 * @see docs/PLAN_RESULT_MANAGEMENT.md
 */

import { useState, useMemo } from 'react';
import { Layout } from '../../components/Layout';
// Phase 21: チャット機能一時非表示
// import { NotificationSection } from '../../components/shared/NotificationSection';
import { TimelineItem } from '../../components/family/TimelineItem';
import type { TimelineItem as TimelineItemType, MealTime, TimelineStatus } from '../../types/family';
import {
  DEMO_RESIDENT,
  getTodayString,
  formatDateDisplay,
  DEMO_CARE_INSTRUCTIONS,
} from '../../data/demoFamilyData';
import { formatDateString } from '../../utils/scheduleUtils';
import { useDailyMealRecords } from '../../hooks/useFamilyMealRecords';
import { useDemoMode } from '../../hooks/useDemoMode';

export function FamilyDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // 食事シートから当日の実績データを取得（予実管理）
  const { records: mealResults, isLoading } = useDailyMealRecords(selectedDate);

  // デモモード判定（将来の拡張用）
  useDemoMode();

  // 日付の前後移動
  const handlePrevDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(formatDateString(date));
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(formatDateString(date));
  };

  // 間食の内容が実質的に空かどうかをチェック
  // snackがあるか、noteに「【ケアに関すること】 【ACPiece】」以外の内容があれば表示
  const hasSnackContent = (note: string | undefined, snack: string | undefined): boolean => {
    // snackがあれば内容あり
    if (snack && snack.trim().length > 0) return true;

    // noteがある場合、【ケアに関すること】と【ACPiece】を削除して残りがあるか確認
    if (!note) return false;
    const content = note
      .replace(/【ケアに関すること】/g, '')
      .replace(/【ACPiece】/g, '')
      .trim();
    return content.length > 0;
  };

  // タイムラインデータを構築（実データ + モックPlan）
  const timelineItems = useMemo<TimelineItemType[]>(() => {
    const items: TimelineItemType[] = [];

    // 朝食・昼食・夕食は各1件（従来通り）
    const regularMealTimes: MealTime[] = ['breakfast', 'lunch', 'dinner'];

    regularMealTimes.forEach((mealTime) => {
      const result = mealResults.find((r) => r.mealTime === mealTime);
      const instruction = DEMO_CARE_INSTRUCTIONS.find(
        (i) => i.targetDate === selectedDate && i.mealTime === mealTime
      );

      let status: TimelineStatus = 'pending';
      if (result) {
        status = result.isImportant ? 'provided' : 'completed';
      } else if (instruction) {
        status = 'has_instruction';
      }

      const item: TimelineItemType = {
        id: `${selectedDate}-${mealTime}`,
        date: selectedDate,
        mealTime,
        status,
        instruction,
      };

      if (result) {
        item.mainDishAmount = result.mainDishAmount ? `${result.mainDishAmount}割` : undefined;
        item.sideDishAmount = result.sideDishAmount ? `${result.sideDishAmount}割` : undefined;
        item.staffName = result.staffName;
        item.recordedAt = result.recordedAt;
        item.note = result.note;
        item.snack = result.snack;
        item.isImportant = result.isImportant;
      }

      items.push(item);
    });

    // 間食(snack)は複数件対応：全てのsnackレコードを取得
    // 実質的な内容がある記録のみ表示（「【ケアに関すること】 【ACPiece】」のみは除外）
    const snackResults = mealResults
      .filter((r) => r.mealTime === 'snack')
      .filter((r) => hasSnackContent(r.note, r.snack));

    if (snackResults.length > 0) {
      // 間食のレコードがある場合、それぞれをタイムラインに追加
      snackResults.forEach((result, index) => {
        const item: TimelineItemType = {
          id: result.id || `${selectedDate}-snack-${index}`,
          date: selectedDate,
          mealTime: 'snack',
          status: result.isImportant ? 'provided' : 'completed',
          mainDishAmount: result.mainDishAmount ? `${result.mainDishAmount}割` : undefined,
          sideDishAmount: result.sideDishAmount ? `${result.sideDishAmount}割` : undefined,
          staffName: result.staffName,
          recordedAt: result.recordedAt,
          note: result.note,
          snack: result.snack,
          isImportant: result.isImportant,
        };
        items.push(item);
      });
    }

    // 表示順: 朝食 → 昼食 → 間食（複数） → 夕食
    const mealTimeOrder: Record<MealTime, number> = {
      breakfast: 1,
      lunch: 2,
      snack: 3,
      dinner: 4,
    };
    items.sort((a, b) => mealTimeOrder[a.mealTime] - mealTimeOrder[b.mealTime]);

    return items;
  }, [selectedDate, mealResults]);

  // 日付選択用の近隣日付生成
  const nearbyDates = useMemo(() => {
    const dates: string[] = [];
    const baseDate = new Date(selectedDate);
    for (let i = -2; i <= 2; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      dates.push(formatDateString(date));
    }
    return dates;
  }, [selectedDate]);

  return (
    <Layout
      title="家族ホーム"
      subtitle={DEMO_RESIDENT.name + '様'}
      showBackButton={false}
    >
      <div className="pb-4">
        {/* Phase 21: チャット機能一時非表示
        <NotificationSection userType="family" maxItems={3} />
        */}

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
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-card p-6">
              <div className="flex flex-col items-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
                <p className="text-sm">データを読み込み中...</p>
              </div>
            </div>
          ) : (
            timelineItems.map((item) => (
              <TimelineItem key={item.id} item={item} />
            ))
          )}
        </div>

      </div>
    </Layout>
  );
}
