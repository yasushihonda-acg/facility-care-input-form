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

### コア機能
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/healthCheck` | ヘルスチェック |
| POST | `/syncPlanData` | 記録データ同期 |
| GET | `/getPlanData` | 記録データ取得 |
| POST | `/submitMealRecord` | 食事記録入力 |
| POST | `/uploadCareImage` | 画像アップロード |
| GET | `/getMealFormSettings` | 設定取得 |
| POST | `/updateMealFormSettings` | 設定更新 |
| POST | `/testWebhook` | Webhookテスト |
| POST | `/testDriveAccess` | Driveアクセステスト |

### 品物管理 (Phase 8.1)
| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/createCareItem` | 品物登録 |
| GET | `/getCareItems` | 品物一覧取得 |
| PUT | `/updateCareItem` | 品物更新 |
| DELETE | `/deleteCareItem` | 品物削除 |

### タスク管理 (Phase 8.2)
| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/createTask` | タスク作成 |
| GET | `/getTasks` | タスク一覧取得 |
| PUT | `/updateTask` | タスク更新・完了 |
| DELETE | `/deleteTask` | タスク削除 |
| SCHED | `/generateDailyTasks` | タスク自動生成（毎日6時） |

### 統計・AI (Phase 8.3-8.4)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getStats` | 統計データ取得 |
| POST | `/aiSuggest` | AI品物入力補助（Gemini） |

### プリセット (Phase 8.6-8.7)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getPresets` | プリセット一覧取得 |
| POST | `/createPreset` | プリセット作成 |
| PUT | `/updatePreset` | プリセット更新 |
| DELETE | `/deletePreset` | プリセット削除 |
| POST | `/saveAISuggestionAsPreset` | AI提案をプリセット保存 |

### 禁止ルール (Phase 9.x)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getProhibitions` | 禁止ルール一覧取得 |
| POST | `/createProhibition` | 禁止ルール作成 |
| PUT | `/updateProhibition` | 禁止ルール更新 |
| DELETE | `/deleteProhibition` | 禁止ルール削除 |

### 消費記録 (Phase 9.2)
| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/recordConsumptionLog` | 消費ログ記録 |
| GET | `/getConsumptionLogs` | 消費ログ一覧取得 |

### 統計拡張 (Phase 9.3)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getInventorySummary` | 在庫サマリー取得 |
| GET | `/getFoodStats` | 食品傾向分析取得 |

## デモ機能

### デモショーケース
- **URL**: https://facility-care-input-form.web.app/demo
- **ガイド付きツアー**: `/demo/showcase`
- **デモモード判定**: `useDemoMode` フック（パスが `/demo` で始まるか判定）
- **シードデータ**: `frontend/src/data/demo/` に12品物、18ログ、9タスク等

### ツアーナビゲーション（ヘッダーボタン）
- `/demo/*` ページ（`/demo/showcase` 除く）でヘッダー右側にオレンジ色のボタン表示
- 「🎯 ツアー」ボタンでいつでもツアートップに戻れる
- スクロールしても常に見える（sticky header）
- `frontend/src/components/demo/DemoHeaderButton.tsx`

### E2Eテスト
- **テストファイル**: `frontend/e2e/demo-page.spec.ts`
- **テスト件数**: 42件
- **実行**: `cd frontend && npx playwright test`

## 重要な設定

### Firestore undefined 対策
`functions/src/index.ts` で以下の設定によりオプショナルフィールドのundefinedエラーを防止:
```typescript
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});
```
詳細は `docs/API_TEST_PLAN.md` 参照。

### APIテスト
- **テスト計画書**: `docs/API_TEST_PLAN.md`
- **対象API**: submitCareItem, createPreset, createProhibition, createTask
- **テスト結果**: 全て成功（2025-12-17）

## ドキュメント構成（36ファイル）

### 必読（引き継ぎ時）
| 優先度 | ファイル | 用途 |
|--------|----------|------|
| ⭐⭐⭐ | `docs/CURRENT_STATUS.md` | 進捗・次のタスク（最初に読む） |
| ⭐⭐⭐ | `docs/HANDOVER.md` | 引き継ぎ（クイックスタート付き） |
| ⭐⭐ | `CLAUDE.md` | アカウント設定・開発方針 |
| ⭐ | `docs/API_SPEC.md` | API仕様書 |

### GitHub Pages
- **URL**: https://yasushihonda-acg.github.io/facility-care-input-form/
- **ファイル**: `gh-pages/index.html`, `gh-pages/architecture.html`
- **自動デプロイ**: mainへpushで自動更新
