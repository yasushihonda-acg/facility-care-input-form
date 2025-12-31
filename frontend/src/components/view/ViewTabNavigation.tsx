/**
 * ViewTabNavigation - 記録閲覧ページのメインタブナビゲーション
 * データ / 相関分析 / グラフ の3タブを切り替える
 */

export type ViewTabType = 'data' | 'correlation' | 'charts';

interface ViewTabNavigationProps {
  activeTab: ViewTabType;
  onTabChange: (tab: ViewTabType) => void;
}

const VIEW_TABS: { id: ViewTabType; label: string; icon: string }[] = [
  { id: 'data', label: 'データ', icon: '📊' },
  { id: 'correlation', label: '相関分析', icon: '🔗' },
  { id: 'charts', label: 'グラフ', icon: '📈' },
];

export function ViewTabNavigation({ activeTab, onTabChange }: ViewTabNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      <div className="flex justify-center gap-2 p-2">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
              ${activeTab === tab.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
