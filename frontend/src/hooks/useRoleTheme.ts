import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { detectRole, applyRoleTheme } from '../utils/roleTheme';

/**
 * 現在のパスに基づいてテーマカラーを自動適用するフック
 *
 * - /family/*, /demo/family/* → Orange（家族）
 * - /staff/*, /demo/staff/* → Green（スタッフ）
 * - ?admin=true → Blue（管理者）
 * - /view, /stats等 → 直前のロールを維持
 */
export function useRoleTheme(): void {
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const role = detectRole(location.pathname, searchParams);
    applyRoleTheme(role);
  }, [location.pathname, location.search]);
}
