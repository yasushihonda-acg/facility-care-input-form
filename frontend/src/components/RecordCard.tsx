import type { SheetRecord } from '../types';

interface RecordCardProps {
  record: SheetRecord;
}

export function RecordCard({ record }: RecordCardProps) {
  const data = record.data;

  // Get meaningful display fields from the record data
  const displayEntries = Object.entries(data).filter(
    ([key]) => !key.startsWith('_') && key !== 'id'
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      {displayEntries.map(([key, value]) => (
        <div key={key} className="py-1 border-b border-gray-50 last:border-0">
          <dt className="text-xs text-gray-500">{key}</dt>
          <dd className="text-sm text-gray-900 mt-0.5">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
