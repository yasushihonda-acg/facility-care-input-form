import type { SheetSummary } from '../types';

interface SheetCardProps {
  sheet: SheetSummary;
  onClick: () => void;
}

export function SheetCard({ sheet, onClick }: SheetCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors text-left"
    >
      <div className="flex-1">
        <h3 className="text-base font-medium text-gray-900">{sheet.sheetName}</h3>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">
          {sheet.recordCount.toLocaleString()}件
        </span>
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}
