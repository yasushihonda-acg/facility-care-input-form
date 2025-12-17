# デモショーケース設計書

> **作成日**: 2025年12月17日
>
> 本ドキュメントは、デモ・プレゼンテーション用の専用ページとシードデータの設計を定義します。
> 本番ページに干渉せず、安全に機能検証・プレゼンが可能な環境を提供します。

---

## 1. 概要

### 1.1 背景・目的

本プロジェクトには以下の課題があります：

| 課題 | 詳細 |
|------|------|
| 機能検証の困難さ | 統計ダッシュボード等の機能を確認するにはデータが必要 |
| プレゼン時の不安定さ | 本番データに依存すると、デモ内容が予測不能 |
| 本番データへの影響リスク | テスト操作が本番データを汚染する可能性 |
| ネットワーク依存 | オフライン環境でのデモが困難 |

**解決策**: デモ専用ページ + シードデータで、本番環境から完全に分離されたデモ環境を提供します。

### 1.2 設計原則

1. **完全分離**: デモモードは本番APIを呼ばず、ローカルデータのみで動作
2. **再利用**: 既存のページコンポーネントをそのまま使用（デモ用に複製しない）
3. **リッチなサンプル**: 統計が見栄えするよう十分なデータを用意
4. **オフライン対応**: ネットワーク不要で動作可能
5. **ガイド付き**: プレゼン時に説明しやすいナビゲーション

---

## 2. ルーティング設計

### 2.1 デモ専用ルート

| パス | ページ | 説明 |
|------|--------|------|
| `/demo` | DemoHome | デモモードのホーム（機能一覧・説明付き） |
| `/demo/showcase` | DemoShowcase | プレゼン用ガイド付きツアー |
| `/demo/staff` | StaffHome (デモモード) | スタッフホームのデモ |
| `/demo/family` | FamilyDashboard (デモモード) | 家族ホームのデモ |
| `/demo/stats` | StatsDashboard (デモモード) | 統計ダッシュボードのデモ |
| `/demo/items/:id` | ItemDetail (デモモード) | 品物詳細のデモ |
| `/demo/items/:id/timeline` | ItemTimeline (デモモード) | 品物タイムラインのデモ |

### 2.2 URL構造

```
/demo                    # デモホーム
/demo/showcase           # ガイド付きプレゼン
/demo/staff              # スタッフビューのデモ
/demo/staff/tasks        # タスク一覧のデモ
/demo/staff/items        # 品物一覧（スタッフ視点）
/demo/family             # 家族ビューのデモ
/demo/family/items       # 品物一覧（家族視点）
/demo/family/items/new   # 品物登録フォーム
/demo/stats              # 統計ダッシュボード
```

### 2.3 本番ルートとの比較

| 機能 | 本番ルート | デモルート | 違い |
|------|------------|------------|------|
| スタッフホーム | `/staff` | `/demo/staff` | データソース |
| 家族ホーム | `/family` | `/demo/family` | データソース |
| 統計 | `/stats` | `/demo/stats` | データソース |

**同じコンポーネントを使用**し、データソースのみ切り替えます。

---

## 3. デモモード切り替え方式

### 3.1 判定ロジック

```typescript
// hooks/useDemoMode.ts

import { useLocation } from 'react-router-dom';

export function useDemoMode(): boolean {
  const location = useLocation();
  return location.pathname.startsWith('/demo');
}
```

### 3.2 データフック切り替え例

```typescript
// hooks/useCareItemsWithDemo.ts

import { useDemoMode } from './useDemoMode';
import { useCareItems } from './useCareItems';
import { DEMO_CARE_ITEMS } from '../data/demo/demoCareItems';

export function useCareItemsWithDemo(residentId: string) {
  const isDemo = useDemoMode();

  // 本番モード: APIから取得
  const apiResult = useCareItems(residentId, { enabled: !isDemo });

  // デモモード: ローカルデータ
  if (isDemo) {
    return {
      data: DEMO_CARE_ITEMS.filter(item => item.residentId === residentId),
      isLoading: false,
      error: null,
      refetch: () => Promise.resolve(),
    };
  }

  return apiResult;
}
```

### 3.3 コンポーネントでの使用

```tsx
// pages/shared/StatsDashboard.tsx

import { useDemoMode } from '../../hooks/useDemoMode';
import { getFoodStats } from '../../api';
import { DEMO_FOOD_STATS } from '../../data/demo/demoStats';

export function StatsDashboard() {
  const isDemo = useDemoMode();

  // デモモードではローカルデータ、本番ではAPI
  const [foodStats, setFoodStats] = useState(isDemo ? DEMO_FOOD_STATS : null);

  useEffect(() => {
    if (!isDemo) {
      getFoodStats({ residentId: DEMO_RESIDENT_ID, limit: 5 })
        .then(res => res.data && setFoodStats(res.data));
    }
  }, [isDemo]);

  // ...以降は同じコンポーネント
}
```

---

## 4. シードデータ設計

### 4.1 ディレクトリ構成

```
frontend/src/data/
├── demoFamilyData.ts       # 既存（家族・プリセット・禁止ルール）
└── demo/                   # 新規ディレクトリ
    ├── index.ts            # エクスポート集約
    ├── demoResidents.ts    # 入居者データ
    ├── demoCareItems.ts    # 品物データ（在庫サマリー用）
    ├── demoConsumptionLogs.ts # 消費ログデータ（摂食傾向用）
    ├── demoTasks.ts        # タスクデータ
    ├── demoStats.ts        # 統計サマリーデータ（事前計算済み）
    └── demoMealRecords.ts  # 食事記録データ
```

### 4.2 品物サンプルデータ (`demoCareItems.ts`)

統計・在庫サマリーが見栄えするよう、**様々なステータス・期限・カテゴリ**のデータを用意：

```typescript
export const DEMO_CARE_ITEMS: CareItem[] = [
  // ===== 果物カテゴリ =====
  {
    id: 'demo-item-001',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'バナナ',
    category: 'fruit',
    initialQuantity: 4,
    currentQuantity: 1.5,
    unit: '房',
    status: 'in_progress',
    expirationDate: getTodayPlus(2), // 2日後期限
    consumptionSummary: {
      totalServed: 5,
      totalConsumedQuantity: 2.5,
      avgConsumptionRate: 75,
    },
    createdAt: getTodayMinus(5),
  },
  {
    id: 'demo-item-002',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'キウイ',
    category: 'fruit',
    initialQuantity: 3,
    currentQuantity: 0,
    unit: '個',
    status: 'consumed',
    consumptionSummary: {
      totalServed: 3,
      totalConsumedQuantity: 2.8,
      avgConsumptionRate: 93,
    },
    createdAt: getTodayMinus(7),
  },
  {
    id: 'demo-item-003',
    residentId: 'resident-001',
    userId: 'family-001',
    itemName: 'りんご',
    category: 'fruit',
    initialQuantity: 2,
    currentQuantity: 1.5,
    unit: '個',
    status: 'in_progress',
    expirationDate: getTodayPlus(5),
    consumptionSummary: {
      totalServed: 2,
      totalConsumedQuantity: 0.5,
      avgConsumptionRate: 25, // 低摂食率（傾向分析に有用）
    },
    createdAt: getTodayMinus(3),
  },
  // ===== おやつカテゴリ =====
  {
    id: 'demo-item-004',
    residentId: 'resident-001',
    itemName: 'プリン',
    category: 'snack',
    initialQuantity: 6,
    currentQuantity: 2,
    unit: '個',
    status: 'in_progress',
    expirationDate: getTodayPlus(1), // 明日期限（期限間近アラート）
    consumptionSummary: {
      totalServed: 4,
      totalConsumedQuantity: 3.8,
      avgConsumptionRate: 95, // 高摂食率
    },
    createdAt: getTodayMinus(4),
  },
  // ... 10〜15件程度用意
];
```

### 4.3 統計サマリーデータ (`demoStats.ts`)

API応答をシミュレートする事前計算済みデータ：

```typescript
// 在庫サマリー (getInventorySummary相当)
export const DEMO_INVENTORY_SUMMARY: GetInventorySummaryResponse = {
  items: DEMO_CARE_ITEMS.map(item => ({
    itemId: item.id,
    itemName: item.itemName,
    // ... 計算済みフィールド
  })),
  totals: {
    totalItems: 12,
    pendingCount: 2,
    inProgressCount: 6,
    consumedCount: 3,
    expiredCount: 1,
    expiringSoonCount: 2,
  },
};

// 食品傾向 (getFoodStats相当)
export const DEMO_FOOD_STATS: GetFoodStatsResponse = {
  mostPreferred: [
    { foodName: 'プリン', avgConsumptionRate: 95, totalServings: 4 },
    { foodName: 'キウイ', avgConsumptionRate: 93, totalServings: 3 },
    { foodName: 'バナナ', avgConsumptionRate: 75, totalServings: 5 },
  ],
  leastPreferred: [
    { foodName: 'りんご', avgConsumptionRate: 25, totalServings: 2 },
    { foodName: '黒豆', avgConsumptionRate: 40, totalServings: 2 },
  ],
  categoryStats: [
    { category: 'fruit', avgConsumptionRate: 64, totalItems: 5, totalServings: 12 },
    { category: 'snack', avgConsumptionRate: 88, totalItems: 3, totalServings: 8 },
    // ...
  ],
};
```

### 4.4 消費ログサンプル (`demoConsumptionLogs.ts`)

品物タイムラインで表示される提供・摂食履歴：

```typescript
export const DEMO_CONSUMPTION_LOGS: ConsumptionLog[] = [
  {
    id: 'log-001',
    itemId: 'demo-item-001', // バナナ
    servedDate: getTodayMinus(1),
    servedQuantity: 1,
    consumedQuantity: 0.8,
    consumptionRate: 80,
    staffId: 'staff-001',
    staffName: '田中花子',
    noteToFamily: 'おいしそうに召し上がっていました',
  },
  // ... 各品物に2〜3件ずつ
];
```

---

## 5. デモホームページ設計

### 5.1 DemoHome コンポーネント

```
+----------------------------------------------------------+
|  デモモード                                     [本番へ →] |
+----------------------------------------------------------+
|                                                            |
|  🎯 機能デモ一覧                                           |
|                                                            |
|  ┌────────────────┐  ┌────────────────┐                   |
|  │ 📦 品物管理    │  │ 📊 統計        │                   |
|  │                │  │                │                   |
|  │ 品物の登録・   │  │ 摂食傾向・     │                   |
|  │ 提供・摂食記録 │  │ 在庫サマリー   │                   |
|  │                │  │                │                   |
|  │ [スタッフ視点] │  │ [ダッシュボード]│                   |
|  │ [家族視点]     │  │                │                   |
|  └────────────────┘  └────────────────┘                   |
|                                                            |
|  ┌────────────────┐  ┌────────────────┐                   |
|  │ ✅ タスク管理  │  │ 🎬 ショーケース │                   |
|  │                │  │                │                   |
|  │ 自動生成タスク │  │ ガイド付き     │                   |
|  │ 期限アラート   │  │ プレゼンツアー │                   |
|  │                │  │                │                   |
|  │ [タスク一覧]   │  │ [開始 →]       │                   |
|  └────────────────┘  └────────────────┘                   |
|                                                            |
|  ─────────────────────────────────────                     |
|  💡 デモモードについて                                     |
|  ・本番データには影響しません                              |
|  ・サンプルデータで機能を確認できます                      |
|  ・オフラインでも動作します                                |
|                                                            |
+----------------------------------------------------------+
```

### 5.2 DemoShowcase（ガイド付きツアー）

プレゼン時に順番に機能を紹介するステップ形式：

```
Step 1/6: 家族による品物登録
  → /demo/family/items/new

Step 2/6: スタッフの家族連絡確認
  → /demo/staff/family-messages

Step 3/6: 品物の提供・摂食記録
  → /demo/staff/items/demo-item-001

Step 4/6: 家族への結果共有
  → /demo/family (タイムライン)

Step 5/6: 摂食傾向の確認
  → /demo/stats (摂食傾向タブ)

Step 6/6: 在庫状況の確認
  → /demo/stats (品物状況タブ)
```

---

## 6. 実装計画

### 6.1 Phase 1: 基盤構築

| タスク | 内容 | 工数目安 |
|--------|------|----------|
| 1.1 | デモデータディレクトリ作成 | 小 |
| 1.2 | `useDemoMode` フック作成 | 小 |
| 1.3 | デモルーティング設定 | 小 |
| 1.4 | DemoHome ページ作成 | 中 |

### 6.2 Phase 2: シードデータ作成

| タスク | 内容 | 工数目安 |
|--------|------|----------|
| 2.1 | `demoCareItems.ts` 作成 | 中 |
| 2.2 | `demoConsumptionLogs.ts` 作成 | 中 |
| 2.3 | `demoStats.ts` 作成 | 小 |
| 2.4 | `demoTasks.ts` 作成 | 小 |

### 6.3 Phase 3: データフック対応

| タスク | 内容 | 工数目安 |
|--------|------|----------|
| 3.1 | `useCareItems` デモ対応 | 中 |
| 3.2 | `useStats` デモ対応 | 中 |
| 3.3 | `useTasks` デモ対応 | 小 |
| 3.4 | `useConsumptionLogs` デモ対応 | 小 |

### 6.4 Phase 4: ショーケース

| タスク | 内容 | 工数目安 |
|--------|------|----------|
| 4.1 | DemoShowcase コンポーネント | 中 |
| 4.2 | ステップナビゲーション | 小 |

---

## 7. メリット・デメリット

### 7.1 メリット

| メリット | 説明 |
|----------|------|
| **本番データ保護** | デモ操作が本番に影響しない |
| **一貫したプレゼン** | 毎回同じデータで説明可能 |
| **オフライン動作** | ネットワーク不要 |
| **開発効率向上** | UIテストがしやすい |
| **コンポーネント再利用** | 同じコードで本番・デモ両対応 |

### 7.2 デメリット・対策

| デメリット | 対策 |
|------------|------|
| データの二重管理 | 型定義を共有、デモデータは最小限 |
| 本番との乖離リスク | 定期的にデモデータを本番仕様に合わせる |
| 初期実装コスト | Phase分割で段階的に実装 |

---

## 8. 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [VIEW_ARCHITECTURE_SPEC.md](./VIEW_ARCHITECTURE_SPEC.md) | 全体ルーティング設計 |
| [DEMO_PWA_SPEC.md](./DEMO_PWA_SPEC.md) | 記録閲覧デモ版仕様 |
| [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) | 統計ダッシュボード設計 |
| [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) | 在庫・消費追跡設計 |

---

## 9. 今後の拡張案

| 機能 | 説明 |
|------|------|
| データリセットボタン | デモデータを初期状態に戻す |
| シナリオ切り替え | 「通常シナリオ」「異常シナリオ」等 |
| 時間シミュレーション | 日付を進めて期限切れ状態を再現 |
| 多言語デモ | 英語版デモデータ |
