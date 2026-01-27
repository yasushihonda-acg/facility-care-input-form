# 技術的負債の優先度（2025年1月レビュー）

> **正式な記録**: docs/adr/0001-technical-debt-review.md を参照

## サマリー

### 対応済み
- **H1**: mealFormSettings認証問題 → Phase 69で完了（Firebase Auth追加）

### 延期（対応不要と判断）
- **H2/M2**: timestamp形式の不整合
  - 理由: summaryServiceがフロントエンドで未使用、修正リスクがメリットを上回る
  - 詳細: ADR参照

### 将来対応
- M1: 同期の読み取り範囲が固定
- M3: 水分記録更新のタイムスタンプ検索
- M4: 決定論的IDの改善
- L1/L2: 軽微な改善

## 教訓（Phase 70失敗から）
1. 使われていない機能を「直す」のはリスク
2. 理論的な問題 ≠ 実際の問題
3. Firestoreの`orderBy`は存在しないフィールドを除外する

## 参照
- ADR: docs/adr/0001-technical-debt-review.md
