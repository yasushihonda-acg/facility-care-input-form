/**
 * デモ用モックデータ
 * 蒲池様のFAX内容に基づく初期データ
 * @see docs/FAMILY_UX_DESIGN.md
 */

import type {
  CareInstruction,
  CarePreset,
  TimelineItem,
  EvidenceData,
  Resident,
  FamilyUser,
} from '../types/family';

// ============================================
// デモユーザー・入居者情報
// ============================================

/** デモ入居者（蒲池 キヌヱ様） */
export const DEMO_RESIDENT: Resident = {
  id: 'resident-kinue',
  name: '蒲池 キヌヱ',
  roomNumber: '215',
};

/** デモ家族ユーザー */
export const DEMO_FAMILY_USER: FamilyUser = {
  id: 'family-kamachi',
  name: '蒲池（ご家族）',
  residentId: 'resident-kinue',
};

// ============================================
// プリセット設定（蒲池様FAX内容に基づく）
// ============================================

export const DEMO_PRESETS: CarePreset[] = [
  {
    id: 'preset-kiwi',
    name: 'キウイ8等分',
    processingDetail:
      '輪切り4等分をさらに半分に切ってください。\n皮は必ず剥いてください。\n種が多い部分は避けてください。',
    icon: '🥝',
  },
  {
    id: 'preset-rakkyo',
    name: 'らっきょう冷',
    processingDetail:
      'らっきょうは冷たいまま提供してください。\n常温で放置しないでください。\n提供直前まで冷蔵庫で保管をお願いします。',
    icon: '🧅',
  },
  {
    id: 'preset-persimmon',
    name: '柿は皮むき',
    processingDetail:
      '柿は必ず皮をむいてから提供してください。\n薄切り（5mm程度）にしてください。\n種がある場合は必ず取り除いてください。',
    icon: '🍑',
  },
  {
    id: 'preset-tomato',
    name: 'トマト月水金禁止',
    processingDetail:
      '月曜・水曜・金曜はトマトの提供を禁止してください。\nリハビリ後は消化に負担がかかるためです。\n他の曜日は少量であれば可能です。',
    icon: '🍅',
  },
];

// ============================================
// ケア指示デモデータ
// ============================================

const today = new Date();
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

export const DEMO_CARE_INSTRUCTIONS: CareInstruction[] = [
  // 今日の昼食 - キウイ指示（完了済み）
  {
    id: 'demo-001',
    userId: 'family-kamachi',
    residentId: 'resident-kinue',
    targetDate: formatDate(today),
    mealTime: 'lunch',
    menuName: 'キウイ',
    processingDetail:
      '輪切り4等分をさらに半分に切ってください。\n皮は必ず剥いてください。\n種が多い部分は避けてください。',
    conditions: [{ trigger: 'leftover', action: 'reserve_snack' }],
    priority: 'critical',
    status: 'completed',
    createdAt: `${formatDate(yesterday)}T18:00:00`,
    updatedAt: `${formatDate(today)}T12:30:00`,
  },
  // 今日の夕食 - らっきょう指示（確認済み）
  {
    id: 'demo-002',
    userId: 'family-kamachi',
    residentId: 'resident-kinue',
    targetDate: formatDate(today),
    mealTime: 'dinner',
    menuName: 'らっきょう',
    processingDetail:
      'らっきょうは冷たいまま提供してください。\n常温で放置しないでください。\n提供直前まで冷蔵庫で保管をお願いします。',
    priority: 'normal',
    status: 'acknowledged',
    createdAt: `${formatDate(yesterday)}T18:00:00`,
    updatedAt: `${formatDate(today)}T08:00:00`,
  },
  // 明日の昼食 - 柿指示（未確認）
  {
    id: 'demo-003',
    userId: 'family-kamachi',
    residentId: 'resident-kinue',
    targetDate: formatDate(tomorrow),
    mealTime: 'lunch',
    menuName: '柿',
    processingDetail:
      '柿は必ず皮をむいてから提供してください。\n薄切り（5mm程度）にしてください。\n種がある場合は必ず取り除いてください。',
    conditions: [{ trigger: 'no_appetite', action: 'reduce_amount' }],
    priority: 'critical',
    status: 'pending',
    createdAt: `${formatDate(today)}T09:00:00`,
    updatedAt: `${formatDate(today)}T09:00:00`,
  },
];

// ============================================
// タイムラインデモデータ（今日の食事状況）
// ============================================

export const DEMO_TIMELINE_ITEMS: TimelineItem[] = [
  // 朝食 - 完了
  {
    id: 'timeline-001',
    date: formatDate(today),
    mealTime: 'breakfast',
    status: 'completed',
    mainDishAmount: '8割',
    sideDishAmount: '7割',
    staffName: '田中花子',
    recordedAt: `${formatDate(today)}T07:45:00`,
    note: '食欲良好',
  },
  // 昼食 - 完了（指示あり）
  {
    id: 'timeline-002',
    date: formatDate(today),
    mealTime: 'lunch',
    status: 'completed',
    mainDishAmount: '全量',
    sideDishAmount: '8割',
    staffName: '佐藤一郎',
    recordedAt: `${formatDate(today)}T12:30:00`,
    photoUrl: '/demo-images/kiwi-cut.jpg', // デモ用プレースホルダ
    note: 'キウイ8等分カット、指示通り対応。美味しそうに召し上がりました。',
    instruction: DEMO_CARE_INSTRUCTIONS[0],
  },
  // 間食 - 提供済み（重要フラグ）
  {
    id: 'timeline-003',
    date: formatDate(today),
    mealTime: 'snack',
    status: 'provided',
    staffName: '山田太郎',
    recordedAt: `${formatDate(today)}T15:15:00`,
    note: 'プリン（ご本人希望により追加提供）',
    isImportant: true,
  },
  // 夕食 - 未提供（指示あり）
  {
    id: 'timeline-004',
    date: formatDate(today),
    mealTime: 'dinner',
    status: 'pending',
    instruction: DEMO_CARE_INSTRUCTIONS[1],
  },
];

// ============================================
// エビデンス対比デモデータ
// ============================================

export const DEMO_EVIDENCE_DATA: EvidenceData = {
  date: formatDate(today),
  mealTime: 'lunch',
  plan: {
    menuName: 'キウイ',
    processingDetail:
      '輪切り4等分をさらに半分に切ってください。\n皮は必ず剥いてください。\n種が多い部分は避けてください。',
    priority: 'critical',
    conditions: [{ trigger: 'leftover', action: 'reserve_snack' }],
  },
  result: {
    photoUrl: '/demo-images/kiwi-cut.jpg',
    staffName: '田中花子',
    recordedAt: `${formatDate(today)}T12:15:00`,
    mainDishAmount: '8割',
    sideDishAmount: '7割',
    note: '指示通りに8等分カットして提供しました。美味しそうに召し上がりました。',
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
  const targetDate = formatDate(today);
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
  if (date === formatDate(today) && mealTime === 'lunch') {
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
 */
export function getTodayString(): string {
  return formatDate(today);
}

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
