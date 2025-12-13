import { useEffect, useRef } from 'react';
import type { PlanDataRecord } from '../types';

interface DetailModalProps {
  record: PlanDataRecord;
  sheetName: string;
  headers: string[];
  onClose: () => void;
}

export function DetailModal({ record, sheetName, headers, onClose }: DetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 背景クリックで閉じる
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // 値の取得
  const getValue = (header: string): string => {
    if (header === '日時' || header.includes('日時')) return record.timestamp || '';
    if (header === 'スタッフ名' || header.includes('スタッフ')) return record.staffName || '';
    if (header === '入居者名' || header.includes('入居者') || header.includes('利用者')) return record.residentName || '';
    return record.data[header] || '';
  };

  // すべてのフィールドを表示用に構築
  const displayFields = headers.map(header => ({
    label: header,
    value: getValue(header)
  })).filter(field => field.value); // 空の値は除外

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      {/* ボトムシート */}
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-t-2xl shadow-2xl animate-slide-up max-h-[85vh] flex flex-col"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{sheetName} 詳細</h2>
            <p className="text-xs text-gray-500">{record.timestamp}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ドラッグハンドル（モバイル用） */}
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto px-4 pb-6">
          <div className="space-y-3">
            {displayFields.map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-xs text-gray-500 font-medium mb-0.5">{label}</span>
                <span className="text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg break-words">
                  {value || '-'}
                </span>
              </div>
            ))}
          </div>

          {/* 同期情報 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-400">
              同期日時: {new Date(record.syncedAt).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      </div>

      {/* スライドアップアニメーション */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
