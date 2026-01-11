# Architecture Decision Records (ADR)

このディレクトリには、プロジェクトの重要な技術判断を記録したADRを保存します。

## ADRとは

ADR（Architecture Decision Record）は、重要なアーキテクチャ上の決定とその理由を記録したドキュメントです。

## ADR作成基準

以下の変更時にADRを作成します：

- アーキテクチャの変更
- データモデルの変更
- 外部サービスの採用/変更
- セキュリティ設計の変更
- 重要なトレードオフ判断

## ファイル命名規則

```
NNNN-short-title.md
```

例: `0001-firebase-authentication.md`

## ADRテンプレート

```markdown
# タイトル

## Status

Accepted / Superseded / Rejected

## Context

なぜこの議論が必要か

## Decision

最終決定

## Consequences

メリット/デメリット/影響

## Alternatives

検討したが採用しなかった案
```

## 現在のADR

（新規作成時にここにリストを追加）

## 参考

- [CLAUDE.md](../../CLAUDE.md) - ADR作成ルール
