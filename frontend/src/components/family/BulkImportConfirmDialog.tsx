/**
 * 一括登録確認ダイアログ
 */

interface BulkImportConfirmDialogProps {
  isOpen: boolean;
  itemCount: number;
  skipCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

export function BulkImportConfirmDialog({
  isOpen,
  itemCount,
  skipCount,
  onConfirm,
  onCancel,
  isImporting,
}: BulkImportConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isImporting ? onCancel : undefined}
      />

      {/* ダイアログ */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              品物の一括登録
            </h3>
          </div>

          {/* 本文 */}
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              以下の内容で品物を登録します。よろしいですか？
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">登録する品物</span>
                <span className="font-medium text-gray-900">{itemCount}件</span>
              </div>
              {skipCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">スキップ（重複）</span>
                  <span className="font-medium text-yellow-600">{skipCount}件</span>
                </div>
              )}
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isImporting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              disabled={isImporting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登録中...
                </>
              ) : (
                <>登録する</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
