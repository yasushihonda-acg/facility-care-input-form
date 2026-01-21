import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { detectRole, applyRoleTheme } from '../utils/roleTheme';

/**
 * 現在のパスに基づいてテーマカラーを自動適用するフック
 *
 * 4パターンに対応:
 * - /family/*, /demo/family/* → Orange（家族）+ localStorage保存
 * - /staff/*, /demo/staff/* → Green（スタッフ）+ localStorage保存
 * - /view, /stats等 → 直前のロールを維持（保存しない）
 * - /settings → テーマ適用なし
 */
export function useRoleTheme(): void {
  const location = useLocation();

  useEffect(() => {
    const { role, isExplicit } = detectRole(location.pathname);
    applyRoleTheme(role, isExplicit);
  }, [location.pathname]);
}
