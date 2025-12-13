import type { PlanDataRecord } from '../types';

interface RecordCardProps {
  record: PlanDataRecord;
}

export function RecordCard({ record }: RecordCardProps) {
  // シート固有データ（dataマップ）から表示エントリを取得
  const dataEntries = Object.entries(record.data).filter(
    ([, value]) => value && value.trim() !== ''
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      {/* 共通ヘッダー情報 */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatTimestamp(record.timestamp)}</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {record.staffName || '(不明)'}
          </span>
        </div>
      </div>

      {/* 利用者名 */}
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-900">
          {record.residentName || '(利用者名なし)'}
        </span>
      </div>

      {/* シート固有データ */}
      {dataEntries.length > 0 && (
        <div className="space-y-2">
          {dataEntries.map(([key, value]) => (
            <div key={key} className="py-1 border-b border-gray-50 last:border-0">
              <dt className="text-xs text-gray-500">{key}</dt>
              <dd className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">
                {value}
              </dd>
            </div>
          ))}
        </div>
      )}

      {/* データがない場合 */}
      {dataEntries.length === 0 && (
        <div className="text-sm text-gray-400 italic">
          追加データなし
        </div>
      )}
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '-';

  // Google Sheetsのタイムスタンプ形式をパース（例: "2024/1/15 14:30:00"）
  try {
    const date = new Date(timestamp.replace(/\//g, '-'));
    if (isNaN(date.getTime())) {
      return timestamp; // パースできない場合はそのまま返す
    }
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}
