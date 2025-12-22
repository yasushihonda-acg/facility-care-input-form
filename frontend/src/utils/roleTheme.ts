/**
 * ロール別テーマカラー管理ユーティリティ
 */

export type UserRole = 'staff' | 'family' | 'admin';

const USER_ROLE_KEY = 'userRole';

/**
 * パスとクエリパラメータからロールを判定
 */
export function detectRole(pathname: string, searchParams: URLSearchParams): UserRole {
  // 管理者判定（?admin=true）
  if (searchParams.get('admin') === 'true') {
    return 'admin';
  }

  // 家族判定（/family/* または /demo/family/*）
  if (pathname.startsWith('/family') || pathname.startsWith('/demo/family')) {
    return 'family';
  }

  // スタッフ判定（/staff/* または /demo/staff/*）
  if (pathname.startsWith('/staff') || pathname.startsWith('/demo/staff')) {
    return 'staff';
  }

  // 共有ページ（/view, /stats等）: localStorageから直前ロール取得
  const savedRole = localStorage.getItem(USER_ROLE_KEY) as UserRole | null;
  return savedRole || 'staff';
}

/**
 * HTML要素にdata-role属性を設定し、テーマを適用
 */
export function applyRoleTheme(role: UserRole): void {
  document.documentElement.setAttribute('data-role', role);

  // ロール限定パスの場合はlocalStorageに保存（共有ページでの復元用）
  // 管理者は一時的なモードなので保存しない
  if (role !== 'admin') {
    localStorage.setItem(USER_ROLE_KEY, role);
  }
}
