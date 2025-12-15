/**
 * View A: エビデンス・モニター
 * Plan（指示）とResult（実績）を対比表示し、写真エビデンスで安心感を提供
 * @see docs/FAMILY_UX_DESIGN.md
 */

import { useParams, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { Layout } from '../../components/Layout';
import {
  MEAL_TIME_LABELS,
  MEAL_TIME_ICONS,
  CARE_PRIORITY_LABELS,
  CONDITION_TRIGGER_LABELS,
  CONDITION_ACTION_LABELS,
  type MealTime,
} from '../../types/family';
import {
  getEvidenceData,
  formatDateDisplay,
  formatDateTime,
  DEMO_EVIDENCE_DATA,
} from '../../data/demoFamilyData';

export function EvidenceMonitor() {
  const { date } = useParams<{ date: string }>();
  const [searchParams] = useSearchParams();
  const mealTime = (searchParams.get('meal') || 'lunch') as MealTime;

  // エビデンスデータ取得
  const evidence = useMemo(() => {
    if (!date) return DEMO_EVIDENCE_DATA; // デモ用フォールバック
    return getEvidenceData(date, mealTime) || DEMO_EVIDENCE_DATA;
  }, [date, mealTime]);

  const mealLabel = MEAL_TIME_LABELS[evidence.mealTime];
  const mealIcon = MEAL_TIME_ICONS[evidence.mealTime];
  const isCritical = evidence.plan?.priority === 'critical';

  return (
    <Layout
      title="エビデンス・モニター"
      subtitle={`${date ? formatDateDisplay(date).split('年')[1] : ''} ${mealLabel}`}
      showBackButton={true}
    >
      <div className="pb-4 space-y-4">
        {/* PLAN セクション */}
        {evidence.plan && (
          <div className={`bg-white rounded-lg shadow-card overflow-hidden ${isCritical ? 'ring-2 ring-red-400' : ''}`}>
            <div className={`px-4 py-3 ${isCritical ? 'bg-red-50' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="font-bold text-gray-800">PLAN（指示内容）</span>
                </div>
                {isCritical && (
                  <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                    {CARE_PRIORITY_LABELS[evidence.plan.priority]}
                  </span>
                )}
              </div>
            </div>
            <div className="p-4">
              {/* メニュー名 */}
              <div className="mb-3">
                <span className="text-lg font-bold text-gray-800">
                  {mealIcon} {evidence.plan.menuName}
                </span>
              </div>

              {/* 詳細指示 - 全文表示（省略禁止） */}
              <div className="mb-3">
                <p className="text-sm text-gray-500 mb-1">【詳細指示】</p>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {evidence.plan.processingDetail}
                  </p>
                </div>
              </div>

              {/* 条件付きロジック */}
              {evidence.plan.conditions && evidence.plan.conditions.length > 0 && (
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-700 font-medium mb-2">条件付きルール</p>
                  {evidence.plan.conditions.map((cond, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-amber-800">
                      <span>もし</span>
                      <span className="px-2 py-0.5 bg-amber-100 rounded">
                        {CONDITION_TRIGGER_LABELS[cond.trigger]}
                      </span>
                      <span>なら →</span>
                      <span className="px-2 py-0.5 bg-amber-100 rounded">
                        {CONDITION_ACTION_LABELS[cond.action]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 対比矢印 */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
            <span className="text-xs">対比</span>
          </div>
        </div>

        {/* RESULT セクション */}
        {evidence.result ? (
          <div className="bg-white rounded-lg shadow-card overflow-hidden ring-2 ring-green-400">
            <div className="px-4 py-3 bg-green-50">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="font-bold text-gray-800">RESULT（実施結果）</span>
              </div>
            </div>
            <div className="p-4">
              {/* 写真エビデンス */}
              {evidence.result.photoUrl && (
                <div className="mb-4">
                  <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {/* デモ用プレースホルダ画像 */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
                      <span className="text-5xl mb-2">📷</span>
                      <p className="text-sm text-gray-500">提供直前の写真</p>
                      <p className="text-xs text-gray-400 mt-1">（デモ用プレースホルダ）</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 記録情報 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">記録者</span>
                  <span className="text-gray-800 font-medium">{evidence.result.staffName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">記録日時</span>
                  <span className="text-gray-800">{formatDateTime(evidence.result.recordedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">摂取量</span>
                  <span className="text-gray-800">
                    主食{evidence.result.mainDishAmount} / 副食{evidence.result.sideDishAmount}
                  </span>
                </div>
              </div>

              {/* 備考 */}
              {evidence.result.note && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">備考</p>
                  <p className="text-gray-800">{evidence.result.note}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-card p-6">
            <div className="flex flex-col items-center text-gray-400">
              <span className="text-4xl mb-2">⏳</span>
              <p className="text-sm">まだ実績が記録されていません</p>
            </div>
          </div>
        )}

        {/* Plan がない場合 */}
        {!evidence.plan && !evidence.result && (
          <div className="bg-white rounded-lg shadow-card p-6">
            <div className="flex flex-col items-center text-gray-400">
              <span className="text-4xl mb-2">📋</span>
              <p className="text-sm">この食事タイミングにはデータがありません</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
