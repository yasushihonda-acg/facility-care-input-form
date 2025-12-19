/**
 * デモモード時にヘッダー右側に表示する「ツアーTOPに戻る」ボタン
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション10
 * @see docs/DEMO_STAFF_SPEC.md セクション3.5
 *
 * - /demo/* ページでのみ表示
 * - /demo/showcase, /demo/staff/showcase では非表示（ツアートップ自体のため）
 * - /demo/staff/* の場合は /demo/staff/showcase へリンク
 * - /demo/* の場合は /demo/showcase へリンク
 * - 目立つオレンジ（家族）/緑（スタッフ）色でスクロールしても常に見える
 */

import { Link, useLocation } from 'react-router-dom';

export function DemoHeaderButton() {
  const location = useLocation();
  const isStaffDemo = location.pathname.startsWith('/demo/staff');

  // ショーケースページ自体では非表示（ツアートップ自体）
  if (location.pathname === '/demo/showcase' || location.pathname === '/demo/staff/showcase') {
    return null;
  }

  // /demo/* 以外では非表示（本番ページ）
  if (!location.pathname.startsWith('/demo')) {
    return null;
  }

  // スタッフデモの場合
  if (isStaffDemo) {
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
