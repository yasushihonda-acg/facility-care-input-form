/**
 * デモモード時にヘッダー右側に表示する「ツアーTOPに戻る」ボタン
 *
 * - /demo/* ページでのみ表示
 * - /demo/showcase, /demo/staff/showcase では非表示（ツアートップ自体のため）
 * - /demo/staff/* の場合は /demo/staff/showcase へリンク
 * - /demo/family/* の場合は /demo/showcase へリンク
 * - 共有ページ（/demo/stats, /demo/view）は localStorage の userRole で判定
 * - 目立つオレンジ（家族）/緑（スタッフ）色でスクロールしても常に見える
 */

import { Link, useLocation } from 'react-router-dom';

export function DemoHeaderButton() {
  const location = useLocation();
  const path = location.pathname;

  // ショーケースページ自体では非表示（ツアートップ自体）
  if (path === '/demo/showcase' || path === '/demo/staff/showcase') {
    return null;
  }

  // /demo/* 以外では非表示（本番ページ）
  if (!path.startsWith('/demo')) {
    return null;
  }

  // ロール判定: 明示的なパス > localStorage のuserRole（roleTheme.tsと同じキー）
  const isStaffPath = path.startsWith('/demo/staff');
  const isFamilyPath = path.startsWith('/demo/family') || path === '/demo' || path === '/demo/';
  const savedRole = localStorage.getItem('userRole') || 'family';
  const isStaffMode = isStaffPath || (!isFamilyPath && savedRole === 'staff');

  // スタッフデモの場合
  if (isStaffMode) {
    return (
      <Link
        to="/demo/staff/showcase"
        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full transition-colors whitespace-nowrap"
        data-testid="demo-tour-button"
      >
        <span>←</span>
        <span>ツアーTOPに戻る</span>
      </Link>
    );
  }

  // 家族デモの場合
  return (
    <Link
      to="/demo/showcase"
      className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium px-2 py-1 rounded-full transition-colors whitespace-nowrap"
      data-testid="demo-tour-button"
    >
      <span>←</span>
      <span>ツアーTOPに戻る</span>
    </Link>
  );
}
