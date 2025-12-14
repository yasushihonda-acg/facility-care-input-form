# プロジェクト概要: facility-care-input-form

## 目的
介護施設向けコミュニケーションアプリのプロトタイプ（デモ版）。
Google スプレッドシートとの連携を行い、介護記録の閲覧・入力を実現する。

## デモURL
https://facility-care-input-form.web.app

## アーキテクチャ

### 主要フロー
- **Flow A**: 記録同期 (Sheet A → Firestore → PWA)
- **Flow B**: 実績入力 (PWA → Cloud Functions → Sheet B)
- **Flow C**: 家族要望 (PWA → Firestore)

### スプレッドシート
| 用途 | Sheet ID | 権限 |
|------|----------|------|
| Sheet A（記録の結果・読取） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | 閲覧者 |
| Sheet B（実績入力先・書込） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | 編集者 |

### サービスアカウント
`facility-care-sa@facility-care-input-form.iam.gserviceaccount.com`

## 技術スタック

### フロントエンド (`frontend/`)
- React 19 + TypeScript
- Vite 7
- TailwindCSS v4
- TanStack Query
- React Router v7
- PWA対応 (vite-plugin-pwa)

### バックエンド (`functions/`)
- Cloud Functions (Firebase)
- Node.js 20
- TypeScript
- Firebase Admin SDK
- Google APIs (Sheets, Drive)
- Firestore

### インフラ
- Firebase Hosting
- Cloud Functions (asia-northeast1)
- Firestore
- Cloud Scheduler (同期ジョブ)

## ディレクトリ構成

```
facility-care-input-form/
├── frontend/              # React PWA
│   └── src/
│       ├── pages/         # ページコンポーネント
│       ├── components/    # UIコンポーネント
│       ├── hooks/         # カスタムフック
│       ├── api/           # API呼び出し
│       ├── types/         # 型定義
│       └── config/        # 設定
├── functions/             # Cloud Functions
│   └── src/
│       ├── functions/     # 各エンドポイント
│       ├── services/      # サービス層 (Sheets, Firestore)
│       ├── types/         # 型定義
│       └── config/        # 設定
├── docs/                  # ドキュメント
├── keys/                  # SA鍵 (Git管理外)
└── .github/workflows/     # CI/CD
```

## Cloud Functions エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/healthCheck` | ヘルスチェック |
| POST | `/syncPlanData` | 記録データ同期 |
| POST | `/submitMealRecord` | 食事記録入力 |
| POST | `/submitCareRecord` | ケア実績入力 (deprecated) |
| POST | `/submitFamilyRequest` | 家族要望送信 |
| POST | `/uploadCareImage` | 画像アップロード |
| GET | `/getPlanData` | 記録データ取得 |
| GET | `/getFamilyRequests` | 家族要望一覧取得 |
