import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { detectRole, applyRoleTheme } from '../utils/roleTheme';

/**
 * 現在のパスに基づいてテーマカラーを自動適用するフック
 *
 * 4パターンに対応:
 * - /family/*, /demo/family/* → Orange（家族）
 * - /staff/*, /demo/staff/* → Green（スタッフ）
 * - /view, /stats等 → 直前のロールを維持
 * - /settings → テーマ適用なし
 */
export function useRoleTheme(): void {
  const location = useLocation();

  useEffect(() => {
    const role = detectRole(location.pathname);
    applyRoleTheme(role);
  }, [location.pathname]);
}
