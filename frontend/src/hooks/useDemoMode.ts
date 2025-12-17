/**
 * デモモード判定フック
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション3
 *
 * URLパスが /demo で始まる場合、デモモードとして判定します。
 * デモモードでは本番APIを呼ばず、ローカルのシードデータを使用します。
 */

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * デモモードかどうかを判定するフック
 *
 * @returns true: デモモード（/demo/* パス）, false: 本番モード
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isDemo = useDemoMode();
 *
 *   if (isDemo) {
 *     // ローカルデモデータを使用
 *     return <div data-testid="demo-mode">デモモード</div>;
 *   }
 *
 *   // 本番APIを呼び出し
 *   return <div>本番モード</div>;
 * }
 * ```
 */
export function useDemoMode(): boolean {
  const location = useLocation();

  return useMemo(() => {
    return location.pathname.startsWith('/demo');
  }, [location.pathname]);
}

/**
 * デモモード用の入居者ID
 * デモデータと一致させるための定数
 */
export const DEMO_RESIDENT_ID = 'resident-001';

/**
 * デモモード用の家族ユーザーID
 */
export const DEMO_FAMILY_USER_ID = 'family-001';

/**
 * デモモード用のスタッフID
 */
export const DEMO_STAFF_ID = 'staff-001';

/**
 * デモモードのベースパス
 */
export const DEMO_BASE_PATH = '/demo';

/**
 * デモモード用のパスを生成
 *
 * @param path 元のパス（例: '/staff', '/family'）
 * @returns デモ用パス（例: '/demo/staff', '/demo/family'）
 */
export function getDemoPath(path: string): string {
  if (path.startsWith('/')) {
    return `${DEMO_BASE_PATH}${path}`;
  }
  return `${DEMO_BASE_PATH}/${path}`;
}

/**
 * 本番用のパスに変換（デモパスから本番パスへ）
 *
 * @param demoPath デモ用パス（例: '/demo/staff'）
 * @returns 本番用パス（例: '/staff'）
 */
export function getProductionPath(demoPath: string): string {
  if (demoPath.startsWith(DEMO_BASE_PATH)) {
    const path = demoPath.slice(DEMO_BASE_PATH.length);
    return path || '/';
  }
  return demoPath;
}
