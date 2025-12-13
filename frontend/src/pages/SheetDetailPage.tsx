import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { RecordCard } from '../components/RecordCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { useSheetRecords } from '../hooks/usePlanData';

export function SheetDetailPage() {
  const { sheetName } = useParams<{ sheetName: string }>();
  const navigate = useNavigate();
  const decodedSheetName = sheetName ? decodeURIComponent(sheetName) : '';
  const { records, totalCount, isLoading, error } = useSheetRecords(decodedSheetName);

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={decodedSheetName} showBack onBack={handleBack} />

      <div className="px-4 py-2 bg-white border-b border-gray-200">
        <span className="text-sm text-gray-600">
          {totalCount.toLocaleString()}件
        </span>
      </div>

      <main className="p-4 pb-20">
        {isLoading && <LoadingSpinner message="データを読み込み中..." />}

        {error && (
          <ErrorMessage
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && (
          <>
            {records.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>このシートにはデータがありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <RecordCard key={record.id} record={record} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
