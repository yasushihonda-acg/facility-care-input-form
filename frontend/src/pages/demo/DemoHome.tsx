/**
 * デモホームページ - 家族向け特化版
 * @see docs/DEMO_FAMILY_REDESIGN.md
 *
 * 家族向けデモのエントリポイント。
 * テーマ: 「離れて暮らす親御さんのケアを見守る」
 */

import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';

interface DemoCardProps {
  title: string;
  description: string;
  icon: string;
  to: string;
}

function DemoCard({ title, description, icon, to }: DemoCardProps) {
  return (
    <Link
      to={to}
      className="block bg-white rounded-lg shadow-card p-4 border border-gray-100 hover:shadow-md hover:border-blue-200 transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export function DemoHome() {
  return (
    <Layout
      title="家族向けデモ"
      subtitle="離れて暮らす親御さんのケアを見守る"
      showBackButton={false}
    >
      <div className="pb-4 space-y-4">
        {/* ヘッダーバナー */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👨‍👩‍👧</span>
            <h2 className="text-lg font-bold">ケアみまもりアプリ</h2>
          </div>
          <p className="text-sm opacity-90 mb-3">
            施設への差し入れ管理から、食事の様子の確認まで。
            離れていても安心のケアサポートです。
          </p>
          <Link
            to="/demo/showcase"
            className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition"
          >
            使い方ツアーを開始
            <span className="ml-1">→</span>
          </Link>
        </div>

        {/* 機能カード一覧 */}
        <div className="space-y-3">
          <DemoCard
            title="品物を登録する"
            description="差し入れ品を登録・管理"
            icon="📦"
            to="/demo/family/items"
          />

          <DemoCard
            title="今日の様子を確認"
            description="タイムラインで食事状況をチェック"
            icon="📅"
            to="/demo/family"
          />

          <DemoCard
            title="いつもの指示を設定"
            description="よく使う提供方法をプリセット保存"
            icon="⭐"
            to="/demo/family/presets"
          />

          <DemoCard
            title="入居者設定"
            description="禁止品目などを設定"
            icon="⚙️"
            to="/demo/family/settings/resident"
          />

          <DemoCard
            title="傾向を分析"
            description="摂食傾向をグラフで確認"
            icon="📊"
            to="/demo/stats"
          />
        </div>

        {/* 説明セクション */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="flex items-center gap-2 font-medium text-amber-800 mb-2">
            <span>💡</span>
            デモモードについて
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• サンプルデータで機能を体験できます</li>
            <li>• 本番データには<strong>影響しません</strong></li>
            <li>• 実際の使い方をイメージしやすい内容です</li>
          </ul>
        </div>

        {/* 本番モードへのリンク */}
        <div className="text-center pt-2">
          <Link
            to="/"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
          >
            <span className="mr-1">←</span>
            本番モードへ戻る
          </Link>
        </div>
      </div>
    </Layout>
  );
}
