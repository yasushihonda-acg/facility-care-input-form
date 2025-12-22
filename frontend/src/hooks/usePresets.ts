/**
 * プリセット管理 カスタムフック
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPresets,
  createPreset,
  updatePreset,
  deletePreset,
  saveAISuggestionAsPreset,
} from '../api';
import type {
  PresetSource,
  GetPresetsRequest,
  CreatePresetRequest,
  UpdatePresetRequest,
  SaveAISuggestionAsPresetRequest,
} from '../types/careItem';

// クエリキー
const PRESETS_KEY = 'presets';

/**
 * プリセット一覧を取得するフック
 */
export function usePresets(params: GetPresetsRequest) {
  return useQuery({
    queryKey: [PRESETS_KEY, params],
    queryFn: async () => {
      const response = await getPresets(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch presets');
      }
      return response.data;
    },
    enabled: !!params.residentId,
  });
}

/**
 * プリセットを作成するミューテーションフック
 */
export function useCreatePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreatePresetRequest) => {
      const response = await createPreset(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to create preset');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] });
    },
  });
}

/**
 * プリセットを更新するミューテーションフック
 */
export function useUpdatePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdatePresetRequest) => {
      const response = await updatePreset(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to update preset');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] });
    },
  });
}

/**
 * プリセットを削除するミューテーションフック（論理削除）
 */
export function useDeletePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (presetId: string) => {
      const response = await deletePreset(presetId);
      if (!response.success) {
        throw new Error('Failed to delete preset');
      }
      return { presetId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] });
    },
  });
}

/**
 * AI提案をプリセットとして保存するミューテーションフック
 */
export function useSaveAISuggestionAsPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveAISuggestionAsPresetRequest) => {
      const response = await saveAISuggestionAsPreset(params);
      if (!response.success || !response.data) {
        throw new Error('Failed to save AI suggestion as preset');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PRESETS_KEY] });
    },
  });
}

// 出所ラベル
export const PRESET_SOURCE_LABELS: Record<PresetSource, string> = {
  manual: '手動登録',
  ai: 'AI提案から保存',
};

// 出所アイコン
export const PRESET_SOURCE_ICONS: Record<PresetSource, string> = {
  manual: '📌',
  ai: '🤖',
};
