/**
 * Phase 51: Google Chat画像取得フック
 *
 * Google Chatスペースから利用者IDでフィルタした画像を取得
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { getChatImages } from '../api';
import { useMealFormSettings } from './useMealFormSettings';
import type { ChatImageMessage } from '../types';

export interface UseChatImagesOptions {
  /** 自動取得を有効化 */
  enabled?: boolean;
  /** 1ページあたりの取得件数 */
  pageSize?: number;
}

export interface UseChatImagesResult {
  /** 画像メッセージ配列 */
  images: ChatImageMessage[];
  /** 読み込み中フラグ */
  isLoading: boolean;
  /** 追加読み込み中フラグ */
  isFetchingNextPage: boolean;
  /** 次ページ存在フラグ */
  hasNextPage: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 設定済みフラグ（residentIdとspaceIdが両方設定されている） */
  isConfigured: boolean;
  /** 設定値 */
  settings: {
    residentId: string | undefined;
    spaceId: string | undefined;
  };
  /** 再取得 */
  refetch: () => void;
  /** 次ページを読み込み */
  fetchNextPage: () => void;
}

/**
 * Google Chat画像取得フック
 *
 * @param options - オプション
 * @returns 画像データとローディング状態
 */
export function useChatImages(options: UseChatImagesOptions = {}): UseChatImagesResult {
  const { enabled = true, pageSize = 50 } = options;

  // 設定を取得
  const { settings: formSettings, isLoading: isLoadingSettings } = useMealFormSettings();

  const chatSettings = formSettings.chatImageSettings;
  const residentId = chatSettings?.residentId;
  const spaceId = chatSettings?.spaceId;

  // 設定が完了しているか
  const isConfigured = Boolean(residentId && spaceId);

  // 画像を取得（無限スクロール対応）
  const {
    data,
    isLoading: isLoadingImages,
    isFetchingNextPage,
    hasNextPage,
    error,
    refetch,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['chatImages', spaceId, residentId],
    queryFn: async ({ pageParam }) => {
      if (!spaceId || !residentId) {
        throw new Error('spaceId and residentId are required');
      }
      const response = await getChatImages({
        spaceId,
        residentId,
        pageToken: pageParam,
        limit: pageSize,
      });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch images');
      }
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextPageToken,
    enabled: enabled && isConfigured && !isLoadingSettings,
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 15 * 60 * 1000, // 15分
  });

  // 全ページの画像をフラット化
  const images: ChatImageMessage[] = data?.pages.flatMap((page) => page?.images ?? []) ?? [];

  return {
    images,
    isLoading: isLoadingSettings || isLoadingImages,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    error: error instanceof Error ? error.message : null,
    isConfigured,
    settings: {
      residentId,
      spaceId,
    },
    refetch,
    fetchNextPage,
  };
}
