/**
 * 入居者設定画面
 * 禁止ルール（提供禁止品目）の管理
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション8
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import {
  useProhibitions,
  useCreateProhibition,
  useDeleteProhibition,
  type ProhibitionRule,
  type ProhibitionRuleInput,
} from '../../hooks/useProhibitions';
import { useDemoMode } from '../../hooks/useDemoMode';
import { DEMO_RESIDENT, DEMO_FAMILY_USER } from '../../data/demoFamilyData';
import { ITEM_CATEGORIES, type ItemCategory } from '../../types/careItem';

export function ResidentSettings() {
  const navigate = useNavigate();
  const isDemo = useDemoMode();
  const residentId = DEMO_RESIDENT.id;
  const userId = DEMO_FAMILY_USER.id;

  // デモモード対応: リンク先プレフィックス
  const pathPrefix = isDemo ? '/demo' : '';

  // 禁止ルール一覧取得
  const { data, isLoading, error } = useProhibitions(residentId);
  const createMutation = useCreateProhibition();
  const deleteMutation = useDeleteProhibition();

  // 新規追加フォーム
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProhibition, setNewProhibition] = useState<ProhibitionRuleInput>({
    itemName: '',
    category: undefined,
    reason: '',
  });

  // 新規作成
  // @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作
  const handleCreate = useCallback(async () => {
    if (!newProhibition.itemName.trim()) {
      alert('禁止品目名を入力してください');
      return;
    }

    // デモモードの場合: APIを呼ばず、成功メッセージを表示
    if (isDemo) {
      alert('追加しました（デモモード - 実際には保存されません）');
      setNewProhibition({ itemName: '', category: undefined, reason: '' });
      setIsAddingNew(false);
      return;
    }

    // 本番モードの場合: 通常通りAPI呼び出し
    try {
      await createMutation.mutateAsync({
        residentId,
        userId,
        prohibition: newProhibition,
      });
      setNewProhibition({ itemName: '', category: undefined, reason: '' });
      setIsAddingNew(false);
    } catch {
      alert('追加に失敗しました');
    }
  }, [createMutation, residentId, userId, newProhibition, isDemo]);

  // 削除
  // @see docs/DEMO_SHOWCASE_SPEC.md セクション11 - デモモードでの書き込み操作
  const handleDelete = useCallback(
    async (prohibition: ProhibitionRule) => {
      if (!confirm(`「${prohibition.itemName}」を削除しますか？`)) {
        return;
      }

      // デモモードの場合: APIを呼ばず、成功メッセージを表示
      if (isDemo) {
        alert('削除しました（デモモード - 実際には削除されません）');
        return;
      }

      // 本番モードの場合: 通常通りAPI呼び出し
      try {
        await deleteMutation.mutateAsync({
          residentId,
          prohibitionId: prohibition.id,
        });
      } catch {
        alert('削除に失敗しました');
      }
    },
    [deleteMutation, residentId, isDemo]
  );

  const prohibitions = data?.prohibitions || [];

  return (
    <Layout title="入居者設定" showBackButton>
      {/* ヘッダー */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">👤</span>
            {DEMO_RESIDENT.name} 様
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {DEMO_RESIDENT.roomNumber}号室
          </p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 禁止ルールセクション */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>🚫</span>
              提供禁止品目
            </h2>
            {!isAddingNew && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="text-sm text-blue-600 font-medium"
              >
                + 追加
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-3">
            ここで設定した品物はスタッフに提供禁止として表示されます
          </p>

          {/* 新規追加フォーム */}
          {isAddingNew && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-medium text-sm mb-3">禁止品目を追加</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    品目名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newProhibition.itemName}
                    onChange={(e) =>
                      setNewProhibition((prev) => ({
                        ...prev,
                        itemName: e.target.value,
                      }))
                    }
                    placeholder="例: 七福のお菓子"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    カテゴリ（任意）
                  </label>
                  <select
                    value={newProhibition.category || ''}
                    onChange={(e) =>
                      setNewProhibition((prev) => ({
                        ...prev,
                        category: (e.target.value || undefined) as ItemCategory | undefined,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">選択してください</option>
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    禁止理由（任意）
                  </label>
                  <input
                    type="text"
                    value={newProhibition.reason || ''}
                    onChange={(e) =>
                      setNewProhibition((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="例: ご家族の希望"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setIsAddingNew(false)}
                  className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-700"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {createMutation.isPending ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          )}

          {/* 禁止ルール一覧 */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">読み込み中...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              エラーが発生しました
            </div>
          ) : prohibitions.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500 text-sm">
                禁止品目はまだ設定されていません
              </p>
              <button
                onClick={() => setIsAddingNew(true)}
                className="mt-3 text-blue-600 text-sm font-medium"
              >
                + 禁止品目を追加
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {prohibitions.map((prohibition) => (
                <div
                  key={prohibition.id}
                  className="bg-white border rounded-lg p-4 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚫</span>
                      <span className="font-medium">{prohibition.itemName}</span>
                    </div>
                    {prohibition.reason && (
                      <p className="text-xs text-gray-500 mt-1 ml-7">
                        理由: {prohibition.reason}
                      </p>
                    )}
                    {prohibition.category && (
                      <p className="text-xs text-gray-400 mt-1 ml-7">
                        カテゴリ:{' '}
                        {ITEM_CATEGORIES.find((c) => c.value === prohibition.category)
                          ?.label || prohibition.category}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(prohibition)}
                    disabled={deleteMutation.isPending}
                    className="text-red-500 text-sm p-2 hover:bg-red-50 rounded"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* プリセット管理へのリンク */}
        <section className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
            <span>⚡</span>
            いつもの指示（プリセット）
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            品物ごとの提供方法は「プリセット管理」で設定してください
          </p>
          <button
            onClick={() => navigate(`${pathPrefix}/family/presets`)}
            className="w-full py-2 px-4 bg-white border rounded-lg text-sm font-medium text-blue-600 flex items-center justify-center gap-1"
          >
            プリセット管理へ
            <span>→</span>
          </button>
        </section>
      </div>
    </Layout>
  );
}
