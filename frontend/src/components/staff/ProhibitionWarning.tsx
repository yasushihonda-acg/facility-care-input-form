/**
 * 禁止品目警告コンポーネント
 * スタッフに禁止品目を表示し、提供前に確認を促す
 * @see docs/ITEM_MANAGEMENT_SPEC.md セクション8
 */

import { useProhibitions } from '../../hooks/useProhibitions';
import type { CareItem } from '../../types/careItem';

interface ProhibitionWarningProps {
  item: CareItem;
  residentId: string;
}

/**
 * 品物が禁止品目に該当するかチェックし、警告を表示
 */
export function ProhibitionWarning({ item, residentId }: ProhibitionWarningProps) {
  const { data, isLoading } = useProhibitions(residentId);

  if (isLoading || !data?.prohibitions) {
    return null;
  }

  // 禁止品目との照合（品名またはカテゴリでマッチング）
  const matchedProhibitions = data.prohibitions.filter((p) => {
    // 品名の部分一致（大文字小文字無視）
    const nameMatch =
      item.itemName.toLowerCase().includes(p.itemName.toLowerCase()) ||
      p.itemName.toLowerCase().includes(item.itemName.toLowerCase());

    // カテゴリ一致
    const categoryMatch = p.category && p.category === item.category;

    return nameMatch || categoryMatch;
  });

  if (matchedProhibitions.length === 0) {
    return null;
  }

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-bold text-red-700 mb-2">
            🚫 禁止品目の可能性があります
          </h3>
          <p className="text-sm text-red-600 mb-3">
            この品物は家族が設定した「提供禁止品目」に該当する可能性があります。
            提供前に必ず確認してください。
          </p>

          <div className="space-y-2">
            {matchedProhibitions.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded p-3 border border-red-200"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">🚫</span>
                  <span className="font-bold text-red-700">{p.itemName}</span>
                </div>
                {p.reason && (
                  <p className="text-xs text-gray-600 mt-1 ml-7">
                    理由: {p.reason}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800">
              <strong>⚡ スタッフへ:</strong> 上記の禁止品目と品物名が一致または類似しています。
              提供可否について看護師または施設管理者に確認をお願いします。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProhibitionWarning;
