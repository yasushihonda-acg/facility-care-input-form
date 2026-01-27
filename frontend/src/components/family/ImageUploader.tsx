/**
 * 画像アップロードコンポーネント (Phase 68)
 * ドラッグ&ドロップ、クリック選択、クリップボード貼り付け、カメラ撮影に対応
 * 画像プレビュー機能付き
 */

import { useRef, useState, useCallback, useEffect } from 'react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export function ImageUploader({
  onImageSelected,
  disabled = false,
  isLoading = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    // MIMEタイプチェック
    if (!VALID_MIME_TYPES.includes(file.type)) {
      setError('JPEG、PNG、WebP形式の画像を選択してください');
      return false;
    }

    // ファイルサイズチェック
    if (file.size > MAX_SIZE_BYTES) {
      setError(`画像サイズは${MAX_SIZE_MB}MB以下にしてください`);
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) {
        return;
      }

      // FileをBase64に変換
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64,xxx の形式から base64部分のみ抽出
        const base64 = result.split(',')[1];
        const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

        // プレビュー用にフルDataURLを保持
        setPreview(result);
        onImageSelected(base64, mimeType);
      };
      reader.onerror = () => {
        setError('画像の読み込みに失敗しました');
      };
      reader.readAsDataURL(file);
    },
    [validateFile, onImageSelected]
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

  // カメラボタンクリック
  const handleCameraClick = useCallback(() => {
    if (!disabled && !isLoading) {
      cameraInputRef.current?.click();
    }
  }, [disabled, isLoading]);

  // クリップボード貼り付け処理
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled || isLoading || preview) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFile(file);
          }
          break;
        }
      }
    },
    [disabled, isLoading, preview, handleFile]
  );

  // グローバルペーストイベントの登録
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // コンテナがフォーカスされているか、アクティブな入力フィールドがない場合に処理
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement ||
                            activeElement instanceof HTMLTextAreaElement;

      if (!isInputFocused) {
        handlePaste(e);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [handlePaste]);

  const handleClearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-4" ref={containerRef}>
      {preview ? (
        // プレビュー表示
        <div className="relative">
          <img
            src={preview}
            alt="アップロード画像プレビュー"
            className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
          />
          {!isLoading && (
            <button
              onClick={handleClearPreview}
              className="absolute top-2 right-2 p-1 bg-gray-800/70 hover:bg-gray-800 rounded-full text-white transition-colors"
              aria-label="画像を削除"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-700 font-medium">画像を解析中...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // アップロードエリア
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            ${isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
            ${error ? 'border-red-300 bg-red-50' : ''}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || isLoading}
          />
          {/* カメラ撮影用input（モバイル向け） */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled || isLoading}
          />

          <div className="flex flex-col items-center gap-2">
            <svg
              className={`w-12 h-12 ${error ? 'text-red-400' : 'text-green-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <div>
              <p className="text-gray-700 font-medium">
                スケジュール表の画像をアップロード
              </p>
              <p className="text-gray-500 text-sm">
                クリックして選択、ドラッグ&ドロップ、または<br />
                <span className="text-green-600 font-medium">Ctrl+V / ⌘+V で貼り付け</span>
              </p>
            </div>

            {/* カメラ撮影ボタン */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCameraClick();
              }}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={disabled || isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              カメラで撮影
            </button>

            <p className="text-xs text-gray-400 mt-2">
              対応形式: JPEG, PNG, WebP（最大{MAX_SIZE_MB}MB）
            </p>
          </div>
        </div>
      )}

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
