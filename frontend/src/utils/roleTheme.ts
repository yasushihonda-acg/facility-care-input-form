/**
 * ロール別テーマカラー管理ユーティリティ
 *
 * 4パターンに対応:
 * - staff: スタッフ本番・スタッフデモ
 * - family: 家族本番・家族デモ
 *
 * 設定ページ（/settings）はロール対象外
 */

export type UserRole = 'staff' | 'family';

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
};

/**
 * パスからロールを判定
 *
 * @returns ロール、または設定ページなど対象外の場合はnull
 */
export function detectRole(pathname: string): UserRole | null {
  // 設定ページはロール対象外
  if (pathname === '/settings') {
    return null;
  }

  // 家族判定（/family/*、/demo、または /demo/family/*）
  // /demo は家族デモホーム（DemoHome.tsx）
  if (pathname.startsWith('/family') || pathname === '/demo' || pathname.startsWith('/demo/family')) {
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
export function applyRoleTheme(role: UserRole | null): void {
  const root = document.documentElement;

  // ロール対象外の場合は何もしない（デフォルトテーマ維持）
  if (role === null) {
    root.removeAttribute('data-role');
    return;
  }

  const colors = ROLE_COLORS[role];

  // data-role属性を設定（デバッグ・CSS参照用）
  root.setAttribute('data-role', role);

  // CSS変数を直接上書き（TailwindCSS V4との互換性確保）
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);

  // ロールをlocalStorageに保存（共有ページでの復元用）
  localStorage.setItem(USER_ROLE_KEY, role);
}
