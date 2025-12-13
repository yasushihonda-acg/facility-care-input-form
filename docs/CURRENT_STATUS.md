# 現在のステータス

> **最終更新**: 2024年12月13日
>
> このファイルは、会話セッションをクリアした後でも開発を継続できるよう、現在の進捗状況を記録しています。

---

## プロジェクト概要

**リポジトリ**: https://github.com/yasushihonda-acg/facility-care-input-form

**目的**: 介護施設向けコミュニケーションアプリのプロトタイプ（デモ版）を開発・公開する

---

## 現在の進捗

### 完了済み ✅

| 項目 | 状態 | 成果物 |
|------|------|--------|
| ドキュメント設計 | ✅ 完了 | `docs/ARCHITECTURE.md` |
| 業務ルール定義 | ✅ 完了 | `docs/BUSINESS_RULES.md` |
| API仕様定義 | ✅ 完了 | `docs/API_SPEC.md` |
| ロードマップ作成 | ✅ 完了 | `docs/ROADMAP.md` |
| セットアップ手順書 | ✅ 完了 | `docs/SETUP.md` |
| GitHubリポジトリ作成 | ✅ 完了 | `yasushihonda-acg/facility-care-input-form` |

### 次のタスク ⬜

**Phase 1-1: GCPプロジェクト作成**

```bash
# 1. プロジェクトID設定（ユニークな名前に変更可）
PROJECT_ID="facility-care-demo-$(date +%Y%m%d)"

# 2. プロジェクト作成
gcloud projects create $PROJECT_ID --name="Facility Care Demo"

# 3. プロジェクト選択
gcloud config set project $PROJECT_ID

# 4. 請求先アカウントのリンク
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID
```

詳細手順: [docs/SETUP.md](./SETUP.md) の「Phase 1-1」セクション

---

## 開発ロードマップ進捗

```
Phase 1: 基盤構築        ░░░░░░░░░░░░░░░░░░░░  0% (未着手)
Phase 2: バックエンド実装  ░░░░░░░░░░░░░░░░░░░░  0% (未着手)
Phase 3: デプロイ・検証    ░░░░░░░░░░░░░░░░░░░░  0% (未着手)
Phase 4: デモ準備         ░░░░░░░░░░░░░░░░░░░░  0% (未着手)
```

詳細: [docs/ROADMAP.md](./ROADMAP.md)

---

## 再開時の手順

### 1. リポジトリクローン（新環境の場合）

```bash
git clone https://github.com/yasushihonda-acg/facility-care-input-form.git
cd facility-care-input-form
```

### 2. ドキュメント確認

```bash
# 現在のステータス確認
cat docs/CURRENT_STATUS.md

# ロードマップ確認
cat docs/ROADMAP.md

# セットアップ手順確認
cat docs/SETUP.md
```

### 3. 次のタスク実行

このファイルの「次のタスク」セクションに記載されたコマンドを実行

---

## ドキュメント一覧

| ファイル | 内容 | いつ読むか |
|----------|------|------------|
| `CURRENT_STATUS.md` | 現在の進捗（本ファイル） | 再開時に最初に読む |
| `ROADMAP.md` | 開発ロードマップ | 全体像を把握したい時 |
| `SETUP.md` | 環境構築手順 | Phase 1 実行時 |
| `ARCHITECTURE.md` | システム設計 | 技術的な仕様を確認したい時 |
| `BUSINESS_RULES.md` | 業務ルール | Bot連携など特殊仕様を確認したい時 |
| `API_SPEC.md` | API仕様 | エンドポイント実装時 |

---

## 重要な情報

### スプレッドシートID

| 用途 | Sheet ID | アクセス権 |
|------|----------|------------|
| Sheet A（記録の結果） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | Read-Only |
| Sheet B（実績入力先） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | Write-Only |

### GitHubアカウント

- **リポジトリ所有者**: `yasushihonda-acg`
- **ghコマンド認証**: `gh auth switch --user yasushihonda-acg` で切り替え

### Dev Mode設定

- 認証: なし（`--allow-unauthenticated`）
- Firestore: 全開放（`allow read, write: if true;`）
- 本番移行時に必ず認証を実装すること

---

## AIエージェントへの指示

会話をクリアした後、このプロジェクトの開発を継続する場合は、以下のように指示してください：

```
facility-care-input-form プロジェクトの開発を継続してください。
docs/CURRENT_STATUS.md を読んで、次のタスクから再開してください。
```

または、特定のPhaseから開始する場合：

```
facility-care-input-form プロジェクトの Phase 1-1 (GCPプロジェクト作成) を実行してください。
docs/SETUP.md の手順に従ってください。
```
