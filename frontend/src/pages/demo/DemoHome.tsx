/**
 * デモホームページ
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション5
 *
 * デモモードのエントリポイント。機能一覧と説明を表示します。
 */

import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';

interface DemoCardProps {
  title: string;
  description: string;
  icon: string;
  links: { label: string; to: string }[];
}

function DemoCard({ title, description, icon, links }: DemoCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-card p-4 border border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DemoHome() {
  return (
    <Layout
      title="デモモード"
      subtitle="機能を安全にお試しいただけます"
      showBackButton={false}
    >
      <div className="pb-4 space-y-4">
        {/* ヘッダーバナー */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎯</span>
            <h2 className="text-lg font-bold">デモショーケース</h2>
          </div>
          <p className="text-sm opacity-90 mb-3">
            サンプルデータで各機能をご確認いただけます。
            本番データには影響しません。
          </p>
          <Link
            to="/demo/showcase"
            className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-50 transition"
          >
            ガイド付きツアーを開始
            <span className="ml-1">→</span>
          </Link>
        </div>

        {/* 機能カード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DemoCard
            title="品物管理"
            description="品物の登録・提供・摂食記録をお試しいただけます"
            icon="📦"
            links={[
              { label: '家族視点', to: '/demo/family/items' },
              { label: 'スタッフ視点', to: '/demo/staff/family-messages' },
            ]}
          />

          <DemoCard
            title="統計ダッシュボード"
            description="摂食傾向・在庫サマリーをグラフで確認"
            icon="📊"
            links={[
              { label: 'ダッシュボード', to: '/demo/stats' },
            ]}
          />

          <DemoCard
            title="タスク管理"
            description="期限アラート・提供リマインダーを確認"
            icon="✅"
            links={[
              { label: 'タスク一覧', to: '/demo/family/tasks' },
              { label: 'スタッフホーム', to: '/demo/staff' },
            ]}
          />

          <DemoCard
            title="家族ホーム"
            description="タイムライン・エビデンス確認"
            icon="👨‍👩‍👧"
            links={[
              { label: '家族ダッシュボード', to: '/demo/family' },
            ]}
          />
        </div>

        {/* 説明セクション */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="flex items-center gap-2 font-medium text-amber-800 mb-2">
            <span>💡</span>
            デモモードについて
          </h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• 本番データには<strong>影響しません</strong></li>
            <li>• サンプルデータで機能を確認できます</li>
            <li>• オフラインでも動作します</li>
            <li>• プレゼンテーション用に最適化されています</li>
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
