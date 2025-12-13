interface MonthFilterProps {
  selectedMonth: number | null; // null = 全月
  monthCounts: Record<number, number>; // 月番号 -> 件数
  onMonthChange: (month: number | null) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function MonthFilter({ selectedMonth, monthCounts, onMonthChange }: MonthFilterProps) {
  const totalCount = Object.values(monthCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="bg-white border-b border-gray-200 overflow-x-auto">
      <div className="flex min-w-max px-2 py-2 gap-1">
        {/* 全月ボタン */}
        <button
          onClick={() => onMonthChange(null)}
          className={`
            px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors
            ${selectedMonth === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          全月
          <span className="ml-1 text-xs opacity-75">({totalCount})</span>
        </button>

        {/* 各月ボタン */}
        {MONTHS.map((month) => {
          const count = monthCounts[month] || 0;
          const isSelected = selectedMonth === month;

          return (
            <button
              key={month}
              onClick={() => onMonthChange(month)}
              disabled={count === 0}
              className={`
                px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors
                ${isSelected
                  ? 'bg-blue-500 text-white'
                  : count > 0
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }
              `}
            >
              {month}月
              {count > 0 && (
                <span className="ml-1 text-xs opacity-75">({count})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
