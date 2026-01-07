/**
 * タイムラインアイテムコンポーネント
 * View C（家族ホーム）で使用
 */

import { Link } from 'react-router-dom';
import type { TimelineItem as TimelineItemType } from '../../types/family';
import {
  MEAL_TIME_LABELS,
  MEAL_TIME_ICONS,
  MEAL_TIME_HOURS,
  TIMELINE_STATUS_CONFIG,
  CARE_PRIORITY_LABELS,
} from '../../types/family';
import { useDemoMode } from '../../hooks/useDemoMode';

interface TimelineItemProps {
  item: TimelineItemType;
}

export function TimelineItem({ item }: TimelineItemProps) {
  const isDemo = useDemoMode();
  const pathPrefix = isDemo ? '/demo' : '';
  const statusConfig = TIMELINE_STATUS_CONFIG[item.status];
  const mealIcon = MEAL_TIME_ICONS[item.mealTime];
  const mealLabel = MEAL_TIME_LABELS[item.mealTime];
  const mealTime = MEAL_TIME_HOURS[item.mealTime];

  const hasInstruction = !!item.instruction;
  const isCritical = item.instruction?.priority === 'critical';

  return (
    <div className="bg-white rounded-lg shadow-card p-4 mb-3">
      {/* ヘッダー: 食事タイミング + ステータス */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{mealIcon}</span>
          <span className="font-bold text-gray-800">{mealLabel}</span>
          <span className="text-sm text-gray-500">({mealTime})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 重要フラグ */}
          {item.isImportant && (
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full">
              重要
            </span>
          )}
          {/* ステータス */}
          <span className={`flex items-center gap-1 text-sm font-medium ${statusConfig.color}`}>
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.label}</span>
          </span>
        </div>
      </div>

      {/* 実績情報 */}
      {item.status === 'completed' || item.status === 'provided' ? (
        <div className="mt-2 space-y-1">
          {/* 指示通り対応バッジ */}
          {hasInstruction && (
            <div className="flex items-center gap-1 text-sm text-green-600 mb-1">
              <span>✓</span>
              <span>{item.instruction?.menuName}（{CARE_PRIORITY_LABELS[item.instruction?.priority || 'normal']}）</span>
              <span className="text-green-700 font-medium">指示通り</span>
            </div>
          )}

          {/* 摂取量 */}
          {(item.mainDishAmount || item.sideDishAmount) && (
            <p className="text-sm text-gray-600">
              主食: {item.mainDishAmount || '-'} / 副食: {item.sideDishAmount || '-'}
            </p>
          )}

          {/* 間食内容（何を食べたか） */}
          {item.snack && (
            <p className="text-sm text-gray-800 font-medium">🍴 {item.snack}</p>
          )}

          {/* 備考 */}
          {item.note && (
            <p className="text-sm text-gray-600 line-clamp-2">{item.note}</p>
          )}

          {/* アクションボタン */}
          <div className="flex gap-2 mt-2">
            {item.photoUrl && (
              <Link
                to={`${pathPrefix}/family/evidence/${item.date}?meal=${item.mealTime}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
              >
                <span>📷</span>
                <span>写真を見る</span>
              </Link>
            )}
            {hasInstruction && (
              <Link
                to={`${pathPrefix}/family/evidence/${item.date}?meal=${item.mealTime}`}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
              >
                <span>📋</span>
                <span>詳細を確認</span>
              </Link>
            )}
          </div>
        </div>
      ) : item.status === 'pending' ? (
        <div className="mt-2">
          {/* 未提供時の指示情報 */}
          {hasInstruction && (
            <div className={`p-3 rounded-lg ${isCritical ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">
                  予定: {item.instruction?.menuName}
                </span>
                {isCritical && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                    絶対厳守
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">
                {item.instruction?.processingDetail.split('\n')[0]}...
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
