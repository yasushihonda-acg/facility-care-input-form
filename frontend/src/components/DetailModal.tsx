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
    // タイムスタンプ系
    if (header === 'タイムスタンプ' || header === '日時' || header.includes('日時')) {
      return record.timestamp || '';
    }
    // スタッフ名系
    if (header === 'あなたの名前は？' || header === 'スタッフ名' || header.includes('スタッフ')) {
      return record.staffName || '';
    }
    // 入居者名系
    if (header === '入居者名' || header.includes('入居者') || header.includes('利用者')) {
      return record.residentName || '';
    }
    return record.data[header] || '';
  };

  // すべてのフィールドを表示用に構築
  const displayFields = headers.map(header => ({
    label: header,
    value: getValue(header)
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      {/* 中央配置モーダル */}
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl animate-modal-in max-h-[80vh] flex flex-col"
        style={{ width: '90%' }}
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-800 truncate">{sheetName} 詳細</h2>
            <p className="text-sm text-gray-500 mt-0.5">{record.timestamp}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="space-y-3">
            {displayFields.map(({ label, value }) => (
              <div key={label} className="grid grid-cols-3 gap-3 items-start">
                <span className="text-sm text-gray-500 font-medium col-span-1 break-words">
                  {label}
                </span>
                <span className="text-sm text-gray-800 col-span-2 break-words whitespace-pre-line">
                  {value || <span className="text-gray-400">-</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* フッター - 同期情報 */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <span className="text-xs text-gray-400">
            同期日時: {new Date(record.syncedAt).toLocaleString('ja-JP')}
          </span>
        </div>
      </div>

      {/* フェードイン + スケールアニメーション */}
      <style>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
