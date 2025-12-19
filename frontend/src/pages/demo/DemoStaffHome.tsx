/**
 * スタッフ用デモホームページ
 * @see docs/DEMO_STAFF_SPEC.md
 *
 * スタッフ向けデモのエントリポイント。
 * テーマ: 「家族からの品物を確認し、ケア記録をつける」
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
      className="block bg-white rounded-lg shadow-card p-4 border border-gray-100 hover:shadow-md hover:border-green-200 transition"
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

export function DemoStaffHome() {
  return (
    <Layout
      title="スタッフ用デモ"
      subtitle="家族からの品物を確認し、ケア記録をつける"
      showBackButton={false}
    >
      <div className="pb-4 space-y-4">
        {/* ヘッダーバナー */}
        <div className="bg-gradient-to-r from-green-500 to-teal-600 rounded-lg p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👨‍⚕️</span>
            <h2 className="text-lg font-bold">スタッフ用デモ</h2>
          </div>
          <p className="text-sm opacity-90 mb-3">
            家族から送られた品物を確認し、入居者様へのケア記録をつけましょう。
            記録は家族にも共有され、安心につながります。
          </p>
          <Link
            to="/demo/staff/showcase"
            className="inline-flex items-center px-4 py-2 bg-white text-green-600 rounded-lg font-medium text-sm hover:bg-green-50 transition"
          >
            ガイド付きツアーを開始
            <span className="ml-1">→</span>
          </Link>
        </div>

        {/* 機能カード一覧 */}
        <div className="space-y-3">
          <DemoCard
            title="家族連絡を確認"
            description="家族から送られた品物・指示を確認"
            icon="📋"
            to="/demo/staff/family-messages"
          />

          <DemoCard
            title="食事記録を入力"
            description="食事・間食の提供記録を入力"
            icon="🍽️"
            to="/demo/staff/input/meal"
          />

          <DemoCard
            title="統計"
            description="摂食傾向や在庫状況を確認"
            icon="📊"
            to="/demo/stats"
          />

          <DemoCard
            title="記録閲覧"
            description="過去の記録を閲覧"
            icon="📖"
            to="/demo/view"
          />
        </div>

        {/* 説明セクション */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="flex items-center gap-2 font-medium text-green-800 mb-2">
            <span>💡</span>
            デモモードについて
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• サンプルデータで機能を体験できます</li>
            <li>• 本番データには<strong>影響しません</strong></li>
            <li>• 実際の業務フローをイメージできます</li>
          </ul>
        </div>

        {/* ナビゲーション */}
        <div className="flex justify-between items-center pt-2">
          <Link
            to="/demo"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
          >
            <span className="mr-1">←</span>
            家族用デモへ
          </Link>
          <Link
            to="/"
            className="inline-flex items-center text-gray-500 hover:text-gray-700 text-sm"
          >
            本番モードへ
            <span className="ml-1">→</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
