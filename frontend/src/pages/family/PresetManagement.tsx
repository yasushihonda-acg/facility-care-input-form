/**
 * プリセット管理ページ（家族用）
 * いつもの指示のCRUD管理
 * @see docs/PRESET_MANAGEMENT_SPEC.md
 */

import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { PresetFormModal } from '../../components/family/PresetFormModal';
import {
  usePresets,
  useCreatePreset,
  useUpdatePreset,
  useDeletePreset,
  PRESET_SOURCE_LABELS,
  PRESET_SOURCE_ICONS,
} from '../../hooks/usePresets';
import { useDemoMode } from '../../hooks/useDemoMode';
import type { CarePreset } from '../../types/careItem';

// 入居者ID・ユーザーID（単一入居者専用アプリのため固定値）
const DEMO_RESIDENT_ID = 'resident-001';
const DEMO_USER_ID = 'family-001';

export function PresetManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<CarePreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const isDemo = useDemoMode();

  // プリセット一覧を取得
  const { data, isLoading, error } = usePresets({
    residentId: DEMO_RESIDENT_ID,
  });

  const createPresetMutation = useCreatePreset();
  const updatePresetMutation = useUpdatePreset();
  const deletePresetMutation = useDeletePreset();

  // フィルタリング
  const filteredPresets = (data?.presets || []).filter((preset) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      // servingMethodDetail優先、旧形式 processingDetail, instruction.content もフォールバック
      const detailText = preset.servingMethodDetail || preset.processingDetail || preset.instruction?.content || '';
      return (
        preset.name.toLowerCase().includes(query) ||
        detailText.toLowerCase().includes(query) ||
        preset.matchConfig.keywords.some((kw) => kw.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // 削除処理
  // @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作
  const handleDelete = async (presetId: string) => {
    // デモモードの場合: APIを呼ばず、成功メッセージを表示
    if (isDemo) {
      alert('削除しました（デモモード - 実際には削除されません）');
      setShowDeleteConfirm(null);
      return;
    }

    // 本番モードの場合: 通常通りAPI呼び出し
    try {
      await deletePresetMutation.mutateAsync(presetId);
      setShowDeleteConfirm(null);
    } catch {
      alert('削除に失敗しました');
    }
  };

  return (
    <Layout title="いつもの指示" showBackButton>
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>📋</span>
            いつもの指示
          </h1>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium text-sm"
          >
            + 新規作成
          </button>
        </div>

        {/* 検索バー */}
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="🔍 検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-sm"
          />
        </div>

      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            読み込みに失敗しました
          </div>
        ) : filteredPresets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <p className="text-gray-500">
              {searchQuery ? '検索結果がありません' : 'プリセットがありません'}
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 text-primary underline"
            >
              新しいプリセットを作成
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onEdit={() => setEditingPreset(preset)}
                onDelete={() => setShowDeleteConfirm(preset.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">削除の確認</h3>
            <p className="text-gray-600 mb-6">
              このプリセットを削除しますか？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border rounded-lg font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletePresetMutation.isPending}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {deletePresetMutation.isPending ? '削除中...' : '削除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 作成/編集モーダル */}
      {/* @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作 */}
      {(isCreating || editingPreset) && (
        <PresetFormModal
          preset={editingPreset}
          onClose={() => {
            setIsCreating(false);
            setEditingPreset(null);
          }}
          onSave={async (input) => {
            // デモモードの場合: APIを呼ばず、成功メッセージを表示
            if (isDemo) {
              const action = editingPreset ? '更新' : '作成';
              alert(`${action}しました（デモモード - 実際には保存されません）`);
              setIsCreating(false);
              setEditingPreset(null);
              return;
            }

            // 本番モードの場合: 通常通りAPI呼び出し
            if (editingPreset) {
              await updatePresetMutation.mutateAsync({
                presetId: editingPreset.id,
                updates: input,
              });
            } else {
              await createPresetMutation.mutateAsync({
                residentId: DEMO_RESIDENT_ID,
                userId: DEMO_USER_ID,
                preset: input,
                source: 'manual',
              });
            }
            setIsCreating(false);
            setEditingPreset(null);
          }}
          isSaving={createPresetMutation.isPending || updatePresetMutation.isPending}
        />
      )}
    </Layout>
  );
}

// プリセットカード
function PresetCard({
  preset,
  onEdit,
  onDelete,
}: {
  preset: CarePreset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sourceIcon = PRESET_SOURCE_ICONS[preset.source];
  const sourceLabel = PRESET_SOURCE_LABELS[preset.source];

  // AI提案から保存された場合、日付を表示
  const sourceDate = preset.aiSourceInfo?.savedAt
    ? new Date(preset.aiSourceInfo.savedAt).toLocaleDateString('ja-JP')
    : null;

  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{preset.icon || '📋'}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{preset.name}</h3>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {preset.servingMethodDetail || preset.processingDetail || preset.instruction?.content}
          </p>

          {/* メタ情報 */}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span
              className={`px-2 py-0.5 rounded-full ${
                preset.source === 'ai' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'
              }`}
            >
              {sourceIcon} {sourceLabel}
              {sourceDate && ` (${sourceDate})`}
            </span>
            <span>使用回数: {preset.usageCount}回</span>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
        <button
          onClick={onEdit}
          className="px-4 py-1.5 text-sm text-primary border border-primary rounded-lg hover:bg-primary/5"
        >
          編集
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-1.5 text-sm text-red-500 border border-red-300 rounded-lg hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}

