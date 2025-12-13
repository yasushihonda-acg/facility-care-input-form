interface MonthFilterProps {
  selectedMonth: number | null; // null = 全月
  monthCounts: Record<number, number>; // 月番号 -> 件数
  onMonthChange: (month: number | null) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function MonthFilter({ selectedMonth, monthCounts, onMonthChange }: MonthFilterProps) {
  const totalCount = Object.values(monthCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="relative bg-white border-b border-gray-200">
      {/* スクロールヒント（グラデーション） */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />

      <div className="overflow-x-auto">
        <div className="flex min-w-max px-3 py-2.5 gap-2">
          {/* 全月ボタン */}
          <button
            onClick={() => onMonthChange(null)}
            className={`
              px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all
              ${selectedMonth === null
                ? 'bg-primary text-white shadow-card'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            全月
            <span className={`ml-1.5 text-xs ${selectedMonth === null ? 'text-white/80' : 'text-gray-400'}`}>
              {totalCount}
            </span>
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
                  px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all
                  ${isSelected
                    ? 'bg-primary text-white shadow-card'
                    : count > 0
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed opacity-50'
                  }
                `}
              >
                {month}月
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
