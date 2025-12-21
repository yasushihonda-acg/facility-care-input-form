---
status: working
scope: feature
owner: core-team
last_reviewed: 2025-12-21
---

# デモモードAI分析対応 設計書

> **Phase 34**: 統計ダッシュボード AI分析のデモモード対応
>
> **作成日**: 2025-12-21

## 1. 概要

### 1.1 目的

統計ダッシュボード（`/demo/stats`）の「AI分析」機能をデモモードで正常に動作させる。

### 1.2 現状の問題

| コンポーネント | デモモード対応 | 問題 |
|---------------|--------------|------|
| `useStats` フック | 対応済み | - |
| `getFoodStats` | 対応済み | - |
| **`AIAnalysis`** | **未対応** | 常にAPI呼び出し → エラー発生 |

**症状**: デモモードで「再分析」ボタンをクリックすると「AI analysis unavailable, using defaults」と警告が表示され、分析結果が表示されない。

### 1.3 解決策

1. **デモ用AI分析モックデータ**を `demoStats.ts` に追加
2. **`AIAnalysis` コンポーネント**にデモモード判定を追加し、モックデータを使用

---

## 2. 設計

### 2.1 デモ用AI分析モックデータ

```typescript
// frontend/src/data/demo/demoStats.ts

export const DEMO_AI_ANALYSIS: AIAnalyzeResponse = {
  summary: "過去30日間の摂食傾向を分析しました。全体的に果物・和菓子類の摂取率が高く、健康的な食生活が維持されています。",
  findings: [
    {
      type: "positive",
      title: "プリンの摂取率が非常に高い",
      description: "摂取率95%で、お気に入りの品目のようです",
      metric: { current: 95, previous: 88, change: 7 },
    },
    {
      type: "positive",
      title: "キウイの完食率向上",
      description: "前月比で摂取率が改善しています",
      metric: { current: 93, previous: 78, change: 15 },
    },
    {
      type: "negative",
      title: "りんごの摂取率が低下傾向",
      description: "固さが原因かもしれません",
      metric: { current: 25, previous: 45, change: -20 },
    },
  ],
  suggestions: [
    {
      priority: "high",
      title: "りんごの提供方法を変更",
      description: "すりおろしや薄切りなど、食べやすい形態での提供を検討してください",
      relatedItemName: "りんご",
    },
    {
      priority: "medium",
      title: "黒豆の提供頻度を見直し",
      description: "摂取率40%のため、少量ずつの提供をお勧めします",
      relatedItemName: "黒豆",
    },
  ],
  analyzedAt: new Date().toISOString(),
};
```

### 2.2 AIAnalysis コンポーネント修正

```typescript
// frontend/src/components/family/AIAnalysis.tsx

import { useLocation } from 'react-router-dom';
import { DEMO_AI_ANALYSIS } from '../../data/demo';

export function AIAnalysis({ residentId, consumptionData, period }: AIAnalysisProps) {
  const location = useLocation();
  const isDemo = location.pathname.startsWith('/demo');

  // ...既存のstate...

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setWarning(null);

    try {
      // デモモードではモックデータを使用
      if (isDemo) {
        // 少し遅延を入れてローディング感を出す
        await new Promise(resolve => setTimeout(resolve, 800));
        setAnalysis(DEMO_AI_ANALYSIS);
        setIsLoading(false);
        return;
      }

      // 本番モード: API呼び出し（既存のまま）
      // ...
    } catch (err) {
      // ...
    }
  };

  // ...既存のrender...
}
```

### 2.3 データフロー

```
[デモモード: /demo/stats]
    │
    ▼
┌─────────────────────────────────────────┐
│ StatsDashboard                          │
│   ├─ useStats()    → DEMO_ITEM_STATS    │ (既存・対応済み)
│   ├─ getFoodStats  → DEMO_FOOD_STATS    │ (既存・対応済み)
│   └─ AIAnalysis    → DEMO_AI_ANALYSIS   │ ★今回対応
└─────────────────────────────────────────┘
```

---

## 3. 実装計画

### 3.1 ファイル変更一覧

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/data/demo/demoStats.ts` | `DEMO_AI_ANALYSIS` 定数追加 |
| `frontend/src/data/demo/index.ts` | エクスポート追加 |
| `frontend/src/components/family/AIAnalysis.tsx` | デモモード判定追加 |

### 3.2 E2Eテスト

**ファイル**: `frontend/e2e/demo-stats-ai.spec.ts`

| テストID | 内容 |
|----------|------|
| DEMO-STATS-AI-001 | AI分析ボタンが表示される |
| DEMO-STATS-AI-002 | 分析ボタンクリックで結果が表示される |
| DEMO-STATS-AI-003 | 発見事項（positive）が表示される |
| DEMO-STATS-AI-004 | 発見事項（negative）が表示される |
| DEMO-STATS-AI-005 | 改善提案が表示される |
| DEMO-STATS-AI-006 | 再分析ボタンで結果が更新される |

---

## 4. モックデータ詳細

### 4.1 発見事項 (findings)

デモデータ `DEMO_FOOD_STATS` と整合性を持たせる：

| 品目 | タイプ | 説明 |
|------|--------|------|
| プリン | positive | 摂取率95%で高評価 |
| キウイ | positive | 93%で完食率向上 |
| りんご | negative | 25%で低下傾向 |

### 4.2 改善提案 (suggestions)

| 優先度 | 対象品目 | 提案内容 |
|--------|----------|----------|
| high | りんご | 提供方法の変更（すりおろし等） |
| medium | 黒豆 | 提供頻度の見直し |

---

## 5. 参照資料

- [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) - 統計ダッシュボード設計
- [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) - AI連携設計
- [DEMO_SHOWCASE_SPEC.md](./DEMO_SHOWCASE_SPEC.md) - デモ機能設計
