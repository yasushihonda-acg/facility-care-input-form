/**
 * 画像アップロードコンポーネント (Phase 68)
 * Phase 69: 複数画像対応
 * ドラッグ&ドロップ、クリック選択、クリップボード貼り付け、カメラ撮影に対応
 * 画像プレビュー機能付き（グリッド表示）
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import type { ImageData } from '../../types/bulkImport';
import { MAX_IMAGES, SINGLE_IMAGE_MAX_SIZE_MB } from '../../types/bulkImport';

interface ImageUploaderProps {
  /** 複数画像選択時のコールバック */
  onImagesSelected: (images: ImageData[]) => void;
  /** 最大アップロード枚数（デフォルト: 5） */
  maxImages?: number;
  disabled?: boolean;
  isLoading?: boolean;
}

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = SINGLE_IMAGE_MAX_SIZE_MB * 1024 * 1024;

interface PreviewImage extends ImageData {
  id: string; // 一意識別子
  previewUrl: string; // DataURL（プレビュー用）
}

export function ImageUploader({
  onImagesSelected,
  maxImages = MAX_IMAGES,
  disabled = false,
  isLoading = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
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
      setError(`画像サイズは${SINGLE_IMAGE_MAX_SIZE_MB}MB以下にしてください`);
      return false;
    }

    return true;
  }, []);

  // 画像をBase64に変換してプレビューに追加
  const addFile = useCallback(
    async (file: File): Promise<PreviewImage | null> => {
      if (!validateFile(file)) {
        return null;
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // data:image/jpeg;base64,xxx の形式から base64部分のみ抽出
          const base64 = result.split(',')[1];
          const mimeType = file.type as 'image/jpeg' | 'image/png' | 'image/webp';

          const previewImage: PreviewImage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            image: base64,
            mimeType,
            previewUrl: result,
          };

          resolve(previewImage);
        };
        reader.onerror = () => {
          setError('画像の読み込みに失敗しました');
          resolve(null);
        };
        reader.readAsDataURL(file);
      });
    },
    [validateFile]
  );

  // 複数ファイルを処理
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const remainingSlots = maxImages - previews.length;

      if (fileArray.length > remainingSlots) {
        setError(`最大${maxImages}枚までアップロードできます（残り${remainingSlots}枚）`);
        // 追加可能な枚数分だけ処理
        fileArray.splice(remainingSlots);
        if (fileArray.length === 0) return;
      }

      setError(null);

      const newPreviews: PreviewImage[] = [];
      for (const file of fileArray) {
        const preview = await addFile(file);
        if (preview) {
          newPreviews.push(preview);
        }
      }

      if (newPreviews.length > 0) {
        setPreviews((prev) => {
          const updated = [...prev, ...newPreviews];
          // コールバックで親に通知
          const imageData: ImageData[] = updated.map(({ image, mimeType }) => ({
            image,
            mimeType,
          }));
          onImagesSelected(imageData);
          return updated;
        });
      }
    },
    [maxImages, previews.length, addFile, onImagesSelected]
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
        handleFiles(files);
      }
    },
    [disabled, isLoading, handleFiles]
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
        handleFiles(files);
      }
      // 同じファイルを再選択できるようにリセット
      e.target.value = '';
    },
    [handleFiles]
  );

  // カメラボタンクリック
  const handleCameraClick = useCallback(() => {
    if (!disabled && !isLoading) {
      cameraInputRef.current?.click();
    }
  }, [disabled, isLoading]);

  // クリップボード貼り付け処理（画像追加）
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled || isLoading) return;
      if (previews.length >= maxImages) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        handleFiles(imageFiles);
      }
    },
    [disabled, isLoading, previews.length, maxImages, handleFiles]
  );

  // グローバルペーストイベントの登録
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // コンテナがフォーカスされているか、アクティブな入力フィールドがない場合に処理
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement;

      if (!isInputFocused) {
        handlePaste(e);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [handlePaste]);

  // 個別画像の削除
  const handleRemoveImage = useCallback(
    (id: string) => {
      setPreviews((prev) => {
        const updated = prev.filter((p) => p.id !== id);
        // コールバックで親に通知
        const imageData: ImageData[] = updated.map(({ image, mimeType }) => ({
          image,
          mimeType,
        }));
        onImagesSelected(imageData);
        return updated;
      });
      setError(null);
    },
    [onImagesSelected]
  );

  // 全画像クリア
  const handleClearAll = useCallback(() => {
    setPreviews([]);
    onImagesSelected([]);
    setError(null);
  }, [onImagesSelected]);

  const canAddMore = previews.length < maxImages;

  return (
    <div className="space-y-4" ref={containerRef}>
      {previews.length > 0 ? (
        // プレビュー表示（グリッド）
        <div className="space-y-3">
          {/* 選択中の画像グリッド */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {previews.map((preview, index) => (
              <div key={preview.id} className="relative group aspect-square">
                <img
                  src={preview.previewUrl}
                  alt={`アップロード画像 ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
                {/* 画像番号バッジ */}
                <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
                {/* 削除ボタン */}
                {!isLoading && (
                  <button
                    onClick={() => handleRemoveImage(preview.id)}
                    className="absolute top-1 right-1 p-1 bg-gray-800/70 hover:bg-red-600 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
                    aria-label={`画像${index + 1}を削除`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {/* 追加ボタン（枠） */}
            {canAddMore && !isLoading && (
              <button
                onClick={handleClick}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-green-500 hover:text-green-500 hover:bg-green-50 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs mt-1">追加</span>
              </button>
            )}
          </div>

          {/* ステータスバー */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {previews.length}枚選択中
              {canAddMore && <span className="text-gray-400 ml-1">（最大{maxImages}枚）</span>}
            </span>
            {!isLoading && (
              <button
                onClick={handleClearAll}
                className="text-gray-500 hover:text-red-600 transition-colors"
              >
                すべてクリア
              </button>
            )}
          </div>

          {/* ローディングオーバーレイ */}
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-blue-700 font-medium">
                  {previews.length}枚の画像を解析中...
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // アップロードエリア（画像なし）
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
            multiple
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
                <span className="text-green-600 font-medium">Ctrl+V / Command+V で貼り付け</span>
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
              対応形式: JPEG, PNG, WebP（各{SINGLE_IMAGE_MAX_SIZE_MB}MB以下、最大{maxImages}枚）
            </p>
          </div>
        </div>
      )}

      {/* ヒントメッセージ */}
      {previews.length > 0 && previews.length < maxImages && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          <p className="font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            複数画像での読み取り
          </p>
          <p className="mt-1">
            パックジュース出庫表などの補助情報があれば一緒に追加すると、より正確に読み取れます。
          </p>
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
