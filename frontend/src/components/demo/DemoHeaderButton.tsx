/**
 * デモモード時にヘッダー右側に表示する「ツアーTOPに戻る」ボタン
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション10
 *
 * - /demo/* ページでのみ表示
 * - /demo/showcase では非表示（ツアートップ自体のため）
 * - 目立つオレンジ色でスクロールしても常に見える
 * - ラベル「← ツアーTOPに戻る」: ユーザーはツアー中、戻るのはツアートップ
 */

import { Link, useLocation } from 'react-router-dom';

export function DemoHeaderButton() {
  const location = useLocation();

  // /demo/showcase では非表示（ツアートップ自体）
  if (location.pathname === '/demo/showcase') {
    return null;
  }

  // /demo/* 以外では非表示（本番ページ）
  if (!location.pathname.startsWith('/demo')) {
    return null;
  }

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
