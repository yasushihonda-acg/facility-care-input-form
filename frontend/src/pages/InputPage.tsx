import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

interface InputCardProps {
  to: string;
  icon: string;
  title: string;
  description: string;
  disabled?: boolean;
}

function InputCard({ to, icon, title, description, disabled = false }: InputCardProps) {
  if (disabled) {
    return (
      <div className="bg-gray-100 rounded-xl p-4 flex flex-col items-center text-center opacity-60 cursor-not-allowed">
        <span className="text-4xl mb-2">{icon}</span>
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
        <span className="text-xs text-gray-400 mt-2 bg-gray-200 px-2 py-0.5 rounded">準備中</span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="bg-white rounded-xl p-4 flex flex-col items-center text-center shadow-card hover:shadow-card-hover transition-shadow active:scale-98"
    >
      <span className="text-4xl mb-2">{icon}</span>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </Link>
  );
}

export function InputPage() {
  const inputTypes = [
    {
      to: '/input/meal',
      icon: '🍽️',
      title: '食事記録',
      description: '朝食・昼食・夕食の摂取量を記録',
      disabled: false,
    },
    {
      to: '/input/hydration',
      icon: '💧',
      title: '水分記録',
      description: '水分摂取量を記録',
      disabled: true,
    },
    {
      to: '/input/excretion',
      icon: '🚻',
      title: '排泄記録',
      description: '排便・排尿の状態を記録',
      disabled: true,
    },
    {
      to: '/input/vital',
      icon: '❤️',
      title: 'バイタル記録',
      description: '体温・血圧・脈拍などを記録',
      disabled: true,
    },
    {
      to: '/input/note',
      icon: '📝',
      title: '特記事項',
      description: '特記事項・申し送りを記録',
      disabled: true,
    },
  ];

  return (
    <Layout>
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-4 shadow-header">
        <h1 className="text-lg font-bold">記録入力</h1>
        <p className="text-sm text-white/80 mt-0.5">入力する記録の種類を選択してください</p>
      </header>

      {/* 入力カードグリッド */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {inputTypes.map((item) => (
            <InputCard
              key={item.to}
              to={item.to}
              icon={item.icon}
              title={item.title}
              description={item.description}
              disabled={item.disabled}
            />
          ))}
        </div>

        {/* ヘルプテキスト */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>記録が完了すると自動的にSheet Bに送信されます</p>
        </div>
      </main>
    </Layout>
  );
}
