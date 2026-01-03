/**
 * ImagesTab - Google Chat画像表示タブ（Phase 52）
 *
 * Firestoreに保存された画像を表示
 * - アクセストークンがあるユーザーは自動的にChatスペースから同期
 * - 全ユーザーがFirestoreの画像を閲覧可能
 */

import { useState } from 'react';
import { useSyncedChatImages } from '../../hooks/useSyncedChatImages';
import { useAuth } from '../../contexts/AuthContext';
import type { CarePhoto } from '../../types';

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
 * 日付文字列からDate取得
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * 年月でフィルタ
 */
function filterByYearMonth(
  photos: CarePhoto[],
  year: number,
  month: number | null
): CarePhoto[] {
  return photos.filter((photo) => {
    const date = parseDate(photo.date);
    const photoYear = date.getFullYear();
    const photoMonth = date.getMonth() + 1;

    if (month === null) {
      return photoYear === year;
    }
    return photoYear === year && photoMonth === month;
  });
}

/**
 * 日時フォーマット
 */
function formatDateTime(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  });
}

/**
 * 日付でグループ化
 */
function groupByDate(photos: CarePhoto[]): Map<string, CarePhoto[]> {
  const groups = new Map<string, CarePhoto[]>();

  for (const photo of photos) {
    const date = parseDate(photo.date);
    const key = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(photo);
  }

  return groups;
}

export function ImagesTab({ year, month }: ImagesTabProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('gallery');
  const [selectedPhoto, setSelectedPhoto] = useState<CarePhoto | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user, refreshAccessToken } = useAuth();

  const {
    photos,
    isLoading,
    error,
    isConfigured,
    canSync,
    isSyncing,
    lastSyncResult,
    needsReauth,
    sync,
    settings,
  } = useSyncedChatImages();

  // 年月フィルタ適用
  const filteredPhotos = filterByYearMonth(photos, year, month);

  // トークン再取得
  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        // トークン取得成功 - syncは自動的に実行される（useSyncedChatImagesのuseEffect）
        console.log('[ImagesTab] Token refreshed, sync will trigger automatically');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

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
            Google Chatの画像を表示するには、設定ページで利用者IDを設定してください。
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

  // ローディング中（同期中も含む）
  if (isLoading || isSyncing) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full mb-4" />
        <p className="text-gray-500">
          {isSyncing ? 'Chatスペースから同期中...' : '画像を読み込み中...'}
        </p>
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
            エラーが発生しました
          </h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          {canSync && (
            <button
              onClick={() => sync(year)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              再試行
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* 再認証が必要な場合のみバナー表示（方法C: API失敗時のみ） */}
      {user && isConfigured && needsReauth && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-700">
              <span>🔑</span>
              <span className="text-sm">
                セッションが期限切れです。再認証すると同期できます
              </span>
            </div>
            <button
              onClick={handleRefreshToken}
              disabled={isRefreshing}
              className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {isRefreshing ? '認証中...' : '🔐 再認証'}
            </button>
          </div>
        </div>
      )}

      {/* ヘッダー: 件数・同期ステータス・表示モード */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {filteredPhotos.length}件の画像
            {month ? ` (${year}年${month}月)` : ` (${year}年)`}
          </span>
          {lastSyncResult && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
              +{lastSyncResult.synced}件同期
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 手動同期ボタン（アクセス可能な場合のみ） */}
          {canSync && (
            <button
              onClick={() => sync(year)}
              disabled={isSyncing}
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
              title={`${year}年のChatメッセージから取得`}
            >
              🔄 同期
            </button>
          )}
          {/* 表示モード切り替え */}
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
      </div>

      {/* 画像がない場合 */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">📷</p>
          <p>この期間の画像はありません</p>
          {canSync && (
            <button
              onClick={() => sync(year)}
              className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              🔄 Chatスペースから取得
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ギャラリーモード */}
          {displayMode === 'gallery' && (
            <GalleryView photos={filteredPhotos} onSelect={setSelectedPhoto} />
          )}

          {/* タイムラインモード */}
          {displayMode === 'timeline' && (
            <TimelineView photos={filteredPhotos} onSelect={setSelectedPhoto} />
          )}

          {/* テーブルモード */}
          {displayMode === 'table' && (
            <TableView photos={filteredPhotos} onSelect={setSelectedPhoto} />
          )}
        </>
      )}

      {/* 画像拡大モーダル */}
      {selectedPhoto && (
        <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </div>
  );
}

// ============================================================================
// サブコンポーネント
// ============================================================================

interface PhotoViewProps {
  photos: CarePhoto[];
  onSelect: (photo: CarePhoto) => void;
}

/**
 * ギャラリービュー
 */
function GalleryView({ photos, onSelect }: PhotoViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {photos.map((photo) => (
        <button
          key={photo.photoId}
          onClick={() => onSelect(photo)}
          className="aspect-square bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition-opacity relative group"
        >
          <img
            src={photo.photoUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs truncate">
              {formatDateTime(photo.date)}
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
function TimelineView({ photos, onSelect }: PhotoViewProps) {
  const grouped = groupByDate(photos);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateStr, datePhotos]) => (
        <div key={dateStr}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2 sticky top-0 bg-white py-1">
            📅 {dateStr}
          </h3>
          <div className="space-y-3 pl-4 border-l-2 border-gray-200">
            {datePhotos.map((photo) => (
              <div
                key={photo.photoId}
                className="flex gap-3 bg-gray-50 rounded-lg p-3"
              >
                <button
                  onClick={() => onSelect(photo)}
                  className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img
                    src={photo.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {formatDateTime(photo.date)}
                  </p>
                  {photo.staffName && (
                    <p className="text-sm text-gray-700">
                      📝 {photo.staffName}
                    </p>
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
function TableView({ photos, onSelect }: PhotoViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">画像</th>
            <th className="p-2 text-left">日付</th>
            <th className="p-2 text-left">記録者</th>
            <th className="p-2 text-left">ソース</th>
          </tr>
        </thead>
        <tbody>
          {photos.map((photo) => (
            <tr key={photo.photoId} className="border-b hover:bg-gray-50">
              <td className="p-2">
                <button
                  onClick={() => onSelect(photo)}
                  className="w-12 h-12 bg-gray-200 rounded overflow-hidden hover:opacity-80 transition-opacity"
                >
                  <img
                    src={photo.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              </td>
              <td className="p-2 whitespace-nowrap">
                {formatDateTime(photo.date)}
              </td>
              <td className="p-2">
                {photo.staffName || '-'}
              </td>
              <td className="p-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  photo.source === 'google_chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {photo.source === 'google_chat' ? 'Chat' : '直接'}
                </span>
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
interface PhotoModalProps {
  photo: CarePhoto;
  onClose: () => void;
}

function PhotoModal({ photo, onClose }: PhotoModalProps) {
  // 拡張フィールドを取得（型安全のためanyでアクセス）
  const extendedPhoto = photo as CarePhoto & {
    chatTags?: string[];
    chatContent?: string;
  };

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
            src={photo.photoUrl}
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
        <div className="p-4 border-t">
          <p className="text-sm text-gray-500 mb-2">
            {formatDateTime(photo.date)}
            {photo.staffName && ` ｜ 記録者: ${photo.staffName}`}
            {photo.source === 'google_chat' && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                Chat経由
              </span>
            )}
          </p>
          {extendedPhoto.chatTags && extendedPhoto.chatTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {extendedPhoto.chatTags.map((tag, i) => (
                <span
                  key={i}
                  className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {extendedPhoto.chatContent && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-5">
              {extendedPhoto.chatContent}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
