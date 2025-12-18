/**
 * FoodMaster 食品マスタ デモデータ (Phase 11)
 * @see docs/INVENTORY_CONSUMPTION_SPEC.md セクション2.2
 *
 * AI提案のキャッシュとして機能し、よく登録される食品の情報を保持
 */

import type { FoodMaster, ItemCategory, StorageMethod, ServingMethod } from '../../types/careItem';

// ===== 日付ヘルパー =====

function getDateTimeString(daysFromToday: number, hour = 12): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

// ===== デモ食品マスタデータ =====

export const DEMO_FOOD_MASTERS: FoodMaster[] = [
  // ===== 果物カテゴリ (fruit) =====
  {
    id: 'food-master-001',
    name: 'バナナ',
    aliases: ['ばなな', 'banana', 'バナナ（フィリピン産）'],
    category: 'fruit' as ItemCategory,
    defaultUnit: '房',
    defaultExpirationDays: 5,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['cut', 'as_is'] as ServingMethod[],
    careNotes: '熟しすぎると滑りやすいため注意。1日1本を目安に。',
    stats: {
      totalServed: 48,
      totalConsumed: 36,
      avgConsumptionRate: 75,
      preferenceScore: 85,
      wasteRate: 8,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-60),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'food-master-002',
    name: 'みかん',
    aliases: ['ミカン', '蜜柑', 'orange', '温州みかん'],
    category: 'fruit' as ItemCategory,
    defaultUnit: '個',
    defaultExpirationDays: 14,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['peeled', 'as_is'] as ServingMethod[],
    careNotes: '薄皮は誤嚥リスクがあるため、取り除いて提供推奨。',
    stats: {
      totalServed: 62,
      totalConsumed: 58,
      avgConsumptionRate: 94,
      preferenceScore: 95,
      wasteRate: 3,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-90),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'food-master-003',
    name: 'りんご',
    aliases: ['リンゴ', '林檎', 'apple', 'ふじりんご'],
    category: 'fruit' as ItemCategory,
    defaultUnit: '個',
    defaultExpirationDays: 21,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['cut', 'peeled'] as ServingMethod[],
    careNotes: '皮は剥き、芯を取り除いて一口大にカット。変色防止に塩水推奨。',
    stats: {
      totalServed: 35,
      totalConsumed: 28,
      avgConsumptionRate: 80,
      preferenceScore: 78,
      wasteRate: 5,
      lastUpdated: getDateTimeString(-2),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-45),
    updatedAt: getDateTimeString(-2),
  },
  {
    id: 'food-master-004',
    name: 'キウイ',
    aliases: ['きうい', 'kiwi', 'キウイフルーツ'],
    category: 'fruit' as ItemCategory,
    defaultUnit: '個',
    defaultExpirationDays: 7,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['peeled', 'cut'] as ServingMethod[],
    careNotes: 'アレルギー注意。皮を剥いて薄切りに。酸味が強い場合は熟すまで待つ。',
    allergyInfo: 'キウイアレルギーに注意',
    stats: {
      totalServed: 20,
      totalConsumed: 14,
      avgConsumptionRate: 70,
      preferenceScore: 65,
      wasteRate: 10,
      lastUpdated: getDateTimeString(-3),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-30),
    updatedAt: getDateTimeString(-3),
  },

  // ===== お菓子・間食カテゴリ (snack) =====
  {
    id: 'food-master-005',
    name: '羊羹',
    aliases: ['ようかん', '練り羊羹', '水羊羹'],
    category: 'snack' as ItemCategory,
    defaultUnit: '本',
    defaultExpirationDays: 60,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['cut'] as ServingMethod[],
    careNotes: '一口サイズにカット。喉に詰まりやすいため注意。1日1切れまで。',
    stats: {
      totalServed: 42,
      totalConsumed: 38,
      avgConsumptionRate: 90,
      preferenceScore: 88,
      wasteRate: 2,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'manual',
    createdAt: getDateTimeString(-120),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'food-master-006',
    name: '黒豆',
    aliases: ['くろまめ', '丹波黒豆', '煮豆'],
    category: 'snack' as ItemCategory,
    defaultUnit: 'g',
    defaultExpirationDays: 14,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['as_is'] as ServingMethod[],
    careNotes: '開封後は冷蔵保存。1日10〜15粒程度。',
    stats: {
      totalServed: 30,
      totalConsumed: 28,
      avgConsumptionRate: 93,
      preferenceScore: 90,
      wasteRate: 3,
      lastUpdated: getDateTimeString(-2),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-50),
    updatedAt: getDateTimeString(-2),
  },
  {
    id: 'food-master-007',
    name: 'らっきょう',
    aliases: ['ラッキョウ', '甘酢漬け', 'らっきょうの甘酢漬け'],
    category: 'snack' as ItemCategory,
    defaultUnit: '瓶',
    defaultExpirationDays: 90,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['as_is'] as ServingMethod[],
    careNotes: '開封後は冷蔵保存。1日3〜5粒程度。塩分注意。',
    stats: {
      totalServed: 25,
      totalConsumed: 24,
      avgConsumptionRate: 96,
      preferenceScore: 92,
      wasteRate: 1,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-40),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'food-master-008',
    name: 'カステラ',
    aliases: ['かすてら', 'castella'],
    category: 'snack' as ItemCategory,
    defaultUnit: '切れ',
    defaultExpirationDays: 10,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['cut'] as ServingMethod[],
    careNotes: 'パサつきやすいため、お茶と一緒に提供推奨。1日1切れ。',
    stats: {
      totalServed: 18,
      totalConsumed: 15,
      avgConsumptionRate: 83,
      preferenceScore: 80,
      wasteRate: 5,
      lastUpdated: getDateTimeString(-3),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-25),
    updatedAt: getDateTimeString(-3),
  },

  // ===== 飲み物カテゴリ (drink) =====
  {
    id: 'food-master-009',
    name: '緑茶',
    aliases: ['お茶', 'グリーンティー', '煎茶', 'green tea'],
    category: 'drink' as ItemCategory,
    defaultUnit: '本',
    defaultExpirationDays: 180,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['heated', 'cooled'] as ServingMethod[],
    careNotes: '適温（60〜70℃）で提供。カフェイン含有のため就寝前は避ける。',
    stats: {
      totalServed: 100,
      totalConsumed: 95,
      avgConsumptionRate: 95,
      preferenceScore: 90,
      wasteRate: 2,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'manual',
    createdAt: getDateTimeString(-180),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'food-master-010',
    name: 'りんごジュース',
    aliases: ['アップルジュース', 'apple juice', '100%りんごジュース'],
    category: 'drink' as ItemCategory,
    defaultUnit: '本',
    defaultExpirationDays: 30,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['cooled'] as ServingMethod[],
    careNotes: '開封後は早めに消費。糖分があるため1日200ml程度。',
    stats: {
      totalServed: 40,
      totalConsumed: 38,
      avgConsumptionRate: 95,
      preferenceScore: 88,
      wasteRate: 3,
      lastUpdated: getDateTimeString(-2),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-60),
    updatedAt: getDateTimeString(-2),
  },

  // ===== 乳製品カテゴリ (dairy) =====
  {
    id: 'food-master-011',
    name: 'ヨーグルト',
    aliases: ['yogurt', 'プレーンヨーグルト'],
    category: 'dairy' as ItemCategory,
    defaultUnit: '個',
    defaultExpirationDays: 14,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['as_is'] as ServingMethod[],
    careNotes: '乳糖不耐症の方は注意。朝食時の提供推奨。',
    allergyInfo: '乳製品アレルギーに注意',
    stats: {
      totalServed: 55,
      totalConsumed: 50,
      avgConsumptionRate: 91,
      preferenceScore: 85,
      wasteRate: 4,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-90),
    updatedAt: getDateTimeString(-1),
  },
  {
    id: 'food-master-012',
    name: 'チーズ',
    aliases: ['プロセスチーズ', 'スライスチーズ', 'cheese'],
    category: 'dairy' as ItemCategory,
    defaultUnit: '枚',
    defaultExpirationDays: 30,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['cut', 'as_is'] as ServingMethod[],
    careNotes: '小さく切って提供。塩分があるため1日1〜2枚程度。',
    allergyInfo: '乳製品アレルギーに注意',
    stats: {
      totalServed: 28,
      totalConsumed: 25,
      avgConsumptionRate: 89,
      preferenceScore: 82,
      wasteRate: 4,
      lastUpdated: getDateTimeString(-2),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-45),
    updatedAt: getDateTimeString(-2),
  },

  // ===== 栄養補助食品カテゴリ (supplement) =====
  {
    id: 'food-master-013',
    name: 'エンシュア',
    aliases: ['エンシュアリキッド', 'ensure', '栄養補助飲料'],
    category: 'supplement' as ItemCategory,
    defaultUnit: '本',
    defaultExpirationDays: 365,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['as_is', 'cooled'] as ServingMethod[],
    careNotes: '医師・栄養士の指示に従って提供。1日の摂取量を守る。',
    stats: {
      totalServed: 60,
      totalConsumed: 58,
      avgConsumptionRate: 97,
      preferenceScore: 70,
      wasteRate: 2,
      lastUpdated: getDateTimeString(-1),
    },
    isActive: true,
    source: 'manual',
    createdAt: getDateTimeString(-150),
    updatedAt: getDateTimeString(-1),
  },

  // ===== 調理済み食品カテゴリ (prepared) =====
  {
    id: 'food-master-014',
    name: 'おにぎり',
    aliases: ['おむすび', 'rice ball'],
    category: 'prepared' as ItemCategory,
    defaultUnit: '個',
    defaultExpirationDays: 1,
    defaultStorageMethod: 'refrigerated' as StorageMethod,
    defaultServingMethods: ['as_is', 'heated'] as ServingMethod[],
    careNotes: '当日中に消費。のりは誤嚥リスクがあるため注意。',
    stats: {
      totalServed: 22,
      totalConsumed: 20,
      avgConsumptionRate: 91,
      preferenceScore: 88,
      wasteRate: 5,
      lastUpdated: getDateTimeString(-3),
    },
    isActive: true,
    source: 'ai',
    createdAt: getDateTimeString(-30),
    updatedAt: getDateTimeString(-3),
  },

  // ===== その他カテゴリ (other) =====
  {
    id: 'food-master-015',
    name: '黒砂糖',
    aliases: ['くろざとう', 'brown sugar', '沖縄黒糖'],
    category: 'other' as ItemCategory,
    defaultUnit: '袋',
    defaultExpirationDays: 365,
    defaultStorageMethod: 'room_temp' as StorageMethod,
    defaultServingMethods: ['as_is'] as ServingMethod[],
    careNotes: '少量ずつ舐める程度。糖尿病の方は医師に相談。',
    stats: {
      totalServed: 15,
      totalConsumed: 14,
      avgConsumptionRate: 93,
      preferenceScore: 85,
      wasteRate: 2,
      lastUpdated: getDateTimeString(-5),
    },
    isActive: true,
    source: 'manual',
    createdAt: getDateTimeString(-100),
    updatedAt: getDateTimeString(-5),
  },
];

/**
 * 食品名でFoodMasterを検索（デモ用）
 */
export function searchDemoFoodMaster(query: string): FoodMaster | undefined {
  const normalizedQuery = query.trim().toLowerCase();

  return DEMO_FOOD_MASTERS.find((fm) => {
    // 名前で完全一致
    if (fm.name.toLowerCase() === normalizedQuery) return true;
    // 別名で完全一致
    if (fm.aliases.some((alias) => alias.toLowerCase() === normalizedQuery)) return true;
    // 名前で部分一致
    if (fm.name.toLowerCase().includes(normalizedQuery)) return true;
    // 別名で部分一致
    if (fm.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery))) return true;
    return false;
  });
}

/**
 * カテゴリでFoodMasterを絞り込み（デモ用）
 */
export function getDemoFoodMastersByCategory(category: ItemCategory): FoodMaster[] {
  return DEMO_FOOD_MASTERS.filter((fm) => fm.category === category && fm.isActive);
}
