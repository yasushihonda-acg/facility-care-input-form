# 現在のステータス

> **最終更新**: 2025年12月13日
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
| Phase 1-1: GCPプロジェクト作成 | ✅ 完了 | `facility-care-input-form` |
| Phase 1-2: Firebase初期化 | ✅ 完了 | `firebase.json`, `.firebaserc`, `functions/` |
| Phase 1-3: API有効化 | ✅ 完了 | Firestore, Sheets, Drive, Cloud Functions, Cloud Run |
| Phase 1-4: サービスアカウント設定 | ✅ 完了 | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |
| Phase 1-5: ローカル開発環境構築 | ✅ 完了 | Emulator動作確認済み |

### 次のタスク ⬜

**Phase 2-1: バックエンド実装 - ディレクトリ構造作成**

```bash
cd /Users/yyyhhh/facility-care-input-form/functions/src
mkdir -p config functions services types
```

詳細手順: [docs/ROADMAP.md](./ROADMAP.md) の「Phase 2」セクション

---

## 開発ロードマップ進捗

```
Phase 1: 基盤構築        ████████████████████ 100% (完了)
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

### 2. アカウント設定

```bash
# GitHub
gh auth switch --user yasushihonda-acg

# GCP
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form

# Firebase
firebase use facility-care-input-form
```

### 3. ドキュメント確認

```bash
# 現在のステータス確認
cat docs/CURRENT_STATUS.md

# ロードマップ確認
cat docs/ROADMAP.md
```

### 4. 次のタスク実行

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

### GCPプロジェクト

| 項目 | 値 |
|------|-----|
| プロジェクトID | `facility-care-input-form` |
| プロジェクト番号 | `672520607884` |
| リージョン | `asia-northeast1` (東京) |

### サービスアカウント

| 項目 | 値 |
|------|-----|
| 名前 | `facility-care-sa` |
| メールアドレス | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |
| キーファイル | `keys/sa-key.json` (Git管理外) |

### スプレッドシートID

| 用途 | Sheet ID | アクセス権 | SA共有状態 |
|------|----------|------------|------------|
| Sheet A（記録の結果） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | Read-Only | 完了 |
| Sheet B（実績入力先） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | Write-Only | ペンディング |

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
facility-care-input-form プロジェクトの Phase 2-1 (バックエンド実装) を実行してください。
docs/ROADMAP.md の手順に従ってください。
```
