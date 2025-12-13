interface YearPaginatorProps {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

export function YearPaginator({ selectedYear, availableYears, onYearChange }: YearPaginatorProps) {
  const sortedYears = [...availableYears].sort((a, b) => b - a);
  const currentIndex = sortedYears.indexOf(selectedYear);
  const hasPrev = currentIndex < sortedYears.length - 1;
  const hasNext = currentIndex > 0;

  const handlePrev = () => {
    if (hasPrev) {
      onYearChange(sortedYears[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onYearChange(sortedYears[currentIndex - 1]);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 py-2 bg-white border-b border-gray-200">
      <button
        onClick={handlePrev}
        disabled={!hasPrev}
        className={`
          p-2 rounded-lg transition-colors
          ${hasPrev
            ? 'text-blue-600 hover:bg-blue-50'
            : 'text-gray-300 cursor-not-allowed'
          }
        `}
        aria-label="前年"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="text-lg font-semibold text-gray-800 min-w-[100px] text-center">
        {selectedYear}年
      </span>

      <button
        onClick={handleNext}
        disabled={!hasNext}
        className={`
          p-2 rounded-lg transition-colors
          ${hasNext
            ? 'text-blue-600 hover:bg-blue-50'
            : 'text-gray-300 cursor-not-allowed'
          }
        `}
        aria-label="翌年"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
