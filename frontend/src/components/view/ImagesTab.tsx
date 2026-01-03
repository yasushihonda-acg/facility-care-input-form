/**
 * ImagesTab - Google Chat画像表示タブ（Phase 51）
 *
 * 設定済みの利用者ID・スペースIDに基づき画像を取得・表示
 * - ギャラリー / タイムライン / テーブル の3モード
 * - 画像クリックで拡大表示
 * - 関連テキスト情報（タグ、記録者、特記事項等）表示
 */

import { useState } from 'react';
import { useChatImages } from '../../hooks/useChatImages';
import type { ChatImageMessage } from '../../types';

interface ImagesTabProps {
  year: number;
  month: number | null;
}

type DisplayMode = 'gallery' | 'timeline' | 'table';

const DISPLAY_MODES: { id: DisplayMode; label: string; icon: string }[] = [
  { id: 'gallery', label: 'ギャラリー', icon: '🖼️' },
  { id: 'timeline', label: 'タイムライン', icon: '📅' },
  { id: 'table', label: 'テーブル', icon: '📋' },
];

/**
 * 日付文字列からDate取得（JST考慮）
 */
function parseTimestamp(timestamp: string): Date {
  return new Date(timestamp);
}

/**
 * 年月でフィルタ
 */
function filterByYearMonth(
  images: ChatImageMessage[],
  year: number,
  month: number | null
): ChatImageMessage[] {
  return images.filter((img) => {
    const date = parseTimestamp(img.timestamp);
    const imgYear = date.getFullYear();
    const imgMonth = date.getMonth() + 1;

    if (month === null) {
      return imgYear === year;
    }
    return imgYear === year && imgMonth === month;
  });
}

/**
 * 日時フォーマット
 */
function formatDateTime(timestamp: string): string {
  const date = parseTimestamp(timestamp);
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 日付でグループ化
 */
function groupByDate(
  images: ChatImageMessage[]
): Map<string, ChatImageMessage[]> {
  const groups = new Map<string, ChatImageMessage[]>();

  for (const img of images) {
    const date = parseTimestamp(img.timestamp);
    const key = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(img);
  }

  return groups;
}

export function ImagesTab({ year, month }: ImagesTabProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('gallery');
  const [selectedImage, setSelectedImage] = useState<ChatImageMessage | null>(null);

  const {
    images,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    isConfigured,
    hasAccessToken,
    settings,
    fetchNextPage,
    refreshToken,
  } = useChatImages();

  // 年月フィルタ適用
  const filteredImages = filterByYearMonth(images, year, month);

  // 未設定時の表示
  if (!isConfigured) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-lg p-6">
          <p className="text-4xl mb-4">⚙️</p>
          <h3 className="text-lg font-semibold text-amber-800 mb-2">
            画像閲覧設定が必要です
          </h3>
          <p className="text-amber-700 text-sm mb-4">
            Google Chatの画像を表示するには、設定ページで利用者IDとチャットスペースIDを設定してください。
          </p>
          <a
            href="/settings"
            className="inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            設定ページへ →
          </a>
          <div className="mt-4 text-xs text-amber-600">
            現在の設定: 利用者ID={settings.residentId || '未設定'}, スペースID={settings.spaceId || '未設定'}
          </div>
        </div>
      </div>
    );
  }

  // アクセストークンがない場合の表示
  if (!hasAccessToken) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-4xl mb-4">🔑</p>
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            認証が必要です
          </h3>
          <p className="text-blue-700 text-sm mb-4">
            Google Chatの画像を取得するにはアクセストークンが必要です。
            ボタンをクリックして認証してください。
          </p>
          <button
            onClick={() => refreshToken()}
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🔄 認証してトークンを取得
          </button>
        </div>
      </div>
    );
  }

  // ローディング中
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full mb-4" />
        <p className="text-gray-500">画像を読み込み中...</p>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-4xl mb-4">⚠️</p>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            画像の取得に失敗しました
          </h3>
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 表示モード切り替え */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500">
          {filteredImages.length}件の画像
          {month ? ` (${year}年${month}月)` : ` (${year}年)`}
        </div>
        <div className="flex gap-1">
          {DISPLAY_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setDisplayMode(mode.id)}
              className={`
                px-3 py-1.5 text-sm rounded-lg transition-all
                ${displayMode === mode.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={mode.label}
            >
              <span className="mr-1">{mode.icon}</span>
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 画像がない場合 */}
      {filteredImages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">📷</p>
          <p>この期間の画像はありません</p>
        </div>
      ) : (
        <>
          {/* ギャラリーモード */}
          {displayMode === 'gallery' && (
            <GalleryView images={filteredImages} onSelect={setSelectedImage} />
          )}

          {/* タイムラインモード */}
          {displayMode === 'timeline' && (
            <TimelineView images={filteredImages} onSelect={setSelectedImage} />
          )}

          {/* テーブルモード */}
          {displayMode === 'table' && (
            <TableView images={filteredImages} onSelect={setSelectedImage} />
          )}
        </>
      )}

      {/* もっと読み込む */}
      {hasNextPage && (
        <div className="text-center mt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {isFetchingNextPage ? '読み込み中...' : 'もっと読み込む'}
          </button>
        </div>
      )}

      {/* 画像拡大モーダル */}
      {selectedImage && (
        <ImageModal image={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
    </div>
  );
}

// ============================================================================
// サブコンポーネント
// ============================================================================

interface ImageViewProps {
  images: ChatImageMessage[];
  onSelect: (image: ChatImageMessage) => void;
}

/**
 * ギャラリービュー
 */
function GalleryView({ images, onSelect }: ImageViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {images.map((img) => (
        <button
          key={img.messageId}
          onClick={() => onSelect(img)}
          className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity relative group"
        >
          <img
            src={img.thumbnailUrl || img.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">
              {formatDateTime(img.timestamp)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

/**
 * タイムラインビュー
 */
function TimelineView({ images, onSelect }: ImageViewProps) {
  const grouped = groupByDate(images);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateStr, dateImages]) => (
        <div key={dateStr}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1">
            📅 {dateStr}
          </h3>
          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
            {dateImages.map((img) => (
              <div
                key={img.messageId}
                className="flex gap-3 bg-gray-50 rounded-lg p-3"
              >
                <button
                  onClick={() => onSelect(img)}
                  className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img
                    src={img.thumbnailUrl || img.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {formatDateTime(img.timestamp)}
                  </p>
                  {img.relatedTextMessage && (
                    <>
                      {img.relatedTextMessage.staffName && (
                        <p className="text-sm text-gray-700">
                          📝 {img.relatedTextMessage.staffName}
                        </p>
                      )}
                      {img.relatedTextMessage.tags && img.relatedTextMessage.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {img.relatedTextMessage.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * テーブルビュー
 */
function TableView({ images, onSelect }: ImageViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">画像</th>
            <th className="p-2 text-left">日時</th>
            <th className="p-2 text-left">記録者</th>
            <th className="p-2 text-left">タグ</th>
          </tr>
        </thead>
        <tbody>
          {images.map((img) => (
            <tr key={img.messageId} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <button
                  onClick={() => onSelect(img)}
                  className="w-12 h-12 bg-gray-200 rounded overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img
                    src={img.thumbnailUrl || img.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              </td>
              <td className="p-2 whitespace-nowrap">
                {formatDateTime(img.timestamp)}
              </td>
              <td className="p-2">
                {img.relatedTextMessage?.staffName || '-'}
              </td>
              <td className="p-2">
                {img.relatedTextMessage?.tags?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {img.relatedTextMessage.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 画像拡大モーダル
 */
interface ImageModalProps {
  image: ChatImageMessage;
  onClose: () => void;
}

function ImageModal({ image, onClose }: ImageModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={image.imageUrl}
            alt=""
            className="max-w-full max-h-[70vh] object-contain"
          />
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>
        {image.relatedTextMessage && (
          <div className="p-4 border-t">
            <p className="text-sm text-gray-500 mb-2">
              {formatDateTime(image.timestamp)}
              {image.relatedTextMessage.staffName &&
                ` ｜ 記録者: ${image.relatedTextMessage.staffName}`}
            </p>
            {image.relatedTextMessage.tags && image.relatedTextMessage.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {image.relatedTextMessage.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {image.relatedTextMessage.content && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {image.relatedTextMessage.content}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
