/**
 * デモショーケース（ガイド付きツアー）- 家族向け特化版
 * @see docs/DEMO_FAMILY_REDESIGN.md
 *
 * 家族の使い方に沿ったストーリー仕立てのガイド
 * テーマ: 「離れて暮らす親御さんへの差し入れを、施設スタッフと連携して見守る」
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';

interface ShowcaseStep {
  id: number;
  title: string;
  description: string;
  story: string; // ストーリー（感情移入用）
  icon: string;
  path: string;
  highlights: string[];
}

const SHOWCASE_STEPS: ShowcaseStep[] = [
  {
    id: 1,
    title: '品物を登録する',
    description: '差し入れ品を登録します',
    story: '週末に施設を訪問。お母さんの好きな羊羹を持っていきました',
    icon: '📦',
    path: '/demo/family/items/new',
    highlights: [
      '品物名・カテゴリ・数量を入力',
      '賞味期限・保存方法を指定',
      '残った場合の処置を事前指示',
      'AIが入力をサポート',
    ],
  },
  {
    id: 2,
    title: '登録した品物を確認',
    description: '現在の品物一覧を確認します',
    story: '今どんな品物が施設にあるか確認しましょう',
    icon: '📋',
    path: '/demo/family/items',
    highlights: [
      '在庫状況を一目で把握',
      '期限が近い品物にアラート',
      'カテゴリ別に絞り込み',
    ],
  },
  {
    id: 3,
    title: 'いつもの指示を設定',
    description: 'よく使う提供指示を登録します',
    story: '毎回同じ品物を持っていくので、よく使う指示を保存しておきます',
    icon: '⭐',
    path: '/demo/family/presets',
    highlights: [
      'よく持っていく品物をプリセット保存',
      'AI提案をワンクリックで保存',
      '次回からの入力がラクラク',
    ],
  },
  // Phase 26: 入居者設定削除
  // {
  //   id: 4,
  //   title: '入居者設定を確認',
  //   description: '禁止品目などを設定します',
  //   story: 'お母さんは甘すぎるお菓子が苦手なので、禁止設定をしておきます',
  //   icon: '⚙️',
  //   path: '/demo/family/settings/resident',
  //   highlights: [
  //     '禁止品目の登録',
  //     'スタッフに自動で警告表示',
  //     '家族の希望を確実に伝える',
  //   ],
  // },
  {
    id: 4,
    title: '今日の様子を確認',
    description: 'タイムラインで食事状況を確認',
    story: '今日の食事はどうだったかな？離れていても様子がわかります',
    icon: '👨‍👩‍👧',
    path: '/demo/family',
    highlights: [
      '朝食・昼食・夕食のタイムライン',
      '摂食率（完食/半分/残した）',
      'スタッフからのメモ',
    ],
  },
  {
    id: 5,
    title: '傾向を分析する',
    description: '統計で摂食傾向を確認します',
    story: '最近の傾向を見て、次回持っていくものを決めましょう',
    icon: '📊',
    path: '/demo/stats',
    highlights: [
      'よく食べる品目 TOP5',
      'よく残す品目 TOP5',
      'カテゴリ別摂食率グラフ',
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
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{step.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{step.title}</h2>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          </div>

          {/* ストーリー（感情移入用） */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4 rounded-r">
            <p className="text-sm text-blue-800 italic">"{step.story}"</p>
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
