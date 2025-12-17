/**
 * デモページ用「ツアーに戻る」バナー
 * @see docs/DEMO_SHOWCASE_SPEC.md セクション10
 *
 * /demo/* ページ（/demo/showcase 以外）で表示
 * ガイド付きツアー中であることを示し、ワンタップでツアートップに戻れる
 */

import { Link, useLocation } from 'react-router-dom';

export function TourReturnBanner() {
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
    <div className="bg-blue-50 border-b border-blue-100">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <span>🎯</span>
          <span>ガイド付きツアー中</span>
        </div>
        <Link
          to="/demo/showcase"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          ツアーに戻る
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
