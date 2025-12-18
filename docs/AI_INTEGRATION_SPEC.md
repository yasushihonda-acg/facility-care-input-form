# Gemini AI連携 詳細設計書

> **最終更新**: 2025年12月18日
>
> 本ドキュメントは、Gemini 2.5 Flash（Vertex AI）を活用したAI機能の詳細設計を定義します。

---

## 実装ステータス

| 機能 | Phase | ステータス | 備考 |
|------|-------|-----------|------|
| 品物入力補助（aiSuggest） | 8.4 | ✅ 実装完了 | セクション3.1 |
| 摂食傾向分析（aiAnalyze） | 8.4.1 | ✅ 実装完了 | セクション3.2 |
| レポート生成（aiReport） | - | 📋 設計のみ | セクション3.3 |
| AI提案UI統合 | 8.4 | ✅ 実装完了 | セクション8 |
| プリセット統合 | 8.5 | ✅ 実装完了 | セクション9 |
| AI自動ストック | 8.7 | ✅ 実装完了 | セクション10 |

---

## 1. 概要

### 1.1 目的

Gemini 2.5 Flashを活用し、以下のAI機能を提供します：

1. **入力補助**: 品物名から賞味期限・保存方法を自動提案 ✅
2. **摂食傾向分析**: 摂食データから傾向・異常を分析 ✅
3. **残量予測**: 消費ペースから残量を予測 📋
4. **ケア提案**: 摂食傾向からケア改善を提案 ✅
5. **アラート評価**: 賞味期限・異常値の自動検出 📋

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

### 3.2 摂食傾向分析（aiAnalyze） ✅ 実装完了

> **実装ファイル**:
> - バックエンド: `functions/src/functions/aiAnalyze.ts`, `functions/src/prompts/analysisPrompts.ts`
> - フロントエンド: `frontend/src/components/family/AIAnalysis.tsx`
> - 型定義: `functions/src/types/index.ts` (AIAnalyzeRequest/Response)
>
> **UI表示場所**: 統計ダッシュボード → 摂食傾向タブ → AI分析セクション

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
| フェードアウト | カード全体がopacity:0に | 300ms |
| 完了後 | コンポーネントがnullを返却（DOM削除） | - |

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
        ↓ 0.3秒後 ↓
      DOM完全削除（空白なし）
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

## 9. プリセット統合（Phase 8.5）

### 9.1 概要

品物登録フォームのAI提案に加えて、「いつもの指示（プリセット）」を統合表示します。
これにより、家族はワンストップで品物情報とケア指示を設定できます。

**関連ドキュメント**: [MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md](./MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md)

### 9.2 設計背景

現状の問題:
- 品物登録（ItemForm）とケア指示（RequestBuilder）が別画面
- 家族が2箇所で類似情報を管理する認知負荷
- スタッフが両方を確認する必要

解決策:
- 品物登録時にプリセットを表示・適用可能に
- AI提案とプリセットを並列表示
- ワンストップで設定完了

### 9.3 ユーザーフロー

```
1. 家族が「品物名」を入力（例: キウイ）
2. 同時にAPI呼び出し:
   - AI提案API（aiSuggest）
   - プリセット候補API（getPresetSuggestions）← 新規
3. 2つの提案カードを表示:

   ┌──────────────────────────────────────┐
   │ 🤖 AIの提案                          │
   │ 📅 賞味期限目安: 7日                 │
   │ 🧊 保存方法: 冷蔵                    │
   │ 🍴 おすすめ: カット、皮むき          │
   │          [この提案を適用]             │
   └──────────────────────────────────────┘

   ┌──────────────────────────────────────┐
   │ 📌 いつもの指示                       │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ 🍎 果物は一口大にカット               │
   │    マッチ理由: カテゴリ「果物」        │
   │          [この指示を適用]             │
   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
   │ 🕐 朝食時に提供                       │
   │    マッチ理由: 品物名「キウイ」        │
   │          [この指示を適用]             │
   └──────────────────────────────────────┘

4. 家族が任意のボタンをタップ
5. フォームに自動入力
6. 「指示の出所」を記録（ai / preset / manual / mixed）
```

### 9.4 API仕様

#### プリセット候補取得API

```
POST /getPresetSuggestions
```

**リクエスト**:
```typescript
interface PresetSuggestRequest {
  residentId: string;
  itemName: string;
  category?: ItemCategory;
}
```

**レスポンス**:
```typescript
interface PresetSuggestResponse {
  success: boolean;
  data?: PresetSuggestion[];
  error?: string;
}

interface PresetSuggestion {
  presetId: string;           // プリセットID
  presetName: string;         // プリセット名
  matchReason: string;        // マッチ理由（表示用）
  matchType: 'category' | 'itemName' | 'keyword';  // マッチタイプ
  confidence: number;         // マッチ度（0-1）
  instruction: {
    title: string;            // 指示タイトル
    content: string;          // 指示内容
    servingMethod?: ServingMethod;  // 提供方法（あれば）
    servingDetail?: string;   // 提供詳細（あれば）
  };
}
```

#### マッチングロジック

```typescript
// functions/src/functions/getPresetSuggestions.ts

function matchPresets(
  presets: CareInstruction[],
  itemName: string,
  category?: ItemCategory
): PresetSuggestion[] {
  const suggestions: PresetSuggestion[] = [];

  for (const preset of presets) {
    // 1. カテゴリマッチ
    if (category && preset.targetCategories?.includes(category)) {
      suggestions.push({
        presetId: preset.id,
        presetName: preset.presetName || preset.title,
        matchReason: `カテゴリ「${CATEGORY_LABELS[category]}」`,
        matchType: 'category',
        confidence: 0.8,
        instruction: {
          title: preset.title,
          content: preset.content,
          servingMethod: preset.servingMethod,
          servingDetail: preset.servingDetail,
        },
      });
    }

    // 2. 品物名マッチ（キーワード部分一致）
    if (preset.keywords?.some(kw => itemName.includes(kw) || kw.includes(itemName))) {
      suggestions.push({
        presetId: preset.id,
        presetName: preset.presetName || preset.title,
        matchReason: `品物名「${itemName}」`,
        matchType: 'itemName',
        confidence: 0.9,
        instruction: {
          title: preset.title,
          content: preset.content,
          servingMethod: preset.servingMethod,
          servingDetail: preset.servingDetail,
        },
      });
    }

    // 3. コンテンツキーワードマッチ
    if (preset.content.includes(itemName)) {
      suggestions.push({
        presetId: preset.id,
        presetName: preset.presetName || preset.title,
        matchReason: `指示内容に「${itemName}」を含む`,
        matchType: 'keyword',
        confidence: 0.7,
        instruction: {
          title: preset.title,
          content: preset.content,
          servingMethod: preset.servingMethod,
          servingDetail: preset.servingDetail,
        },
      });
    }
  }

  // confidence降順でソート、最大3件
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
```

### 9.5 データモデル拡張

#### CareInstruction（プリセット）拡張

```typescript
// 既存の CareInstruction に追加
interface CareInstruction {
  // ... 既存フィールド

  // プリセットマッチング用（新規追加）
  targetCategories?: ItemCategory[];  // 対象カテゴリ
  keywords?: string[];                // マッチキーワード
  servingMethod?: ServingMethod;      // 提供方法
  servingDetail?: string;             // 提供詳細
}
```

#### CareItemInput 拡張

```typescript
// 既存の CareItemInput に追加
interface CareItemInput {
  // ... 既存フィールド

  // 指示の出所追跡（新規追加）
  appliedPresetIds?: string[];        // 適用したプリセットID群
  aiSuggestionApplied?: boolean;      // AI提案適用フラグ
  instructionSource?: 'ai' | 'preset' | 'manual' | 'mixed';  // 指示の出所
}
```

### 9.6 フロントエンド実装

#### PresetSuggestion コンポーネント

```typescript
// frontend/src/components/family/PresetSuggestion.tsx

interface PresetSuggestionProps {
  suggestions: PresetSuggestion[] | null;
  isLoading: boolean;
  onApply: (suggestion: PresetSuggestion) => void;
}

function PresetSuggestion({ suggestions, isLoading, onApply }: PresetSuggestionProps) {
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-amber-600">
          <span className="animate-pulse">📌</span>
          <span className="text-sm">いつもの指示を検索中...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleApply = (suggestion: PresetSuggestion) => {
    onApply(suggestion);
    setAppliedIds(prev => new Set([...prev, suggestion.presetId]));
  };

  return (
    <div className="mt-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📌</span>
          <span className="text-sm font-medium text-amber-800">いつもの指示</span>
          <span className="text-xs text-amber-600 ml-auto">{suggestions.length}件</span>
        </div>
      </div>

      {/* プリセット一覧 */}
      <div className="divide-y divide-amber-100">
        {suggestions.map((suggestion) => (
          <div key={suggestion.presetId} className="p-3">
            <div className="flex items-start gap-2">
              <span className="text-gray-500">
                {suggestion.matchType === 'category' ? '🏷️' :
                 suggestion.matchType === 'itemName' ? '📝' : '🔍'}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">
                  {suggestion.instruction.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {suggestion.matchReason}
                </p>
                {suggestion.instruction.content && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {suggestion.instruction.content}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleApply(suggestion)}
              disabled={appliedIds.has(suggestion.presetId)}
              className={`mt-2 w-full py-1.5 text-xs font-medium rounded transition-all ${
                appliedIds.has(suggestion.presetId)
                  ? 'bg-green-500 text-white cursor-default'
                  : 'bg-amber-500 hover:bg-amber-600 text-white active:scale-95'
              }`}
            >
              {appliedIds.has(suggestion.presetId) ? '✓ 適用済み' : 'この指示を適用'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### usePresetSuggestions フック

```typescript
// frontend/src/hooks/usePresetSuggestions.ts

import { useQuery } from '@tanstack/react-query';
import { getPresetSuggestions } from '../api';

interface UsePresetSuggestionsOptions {
  minLength?: number;
  debounceMs?: number;
}

export function usePresetSuggestions(
  residentId: string,
  itemName: string,
  category?: ItemCategory,
  options: UsePresetSuggestionsOptions = {}
) {
  const { minLength = 2, debounceMs = 500 } = options;
  const [debouncedName, setDebouncedName] = useState(itemName);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(itemName);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [itemName, debounceMs]);

  return useQuery({
    queryKey: ['presetSuggestions', residentId, debouncedName, category],
    queryFn: () => getPresetSuggestions({ residentId, itemName: debouncedName, category }),
    enabled: debouncedName.length >= minLength && !!residentId,
    staleTime: 1000 * 60 * 5, // 5分キャッシュ
  });
}
```

#### ItemForm.tsx 統合

```typescript
// frontend/src/pages/family/ItemForm.tsx（抜粋）

// フック追加
const {
  data: presetSuggestions,
  isLoading: isPresetLoading,
} = usePresetSuggestions(DEMO_RESIDENT_ID, formData.itemName, formData.category);

// プリセット適用ハンドラ追加
const handleApplyPreset = useCallback((preset: PresetSuggestion) => {
  setFormData((prev) => ({
    ...prev,
    // 提供方法（あれば）
    ...(preset.instruction.servingMethod && {
      servingMethod: preset.instruction.servingMethod,
    }),
    // 提供方法の詳細（あれば）
    ...(preset.instruction.servingDetail && {
      servingMethodDetail: preset.instruction.servingDetail,
    }),
    // スタッフへの申し送り（指示内容を追加）
    noteToStaff: prev.noteToStaff
      ? `${prev.noteToStaff}\n\n【いつもの指示】${preset.instruction.content}`
      : `【いつもの指示】${preset.instruction.content}`,
    // 適用済みプリセットID記録
    appliedPresetIds: [...(prev.appliedPresetIds || []), preset.presetId],
    // 指示の出所更新
    instructionSource: prev.aiSuggestionApplied ? 'mixed' : 'preset',
  }));
}, []);

// JSX（品物名入力の下に追加）
<AISuggestion
  suggestion={suggestion}
  isLoading={isAISuggesting}
  warning={aiWarning}
  onApply={handleApplySuggestion}
/>
<PresetSuggestion
  suggestions={presetSuggestions?.data}
  isLoading={isPresetLoading}
  onApply={handleApplyPreset}
/>
```

### 9.7 統合UI仕様

#### 表示順序

```
品物名入力欄
    │
    ├── AI提案カード（紫/青グラデーション）
    │     └── 賞味期限・保存方法・提供方法
    │
    └── プリセット提案カード（琥珀/オレンジグラデーション）
          └── マッチしたプリセット一覧
```

#### 併用時の動作

| 操作 | instructionSource |
|------|-------------------|
| AI提案のみ適用 | `'ai'` |
| プリセットのみ適用 | `'preset'` |
| 両方適用 | `'mixed'` |
| 手動入力のみ | `'manual'` |

#### 矛盾検出（将来実装）

AI提案とプリセットで矛盾がある場合の警告表示:

```
⚠️ 注意: AIは「冷蔵」、プリセットは「常温」を推奨しています
```

### 9.8 実装チェックリスト

**バックエンド**:
- [ ] `getPresetSuggestions.ts` 新規作成
- [ ] `functions/src/index.ts` にエクスポート追加
- [ ] `CareInstruction` 型拡張（targetCategories, keywords）
- [ ] Firestoreインデックス追加（必要に応じて）

**フロントエンド**:
- [ ] `PresetSuggestion.tsx` 新規作成
- [ ] `usePresetSuggestions.ts` 新規作成
- [ ] `api/index.ts` にAPI関数追加
- [ ] `ItemForm.tsx` 統合
- [ ] `CareItemInput` 型拡張

**テスト**:
- [ ] プリセットなしの場合の表示確認
- [ ] AI提案のみの場合の動作確認
- [ ] プリセットのみの場合の動作確認
- [ ] 両方適用の場合の動作確認
- [ ] 空白残りなしの確認

---

## 10. AI自動ストック化（Phase 8.7）

### 10.1 概要

AI提案を適用した際に、その設定を「いつもの指示（プリセット）」として保存する機能です。

**詳細設計**: [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md)

### 10.2 ユーザーフロー

```
1. 品物登録フォームで品物名入力（例: りんご）
2. AI提案カードが表示される
3. 「この提案を適用」をタップ
4. 保存ダイアログが表示:

   ┌──────────────────────────────────────────────┐
   │ この設定を「いつもの指示」として保存しますか？ │
   ├──────────────────────────────────────────────┤
   │                                              │
   │ 🍎 りんご                                     │
   │ ───────────────────────────────────────────  │
   │ 賞味期限: 7日                                 │
   │ 保存方法: 冷蔵                                │
   │ 提供方法: カット、皮むき                       │
   │ 注意: 皮をむいて食べやすい大きさにカット       │
   │                                              │
   │ プリセット名                                  │
   │ ┌──────────────────────────────────────────┐ │
   │ │ りんご（カット・皮むき）                  │ │
   │ └──────────────────────────────────────────┘ │
   │                                              │
   │ ┌──────────────┐  ┌──────────────┐          │
   │ │  今回だけ    │  │ 保存して適用  │          │
   │ └──────────────┘  └──────────────┘          │
   └──────────────────────────────────────────────┘

5. 「保存して適用」をタップ
6. Firestore care_presets に保存（source: 'ai'）
7. フォームに適用 + 完了トースト
```

### 10.3 API仕様

#### AI提案をプリセットとして保存

```
POST /saveAISuggestionAsPreset
```

**リクエスト**:
```typescript
interface SaveAISuggestionAsPresetRequest {
  residentId: string;
  userId: string;

  // プリセット基本情報
  name: string;                // ユーザーが入力した名前
  category: PresetCategory;
  icon?: string;
  keywords: string[];          // マッチングキーワード

  // 元のAI提案情報
  originalItemName: string;    // 品物名
  originalSuggestion: {
    expirationDays: number;
    storageMethod: StorageMethod;
    servingMethods: ServingMethod[];
    notes?: string;
  };

  // カスタマイズした指示内容（オプション）
  customInstruction?: {
    content: string;
    servingMethod?: ServingMethod;
    servingDetail?: string;
  };
}
```

**レスポンス**:
```typescript
interface SaveAISuggestionAsPresetResponse {
  success: boolean;
  data?: {
    presetId: string;
    createdAt: string;
  };
  error?: string;
}
```

### 10.4 保存されるプリセットデータ

```typescript
// Firestore care_presets/{presetId}
{
  id: "preset-ai-xxxxx",
  residentId: "resident-001",
  name: "りんご（カット・皮むき）",
  category: "cut",
  icon: "🍎",
  instruction: {
    content: "皮をむいて食べやすい大きさにカットしてください。",
    servingMethod: "cut",
    servingDetail: "5mm程度の薄切り"
  },
  matchConfig: {
    keywords: ["りんご", "リンゴ", "apple"],
    categories: ["fruit"]
  },
  source: "ai",                    // ← AI登録であることを示す
  aiSourceInfo: {                   // ← 元のAI提案情報
    originalItemName: "りんご",
    originalSuggestion: {
      expirationDays: 7,
      storageMethod: "refrigerated",
      servingMethods: ["cut", "peeled"],
      notes: "皮をむいて食べやすい大きさにカットしてください。"
    },
    savedAt: "2025-12-16T10:30:00Z"
  },
  isActive: true,
  usageCount: 0,
  createdAt: "2025-12-16T10:30:00Z",
  updatedAt: "2025-12-16T10:30:00Z",
  createdBy: "family-001"
}
```

### 10.5 フロントエンド実装

#### SaveAISuggestionDialog コンポーネント

```typescript
// frontend/src/components/family/SaveAISuggestionDialog.tsx

interface SaveAISuggestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onApplyOnly: () => void;
  itemName: string;
  suggestion: AISuggestResponse;
}

function SaveAISuggestionDialog({
  isOpen,
  onClose,
  onSave,
  onApplyOnly,
  itemName,
  suggestion,
}: SaveAISuggestionDialogProps) {
  const [presetName, setPresetName] = useState(
    `${itemName}（${SERVING_METHOD_LABELS[suggestion.servingMethods[0]] || 'カスタム'}）`
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(presetName);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-[90%] max-w-md p-5 shadow-xl">
        <h2 className="text-lg font-bold text-center mb-4">
          この設定を「いつもの指示」として保存しますか？
        </h2>

        {/* AI提案サマリ */}
        <div className="bg-purple-50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span>🤖</span>
            <span className="font-medium">{itemName}</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>📅 賞味期限: {suggestion.expirationDays}日</p>
            <p>🧊 保存方法: {STORAGE_METHOD_LABELS[suggestion.storageMethod]}</p>
            <p>🍴 提供方法: {suggestion.servingMethods.map(m => SERVING_METHOD_LABELS[m]).join('、')}</p>
            {suggestion.notes && <p>⚠️ 注意: {suggestion.notes}</p>}
          </div>
        </div>

        {/* プリセット名入力 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            プリセット名
          </label>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="例: りんご（カット・皮むき）"
          />
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={onApplyOnly}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700"
          >
            今回だけ
          </button>
          <button
            onClick={handleSave}
            disabled={!presetName.trim() || isSaving}
            className="flex-1 py-2.5 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存して適用'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### ItemForm.tsx 統合

```typescript
// AI提案適用時の処理を修正
const handleApplySuggestion = useCallback((aiSuggestion: AISuggestResponse) => {
  // 保存ダイアログを表示
  setShowSaveDialog(true);
  setPendingSuggestion(aiSuggestion);
}, []);

// 「保存して適用」
const handleSaveAndApply = async (presetName: string) => {
  if (!pendingSuggestion) return;

  // プリセットとして保存
  await saveAISuggestionAsPreset({
    residentId: DEMO_RESIDENT_ID,
    userId: DEMO_USER_ID,
    name: presetName,
    category: 'cut', // デフォルトまたはユーザー選択
    keywords: [formData.itemName],
    originalItemName: formData.itemName,
    originalSuggestion: pendingSuggestion,
  });

  // フォームに適用
  applyToForm(pendingSuggestion);

  // ダイアログを閉じる
  setShowSaveDialog(false);
  setPendingSuggestion(null);
};

// 「今回だけ」
const handleApplyOnly = () => {
  if (pendingSuggestion) {
    applyToForm(pendingSuggestion);
  }
  setShowSaveDialog(false);
  setPendingSuggestion(null);
};
```

### 10.6 出所バッジ表示

プリセット一覧・プリセット候補で出所を明示的に表示:

| 出所 | バッジ表示 | 背景色 |
|------|-----------|--------|
| 手動登録 | 📌 手動登録 | `bg-gray-100` |
| AI提案から | 🤖 AI提案から保存（日時） | `bg-purple-100` |

```typescript
// PresetSuggestion.tsx の出所バッジ
{suggestion.source === 'ai' ? (
  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
    🤖 AI提案から保存
  </span>
) : (
  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
    📌 手動登録
  </span>
)}
```

### 10.7 実装チェックリスト

**バックエンド**:
- [ ] `saveAISuggestionAsPreset.ts` 新規作成
- [ ] `functions/src/index.ts` にエクスポート追加
- [ ] `CarePreset` 型に `aiSourceInfo` フィールド追加

**フロントエンド**:
- [ ] `SaveAISuggestionDialog.tsx` 新規作成
- [ ] `ItemForm.tsx` にダイアログ統合
- [ ] `api/index.ts` に `saveAISuggestionAsPreset` 関数追加
- [ ] `PresetSuggestion.tsx` に出所バッジ追加

**テスト**:
- [ ] AI提案→保存フローの動作確認
- [ ] 保存したプリセットが候補に表示されることの確認
- [ ] 出所バッジの表示確認
- [ ] 「今回だけ」選択時に保存されないことの確認

---

## 11. 参照資料

- [USER_ROLE_SPEC.md](./USER_ROLE_SPEC.md) - ユーザーロール・権限設計
- [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) - 品物管理詳細設計
- [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) - 統計ダッシュボード設計
- [MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md](./MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md) - MoE複眼チェック分析
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini)
