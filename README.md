# 介護施設向け入居者様ご家族コミュニケーションアプリ

蒲池様プロジェクト - 介護施設における記録閲覧・実績入力・要望送信のためのモバイルアプリ基盤

## 概要

既存の業務フロー（スプレッドシート・FAX）を維持しつつ、モバイルアプリで以下の機能を提供します：

- **記録の閲覧**: 施設側が管理するケアプラン・指示内容の参照
- **実績の入力**: スタッフによる食事介助記録などの入力
- **要望の送信**: ご家族からの詳細なケア要望・指示

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| Backend | Cloud Functions (2nd gen) + TypeScript |
| Database | Cloud Firestore |
| External API | Google Sheets API, Google Drive API |
| 認証 | なし（Dev Mode） |
| CI/CD | GitHub Actions |

## プロジェクト情報

| 項目 | 値 |
|------|-----|
| GCPプロジェクトID | `facility-care-input-form` |
| リージョン | `asia-northeast1` (東京) |
| リポジトリ | Private |

## データフロー

本システムは3つの独立したデータフローで構成されています：

```
┌─────────────────────────────────────────────────────────────────┐
│                         Mobile App                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Functions                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   syncPlanData  │ submitCareRecord│    submitFamilyRequest      │
│    (Flow A)     │    (Flow B)     │         (Flow C)            │
└────────┬────────┴────────┬────────┴──────────────┬──────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────┐ ┌─────────────────┐   ┌───────────────┐
│   Sheet A       │ │   Sheet B       │   │   Firestore   │
│  (Read-Only)    │ │  (Write-Only)   │   │               │
│  記録の結果/参照 │ │   実績入力先    │   │ family_requests│
└─────────────────┘ └─────────────────┘   └───────────────┘
```

### Flow A: 記録参照フロー
- **Role**: Read-Only（読み取り専用）
- **概要**: FAX等で届いた指示内容が施設側で記録されたデータを同期

### Flow B: 実績入力フロー
- **Role**: Write-Only（書き込み専用）
- **概要**: スタッフが入力したケア実績を既存スプレッドシートに追記
- **特殊仕様**: 既存Bot連携のための特殊書き込みルール

### Flow C: 家族要望フロー
- **Role**: Firestoreで完結
- **概要**: ご家族からの詳細なケア要望を管理

## クイックスタート

### 開発を再開する場合

```bash
# 1. 現在のステータスを確認
cat docs/CURRENT_STATUS.md

# 2. アカウント設定
gh auth switch --user yasushihonda-acg
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form
firebase use facility-care-input-form

# 3. 依存関係インストール
cd functions && npm install

# 4. Emulator起動
firebase emulators:start --only functions,firestore
```

### 新規環境セットアップ

[docs/SETUP.md](./docs/SETUP.md) を参照してください。

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [CLAUDE.md](./CLAUDE.md) | **プロジェクト設定・記憶（AIエージェント用）** |
| [docs/CURRENT_STATUS.md](./docs/CURRENT_STATUS.md) | **現在の進捗状況（再開時に最初に読む）** |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | 開発ロードマップ（Phase 1〜4） |
| [docs/SETUP.md](./docs/SETUP.md) | 環境セットアップガイド（CLI版） |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | システム全体設計・データフロー定義 |
| [docs/BUSINESS_RULES.md](./docs/BUSINESS_RULES.md) | 業務ルール・Bot連携ハック・FAXデータ仕様 |
| [docs/API_SPEC.md](./docs/API_SPEC.md) | API仕様書（Dev Mode） |

## 開発モード (Dev Mode)

本プロジェクトは機能検証フェーズのため、以下の設定で動作します：

| 項目 | 設定 |
|------|------|
| Firebase Authentication | 未実装 |
| Cloud Functions | `--allow-unauthenticated` |
| Firestore Security Rules | `allow read, write: if true;` |

> **注意**: 本設定はプロトタイプ検証用です。本番環境では認証・認可を実装してください。

## ディレクトリ構成

```
facility-care-input-form/
├── CLAUDE.md                 # AIエージェント用設定・記憶
├── README.md
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── .gitignore
├── docs/
│   ├── CURRENT_STATUS.md     # 進捗管理
│   ├── ROADMAP.md            # ロードマップ
│   ├── SETUP.md              # セットアップ手順
│   ├── ARCHITECTURE.md       # 設計ドキュメント
│   ├── BUSINESS_RULES.md     # 業務ルール
│   └── API_SPEC.md           # API仕様
├── functions/
│   ├── src/
│   │   └── index.ts          # エントリーポイント
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.js
│   └── .env                  # 環境変数（Git管理外）
├── keys/                     # サービスアカウントキー（Git管理外）
└── .github/
    └── workflows/            # CI/CD設定
```

## CI/CD

GitHub Actionsで以下を自動化：

- **PR時**: Lint・ビルドチェック
- **mainマージ時**: Firebase自動デプロイ

## ライセンス

Private - All rights reserved
