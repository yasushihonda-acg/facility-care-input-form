/**
 * MealInputTabs - 食事記録入力のタブ切替コンポーネント
 * 設計書: docs/ITEM_BASED_SNACK_RECORD_SPEC.md セクション2.2
 */

export type MealInputTabType = 'meal' | 'item_based';

interface MealInputTabsProps {
  activeTab: MealInputTabType;
  onTabChange: (tab: MealInputTabType) => void;
}

export function MealInputTabs({ activeTab, onTabChange }: MealInputTabsProps) {
  const tabs: { id: MealInputTabType; label: string; icon: string }[] = [
    { id: 'meal', label: '食事', icon: '🍽️' },
    { id: 'item_based', label: '品物から記録', icon: '📦' },
  ];

  return (
    <div className="flex border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex-1 px-4 py-3 text-sm font-medium transition-colors
            flex items-center justify-center gap-2
            ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
