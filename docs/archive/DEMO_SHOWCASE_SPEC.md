---
status: archived
scope: feature
owner: core-team
last_reviewed: 2025-12-20
---

# デモショーケース設計書

> **作成日**: 2025年12月17日
> **実装状況**: ✅ 全Phase完了（家族向け特化リデザイン済み）
>
> 本ドキュメントは、デモ・プレゼンテーション用の専用ページとシードデータの設計を定義します。
> 本番ページに干渉せず、安全に機能検証・プレゼンが可能な環境を提供します。
>
> **重要**: 2025-12-17に家族向け特化リデザインを実施。
> 詳細は [DEMO_FAMILY_REDESIGN.md](./DEMO_FAMILY_REDESIGN.md) を参照。
>
> **Phase 26更新** (2025-12-21): 入居者設定画面（`/demo/family/settings/resident`）は削除されました。
> ショーケースステップは6→5ステップに変更。禁止ルールUIは将来的にプリセット管理に統合予定。

---

## 実装完了サマリー

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | 基盤構築（useDemoMode, ルーティング, DemoHome） | ✅ 完了 |
| Phase 2 | シードデータ作成（demoCareItems, demoStats等） | ✅ 完了 |
| Phase 3 | データフック対応（useCareItems等のデモモード対応） | ✅ 完了 |
| Phase 4 | ショーケース（DemoShowcase完成） | ✅ 完了 |
| Phase 5 | **家族向け特化リデザイン** | ✅ 完了 |

**デモURL**: https://facility-care-input-form.web.app/demo

**ターゲット**: 家族（入居者の家族）がメインターゲット
**テーマ**: 「離れて暮らす親御さんのケアを見守る」

**実装ファイル**:
- `frontend/src/hooks/useDemoMode.ts` - デモモード判定フック
- `frontend/src/data/demo/` - シードデータ（12品物、18ログ、9タスク等）
- `frontend/src/pages/demo/DemoHome.tsx` - デモホームページ
- `frontend/src/pages/demo/DemoShowcase.tsx` - ガイド付きツアー
- `frontend/src/hooks/useCareItems.ts` - デモモード対応済み
- `frontend/src/hooks/useStats.ts` - デモモード対応済み
- `frontend/src/hooks/useTasks.ts` - デモモード対応済み
- `frontend/src/hooks/useConsumptionLogs.ts` - デモモード対応済み

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

### 2.1 デモ専用ルート（家族向け特化）

| パス | ページ | 説明 |
|------|--------|------|
| `/demo` | DemoHome | デモホーム（家族向け機能一覧） |
| `/demo/showcase` | DemoShowcase | 家族視点のガイド付きツアー（6ステップ） |
| `/demo/family` | FamilyDashboard | 家族ホーム（タイムライン） |
| `/demo/family/items` | ItemManagement | 品物一覧 |
| `/demo/family/items/new` | ItemForm | 品物登録フォーム |
| `/demo/family/items/:id` | ItemDetail | 品物詳細 |
| `/demo/family/presets` | PresetManagement | プリセット管理 |
| `/demo/family/settings/resident` | ResidentSettings | 入居者設定（禁止ルール等） |
| `/demo/family/tasks` | TaskList | タスク一覧 |
| `/demo/stats` | StatsDashboard | 統計ダッシュボード |
| `/demo/view` | ViewPage | 記録閲覧 |
| `/demo/items/:id/timeline` | ItemTimeline | 品物タイムライン |

> **注**: `/demo/staff/*` ルートは無効化されています（将来 `/demo/staff-app` として復活予定）。
> 詳細は [DEMO_FAMILY_REDESIGN.md](./DEMO_FAMILY_REDESIGN.md) を参照。

### 2.2 URL構造

```
/demo                              # デモホーム（家族向け）
/demo/showcase                     # 家族視点ガイド付きツアー
/demo/family                       # 家族ホーム（タイムライン）
/demo/family/items                 # 品物一覧
/demo/family/items/new             # 品物登録
/demo/family/items/:id             # 品物詳細
/demo/family/presets               # プリセット管理
/demo/family/settings/resident     # 入居者設定
/demo/family/tasks                 # タスク一覧
/demo/stats                        # 統計ダッシュボード
/demo/view                         # 記録閲覧
/demo/items/:id/timeline           # 品物タイムライン
```

### 2.3 本番ルートとの比較

| 機能 | 本番ルート | デモルート | 違い |
|------|------------|------------|------|
| 家族ホーム | `/family` | `/demo/family` | データソース |
| 品物管理 | `/family/items` | `/demo/family/items` | データソース |
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

### 5.2 DemoShowcase（家族視点ガイド付きツアー）

家族の使い方に沿ったストーリー仕立ての6ステップツアー：

```
Step 1/6: 品物を登録する
  → /demo/family/items/new
  ストーリー: 「週末に施設を訪問。お母さんの好きな羊羹を持っていきました」

Step 2/6: 登録した品物を確認
  → /demo/family/items
  ストーリー: 「今どんな品物が施設にあるか確認しましょう」

Step 3/6: いつもの指示を設定
  → /demo/family/presets
  ストーリー: 「毎回同じ品物を持っていくので、よく使う指示を保存しておきます」

Step 4/6: 入居者設定を確認
  → /demo/family/settings/resident
  ストーリー: 「お母さんは甘すぎるお菓子が苦手なので、禁止設定をしておきます」

Step 5/6: 今日の様子を確認
  → /demo/family
  ストーリー: 「今日の食事はどうだったかな？離れていても様子がわかります」

Step 6/6: 傾向を分析する
  → /demo/stats
  ストーリー: 「最近の傾向を見て、次回持っていくものを決めましょう」
```

> **注**: 旧バージョンではスタッフ視点（Step 2-3）が混在していましたが、
> 家族向け特化リデザインにより全ステップが家族視点に統一されました。

---

## 5.3 FIFOケース（つぎたし）の設計方針

### 5.3.1 背景

同じ品物（例：りんご）が複数回送付される「つぎたしケース」への対応。

**ユースケース**:
```
家族が「りんご」を送付（12/20期限）
    ↓ 1週間後
家族が「りんご」を追加送付（12/27期限）
    ↓
スタッフは期限が近い12/20のりんごから先に提供すべき
```

### 5.3.2 設計方針：裏で自然に動く

**結論**: FIFOはデモで強調しない。**あって当たり前の機能**として裏で動作させる。

| 観点 | 判断 |
|------|------|
| 家族の期待 | 「古いものから使うのは当然」と思っている |
| 強調リスク | わざわざアピールすると「今までできなかったの？」と不安を与える |
| 本当に見せたい価値 | 品物の消費状況が見える、スタッフと繋がっている安心感 |

**実装済み機能（変更なし）**:
- ✅ 品物一覧は期限順に表示（自然にFIFO）
- ✅ 詳細画面でSameItemAlert（必要な人だけ気づく）
- ✅ 間食提供時にFIFOWarning（スタッフ向け）

**ショーケースへの影響**: なし（Step追加・ストーリー変更は不要）

### 5.3.3 デモデータ（参考）

FIFOテスト・動作確認用に以下のデータが存在：

| ID | 品物名 | 期限 | 用途 |
|----|--------|------|------|
| demo-item-013 | りんご | +2日 | FIFO検証用（先に消費推奨） |
| demo-item-003 | りんご | +5日 | FIFO検証用（後で消費） |
| demo-item-014 | バナナ | +0日 | FIFO検証用（すぐ消費） |
| demo-item-001 | バナナ | +2日 | FIFO検証用 |

> **技術詳細**: [FIFO_DESIGN_SPEC.md](./FIFO_DESIGN_SPEC.md) を参照

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

---

## 10. ツアーナビゲーション

> **追加日**: 2025年12月17日
> **更新日**: 2025年12月17日（ヘッダー統合型に改善）
> **実装状況**: ✅ 実装完了

### 10.1 背景・課題

#### 旧方式の問題点

以前はヘッダー下に薄いバナーを表示する方式だったが、以下の問題があった：

| 課題 | 詳細 |
|------|------|
| **目立たない** | 薄い青バナーが小さく、気づきにくい |
| **スクロールで消える** | ページ上部にあるため、スクロールすると見えなくなる |
| **アクセスしにくい** | ツアートップに戻るのが大変 |
| **UX悪化** | ユーザーが迷子になりやすい |

### 10.2 解決策: ヘッダー統合型

**ヘッダー右側に目立つ「ツアー」ボタンを常時表示**

- sticky headerの右側にボタンを配置
- スクロールしても常に表示される
- 目立つオレンジ色でアクセント
- いつでも1タップでツアートップに戻れる

### 10.3 UI設計

```
┌───────────────────────────────────────────────────────┐
│ [←]       ページタイトル           [🎯 ツアー →]     │  ← ヘッダー内にボタン
├───────────────────────────────────────────────────────┤
│                                                       │
│              （ページコンテンツ）                      │
│                                                       │
│              スクロールしても                          │
│              ヘッダーは固定表示                        │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**デザイン仕様**:

| 項目 | 値 |
|------|-----|
| 背景色 | `bg-orange-500` (ホバー時 `bg-orange-600`) |
| テキスト色 | `text-white` |
| サイズ | コンパクト（px-2 py-1） |
| 角丸 | `rounded-full` |
| 位置 | ヘッダー右側（`rightElement`） |
| ラベル | `← ツアーTOPに戻る` |

**ラベル設計の考え方**:

ユーザーの画面遷移を考慮：
1. `/demo/showcase` (ツアートップ) → 「この機能を見る」クリック
2. `/demo/family` 等（デモページ）← ここはまだ「ツアー中」
3. 戻りたい先 → ツアートップ

- ユーザーはツアーの**中**にいる
- 戻りたいのはツアーの**トップ**
- 「← ツアーTOPに戻る」が最も正確で分かりやすい

### 10.4 実装設計

#### 10.4.1 コンポーネント構成

```
frontend/src/components/demo/
├── TourReturnBanner.tsx    # 削除（不要になる）
└── DemoHeaderButton.tsx    # 新規作成
```

#### 10.4.2 DemoHeaderButton コンポーネント

```typescript
// components/demo/DemoHeaderButton.tsx

import { Link, useLocation } from 'react-router-dom';

/**
 * デモモード時にヘッダー右側に表示する「ツアーに戻る」ボタン
 * - /demo/* ページでのみ表示
 * - /demo/showcase では非表示（ツアートップ自体のため）
 */
export function DemoHeaderButton() {
  const location = useLocation();

  // /demo/showcase では非表示
  if (location.pathname === '/demo/showcase') {
    return null;
  }

  // /demo/* 以外では非表示
  if (!location.pathname.startsWith('/demo')) {
    return null;
  }

  return (
    <Link
      to="/demo/showcase"
      className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-2 py-1 rounded-full transition-colors"
    >
      <span>←</span>
      <span>ツアーTOPに戻る</span>
    </Link>
  );
}
```

#### 10.4.3 Layout への統合

```typescript
// components/Layout.tsx

import { DemoHeaderButton } from './demo/DemoHeaderButton';

export function Layout({ children, title, rightElement, ... }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      {title && (
        <header className="bg-gradient-to-r from-primary to-primary-dark text-white sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            {/* 左側: 戻るボタン */}
            <div className="w-10">...</div>

            {/* 中央: タイトル */}
            <div className="flex-1 text-center">
              <h1>{title}</h1>
            </div>

            {/* 右側: デモボタン or カスタム要素 */}
            <div className="w-auto flex-shrink-0 flex justify-end gap-2">
              <DemoHeaderButton />  {/* 常に表示判定 */}
              {rightElement}
            </div>
          </div>
        </header>
      )}

      {/* メインコンテンツ */}
      <main>...</main>

      {/* フッター */}
      {showFooter && <FooterNav />}
    </div>
  );
}
```

### 10.5 表示条件まとめ

| パス | ボタン表示 | 理由 |
|------|----------|------|
| `/demo` | ✅ 表示 | デモホーム |
| `/demo/showcase` | ❌ 非表示 | ツアートップ自体 |
| `/demo/staff` | ✅ 表示 | デモページ |
| `/demo/family` | ✅ 表示 | デモページ |
| `/demo/family/items/new` | ✅ 表示 | デモページ |
| `/demo/stats` | ✅ 表示 | デモページ |
| `/staff` | ❌ 非表示 | 本番ページ |
| `/family` | ❌ 非表示 | 本番ページ |

### 10.6 旧方式との比較

| 項目 | 旧方式（バナー） | 新方式（ヘッダーボタン） |
|------|------------------|------------------------|
| 位置 | ヘッダー下 | ヘッダー内（右側） |
| 視認性 | △ 薄い青で目立たない | ◎ オレンジで目立つ |
| スクロール時 | ✗ 見えなくなる | ◎ 常に表示（sticky） |
| アクセス性 | △ 上部に戻る必要 | ◎ いつでも1タップ |
| デザイン | テキストリンク | ボタン型（明確なCTA） |

### 10.7 実装タスク

| # | タスク | 工数 |
|---|--------|------|
| 1 | `DemoHeaderButton.tsx` 作成 | 小 |
| 2 | `Layout.tsx` 修正（右側にボタン配置） | 小 |
| 3 | `TourReturnBanner.tsx` 削除 | 小 |
| 4 | E2Eテスト更新 | 小 |

### 10.8 将来の拡張案

| 機能 | 説明 |
|------|------|
| ステップ番号表示 | ボタンに「2/6」など現在位置を表示 |
| ツールチップ | ホバー時に「ガイド付きツアーに戻る」と表示 |
| アニメーション | 初回訪問時にパルスアニメーションで注目を集める |

---

## 11. デモモードでの書き込み操作

> **追加日**: 2025年12月17日
> **実装状況**: ✅ 実装完了

### 11.1 背景・課題

デモモードで「読み取り」はローカルデータを使用するが、「書き込み」（登録・更新・削除）は本番APIを呼び出してしまう問題が発覚。

| 問題 | 詳細 |
|------|------|
| **本番APIを呼び出し** | `/demo/family/items/new` で登録すると本番Firestoreに保存 |
| **本番ページにリダイレクト** | 登録成功後に `/family/items`（本番）に遷移 |
| **データ汚染** | デモ操作で本番データが汚染される |
| **設計原則違反** | 「完全分離」原則に違反 |

### 11.2 設計原則（再確認）

セクション1.2より：
> **完全分離**: デモモードは本番APIを呼ばず、ローカルデータのみで動作

この原則に基づき、**全ての書き込み操作**をデモモードでは抑制する。

### 11.3 解決策

デモモード時の書き込み操作は：
1. **本番APIを呼ばない**
2. **成功メッセージを表示**（「登録しました（デモ）」等）
3. **デモページにリダイレクト**（`/demo/family/items` 等）
4. **ローカルデータは更新しない**（リロードで元に戻る）

### 11.4 影響範囲

デモモードで書き込み操作が可能な画面を特定し、対応完了：

| 画面 | パス | 操作 | 対応 |
|------|------|------|------|
| 品物登録 | `/demo/family/items/new` | 登録 | ✅ 対応済み |
| 品物詳細 | `/demo/family/items/:id` | 削除 | ✅ 対応済み |
| 品物一覧 | `/demo/family/items` | 削除 | ✅ 対応済み |
| タスク一覧 | `/demo/family/tasks` | 完了/ステータス変更 | ✅ 対応済み |
| 入居者設定 | `/demo/family/settings/resident` | 禁止ルール追加/削除 | ✅ 対応済み |
| プリセット管理 | `/demo/family/presets` | 作成/更新/削除 | ✅ 対応済み |

### 11.5 実装設計

#### 11.5.1 品物登録フォーム（ItemForm.tsx）

```typescript
import { useDemoMode } from '../../hooks/useDemoMode';

export function ItemForm() {
  const navigate = useNavigate();
  const isDemo = useDemoMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // デモモードの場合
    if (isDemo) {
      // APIを呼ばず、成功メッセージを表示
      alert('登録しました（デモモード - 実際には保存されません）');
      // デモページにリダイレクト
      navigate('/demo/family/items');
      return;
    }

    // 本番モードの場合は通常通りAPI呼び出し
    await submitItem.mutateAsync({...});
    navigate('/family/items');
  };
}
```

#### 11.5.2 共通パターン

全ての書き込み操作で以下のパターンを適用：

```typescript
const isDemo = useDemoMode();

const handleAction = async () => {
  if (isDemo) {
    // 1. APIを呼ばない
    // 2. 成功メッセージ（デモであることを明示）
    // 3. デモページにリダイレクト
    return;
  }
  // 本番処理
};
```

### 11.6 ユーザーへの明示

デモモードでの操作結果は、ユーザーに以下を明示：
- 「デモモード」であること
- 「実際には保存されない」こと
- リロードで元に戻ること

### 11.7 実装タスク

| # | タスク | 工数 |
|---|--------|------|
| 1 | ItemForm.tsx 修正 | 小 |
| 2 | ItemDetail.tsx 削除操作対応 | 小 |
| 3 | TaskList.tsx 完了/削除操作対応 | 小 |
| 4 | ResidentSettings.tsx 禁止ルール操作対応 | 小 |
| 5 | PresetManagement.tsx 操作対応 | 小 |
| 6 | ConsumptionRecordModal.tsx 操作対応 | 小 |
| 7 | E2Eテスト追加 | 中 |
