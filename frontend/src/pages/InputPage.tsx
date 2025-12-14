import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function InputPage() {
  return (
    <Layout>
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-4 shadow-header">
        <h1 className="text-lg font-bold">記録入力</h1>
        <p className="text-sm text-white/80 mt-0.5">入力する記録を選択してください</p>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 p-6 flex items-start justify-center">
        <div className="w-full max-w-sm">
          {/* 食事記録カード */}
          <Link
            to="/input/meal"
            className="block bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all active:scale-[0.98] border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800">食事記録</h2>
                <p className="text-sm text-gray-500 mt-1">朝食・昼食・夕食の摂取量を記録</p>
              </div>
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* ヘルプテキスト */}
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>記録が完了すると自動的にSheet Bに送信されます</p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
