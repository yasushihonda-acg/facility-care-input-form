---
status: working
scope: test
owner: core-team
last_reviewed: 2025-12-20
links:
  - docs/API_TEST_PLAN.md
  - docs/E2E_TEST_SPEC.md
  - docs/ADMIN_TEST_FEATURE_SPEC.md
---

# テスト戦略

> **統合ドキュメント**: 本ドキュメントはテスト関連仕様を集約した包括的なガイドです。

---

## 1. 目的

本プロジェクトにおけるテストの目的・方針・実施基準を定義し、品質を担保する。

---

## 2. テストピラミッド

```
          ┌─────────────┐
          │   E2E Test  │  ← 少数の重要シナリオ
          ├─────────────┤
          │ Integration │  ← API・DB結合テスト
          ├─────────────┤
          │  Unit Test  │  ← 多数のロジックテスト
          └─────────────┘
```

| レベル | 対象 | ツール | 実行頻度 |
|--------|------|--------|----------|
| E2E | ユーザーシナリオ | Playwright | PR/デプロイ前 |
| Integration | API・Firestore | 手動curl/スクリプト | 機能追加時 |
| Unit | ビジネスロジック | Vitest | コミット時 |

---

## 3. 品質ゲート

| ゲート | 基準 | 確認方法 |
|--------|------|----------|
| Lint | エラーゼロ | `npm run lint` |
| TypeScript | エラーゼロ | `npm run build` |
| E2Eテスト | 全パス | `npx playwright test` |
| コードレビュー | 1名以上承認 | PR |

---

## 4. 受入基準

- 新機能追加時: 対応するE2Eテストを追加
- バグ修正時: 再発防止テストを追加
- API変更時: Integration テストを実施・記録

---

## 5. テスト仕様詳細

以下のドキュメントに詳細仕様を記載しています。

### 5.1 E2Eテスト仕様

**ファイル**: [E2E_TEST_SPEC.md](./E2E_TEST_SPEC.md)

- Playwright によるブラウザ自動テスト
- デモページ・家族シナリオ・間食記録連携のテストケース
- 現在 212件 のテストケースがパス

#### 主要テストカテゴリ

| カテゴリ | 概要 |
|----------|------|
| デモページ | `/demo` 配下の基本動作確認 |
| 家族シナリオ | 家族ユーザー目線のシナリオテスト |
| パリティテスト | デモ↔本番の同一性検証 |
| 間食記録連携 | 品物リスト・提供記録の連携確認 |

### 5.2 APIテスト計画

**ファイル**: [API_TEST_PLAN.md](./API_TEST_PLAN.md)

- Firestore undefined エラー検証
- 主要API（submitCareItem, createPreset, createProhibition, createTask）の手動検証
- 本番環境への影響を最小化するテスト設計

### 5.3 管理設定テスト機能

**ファイル**: [ADMIN_TEST_FEATURE_SPEC.md](./ADMIN_TEST_FEATURE_SPEC.md)

- Google Chat Webhook テスト機能
- Google Drive フォルダアクセステスト
- 設定画面からの接続確認UI

---

## 6. テスト実行コマンド

```bash
# E2Eテスト（全件）
npx playwright test

# E2Eテスト（特定ファイル）
npx playwright test tests/demo-pages.spec.ts

# E2Eテスト（UIモード）
npx playwright test --ui

# E2Eテスト（本番環境）
BASE_URL=https://facility-care-input-form.web.app npx playwright test

# Lint
npm run lint

# TypeScript ビルド確認
npm run build
```

---

## 7. 関連ドキュメント

- [E2E_TEST_SPEC.md](./E2E_TEST_SPEC.md) - E2Eテスト仕様
- [API_TEST_PLAN.md](./API_TEST_PLAN.md) - APIテスト計画
- [ADMIN_TEST_FEATURE_SPEC.md](./ADMIN_TEST_FEATURE_SPEC.md) - 管理設定テスト機能

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-20 | 統合ドキュメント作成 |
