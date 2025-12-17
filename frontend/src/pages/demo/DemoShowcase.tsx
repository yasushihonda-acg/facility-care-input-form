/**
 * デモショーケース（ガイド付きツアー）
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション5.2
 *
 * プレゼン時に順番に機能を紹介するステップ形式のガイド
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';

interface ShowcaseStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  path: string;
  highlights: string[];
}

const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    id: 1,
    title: '家族による品物登録',
    description: '家族が入居者への差し入れを登録します',
    icon: '📦',
    path: '/demo/family/items/new',
    highlights: [
      '品物名・カテゴリ・数量を入力',
      '賞味期限・保存方法を指定',
      'AIによる入力補助機能',
    ],
  },
  {
    id: 2,
    title: 'スタッフの家族連絡確認',
    description: 'スタッフが家族からの品物情報を確認します',
    icon: '📋',
    path: '/demo/staff/family-messages',
    highlights: [
      '新着の品物一覧',
      '賞味期限アラート表示',
      '提供指示の確認',
    ],
  },
  {
    id: 3,
    title: '品物の提供・摂食記録',
    description: 'スタッフが提供と摂食状況を記録します',
    icon: '🍽️',
    path: '/demo/staff/family-messages/demo-item-001',
    highlights: [
      '提供数量の入力',
      '摂食率の記録',
      '家族への申し送りメモ',
    ],
  },
  {
    id: 4,
    title: '家族への結果共有',
    description: '家族がタイムラインで結果を確認します',
    icon: '👨‍👩‍👧',
    path: '/demo/family',
    highlights: [
      '今日の食事タイムライン',
      '写真付きエビデンス',
      'スタッフからの申し送り',
    ],
  },
  {
    id: 5,
    title: '摂食傾向の確認',
    description: 'よく食べる/残す品目を確認します',
    icon: '📊',
    path: '/demo/stats',
    highlights: [
      'よく食べる品目 TOP5',
      'よく残す品目 TOP5',
      'カテゴリ別摂食率',
    ],
  },
  {
    id: 6,
    title: '在庫状況の確認',
    description: '品物の残量・期限を一覧で確認します',
    icon: '📈',
    path: '/demo/stats',
    highlights: [
      '品物サマリー',
      '賞味期限カレンダー',
      '期限切れアラート',
    ],
  },
];

export function DemoShowcase() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const step = SHOWCASE_STEPS[currentStep];
  const progress = ((currentStep + 1) / SHOWCASE_STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < SHOWCASE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGo = () => {
    navigate(step.path);
  };

  return (
    <Layout
      title="ガイド付きツアー"
      subtitle={`ステップ ${currentStep + 1}/${SHOWCASE_STEPS.length}`}
      showBackButton
    >
      <div className="pb-4 space-y-4">
        {/* プログレスバー */}
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ステップカード */}
        <div className="bg-white rounded-lg shadow-card p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{step.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{step.title}</h2>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">この画面のポイント</h3>
            <ul className="space-y-1">
              {step.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="text-green-500 mt-0.5">✓</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>

          {/* アクションボタン */}
          <button
            onClick={handleGo}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
          >
            この機能を見る →
          </button>
        </div>

        {/* ナビゲーション */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ← 前へ
          </button>

          <div className="flex gap-1">
            {SHOWCASE_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition ${
                  idx === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStep === SHOWCASE_STEPS.length - 1}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              currentStep === SHOWCASE_STEPS.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            次へ →
          </button>
        </div>

        {/* ステップ一覧（折りたたみ） */}
        <details className="bg-white rounded-lg shadow-card border border-gray-100">
          <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
            全ステップ一覧
          </summary>
          <div className="border-t border-gray-100 p-4 space-y-2">
            {SHOWCASE_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`w-full text-left p-2 rounded flex items-center gap-2 transition ${
                  idx === currentStep
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span>{s.icon}</span>
                <span className="text-sm">
                  {s.id}. {s.title}
                </span>
                {idx === currentStep && (
                  <span className="ml-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                    現在
                  </span>
                )}
              </button>
            ))}
          </div>
        </details>

        {/* デモホームへ戻る */}
        <div className="text-center pt-2">
          <Link
            to="/demo"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
          >
            <span className="mr-1">←</span>
            デモホームへ戻る
          </Link>
        </div>
      </div>
    </Layout>
  );
}
