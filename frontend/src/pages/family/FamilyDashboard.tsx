/**
 * View C: 家族ホーム（タイムライン）
 * 時系列で1日の食事提供状況を一覧表示
 * @see docs/FAMILY_UX_DESIGN.md
 * @see docs/PLAN_RESULT_MANAGEMENT.md
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { useDailyMealRecords } from '../../hooks/useFamilyMealRecords';
import { useTaskBadgeCount } from '../../hooks/useTasks';
import { useDemoMode } from '../../hooks/useDemoMode';

// デモ用の入居者ID（将来は認証から取得）
const DEMO_RESIDENT_ID = 'resident-001';

/** 食事タイミングの順序（表示順） */
const MEAL_TIME_ORDER: MealTime[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export function FamilyDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // 食事シートから当日の実績データを取得（予実管理）
  const { records: mealResults, isLoading } = useDailyMealRecords(selectedDate);

  // タスクバッジカウント取得（フッターに無い機能なのでホームに表示）
  const { count: taskCount, hasOverdue } = useTaskBadgeCount(DEMO_RESIDENT_ID);

  // デモモード対応: リンク先プレフィックス
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';

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

  // タイムラインデータを構築（実データ + モックPlan）
  const timelineItems = useMemo<TimelineItemType[]>(() => {
    // 各食事タイミング用のベースタイムライン
    const items: TimelineItemType[] = MEAL_TIME_ORDER.map((mealTime) => {
      // 実績データから該当する食事を検索（mealTime でマッチング）
      const result = mealResults.find((r) => r.mealTime === mealTime);

      // モックのケア指示から該当するものを検索
      const instruction = DEMO_CARE_INSTRUCTIONS.find(
        (i) => i.targetDate === selectedDate && i.mealTime === mealTime
      );

      // ステータス判定
      let status: TimelineStatus = 'pending';
      if (result) {
        // 実績あり
        status = result.isImportant ? 'provided' : 'completed';
      } else if (instruction) {
        // 実績なし、指示あり
        status = 'has_instruction';
      }

      // タイムラインアイテム構築
      const item: TimelineItemType = {
        id: `${selectedDate}-${mealTime}`,
        date: selectedDate,
        mealTime,
        status,
        instruction,
      };

      // 実績データがある場合、タイムラインにマージ
      if (result) {
        item.mainDishAmount = result.mainDishAmount ? `${result.mainDishAmount}割` : undefined;
        item.sideDishAmount = result.sideDishAmount ? `${result.sideDishAmount}割` : undefined;
        item.staffName = result.staffName;
        item.recordedAt = result.recordedAt;
        item.note = result.note || result.snack;
        item.isImportant = result.isImportant;
      }

      return item;
    });

    return items;
  }, [selectedDate, mealResults]);

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
    >
      <div className="pb-4">
        {/* フッターに無い機能へのクイックアクセス - Phase 27: 1列フル幅レイアウトに変更 */}
        <div className="mb-4">
          {/* タスク管理 */}
          <Link
            to={`${pathPrefix}/family/tasks`}
            className={`block bg-white rounded-lg shadow-card p-4 hover:shadow-md transition ${
              hasOverdue ? 'ring-2 ring-red-300' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">タスク</p>
                <p className="text-xs text-gray-500 truncate">
                  {taskCount > 0 ? `${taskCount}件のタスクがあります` : 'タスクはありません'}
                </p>
              </div>
              {taskCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white ${
                  hasOverdue ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  {taskCount}
                </span>
              )}
            </div>
          </Link>
        </div>

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

        {/* ケア指示作成ボタン（FAB風） */}
        <Link
          to={`${pathPrefix}/family/request`}
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
