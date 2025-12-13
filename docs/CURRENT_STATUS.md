# 現在のステータス

> **最終更新**: 2025年12月13日 (Phase 4 デモ版PWAデプロイ完了)
>
> このファイルは、会話セッションをクリアした後でも開発を継続できるよう、現在の進捗状況を記録しています。

---

## プロジェクト概要

**リポジトリ**: https://github.com/yasushihonda-acg/facility-care-input-form

**目的**: 介護施設向けコミュニケーションアプリのプロトタイプ（デモ版）を開発・公開する

**デモURL**: https://facility-care-input-form.web.app

---

## 現在の進捗

### 完了済み

| 項目 | 状態 | 成果物 |
|------|------|--------|
| ドキュメント設計 | 完了 | `docs/ARCHITECTURE.md` |
| 業務ルール定義 | 完了 | `docs/BUSINESS_RULES.md` |
| API仕様定義 | 完了 | `docs/API_SPEC.md` |
| ロードマップ作成 | 完了 | `docs/ROADMAP.md` |
| セットアップ手順書 | 完了 | `docs/SETUP.md` |
| GitHubリポジトリ作成 | 完了 | `yasushihonda-acg/facility-care-input-form` |
| Phase 1: 基盤構築 | 完了 | GCP/Firebase環境構築済み |
| Phase 2: バックエンド実装 | 完了 | 全7エンドポイント実装済み |
| Phase 3: デプロイ・検証 | 完了 | Sheet A読み取り (11シート・13,603件) |
| Phase 4: デモ版PWA開発 | 完了 | Firebase Hostingデプロイ完了 |

### 次のタスク: デモ実施・フィードバック収集

**デモ版PWAの動作確認・フィードバック収集**

PWAが公開されました。以下の内容でデモ・検証を行います：

1. **モバイル実機テスト**: スマートフォンで https://facility-care-input-form.web.app にアクセス
2. **PWAインストール確認**: ホーム画面に追加できるか確認
3. **同期機能テスト**: 手動同期ボタンが正常に動作するか確認
4. **シートデータ閲覧**: 全11シートのデータが表示されるか確認

---

### 後回し (デモ版対象外)

**Sheet B へのサービスアカウント共有**

実績入力機能はデモ版対象外のため、Sheet B共有は後回し。

| サービスアカウント | 共有先 | 権限 | 状態 |
|-------------------|--------|------|------|
| `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | Sheet B | 編集者 | 後回し |

---

## 開発ロードマップ進捗

```
Phase 1: 基盤構築 + CI/CD   ████████████████████ 100% (完了)
Phase 2: バックエンド実装    ████████████████████ 100% (完了)
Phase 3: デプロイ・検証      ████████████████████ 100% (完了)
Phase 4: デモ版PWA開発      ████████████████████ 100% (完了)
```

詳細: [docs/ROADMAP.md](./ROADMAP.md)

---

## デプロイ済みリソース

### PWA (Firebase Hosting)

| 項目 | 値 |
|------|-----|
| URL | https://facility-care-input-form.web.app |
| 技術スタック | React + Vite + TailwindCSS + TanStack Query |
| PWA対応 | Service Worker、オフラインキャッシュ対応 |

### Cloud Functions

ベースURL: `https://asia-northeast1-facility-care-input-form.cloudfunctions.net`

| メソッド | パス | 説明 | 状態 |
|----------|------|------|------|
| GET | `/healthCheck` | ヘルスチェック | 動作確認済み |
| POST | `/syncPlanData` | 記録データを同期 | 動作確認済み (13,603件同期) |
| POST | `/submitCareRecord` | ケア実績を入力 | Sheet B共有待ち |
| POST | `/submitFamilyRequest` | 家族要望を送信 | 動作可能 |
| POST | `/uploadCareImage` | 画像をアップロード | Drive権限未確認 |
| GET | `/getPlanData` | 同期済み記録を取得 | 動作可能 |
| GET | `/getFamilyRequests` | 家族要望一覧を取得 | 動作可能 |

---

## 実装済みファイル構造

```
facility-care-input-form/
├── frontend/                     # デモ版PWA (React + Vite)
│   ├── src/
│   │   ├── api/                  # API呼び出し
│   │   ├── components/           # UIコンポーネント
│   │   ├── hooks/                # カスタムフック（同期・データ取得）
│   │   ├── pages/                # ページコンポーネント
│   │   ├── types/                # 型定義
│   │   ├── App.tsx               # ルーティング
│   │   ├── main.tsx              # エントリポイント
│   │   └── index.css             # TailwindCSS
│   ├── public/                   # PWAアイコン等
│   ├── vite.config.ts            # Vite + PWA設定
│   └── package.json
├── functions/src/                # Cloud Functions
│   ├── index.ts                  # エントリポイント
│   ├── config/
│   │   └── sheets.ts             # スプレッドシートID、Bot連携定数
│   ├── types/
│   │   └── index.ts              # 型定義
│   ├── services/
│   │   ├── sheetsService.ts      # Google Sheets API ラッパー
│   │   ├── firestoreService.ts   # Firestore CRUD操作
│   │   └── driveService.ts       # Google Drive API ラッパー
│   └── functions/
│       ├── healthCheck.ts        # ヘルスチェック
│       ├── syncPlanData.ts       # Flow A: 記録同期
│       ├── submitCareRecord.ts   # Flow B: 実績入力
│       ├── submitFamilyRequest.ts# Flow C: 家族要望
│       ├── uploadCareImage.ts    # 画像アップロード
│       ├── getPlanData.ts        # 記録データ取得
│       └── getFamilyRequests.ts  # 家族要望取得
├── docs/                         # ドキュメント
├── firebase.json                 # Firebase設定（Hosting追加済み）
└── firestore.rules               # Firestoreルール
```

---

## 重要な情報

### サービスアカウント

**統一済み**: 全用途で単一のサービスアカウントを使用

| 用途 | サービスアカウント |
|------|-------------------|
| Cloud Functions / CI/CD / スプレッドシート連携 | `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` |

### スプレッドシート共有状態

| シート | ID | 必要な権限 | 共有状態 |
|--------|-----|-----------|----------|
| Sheet A (記録の結果) | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | 閲覧者 | 完了 |
| Sheet B (実績入力先) | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | 編集者 | ペンディング |

### Dev Mode設定

- 認証: なし（`allUsers` に `cloudfunctions.invoker` 付与済み）
- Firestore: 全開放（`allow read, write: if true;`）
- 本番移行時に必ず認証を実装すること

---

## 再開時の手順

1. `docs/CURRENT_STATUS.md` を読んで現在の進捗を確認
2. https://facility-care-input-form.web.app でPWAの動作確認
3. フィードバックを元に改善タスクを実施

---

## AIエージェントへの指示

会話をクリアした後、このプロジェクトの開発を継続する場合は、以下のように指示してください：

```
facility-care-input-form プロジェクトの開発を継続してください。
docs/CURRENT_STATUS.md を読んで、次のタスクから再開してください。
```
