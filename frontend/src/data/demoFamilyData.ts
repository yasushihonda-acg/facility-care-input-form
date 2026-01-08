/**
 * デモ用モックデータ
 * 蒲地様のFAX内容に基づく初期データ
 * @see docs/FAMILY_UX_DESIGN.md
 * @see docs/PRESET_MANAGEMENT_SPEC.md (プリセットデータ定義)
 */

import type {
  CareInstruction,
  CarePreset,
  TimelineItem,
  EvidenceData,
  Resident,
  FamilyUser,
} from '../types/family';
import type { ProhibitionRule } from '../types/careItem';
import { formatDateString, getTodayString as getToday } from '../utils/scheduleUtils';

// ============================================
// デモユーザー・入居者情報
// ============================================

/** デモ入居者（蒲地 キヌヱ様） */
export const DEMO_RESIDENT: Resident = {
  id: 'resident-001',
  name: '蒲地 キヌヱ',
  roomNumber: '215',
};

/** デモ家族ユーザー */
export const DEMO_FAMILY_USER: FamilyUser = {
  id: 'family-001',
  name: '蒲地（ご家族）',
  residentId: 'resident-001',
};

// ============================================
// プリセット設定（蒲地様FAX内容に基づく）
// @see docs/PRESET_MANAGEMENT_SPEC.md - セクション3「初期プリセットデータ」
//
// 重要: プリセットには「品物のみ」を登録
// - 禁止ルール（「〇〇は出さない」）は登録対象外
// - 複数品物（黒砂糖・チーズ）は単品ごとに分離
// ============================================

export const DEMO_PRESETS: CarePreset[] = [
  // カット・加工系
  {
    id: 'preset-kiwi',
    residentId: 'resident-001',
    name: 'キウイ',
    icon: '🥝',
    itemCategory: 'food',
    storageMethod: 'refrigerated',
    servingMethod: 'cut',
    servingMethodDetail:
      '輪切り4等分をさらに半分（半月）に切ってください。\n皮は必ず剥いてください。\n種が多い部分は避けてください。',
    servingTimeSlot: 'snack',
    matchConfig: { keywords: ['キウイ', 'kiwi'] },
    source: 'manual',
    isActive: true,
    usageCount: 5,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
  {
    id: 'preset-persimmon',
    residentId: 'resident-001',
    name: '柿',
    icon: '🍑',
    itemCategory: 'food',
    storageMethod: 'room_temp',
    servingMethod: 'cut',
    servingMethodDetail:
      '熟して柔らかくなった部分も捨てずに提供してください。\nご本人の好物です。\n皮をむいて食べやすい大きさにカット。',
    servingTimeSlot: 'snack',
    matchConfig: { keywords: ['柿', '柿の実'] },
    source: 'manual',
    isActive: true,
    usageCount: 3,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
  {
    id: 'preset-kuromame',
    residentId: 'resident-001',
    name: '黒豆',
    icon: '⚫',
    itemCategory: 'food',
    storageMethod: 'refrigerated',
    servingMethod: 'other',
    servingMethodDetail:
      '煮汁をしっかり切ってから器に盛り付けてください。\n汁気が多いとこぼれやすいため。',
    servingTimeSlot: 'snack',
    matchConfig: { keywords: ['黒豆', 'くろまめ'] },
    source: 'manual',
    isActive: true,
    usageCount: 2,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
  // 提供方法系
  {
    id: 'preset-rakkyo',
    residentId: 'resident-001',
    name: 'らっきょう',
    icon: '🧅',
    itemCategory: 'food',
    storageMethod: 'refrigerated',
    servingMethod: 'as_is',
    servingMethodDetail:
      'らっきょうは冷たいまま小皿で提供してください。\n常温で放置しないでください。',
    servingTimeSlot: 'dinner',
    noteToStaff: '提供直前まで冷蔵庫で保管をお願いします。',
    matchConfig: { keywords: ['らっきょう', 'ラッキョウ'] },
    source: 'manual',
    isActive: true,
    usageCount: 4,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
  // 条件付きロジック系
  {
    id: 'preset-mikan',
    residentId: 'resident-001',
    name: 'みかん',
    icon: '🍊',
    itemCategory: 'food',
    storageMethod: 'room_temp',
    servingMethod: 'peeled',
    servingTimeSlot: 'snack',
    remainingHandlingInstruction: 'stored',
    noteToStaff:
      '皮を剥かずに残した場合は、おやつの時間に再度提供してください。\n剥いた状態で残した場合は廃棄。',
    matchConfig: { keywords: ['みかん', 'ミカン', '蜜柑'] },
    source: 'manual',
    isActive: true,
    usageCount: 6,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
  // 条件付き提供系
  {
    id: 'preset-kurozato',
    residentId: 'resident-001',
    name: '黒砂糖',
    icon: '🍬',
    itemCategory: 'food',
    storageMethod: 'room_temp',
    servingMethod: 'as_is',
    servingTimeSlot: 'anytime',
    noteToStaff:
      'ご家族が指定した日のみ提供してください。\n指定日以外は提供しないでください。\n不明な場合はご家族に確認を。',
    matchConfig: { keywords: ['黒砂糖', 'くろざとう'] },
    source: 'manual',
    isActive: true,
    usageCount: 1,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
  {
    id: 'preset-cheese',
    residentId: 'resident-001',
    name: 'チーズ',
    icon: '🧀',
    itemCategory: 'food',
    storageMethod: 'refrigerated',
    servingMethod: 'as_is',
    servingTimeSlot: 'breakfast',
    noteToStaff:
      'ご家族が指定した日のみ提供してください。\n指定日以外は提供しないでください。\n不明な場合はご家族に確認を。',
    matchConfig: { keywords: ['チーズ', 'cheese'] },
    source: 'manual',
    isActive: true,
    usageCount: 1,
    createdAt: '2025-12-01T10:00:00Z',
    updatedAt: '2025-12-20T15:00:00Z',
    createdBy: 'family-001',
  },
];

// ============================================
// 禁止ルールデモデータ（蒲地様FAX内容に基づく）
// @see docs/ITEM_MANAGEMENT_SPEC.md - セクション8「禁止ルール」
//
// 「七福のお菓子は出さない」が初期設定済み
// ============================================

/** 初期禁止ルール */
export const DEMO_PROHIBITIONS: ProhibitionRule[] = [
  {
    id: 'prohibition-001',
    residentId: 'resident-001',
    itemName: '七福のお菓子',
    category: 'food',
    reason: 'ご家族の希望（FAX指示）',
    createdBy: 'family-001',
    createdAt: '2024-12-01T00:00:00',
    updatedAt: '2024-12-01T00:00:00',
    isActive: true,
  },
];

// ============================================
// ケア指示デモデータ
// ============================================

const today = new Date();

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

export const DEMO_CARE_INSTRUCTIONS: CareInstruction[] = [
  // 今日の昼食 - キウイ指示（完了済み）
  {
    id: 'demo-001',
    userId: 'family-001',
    residentId: 'resident-001',
    targetDate: formatDateString(today),
    mealTime: 'lunch',
    menuName: 'キウイ',
    processingDetail:
      '輪切り4等分をさらに半分（半月）に切ってください。\n皮は必ず剥いてください。\n種が多い部分は避けてください。',
    conditions: [{ trigger: 'leftover', action: 'reserve_snack' }],
    priority: 'critical',
    status: 'completed',
    createdAt: `${formatDateString(yesterday)}T18:00:00`,
    updatedAt: `${formatDateString(today)}T12:30:00`,
  },
  // 今日の夕食 - らっきょう指示（確認済み）
  {
    id: 'demo-002',
    userId: 'family-001',
    residentId: 'resident-001',
    targetDate: formatDateString(today),
    mealTime: 'dinner',
    menuName: 'らっきょう',
    processingDetail:
      'らっきょうは冷たいまま小皿で提供してください。\n常温で放置しないでください。\n提供直前まで冷蔵庫で保管をお願いします。',
    priority: 'normal',
    status: 'acknowledged',
    createdAt: `${formatDateString(yesterday)}T18:00:00`,
    updatedAt: `${formatDateString(today)}T08:00:00`,
  },
  // 明日の昼食 - 熟した柿指示（未確認）
  {
    id: 'demo-003',
    userId: 'family-001',
    residentId: 'resident-001',
    targetDate: formatDateString(tomorrow),
    mealTime: 'lunch',
    menuName: '熟した柿',
    processingDetail:
      '熟して柔らかくなった部分も捨てずに提供してください。\nご本人の好物です。\n皮をむいて食べやすい大きさにカット。',
    conditions: [{ trigger: 'no_appetite', action: 'reduce_amount' }],
    priority: 'critical',
    status: 'pending',
    createdAt: `${formatDateString(today)}T09:00:00`,
    updatedAt: `${formatDateString(today)}T09:00:00`,
  },
];

// ============================================
// タイムラインデモデータ（今日の食事状況）
// ============================================

export const DEMO_TIMELINE_ITEMS: TimelineItem[] = [
  // 朝食 - 完了
  {
    id: 'timeline-001',
    date: formatDateString(today),
    mealTime: 'breakfast',
    status: 'completed',
    mainDishAmount: '8割',
    sideDishAmount: '7割',
    staffName: '田中花子',
    recordedAt: `${formatDateString(today)}T07:45:00`,
    note: '食欲良好',
  },
  // 昼食 - 完了（指示あり）
  {
    id: 'timeline-002',
    date: formatDateString(today),
    mealTime: 'lunch',
    status: 'completed',
    mainDishAmount: '全量',
    sideDishAmount: '8割',
    staffName: '佐藤一郎',
    recordedAt: `${formatDateString(today)}T12:30:00`,
    photoUrl: '/demo-images/kiwi-cut.jpg', // デモ用プレースホルダ
    note: 'キウイ8等分・半月切り、指示通り対応。美味しそうに召し上がりました。',
    instruction: DEMO_CARE_INSTRUCTIONS[0],
  },
  // 間食 - 提供済み（重要フラグ）
  {
    id: 'timeline-003',
    date: formatDateString(today),
    mealTime: 'snack',
    status: 'provided',
    staffName: '山田太郎',
    recordedAt: `${formatDateString(today)}T15:15:00`,
    note: 'プリン（ご本人希望により追加提供）',
    isImportant: true,
  },
  // 夕食 - 未提供（指示あり）
  {
    id: 'timeline-004',
    date: formatDateString(today),
    mealTime: 'dinner',
    status: 'pending',
    instruction: DEMO_CARE_INSTRUCTIONS[1],
  },
];

// ============================================
// エビデンス対比デモデータ
// ============================================

export const DEMO_EVIDENCE_DATA: EvidenceData = {
  date: formatDateString(today),
  mealTime: 'lunch',
  plan: {
    menuName: 'キウイ',
    processingDetail:
      '輪切り4等分をさらに半分（半月）に切ってください。\n皮は必ず剥いてください。\n種が多い部分は避けてください。',
    priority: 'critical',
    conditions: [{ trigger: 'leftover', action: 'reserve_snack' }],
  },
  result: {
    id: 'demo-result-001',
    // Phase 16: テスト用の実在するダミー画像URL
    photoUrl: 'https://picsum.photos/seed/kiwi/800/600',
    staffName: '田中花子',
    recordedAt: `${formatDateString(today)}T12:15:00`,
    mealTime: 'lunch',
    mainDishAmount: '8',
    sideDishAmount: '7',
    note: '指示通りに8等分・半月切りで提供しました。美味しそうに召し上がりました。',
    isImportant: false,
  },
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * 指定日のタイムラインデータを取得
 */
export function getTimelineForDate(date: string): TimelineItem[] {
  // デモでは今日のデータのみ返す
  const targetDate = formatDateString(today);
  if (date === targetDate) {
    return DEMO_TIMELINE_ITEMS;
  }
  // 他の日付は空のタイムラインを生成
  return [
    { id: `${date}-breakfast`, date, mealTime: 'breakfast', status: 'pending' },
    { id: `${date}-lunch`, date, mealTime: 'lunch', status: 'pending' },
    { id: `${date}-snack`, date, mealTime: 'snack', status: 'pending' },
    { id: `${date}-dinner`, date, mealTime: 'dinner', status: 'pending' },
  ];
}

/**
 * 指定日・食事時間のエビデンスデータを取得
 */
export function getEvidenceData(date: string, mealTime: string): EvidenceData | null {
  // デモでは今日の昼食のみ返す
  if (date === formatDateString(today) && mealTime === 'lunch') {
    return DEMO_EVIDENCE_DATA;
  }
  return null;
}

/**
 * 指定入居者のケア指示一覧を取得
 */
export function getCareInstructionsForResident(residentId: string): CareInstruction[] {
  return DEMO_CARE_INSTRUCTIONS.filter((i) => i.residentId === residentId);
}

/**
 * 今日の日付を取得（YYYY-MM-DD形式）
 * scheduleUtilsからの再エクスポート
 */
export { getToday as getTodayString };

/**
 * 日付をフォーマット（表示用）
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${date.getFullYear()}年${month}月${day}日（${weekday}）`;
}

/**
 * 日時をフォーマット（表示用）
 */
export function formatDateTime(dateTimeStr: string): string {
  const date = new Date(dateTimeStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${date.getFullYear()}/${month}/${day} ${hours}:${minutes}`;
}
