/**
 * ロール別テーマカラー管理ユーティリティ
 */

export type UserRole = 'staff' | 'family' | 'admin';

const USER_ROLE_KEY = 'userRole';

/** ロール別カラー定義 */
const ROLE_COLORS: Record<UserRole, { primary: string; primaryLight: string; primaryDark: string }> = {
  staff: {
    primary: '#22C55E',      // green-500
    primaryLight: '#4ADE80', // green-400
    primaryDark: '#16A34A',  // green-600
  },
  family: {
    primary: '#F97316',      // orange-500
    primaryLight: '#FB923C', // orange-400
    primaryDark: '#EA580C',  // orange-600
  },
  admin: {
    primary: '#2563EB',      // blue-600
    primaryLight: '#3B82F6', // blue-500
    primaryDark: '#1D4ED8',  // blue-700
  },
};

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
 * HTML要素にdata-role属性を設定し、CSS変数でテーマカラーを適用
 */
export function applyRoleTheme(role: UserRole): void {
  const root = document.documentElement;
  const colors = ROLE_COLORS[role];

  // data-role属性を設定（デバッグ・CSS参照用）
  root.setAttribute('data-role', role);

  // CSS変数を直接上書き（TailwindCSS V4との互換性確保）
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);

  // ロール限定パスの場合はlocalStorageに保存（共有ページでの復元用）
  // 管理者は一時的なモードなので保存しない
  if (role !== 'admin') {
    localStorage.setItem(USER_ROLE_KEY, role);
  }
}
