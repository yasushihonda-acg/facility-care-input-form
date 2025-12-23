/**
 * スタッフ用デモショーケース（ガイド付きツアー）
 *
 * スタッフの使い方に沿ったストーリー仕立てのガイド
 * テーマ: 「家族から送られた品物を確認し、ケア記録をつける」
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';

interface ShowcaseStep {
  id: number;
  title: string;
  description: string;
  story: string;
  icon: string;
  path: string;
  highlights: string[];
}

const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    id: 1,
    title: '注意事項を確認',
    description: 'スタッフ間の申し送り・注意事項を確認します',
    story: '朝の申し送り。蒲地様の食事に関する注意事項を確認しましょう',
    icon: '📋',
    path: '/demo/staff/notes',
    highlights: [
      '重要な注意事項（常時表示）を確認',
      '期間限定の申し送りを把握',
      '家族からの依頼（タスク）を確認',
    ],
  },
  {
    id: 2,
    title: '家族依頼を確認',
    description: '家族から送られた品物・指示を確認します',
    story: '蒲地様のご家族から新しい差し入れが届いています。指示を確認しましょう',
    icon: '📦',
    path: '/demo/staff/notes',
    highlights: [
      '家族からのタスク一覧を確認',
      '品物の提供指示を把握',
      '残り対応の指示（破棄/保存）を確認',
    ],
  },
  {
    id: 3,
    title: '食事記録を入力',
    description: '食事・間食の提供記録を入力します',
    story: 'おやつの時間。蒲地様に羊羹をお出ししました。記録をつけましょう',
    icon: '🍽️',
    path: '/demo/staff/input/meal',
    highlights: [
      '朝食・昼食・夕食・間食を記録',
      '摂食状況（0-10割）を入力',
      '家族の指示に従った残り対応を記録',
      '家族が送った品物を選んで記録',
    ],
  },
  {
    id: 4,
    title: '統計を確認',
    description: '摂食傾向や在庫状況を確認します',
    story: '蒲地様は最近どんなものをよく召し上がっているかな',
    icon: '📊',
    path: '/demo/stats',
    highlights: [
      'よく食べる品目 TOP5',
      '在庫状況（残量・期限）を把握',
      'カテゴリ別の摂食傾向',
    ],
  },
];

export function DemoStaffShowcase() {
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
      title="スタッフ用ガイドツアー"
      subtitle={`ステップ ${currentStep + 1}/${SHOWCASE_STEPS.length}`}
      showBackButton
    >
      <div className="pb-4 space-y-4">
        {/* プログレスバー */}
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-500 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* ステップカード */}
        <div className="bg-white rounded-lg shadow-card p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{step.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{step.title}</h2>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          </div>

          {/* ストーリー（感情移入用） */}
          <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-4 rounded-r">
            <p className="text-sm text-green-800 italic">"{step.story}"</p>
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
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
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
                  idx === currentStep ? 'bg-green-500' : 'bg-gray-300'
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
                : 'bg-green-500 text-white hover:bg-green-600'
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
                    ? 'bg-green-50 text-green-700'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span>{s.icon}</span>
                <span className="text-sm">
                  {s.id}. {s.title}
                </span>
                {idx === currentStep && (
                  <span className="ml-auto text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    現在
                  </span>
                )}
              </button>
            ))}
          </div>
        </details>

        {/* スタッフデモホームへ戻る */}
        <div className="text-center pt-2">
          <Link
            to="/demo/staff"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
          >
            <span className="mr-1">←</span>
            スタッフデモホームへ戻る
          </Link>
        </div>
      </div>
    </Layout>
  );
}
