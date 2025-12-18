/**
 * AI摂食傾向分析コンポーネント (Phase 8.4)
 * @see docs/AI_INTEGRATION_SPEC.md セクション3.2
 */

import { useState } from 'react';
import { aiAnalyze } from '../../api';
import type {
  AIAnalyzeResponse,
  AIFinding,
  AISuggestion,
  AIConsumptionRecord,
} from '../../types/careItem';
import {
  FINDING_TYPE_CONFIG,
  SUGGESTION_PRIORITY_CONFIG,
} from '../../types/careItem';

interface AIAnalysisProps {
  residentId: string;
  consumptionData?: AIConsumptionRecord[];
  period?: {
    startDate: string;
    endDate: string;
  };
}

export function AIAnalysis({ residentId, consumptionData, period }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AIAnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setWarning(null);

    try {
      // デフォルト期間: 過去30日
      const endDate = period?.endDate || new Date().toISOString().split('T')[0];
      const startDate = period?.startDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
      })();

      const response = await aiAnalyze({
        residentId,
        analysisType: 'consumption',
        period: { startDate, endDate },
        data: consumptionData ? { consumptionRecords: consumptionData } : undefined,
      });

      if (response.success && response.data) {
        setAnalysis(response.data);
        // 警告がある場合
        if ('warning' in response) {
          setWarning((response as { warning?: string }).warning || null);
        }
      } else {
        setError('分析結果の取得に失敗しました');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <span className="text-lg">🤖</span>
          AI分析
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg transition-all
            ${isLoading
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-purple-500 text-white hover:bg-purple-600 active:scale-95'
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin">⏳</span>
              分析中...
            </span>
          ) : analysis ? (
            '再分析'
          ) : (
            '分析を開始'
          )}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 警告表示 */}
      {warning && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <p className="text-sm text-yellow-700">
            <span className="mr-1">⚠️</span>
            {warning}
          </p>
        </div>
      )}

      {/* 分析結果なし */}
      {!analysis && !isLoading && !error && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">「分析を開始」ボタンをクリックすると</p>
          <p className="text-sm">AIが摂食傾向を分析します</p>
        </div>
      )}

      {/* 分析結果 */}
      {analysis && (
        <div className="space-y-4">
          {/* サマリ */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>

          {/* 発見事項 */}
          {analysis.findings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                <span>📋</span>
                発見事項
              </h4>
              <div className="space-y-2">
                {analysis.findings.map((finding, index) => (
                  <FindingCard key={index} finding={finding} />
                ))}
              </div>
            </div>
          )}

          {/* 改善提案 */}
          {analysis.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                <span>💡</span>
                改善提案
              </h4>
              <div className="space-y-2">
                {analysis.suggestions.map((suggestion, index) => (
                  <SuggestionCard key={index} suggestion={suggestion} />
                ))}
              </div>
            </div>
          )}

          {/* データなし時のメッセージ */}
          {analysis.findings.length === 0 && analysis.suggestions.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">特に注目すべき傾向は見つかりませんでした</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 発見事項カード
// =============================================================================

interface FindingCardProps {
  finding: AIFinding;
}

function FindingCard({ finding }: FindingCardProps) {
  const config = FINDING_TYPE_CONFIG[finding.type];

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.color}`}>{finding.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{finding.description}</p>
          {finding.metric && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="px-2 py-0.5 bg-white rounded">
                現在: {finding.metric.current}%
              </span>
              {finding.metric.previous !== undefined && (
                <span className="px-2 py-0.5 bg-white rounded">
                  前回: {finding.metric.previous}%
                </span>
              )}
              {finding.metric.change !== undefined && (
                <span className={`px-2 py-0.5 rounded ${
                  finding.metric.change > 0 ? 'bg-green-100 text-green-700' :
                  finding.metric.change < 0 ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {finding.metric.change > 0 ? '+' : ''}{finding.metric.change}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 改善提案カード
// =============================================================================

interface SuggestionCardProps {
  suggestion: AISuggestion;
}

function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const config = SUGGESTION_PRIORITY_CONFIG[suggestion.priority];

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{config.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.color}`}>{suggestion.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{suggestion.description}</p>
          {suggestion.relatedItemName && (
            <span className="inline-block mt-1.5 px-2 py-0.5 bg-white text-xs text-gray-500 rounded">
              関連品目: {suggestion.relatedItemName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
