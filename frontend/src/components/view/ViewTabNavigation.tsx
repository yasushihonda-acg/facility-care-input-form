/**
 * ViewTabNavigation - 記録閲覧ページのメインタブナビゲーション
 * データ / 相関分析 / グラフ / 画像 の4タブを切り替える
 */

export type ViewTabType = 'data' | 'correlation' | 'charts' | 'images';

interface ViewTabNavigationProps {
  activeTab: ViewTabType;
  onTabChange: (tab: ViewTabType) => void;
}

const VIEW_TABS: { id: ViewTabType; label: string; icon: string }[] = [
  { id: 'data', label: 'データ', icon: '📊' },
  { id: 'correlation', label: '相関分析', icon: '🔗' },
  { id: 'charts', label: 'グラフ', icon: '📈' },
  { id: 'images', label: '画像', icon: '🖼️' },
];

export function ViewTabNavigation({ activeTab, onTabChange }: ViewTabNavigationProps) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      <div className="flex justify-center gap-1 sm:gap-2 p-2">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2
              px-2.5 sm:px-4 py-1.5 sm:py-2
              text-xs sm:text-sm font-medium rounded-lg transition-all
              min-w-[52px] sm:min-w-0
              ${activeTab === tab.id
                ? 'bg-primary text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }
            `}
          >
            <span className="text-base sm:text-sm">{tab.icon}</span>
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
