/**
 * 統計デモデータ
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション4.3
 *
 * API応答をシミュレートする事前計算済みデータ
 */

import type {
  GetInventorySummaryResponse,
  GetFoodStatsResponse,
  ItemStatsData,
  Alert,
} from '../../types/stats';
import type { ItemCategory, AIAnalyzeResponse } from '../../types/careItem';
import { formatDateString } from '../../utils/scheduleUtils';

// ===== 日付ヘルパー =====

function getDateString(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return formatDateString(date);
}

// ===== 在庫サマリー (getInventorySummary相当) =====

export const DEMO_INVENTORY_SUMMARY: GetInventorySummaryResponse = {
  items: [
    {
      itemId: 'demo-item-005',
      itemName: '柿（熟し）',
      category: 'food' as ItemCategory,
      initialQuantity: 2,
      currentQuantity: 2,
      unit: '個',
      consumedQuantity: 0,
      consumptionPercentage: 0,
      expirationDate: getDateString(1),
      daysUntilExpiration: 1,
      isExpiringSoon: true,
      isExpired: false,
      avgConsumptionRate: 0,
      totalServings: 0,
      status: 'pending',
    },
    {
      itemId: 'demo-item-006',
      itemName: 'プリン',
      category: 'food' as ItemCategory,
      initialQuantity: 6,
      currentQuantity: 2,
      unit: '個',
      consumedQuantity: 4,
      consumptionPercentage: 67,
      expirationDate: getDateString(1),
      daysUntilExpiration: 1,
      isExpiringSoon: true,
      isExpired: false,
      avgConsumptionRate: 95,
      totalServings: 4,
      status: 'in_progress',
      latestNoteToFamily: '大好物のようです',
    },
    {
      itemId: 'demo-item-001',
      itemName: 'バナナ',
      category: 'food' as ItemCategory,
      initialQuantity: 4,
      currentQuantity: 1.5,
      unit: '房',
      consumedQuantity: 2.5,
      consumptionPercentage: 63,
      expirationDate: getDateString(2),
      daysUntilExpiration: 2,
      isExpiringSoon: true,
      isExpired: false,
      avgConsumptionRate: 75,
      totalServings: 5,
      status: 'in_progress',
    },
    {
      itemId: 'demo-item-009',
      itemName: '麦茶',
      category: 'drink' as ItemCategory,
      initialQuantity: 2,
      currentQuantity: 1,
      unit: 'L',
      consumedQuantity: 1,
      consumptionPercentage: 50,
      expirationDate: getDateString(3),
      daysUntilExpiration: 3,
      isExpiringSoon: true,
      isExpired: false,
      avgConsumptionRate: 90,
      totalServings: 5,
      status: 'in_progress',
    },
    {
      itemId: 'demo-item-003',
      itemName: 'りんご',
      category: 'food' as ItemCategory,
      initialQuantity: 2,
      currentQuantity: 1.5,
      unit: '個',
      consumedQuantity: 0.5,
      consumptionPercentage: 25,
      expirationDate: getDateString(5),
      daysUntilExpiration: 5,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 25,
      totalServings: 2,
      status: 'in_progress',
      latestNoteToFamily: '食べ残しが多いようです',
    },
    {
      itemId: 'demo-item-004',
      itemName: 'みかん',
      category: 'food' as ItemCategory,
      initialQuantity: 5,
      currentQuantity: 3,
      unit: '個',
      consumedQuantity: 2,
      consumptionPercentage: 40,
      expirationDate: getDateString(7),
      daysUntilExpiration: 7,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 80,
      totalServings: 2,
      status: 'in_progress',
    },
    {
      itemId: 'demo-item-007',
      itemName: 'カステラ',
      category: 'food' as ItemCategory,
      initialQuantity: 8,
      currentQuantity: 5,
      unit: '切れ',
      consumedQuantity: 3,
      consumptionPercentage: 38,
      expirationDate: getDateString(10),
      daysUntilExpiration: 10,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 80,
      totalServings: 3,
      status: 'in_progress',
    },
    {
      itemId: 'demo-item-011',
      itemName: '黒豆',
      category: 'food' as ItemCategory,
      initialQuantity: 200,
      currentQuantity: 120,
      unit: 'g',
      consumedQuantity: 80,
      consumptionPercentage: 40,
      expirationDate: getDateString(14),
      daysUntilExpiration: 14,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 40,
      totalServings: 4,
      status: 'in_progress',
      latestNoteToFamily: '最近あまり召し上がりません',
    },
    {
      itemId: 'demo-item-008',
      itemName: '羊羹',
      category: 'food' as ItemCategory,
      initialQuantity: 4,
      currentQuantity: 4,
      unit: '切れ',
      consumedQuantity: 0,
      consumptionPercentage: 0,
      expirationDate: getDateString(30),
      daysUntilExpiration: 30,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 0,
      totalServings: 0,
      status: 'pending',
    },
    {
      itemId: 'demo-item-010',
      itemName: 'らっきょう',
      category: 'food' as ItemCategory,
      initialQuantity: 1,
      currentQuantity: 0.7,
      unit: '瓶',
      consumedQuantity: 0.3,
      consumptionPercentage: 30,
      expirationDate: getDateString(60),
      daysUntilExpiration: 60,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 80,
      totalServings: 3,
      status: 'in_progress',
    },
    {
      itemId: 'demo-item-002',
      itemName: 'キウイ',
      category: 'food' as ItemCategory,
      initialQuantity: 3,
      currentQuantity: 0,
      unit: '個',
      consumedQuantity: 3,
      consumptionPercentage: 100,
      isExpiringSoon: false,
      isExpired: false,
      avgConsumptionRate: 93,
      totalServings: 3,
      status: 'consumed',
      latestNoteToFamily: '大変喜んで召し上がっていました',
    },
    {
      itemId: 'demo-item-012',
      itemName: 'ヨーグルト',
      category: 'food' as ItemCategory,
      initialQuantity: 4,
      currentQuantity: 1,
      unit: '個',
      consumedQuantity: 3,
      consumptionPercentage: 75,
      expirationDate: getDateString(-2),
      daysUntilExpiration: -2,
      isExpiringSoon: false,
      isExpired: true,
      avgConsumptionRate: 90,
      totalServings: 3,
      status: 'expired',
    },
  ],
  totals: {
    totalItems: 12,
    pendingCount: 2,
    inProgressCount: 8,
    consumedCount: 1,
    expiredCount: 1,
    expiringSoonCount: 4,
  },
};

// ===== 食品傾向 (getFoodStats相当) =====

export const DEMO_FOOD_STATS: GetFoodStatsResponse = {
  mostPreferred: [
    { foodName: 'プリン', avgConsumptionRate: 95, totalServings: 4 },
    { foodName: 'キウイ', avgConsumptionRate: 93, totalServings: 3 },
    { foodName: '麦茶', avgConsumptionRate: 90, totalServings: 5 },
    { foodName: 'カステラ', avgConsumptionRate: 80, totalServings: 3 },
    { foodName: 'みかん', avgConsumptionRate: 80, totalServings: 2 },
  ],
  leastPreferred: [
    { foodName: 'りんご', avgConsumptionRate: 25, totalServings: 2, wastedQuantity: 0.37 },
    { foodName: '黒豆', avgConsumptionRate: 40, totalServings: 4, wastedQuantity: 48 },
    { foodName: 'バナナ', avgConsumptionRate: 75, totalServings: 5 },
  ],
  categoryStats: [
    { category: 'food' as ItemCategory, avgConsumptionRate: 75, totalItems: 11, totalServings: 29 },
    { category: 'drink' as ItemCategory, avgConsumptionRate: 90, totalItems: 1, totalServings: 5 },
  ],
};

// ===== 品物統計 (getStats 品物部分) =====

export const DEMO_ITEM_STATS: ItemStatsData = {
  summary: {
    totalItems: 12,
    pendingItems: 2,
    servedItems: 8,
    consumedItems: 1,
    expiringToday: 0,
    expiringIn3Days: 4,
  },
  // Phase 32: カテゴリ別分布から品物別分布に変更
  itemDistribution: [
    { id: 'demo-item-006', itemName: 'プリン', unit: '個', consumedQuantity: 4, initialQuantity: 6, consumptionPercentage: 67 },
    { id: 'demo-item-001', itemName: 'バナナ', unit: '房', consumedQuantity: 2.5, initialQuantity: 4, consumptionPercentage: 63 },
    { id: 'demo-item-009', itemName: '麦茶', unit: 'L', consumedQuantity: 1, initialQuantity: 2, consumptionPercentage: 50 },
    { id: 'demo-item-004', itemName: 'みかん', unit: '個', consumedQuantity: 2, initialQuantity: 5, consumptionPercentage: 40 },
    { id: 'demo-item-011', itemName: '黒豆', unit: 'g', consumedQuantity: 80, initialQuantity: 200, consumptionPercentage: 40 },
    { id: 'demo-item-007', itemName: 'カステラ', unit: '切れ', consumedQuantity: 3, initialQuantity: 8, consumptionPercentage: 38 },
  ],
  expirationCalendar: [
    {
      date: getDateString(1),
      items: [
        { id: 'demo-item-005', itemName: '柿（熟し）', daysUntil: 1 },
        { id: 'demo-item-006', itemName: 'プリン', daysUntil: 1 },
      ],
    },
    {
      date: getDateString(2),
      items: [
        { id: 'demo-item-001', itemName: 'バナナ', daysUntil: 2 },
      ],
    },
    {
      date: getDateString(3),
      items: [
        { id: 'demo-item-009', itemName: '麦茶', daysUntil: 3 },
      ],
    },
    {
      date: getDateString(5),
      items: [
        { id: 'demo-item-003', itemName: 'りんご', daysUntil: 5 },
      ],
    },
    {
      date: getDateString(7),
      items: [
        { id: 'demo-item-004', itemName: 'みかん', daysUntil: 7 },
      ],
    },
  ],
};

// ===== アラート =====

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'alert-001',
    type: 'expiration_soon',
    severity: 'urgent',
    title: '柿（熟し）の賞味期限が明日です',
    description: '2個中2個が未提供です。早めの提供をお願いします。',
    relatedItemId: 'demo-item-005',
    createdAt: getDateString(0),
  },
  {
    id: 'alert-002',
    type: 'expiration_soon',
    severity: 'urgent',
    title: 'プリンの賞味期限が明日です',
    description: '残り2個です。',
    relatedItemId: 'demo-item-006',
    createdAt: getDateString(0),
  },
  {
    id: 'alert-003',
    type: 'expiration_soon',
    severity: 'warning',
    title: 'バナナの賞味期限が近づいています',
    description: '2日後に期限切れ。残り1.5房。',
    relatedItemId: 'demo-item-001',
    createdAt: getDateString(0),
  },
  {
    id: 'alert-004',
    type: 'consumption_decline',
    severity: 'warning',
    title: 'りんごの摂食率が低下しています',
    description: '平均摂食率25%。提供方法の見直しを検討してください。',
    relatedItemId: 'demo-item-003',
    createdAt: getDateString(-1),
  },
  {
    id: 'alert-005',
    type: 'consumption_decline',
    severity: 'info',
    title: '黒豆の摂食率が低下傾向',
    description: '平均摂食率40%。最近あまり召し上がらないようです。',
    relatedItemId: 'demo-item-011',
    createdAt: getDateString(-2),
  },
];

// ===== AI分析モックデータ (Phase 34) =====

/**
 * デモ用AI分析結果
 * @see docs/DEMO_AI_ANALYSIS_SPEC.md
 */
export const DEMO_AI_ANALYSIS: AIAnalyzeResponse = {
  analysisType: 'consumption',
  summary: '過去30日間の摂食傾向を分析しました。全体的に果物・和菓子類の摂取率が高く、健康的な食生活が維持されています。特にプリンとキウイの摂取率が非常に高い一方で、りんごは食べにくさから摂取率が低下傾向にあります。',
  findings: [
    {
      type: 'positive',
      title: 'プリンの摂取率が非常に高い',
      description: '大好物のようで、提供のたびにほぼ完食されています',
      metric: { current: 95, previous: 88, change: 7 },
    },
    {
      type: 'positive',
      title: 'キウイの完食率向上',
      description: '前月比で摂取率が15%改善。酸味が好まれているようです',
      metric: { current: 93, previous: 78, change: 15 },
    },
    {
      type: 'negative',
      title: 'りんごの摂取率が低下傾向',
      description: '固さが原因で食べにくい可能性があります',
      metric: { current: 25, previous: 45, change: -20 },
    },
    {
      type: 'neutral',
      title: '麦茶の摂取は安定',
      description: '水分補給として適切に摂取されています',
      metric: { current: 90 },
    },
  ],
  suggestions: [
    {
      priority: 'high',
      title: 'りんごの提供方法を変更',
      description: 'すりおろしや薄切り、またはコンポートなど食べやすい形態での提供を検討してください',
      relatedItemName: 'りんご',
    },
    {
      priority: 'medium',
      title: '黒豆の提供頻度を見直し',
      description: '摂取率40%のため、小皿で少量ずつの提供をお勧めします。他の豆類との組み合わせも検討してください',
      relatedItemName: '黒豆',
    },
    {
      priority: 'low',
      title: 'プリンのストック確保',
      description: '大変お気に入りの品目です。切らさないようストックを確保することをお勧めします',
      relatedItemName: 'プリン',
    },
  ],
};
