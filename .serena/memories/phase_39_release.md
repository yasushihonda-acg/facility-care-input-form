# Phase 39 Release Notes

## リリース日
2025-12-22

## 概要
ロール別ベースカラー実装 - 家族/スタッフ/管理者で自動的にテーマカラーを切り替え

## カラー設計

| ロール | Primary | Light | Dark |
|--------|---------|-------|------|
| スタッフ（デフォルト） | Green #22C55E | #4ADE80 | #16A34A |
| 家族 | Orange #F97316 | #FB923C | #EA580C |
| 管理者 | Blue #2563EB | #3B82F6 | #1D4ED8 |

## 実装方式
CSS変数 + data属性方式
- `<html data-role="family">` を付与
- CSSセレクタ `:root[data-role="family"]` で変数上書き
- 既存の `bg-primary` 等のクラスはそのまま動作

## ロール判定ロジック
1. `?admin=true` → 管理者（Blue）
2. `/family/*`, `/demo/family/*` → 家族（Orange）
3. `/staff/*`, `/demo/staff/*` → スタッフ（Green）
4. `/view`, `/stats` 等の共有ページ → localStorageから直前ロール復元

## 新規ファイル
- `frontend/src/utils/roleTheme.ts` - detectRole(), applyRoleTheme()
- `frontend/src/hooks/useRoleTheme.ts` - パス変更時の自動適用フック

## 変更ファイル
- `frontend/src/index.css` - @theme変更 + ロール別CSS変数追加
- `frontend/src/App.tsx` - useRoleTheme()呼び出し追加

## コミット
- `0f51ee6` - feat(Phase 39): ロール別ベースカラー実装

## 動作確認URL
- スタッフ（Green）: https://facility-care-input-form.web.app/demo/staff
- 家族（Orange）: https://facility-care-input-form.web.app/demo/family
- 設定ページ: https://facility-care-input-form.web.app/settings

## Phase 39.1 追加変更（2025-12-22）
- 管理者ロール（Blue）を廃止
- /settings を独立ページ化（フッターなし）
- ロール判定を4パターンに簡素化（staff/family/shared/settings）
- ROLE_THEME_DESIGN.md を docs/archive/ に移動
