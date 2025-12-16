# Gemini AI連携 詳細設計書

> **最終更新**: 2025年12月16日
>
> 本ドキュメントは、Gemini 2.5 Flash（Vertex AI）を活用したAI機能の詳細設計を定義します。

---

## 1. 概要

### 1.1 目的

Gemini 2.5 Flashを活用し、以下のAI機能を提供します：

1. **入力補助**: 品物名から賞味期限・保存方法を自動提案
2. **摂食傾向分析**: 摂食データから傾向・異常を分析
3. **残量予測**: 消費ペースから残量を予測
4. **ケア提案**: 摂食傾向からケア改善を提案
5. **アラート評価**: 賞味期限・異常値の自動検出

### 1.2 技術スタック

| 項目 | 値 |
|------|-----|
| AI モデル | Gemini 2.5 Flash |
| API | Vertex AI (Google Cloud) |
| リージョン | asia-northeast1（東京） |
| SDK | @google-cloud/vertexai |

### 1.3 設計原則

1. **レスポンス速度優先**: Flash モデルで高速応答
2. **コスト最適化**: 必要最小限のトークン使用
3. **フォールバック対応**: AI障害時はデフォルト値を使用
4. **プロンプトの一元管理**: テンプレート化して保守性確保

---

## 2. GCP設定

### 2.1 Vertex AI API有効化

```bash
# Vertex AI API有効化
gcloud services enable aiplatform.googleapis.com --project=facility-care-input-form

# サービスアカウントに権限付与
gcloud projects add-iam-policy-binding facility-care-input-form \
  --member="serviceAccount:facility-care-sa@facility-care-input-form.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### 2.2 依存パッケージ

```bash
cd functions
npm install @google-cloud/vertexai
```

### 2.3 初期化コード

```typescript
// functions/src/services/geminiService.ts
import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = 'facility-care-input-form';
const LOCATION = 'asia-northeast1';  // 東京リージョン
const MODEL_ID = 'gemini-2.5-flash'; // GA版モデル

const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

const generativeModel = vertexAI.getGenerativeModel({
  model: MODEL_ID,
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.2,  // 低め: 安定した出力
    topP: 0.8,
  },
});

export { generativeModel };
```

> **注意**: モデルIDは `gemini-2.5-flash` を使用。`gemini-2.5-flash-preview-*` はプレビュー版で利用制限あり。

---

## 3. AI機能詳細

### 3.1 品物入力補助（aiSuggest）

#### ユースケース

家族が品物名を入力した際に、賞味期限の目安と保存方法を自動提案します。

```
入力: 「キウイ」
↓
AI提案:
- 賞味期限目安: 3-5日
- 保存方法: 冷蔵
- 提供方法候補: カット、皮むき
```

#### API仕様

```
POST /aiSuggest
```

**リクエスト**:
```typescript
interface AISuggestRequest {
  itemName: string;
  category?: ItemCategory;
}
```

**レスポンス**:
```typescript
interface AISuggestResponse {
  success: boolean;
  data?: {
    expirationDays: number;        // 賞味期限目安（日数）
    storageMethod: StorageMethod;  // 保存方法
    servingMethods: ServingMethod[]; // 提供方法候補
    notes?: string;                // 補足情報
  };
  error?: string;
}
```

#### プロンプトテンプレート

```typescript
// functions/src/prompts/itemSuggestion.ts

export function buildItemSuggestionPrompt(itemName: string, category?: string): string {
  return `
あなたは介護施設の栄養管理アシスタントです。
以下の食品について、高齢者向けの情報を提供してください。

食品名: ${itemName}
${category ? `カテゴリ: ${category}` : ''}

以下の情報をJSON形式で回答してください：
1. expirationDays: 賞味期限の目安（日数、整数）
2. storageMethod: 保存方法（"room_temp", "refrigerated", "frozen" のいずれか）
3. servingMethods: 高齢者に適した提供方法の配列（"as_is", "cut", "peeled", "heated", "cooled", "blended" から選択）
4. notes: 高齢者が食べる際の注意点（任意、50文字以内）

回答例:
{
  "expirationDays": 5,
  "storageMethod": "refrigerated",
  "servingMethods": ["cut", "peeled"],
  "notes": "種を取り除き、食べやすい大きさにカットしてください"
}

JSONのみを出力し、説明文は不要です。
`;
}
```

#### 実装

```typescript
// functions/src/functions/aiSuggest.ts
import * as functions from 'firebase-functions';
import { generativeModel } from '../services/geminiService';
import { buildItemSuggestionPrompt } from '../prompts/itemSuggestion';

export const aiSuggest = functions
  .region('asia-northeast1')
  .https.onRequest(async (req, res) => {
    // CORS処理
    res.set('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }

    try {
      const { itemName, category } = req.body;

      if (!itemName) {
        res.status(400).json({ success: false, error: 'itemName is required' });
        return;
      }

      const prompt = buildItemSuggestionPrompt(itemName, category);
      const result = await generativeModel.generateContent(prompt);
      const response = result.response;
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // JSONパース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }

      const suggestion = JSON.parse(jsonMatch[0]);

      res.status(200).json({
        success: true,
        data: {
          expirationDays: suggestion.expirationDays || 7,
          storageMethod: suggestion.storageMethod || 'refrigerated',
          servingMethods: suggestion.servingMethods || ['as_is'],
          notes: suggestion.notes || undefined,
        },
      });
    } catch (error) {
      functions.logger.error('AI suggest error:', error);

      // フォールバック: デフォルト値を返す
      res.status(200).json({
        success: true,
        data: {
          expirationDays: 7,
          storageMethod: 'refrigerated',
          servingMethods: ['as_is'],
          notes: undefined,
        },
        warning: 'AI suggestion unavailable, using defaults',
      });
    }
  });
```

---

### 3.2 摂食傾向分析（aiAnalyze）

#### ユースケース

蓄積された摂食データを分析し、傾向や異常を検出します。

```
入力: 過去30日間の摂食記録
↓
AI分析:
- 摂食率は平均78%で安定
- 果物の摂食率が高い（90%）
- リンゴの摂食率が急低下（60%→20%）
- 提案: リンゴは硬さが原因かも、すりおろし提供を検討
```

#### API仕様

```
POST /aiAnalyze
```

**リクエスト**:
```typescript
interface AIAnalyzeRequest {
  residentId: string;
  analysisType: 'consumption' | 'prediction' | 'care_suggestion';
  period: {
    startDate: string;
    endDate: string;
  };
  data?: {
    consumptionRecords?: ConsumptionRecord[];
    mealRecords?: MealRecord[];
    itemRecords?: CareItem[];
  };
}

interface ConsumptionRecord {
  date: string;
  itemName: string;
  category: string;
  rate: number;
}

interface MealRecord {
  date: string;
  mealTime: string;
  mainDishRate: number;
  sideDishRate: number;
}
```

**レスポンス**:
```typescript
interface AIAnalyzeResponse {
  success: boolean;
  data?: {
    analysisType: string;
    summary: string;              // 分析サマリ（200文字以内）
    findings: Finding[];         // 発見事項
    suggestions: Suggestion[];   // 改善提案
    alerts?: Alert[];            // 警告
  };
  error?: string;
}

interface Finding {
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: {
    current: number;
    previous?: number;
    change?: number;
  };
}

interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  relatedItemName?: string;
}
```

#### プロンプトテンプレート

```typescript
// functions/src/prompts/analysisPrompts.ts

export function buildConsumptionAnalysisPrompt(
  records: ConsumptionRecord[],
  period: { startDate: string; endDate: string }
): string {
  const recordsJson = JSON.stringify(records.slice(0, 100)); // 最大100件

  return `
あなたは介護施設の栄養管理アシスタントです。
以下の摂食記録を分析し、傾向と改善提案を提供してください。

分析期間: ${period.startDate} 〜 ${period.endDate}

摂食記録データ:
${recordsJson}

以下の情報をJSON形式で回答してください：

1. summary: 全体のサマリ（200文字以内）
2. findings: 発見事項の配列
   - type: "positive"（良い傾向）, "negative"（悪い傾向）, "neutral"（中立）
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - metric: 数値情報（current, previous, change）

3. suggestions: 改善提案の配列
   - priority: "high", "medium", "low"
   - title: タイトル（30文字以内）
   - description: 説明（100文字以内）
   - relatedItemName: 関連する品物名（任意）

回答例:
{
  "summary": "摂食率は平均78%で安定しています。果物の摂食率が特に高く、リンゴのみ低下傾向が見られます。",
  "findings": [
    {
      "type": "positive",
      "title": "果物の摂食率が高い",
      "description": "バナナ、みかんなど柔らかい果物の摂食率が90%以上です",
      "metric": { "current": 92, "previous": 88, "change": 4 }
    },
    {
      "type": "negative",
      "title": "リンゴの摂食率が低下",
      "description": "先週60%から今週20%に急低下しています",
      "metric": { "current": 20, "previous": 60, "change": -40 }
    }
  ],
  "suggestions": [
    {
      "priority": "high",
      "title": "リンゴの提供方法を変更",
      "description": "硬さが原因の可能性があります。すりおろしや煮リンゴでの提供を検討してください",
      "relatedItemName": "リンゴ"
    }
  ]
}

JSONのみを出力してください。
`;
}
```

---

### 3.3 レポート生成（aiReport）

#### ユースケース

週次/月次のサマリレポートをAIが自動生成します。

#### プロンプトテンプレート

```typescript
// functions/src/prompts/reportPrompts.ts

export function buildWeeklyReportPrompt(
  data: {
    itemStats: ItemStatsData;
    consumptionStats: ConsumptionStatsData;
    taskStats: { completed: number; pending: number };
  },
  period: { startDate: string; endDate: string }
): string {
  return `
あなたは介護施設の報告書作成アシスタントです。
以下のデータを基に、ご家族向けの週次レポートを作成してください。

期間: ${period.startDate} 〜 ${period.endDate}

【品物統計】
- 登録品物数: ${data.itemStats.summary.totalItems}件
- 提供待ち: ${data.itemStats.summary.pendingItems}件
- 本日期限: ${data.itemStats.summary.expiringToday}件

【摂食統計】
- 平均摂食率: ${data.consumptionStats.summary.averageRate}%
- 前週比: ${data.consumptionStats.summary.weeklyChange > 0 ? '+' : ''}${data.consumptionStats.summary.weeklyChange}%
- 記録件数: ${data.consumptionStats.summary.totalRecords}件

【タスク統計】
- 完了: ${data.taskStats.completed}件
- 未完了: ${data.taskStats.pending}件

以下の形式でレポートを作成してください（Markdown形式）：

## 今週のサマリ

（3-5行で全体の状況を要約）

## 良かった点

（箇条書きで2-3点）

## 気になる点

（箇条書きで2-3点、ある場合のみ）

## 来週に向けて

（1-2行のアドバイス）

---

レポートは温かみのある、ご家族に安心感を与えるトーンで書いてください。
専門用語は避け、分かりやすい表現を使ってください。
`;
}
```

---

## 4. フロントエンド実装

### 4.1 AI提案コンポーネント

```typescript
// frontend/src/components/family/AISuggestion.tsx

interface AISuggestionProps {
  itemName: string;
  onApply: (suggestion: ItemSuggestion) => void;
}

function AISuggestion({ itemName, onApply }: AISuggestionProps) {
  const { data, isLoading, error } = useAISuggest(itemName);

  if (!itemName || itemName.length < 2) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="ai-suggestion loading">
        <span className="spinner" /> AI が提案を生成中...
      </div>
    );
  }

  if (error || !data) {
    return null; // エラー時は非表示
  }

  return (
    <div className="ai-suggestion">
      <div className="ai-suggestion-header">
        <span className="ai-icon">🤖</span>
        <span>AIの提案</span>
      </div>
      <div className="ai-suggestion-content">
        <p>
          <strong>賞味期限目安:</strong> {data.expirationDays}日
        </p>
        <p>
          <strong>保存方法:</strong> {STORAGE_METHODS_MAP[data.storageMethod]}
        </p>
        <p>
          <strong>おすすめの提供方法:</strong>
          {data.servingMethods.map(m => SERVING_METHODS_MAP[m]).join('、')}
        </p>
        {data.notes && (
          <p className="ai-notes">
            <strong>注意:</strong> {data.notes}
          </p>
        )}
      </div>
      <button
        className="ai-apply-button"
        onClick={() => onApply(data)}
      >
        この提案を適用
      </button>
    </div>
  );
}
```

### 4.2 AI提案フック

```typescript
// frontend/src/hooks/useAISuggest.ts

import { useQuery } from '@tanstack/react-query';
import { fetchAISuggest } from '../api/ai';

export function useAISuggest(itemName: string) {
  return useQuery({
    queryKey: ['aiSuggest', itemName],
    queryFn: () => fetchAISuggest(itemName),
    enabled: itemName.length >= 2, // 2文字以上で実行
    staleTime: 1000 * 60 * 60, // 1時間キャッシュ
    retry: false, // リトライしない（フォールバックがあるため）
  });
}
```

### 4.3 AIレポートコンポーネント

```typescript
// frontend/src/components/family/AIReport.tsx

interface AIReportProps {
  residentId: string;
  period: { startDate: string; endDate: string };
}

function AIReport({ residentId, period }: AIReportProps) {
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateReport(residentId, period);
      setReport(result.report);
    } catch (error) {
      console.error('Report generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="ai-report">
      <div className="ai-report-header">
        <h3>📄 AIレポート</h3>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="generate-button"
        >
          {isGenerating ? '生成中...' : 'レポートを生成'}
        </button>
      </div>

      {report && (
        <div className="ai-report-content">
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

---

## 5. エラーハンドリング・フォールバック

### 5.1 エラーパターン

| エラー種別 | 原因 | 対処 |
|-----------|------|------|
| API制限 | レートリミット超過 | キャッシュ活用、リトライ |
| タイムアウト | レスポンス遅延 | フォールバック値を返却 |
| パースエラー | AI出力が不正 | デフォルト値を使用 |
| 認証エラー | SA権限不足 | ログ出力、手動対応 |

### 5.2 フォールバック実装

```typescript
// functions/src/services/geminiService.ts

const DEFAULT_ITEM_SUGGESTION: ItemSuggestion = {
  expirationDays: 7,
  storageMethod: 'refrigerated',
  servingMethods: ['as_is'],
  notes: undefined,
};

export async function getItemSuggestionWithFallback(
  itemName: string
): Promise<ItemSuggestion> {
  try {
    const suggestion = await getItemSuggestion(itemName);
    return suggestion;
  } catch (error) {
    functions.logger.warn('AI suggestion failed, using fallback:', error);
    return DEFAULT_ITEM_SUGGESTION;
  }
}
```

### 5.3 キャッシュ戦略

```typescript
// Firestoreキャッシュ
interface AISuggestionCache {
  itemName: string;
  suggestion: ItemSuggestion;
  createdAt: Timestamp;
  expiresAt: Timestamp; // 24時間後
}

// キャッシュチェック
async function getCachedSuggestion(itemName: string): Promise<ItemSuggestion | null> {
  const cacheDoc = await firestore
    .collection('ai_suggestion_cache')
    .doc(itemName.toLowerCase())
    .get();

  if (cacheDoc.exists) {
    const cache = cacheDoc.data() as AISuggestionCache;
    if (cache.expiresAt.toDate() > new Date()) {
      return cache.suggestion;
    }
  }
  return null;
}
```

---

## 6. コスト管理

### 6.1 見積もり

| 項目 | 想定利用量 | 単価 | 月額見積 |
|------|-----------|------|---------|
| 入力補助 | 100回/日 | $0.00015/1K入力トークン | 〜$5 |
| 分析 | 10回/日 | $0.0006/1K出力トークン | 〜$10 |
| レポート | 30回/月 | - | 〜$5 |
| **合計** | | | **〜$20/月** |

### 6.2 最適化ポイント

1. **キャッシュ活用**: 同じ品物名の提案はキャッシュから返却
2. **バッチ処理**: 分析は日次バッチで実行
3. **トークン削減**: プロンプトを簡潔に、出力を制限
4. **利用制限**: 1ユーザーあたりの日次利用上限を設定

---

## 7. 実装ファイル構成

### 7.1 バックエンド

```
functions/src/
├── services/
│   └── geminiService.ts       # Gemini API連携
├── functions/
│   ├── aiSuggest.ts           # 品物入力補助API
│   ├── aiAnalyze.ts           # 摂食傾向分析API
│   └── aiReport.ts            # レポート生成API
├── prompts/
│   ├── itemSuggestion.ts      # 品物提案プロンプト
│   ├── analysisPrompts.ts     # 分析プロンプト
│   └── reportPrompts.ts       # レポートプロンプト
└── types/
    └── ai.ts                  # AI関連型定義
```

### 7.2 フロントエンド

```
frontend/src/
├── components/family/
│   ├── AISuggestion.tsx       # AI提案UI
│   └── AIReport.tsx           # AIレポート表示
├── hooks/
│   ├── useAISuggest.ts        # 品物提案フック
│   └── useAIAnalyze.ts        # 分析フック
└── api/
    └── ai.ts                  # AI API呼び出し
```

---

## 8. AI提案UI統合（Phase 8.4拡張）

### 8.1 概要

品物登録フォーム（ItemForm.tsx）にAI提案機能を統合し、品物名入力時に自動で提案を表示します。

### 8.2 ユーザーフロー

```
1. 家族が「品物名」を入力（2文字以上）
2. 500msのデバウンス後、AI APIを呼び出し
3. ローディング表示（「AI が提案を生成中...」）
4. 提案カードを表示:
   - 賞味期限目安: N日
   - 保存方法: 常温/冷蔵/冷凍
   - おすすめの提供方法: カット、皮むき等
   - 注意事項（あれば）
5. 「この提案を適用」ボタンをタップ
6. フォームに自動入力:
   - 賞味期限: 今日 + expirationDays
   - 保存方法: storageMethod
   - 提供方法: servingMethods[0]
   - 提供方法の詳細: notes（あれば）
```

### 8.3 UI仕様

#### AI提案カード

```
┌─────────────────────────────────────┐
│ 🤖 AIの提案                         │
├─────────────────────────────────────┤
│ 📅 賞味期限目安: 5日                │
│ 🧊 保存方法: 冷蔵                   │
│ 🍴 おすすめ: カット、皮むき、温める │
│ ⚠️ 注意: 種を取り除いてください     │
├─────────────────────────────────────┤
│         [この提案を適用]            │
└─────────────────────────────────────┘
```

#### 状態別表示

| 状態 | 表示 |
|------|------|
| 入力中（<2文字） | 非表示 |
| ローディング | スピナー + 「AI が提案を生成中...」 |
| 成功 | 提案カード |
| エラー | 非表示（サイレント） |
| フォールバック | 提案カード + 警告アイコン |

#### 適用フィードバック

「この提案を適用」ボタンクリック時のユーザーフィードバック:

| フェーズ | 表示内容 | 持続時間 |
|----------|----------|----------|
| クリック直後 | ボタンがスケールダウン（押し込み効果） | 100ms |
| 適用中 | ボタン内に「✓ 適用しました」+ 緑色背景 | 1.5秒 |
| 完了後 | カード全体がフェードアウト | 300ms |

```
クリック前:
┌─────────────────────────────────────┐
│         [この提案を適用]            │  ← 紫色ボタン
└─────────────────────────────────────┘

クリック後:
┌─────────────────────────────────────┐
│         [✓ 適用しました]            │  ← 緑色ボタン + チェックマーク
└─────────────────────────────────────┘
        ↓ 1.5秒後 ↓
      カード全体がフェードアウト
```

### 8.4 実装ファイル

| ファイル | 説明 |
|----------|------|
| `frontend/src/components/family/AISuggestion.tsx` | AI提案カードコンポーネント（新規） |
| `frontend/src/pages/family/ItemForm.tsx` | useAISuggestフック統合（修正） |

### 8.5 適用ロジック

「この提案を適用」ボタン押下時:

```typescript
const handleApplySuggestion = (suggestion: AISuggestResponse) => {
  // 賞味期限: 今日 + expirationDays
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + suggestion.expirationDays);
  updateField('expirationDate', expirationDate.toISOString().split('T')[0]);

  // 保存方法
  if (suggestion.storageMethod) {
    updateField('storageMethod', suggestion.storageMethod);
  }

  // 提供方法（最初の1つを選択）
  if (suggestion.servingMethods?.length > 0) {
    updateField('servingMethod', suggestion.servingMethods[0]);
  }

  // 注意事項を提供方法の詳細に設定
  if (suggestion.notes) {
    updateField('servingMethodDetail', suggestion.notes);
  }
};
```

---

## 9. 参照資料

- [USER_ROLE_SPEC.md](./USER_ROLE_SPEC.md) - ユーザーロール・権限設計
- [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) - 品物管理詳細設計
- [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) - 統計ダッシュボード設計
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini)
