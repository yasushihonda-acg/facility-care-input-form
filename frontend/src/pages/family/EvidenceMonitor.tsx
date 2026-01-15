/**
 * View A: エビデンス・モニター
 * Plan（指示）とResult（実績）を対比表示し、写真エビデンスで安心感を提供
 * @see docs/FAMILY_UX_DESIGN.md
 * @see docs/PLAN_RESULT_MANAGEMENT.md
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
  type EvidenceData,
} from '../../types/family';
import {
  getEvidenceData,
  formatDateDisplay,
  getTodayString,
  DEMO_CARE_INSTRUCTIONS,
} from '../../data/demoFamilyData';
import { useFamilyMealRecords } from '../../hooks/useFamilyMealRecords';
import { useCarePhotoList } from '../../hooks/useCarePhotos';
import { DEMO_RESIDENT_ID, useDemoMode } from '../../hooks/useDemoMode';

/**
 * タイムスタンプをフォーマット（表示用）
 * "YYYY/MM/DD HH:mm:ss" → "YYYY/M/D HH:mm"
 */
function formatRecordedAt(timestamp: string): string {
  if (!timestamp) return '';
  // ISO形式の場合
  if (timestamp.includes('T')) {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${date.getFullYear()}/${month}/${day} ${hours}:${minutes}`;
  }
  // シート形式の場合 "YYYY/MM/DD HH:mm:ss"
  const match = timestamp.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return `${year}/${parseInt(month)}/${parseInt(day)} ${hour.padStart(2, '0')}:${minute}`;
  }
  return timestamp;
}

export function EvidenceMonitor() {
  const { date } = useParams<{ date: string }>();
  const [searchParams] = useSearchParams();
  const mealTime = (searchParams.get('meal') || 'lunch') as MealTime;

  // デモモード判定
  const isDemo = useDemoMode();

  // 対象日（URLパラメータがない場合は今日）
  const targetDate = date || getTodayString();

  // 食事シートから実績データを取得（予実管理）
  const { records: mealResults, isLoading } = useFamilyMealRecords({
    date: targetDate,
    mealTime: mealTime,
    // デモ版では入居者フィルタなし（全員分表示）
  });

  // Phase 17: Firebase Storage から写真を取得
  const { photos, isLoading: isPhotosLoading } = useCarePhotoList({
    residentId: DEMO_RESIDENT_ID,
    date: targetDate,
    mealTime: mealTime === 'breakfast' ? 'breakfast'
            : mealTime === 'lunch' ? 'lunch'
            : mealTime === 'dinner' ? 'dinner'
            : 'snack',
    enabled: true,
  });

  // エビデンスデータを構築（Plan: モック、Result: 実データ優先）
  const evidence = useMemo<EvidenceData>(() => {
    // Plan: デモモードの場合のみデモ指示データを使用（本番では指示機能未実装）
    const instruction = isDemo
      ? DEMO_CARE_INSTRUCTIONS.find(
          (i) => i.targetDate === targetDate && i.mealTime === mealTime
        )
      : undefined;

    // Result: 食事シートから取得した実績（最新1件）
    const result = mealResults.length > 0 ? mealResults[0] : undefined;

    // デモモードの場合のみフォールバック用のデモデータを取得
    const fallbackEvidence = isDemo ? getEvidenceData(targetDate, mealTime) : null;

    // Phase 17: Firestoreから取得した写真URLを優先（最新1件）
    const firestorePhotoUrl = photos.length > 0 ? photos[0].photoUrl : undefined;

    // 結果データにFirestoreの写真URLをマージ
    const resultWithPhoto = result
      ? { ...result, photoUrl: firestorePhotoUrl || result.photoUrl }
      : fallbackEvidence?.result
        ? { ...fallbackEvidence.result, photoUrl: firestorePhotoUrl || fallbackEvidence.result.photoUrl }
        : undefined;

    return {
      date: targetDate,
      mealTime: mealTime,
      plan: instruction
        ? {
            menuName: instruction.menuName,
            processingDetail: instruction.processingDetail,
            priority: instruction.priority,
            conditions: instruction.conditions,
          }
        : fallbackEvidence?.plan,
      // 実データ優先、デモモードの場合はデモのresultにフォールバック（写真URLはFirestore優先）
      result: resultWithPhoto,
    };
  }, [targetDate, mealTime, mealResults, photos, isDemo]);

  const mealLabel = MEAL_TIME_LABELS[evidence.mealTime];
  const mealIcon = MEAL_TIME_ICONS[evidence.mealTime];
  const isCritical = evidence.plan?.priority === 'critical';

  return (
    <Layout
      title="エビデンス・モニター"
      subtitle={`${targetDate ? formatDateDisplay(targetDate).split('年')[1] : ''} ${mealLabel}`}
      showBackButton={true}
    >
      <div className="pb-4 space-y-4">
        {/* ローディング表示 */}
        {(isLoading || isPhotosLoading) && (
          <div className="bg-white rounded-lg shadow-card p-6">
            <div className="flex flex-col items-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2" />
              <p className="text-sm">データを読み込み中...</p>
            </div>
          </div>
        )}
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
              {/* 写真エビデンス - Phase 16: 実画像表示 */}
              {evidence.result.photoUrl && (
                <div className="mb-4">
                  <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {/* 実在するURLの場合は実画像を表示 */}
                    {evidence.result.photoUrl.startsWith('http') ? (
                      <img
                        src={evidence.result.photoUrl}
                        alt="提供直前の写真"
                        data-testid="evidence-photo"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // 画像読み込みエラー時はプレースホルダに切り替え
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement?.querySelector('[data-placeholder]')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {/* プレースホルダ（画像がない場合や読み込みエラー時） */}
                    <div
                      data-placeholder
                      className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100 ${
                        evidence.result.photoUrl.startsWith('http') ? 'hidden' : ''
                      }`}
                    >
                      <span className="text-5xl mb-2">📷</span>
                      <p className="text-sm text-gray-500">提供直前の写真</p>
                      <p className="text-xs text-gray-400 mt-1">（画像を読み込めません）</p>
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
                  <span className="text-gray-800">{formatRecordedAt(evidence.result.recordedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">摂取量</span>
                  <span className="text-gray-800">
                    主食{evidence.result.mainDishAmount}{evidence.result.mainDishAmount && !evidence.result.mainDishAmount.includes('割') ? '割' : ''} / 副食{evidence.result.sideDishAmount}{evidence.result.sideDishAmount && !evidence.result.sideDishAmount.includes('割') ? '割' : ''}
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
