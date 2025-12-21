# Phase 37: プリセット管理へのアクセス改善

## 概要
「いつもの指示」（プリセット管理）ページへのアクセス方法を改善。
品物管理ページのヘッダーにナビゲーションリンクを追加。

## 実装日
2025-12-22

## 変更内容

### UI変更
- 品物管理ページ（`/family/items`）のヘッダーに「⭐ いつもの指示」ボタン追加
- レスポンシブ対応:
  - モバイル（<640px）: アイコン（⭐）のみ表示
  - タブレット以上（≥640px）: 「⭐ いつもの指示」テキスト表示
- スタイル: アウトラインボタン（`border border-primary text-primary`）

### 実装ファイル
| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/pages/family/ItemManagement.tsx` | ヘッダーにプリセット管理リンク追加 |
| `frontend/e2e/preset-navigation.spec.ts` | E2Eテスト5件追加 |
| `docs/PRESET_MANAGEMENT_SPEC.md` | セクション5.1にアクセス方法追記 |

## E2Eテスト
- PRESET-NAV-001: リンク表示確認
- PRESET-NAV-002: 遷移確認
- PRESET-NAV-003: デモモード動作確認
- PRESET-NAV-004: 本番モード動作確認
- PRESET-NAV-005: レスポンシブ表示確認

## コミット
`321619f` - feat(Phase 37): プリセット管理へのアクセス改善

## 本番デプロイ
完了（GitHub Actions自動デプロイ）
