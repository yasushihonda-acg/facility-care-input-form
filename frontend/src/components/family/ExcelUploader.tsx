/**
 * Excelファイルアップロードコンポーネント
 * ドラッグ＆ドロップとクリック選択に対応
 */

import { useRef, useState, useCallback } from 'react';

interface ExcelUploaderProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ExcelUploader({
  onFileSelected,
  disabled = false,
  isLoading = false,
}: ExcelUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    // ファイル拡張子チェック
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValidExtension) {
      setError('Excelファイル（.xlsx, .xls）を選択してください');
      return false;
    }

    // ファイルサイズチェック（5MB以下）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('ファイルサイズは5MB以下にしてください');
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelected(file);
      }
    },
    [validateFile, onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || isLoading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, isLoading, handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled && !isLoading) {
      inputRef.current?.click();
    }
  }, [disabled, isLoading]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // 同じファイルを再選択できるようにリセット
      e.target.value = '';
    },
    [handleFile]
  );

  return (
    <div className="space-y-2">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600">ファイルを読み込み中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <svg
              className={`w-12 h-12 ${error ? 'text-red-400' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div>
              <p className="text-gray-700 font-medium">
                ファイルをドラッグ＆ドロップ
              </p>
              <p className="text-gray-500 text-sm">
                または <span className="text-blue-600 underline">クリックして選択</span>
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              対応形式: .xlsx, .xls（最大5MB）
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
