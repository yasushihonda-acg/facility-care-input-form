import { useMemo } from 'react';

interface YearPaginatorProps {
  selectedYear: number;
  availableYears: number[];
  onYearChange: (year: number) => void;
}

export function YearPaginator({ selectedYear, availableYears, onYearChange }: YearPaginatorProps) {
  // 最古年から現在年までの全年リストを生成
  const allYears = useMemo(() => {
    if (availableYears.length === 0) return [];
    const minYear = Math.min(...availableYears);
    const maxYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [availableYears]);

  const availableYearsSet = useMemo(() => new Set(availableYears), [availableYears]);

  const currentIndex = allYears.indexOf(selectedYear);
  const hasPrev = currentIndex < allYears.length - 1;
  const hasNext = currentIndex > 0;

  const handlePrev = () => {
    if (hasPrev) {
      onYearChange(allYears[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onYearChange(allYears[currentIndex - 1]);
    }
  };

  const hasData = availableYearsSet.has(selectedYear);

  return (
    <div className="flex items-center justify-center gap-3 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
      <button
        onClick={handlePrev}
        disabled={!hasPrev}
        className={`
          flex items-center justify-center w-11 h-11 rounded-xl transition-all
          ${hasPrev
            ? 'text-primary bg-white shadow-card hover:shadow-card-hover active:scale-95'
            : 'text-gray-300 bg-gray-100 cursor-not-allowed'
          }
        `}
        aria-label="前年"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className={`
        flex items-center gap-2 px-5 py-2 rounded-xl shadow-card
        ${hasData ? 'bg-white' : 'bg-gray-100'}
      `}>
        <svg className={`w-5 h-5 ${hasData ? 'text-primary' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={`text-xl font-bold ${hasData ? 'text-gray-800' : 'text-gray-400'}`}>
          {selectedYear}年
        </span>
        {!hasData && (
          <span className="text-xs text-gray-400 ml-1">(データなし)</span>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!hasNext}
        className={`
          flex items-center justify-center w-11 h-11 rounded-xl transition-all
          ${hasNext
            ? 'text-primary bg-white shadow-card hover:shadow-card-hover active:scale-95'
            : 'text-gray-300 bg-gray-100 cursor-not-allowed'
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
