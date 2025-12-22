# 引き継ぎドキュメント

> 最終更新: 2025-12-22

## クイックスタート（5分で開発開始）

### 1. 認証設定
```bash
# GitHub
gh auth switch --user yasushihonda-acg

# GCP
gcloud config set account yasushi.honda@aozora-cg.com
gcloud config set project facility-care-input-form

# Firebase
firebase login:use yasushi.honda@aozora-cg.com
firebase use facility-care-input-form
```

### 2. 開発サーバー起動
```bash
cd frontend && npm run dev
# → http://localhost:5173
```

### 3. 変更をデプロイ
```bash
git add -A && git commit -m "変更内容" && git push origin main
# → GitHub Actionsで自動デプロイ
```

---

## 主要URL

| 用途 | URL |
|------|-----|
| **本番サイト** | https://facility-care-input-form.web.app |
| **デモ（家族）** | https://facility-care-input-form.web.app/demo |
| **デモ（スタッフ）** | https://facility-care-input-form.web.app/demo/staff |
| **GitHub Pages** | https://yasushihonda-acg.github.io/facility-care-input-form/ |
| **リポジトリ** | https://github.com/yasushihonda-acg/facility-care-input-form |

---

## プロジェクト構成

```
facility-care-input-form/
├── CLAUDE.md          # 開発設定・アカウント情報
├── frontend/          # React PWA (Vite + TailwindCSS)
│   ├── src/           # ソースコード
│   └── e2e/           # E2Eテスト (Playwright)
├── functions/         # Cloud Functions (Firebase)
├── docs/              # ドキュメント
│   ├── ARCHITECTURE.md   # システム設計
│   ├── API_SPEC.md       # API仕様
│   ├── BUSINESS_RULES.md # 業務ルール
│   └── archive/          # 過去の仕様書
└── gh-pages/          # GitHub Pages
```

---

## 主要コマンド

### 開発
```bash
# フロントエンド開発
cd frontend && npm run dev

# ビルド
cd frontend && npm run build

# Lint
cd frontend && npm run lint
npm run lint --prefix functions
```

### テスト
```bash
# E2Eテスト（ローカル）
cd frontend && npm run build
npm run preview -- --port 4173 &
npx playwright test

# 本番環境でテスト
BASE_URL=https://facility-care-input-form.web.app npx playwright test
```

### デプロイ
```bash
# 自動デプロイ（推奨）
git push origin main

# 手動デプロイ（緊急時のみ）
firebase deploy --only hosting
firebase deploy --only functions
```

---

## 認証情報

### サービスアカウント
- **メール**: `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com`
- **キー**: `keys/sa-key.json`（Git管理外）

### スプレッドシート
| 用途 | Sheet ID |
|------|----------|
| Sheet A（読取） | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` |
| Sheet B（書込） | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` |
| 水分摂取量 | `1su5K9TjmzMfKc8OIK2aZYXCfuDrNeIRM0a3LUCFcct4` |

---

## トラブルシューティング

### Firebase CLI認証エラー
```bash
firebase login:list
firebase login:add  # ブラウザでログイン
firebase login:use yasushi.honda@aozora-cg.com
```

### Firestoreインデックスエラー
エラーメッセージ内のURLからFirestoreコンソールでインデックスを作成。

### Cloud Functions デプロイ失敗
```bash
npm run build --prefix functions  # まずビルド確認
firebase deploy --only functions --debug
```

---

## 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| `CLAUDE.md` | 開発設定・アカウント・コマンド |
| `docs/ARCHITECTURE.md` | システム設計・データフロー |
| `docs/API_SPEC.md` | API仕様（全エンドポイント） |
| `docs/BUSINESS_RULES.md` | 業務ルール・投稿ID規則 |
| `docs/archive/` | 過去のPhase仕様書 |

---

## 実装済み機能一覧

### 家族向け (`/family`, `/demo/family`)
| 機能 | パス | 説明 |
|------|------|------|
| ダッシュボード | `/family` | ケア記録タイムライン表示 |
| 品物管理 | `/family/items` | 送付品の登録・在庫・期限管理 |
| 品物詳細 | `/family/items/:id` | 品物の詳細表示 |
| 品物編集 | `/family/items/:id/edit` | 品物の編集 |
| 品物登録 | `/family/items/new` | 新規品物の登録フォーム |
| プリセット | `/family/presets` | よく送る品物の組み合わせ保存 |
| タスク一覧 | `/family/tasks` | タスク管理 |
| ケア指示 | `/family/request` | ケア指示の作成 |
| エビデンス確認 | `/family/evidence/:date` | 日別エビデンス確認 |

### スタッフ向け (`/staff`, `/demo/staff`)
| 機能 | パス | 説明 |
|------|------|------|
| スタッフホーム | `/staff` | スタッフ用トップページ |
| 食事入力 | `/staff/input/meal` | 食事記録入力（写真・Chat通知） |
| 家族連絡一覧 | `/staff/family-messages` | 家族からの品物・指示を確認 |
| 家族連絡詳細 | `/staff/family-messages/:id` | 品物詳細・消費記録入力 |
| 記録閲覧 | `/view` | 全ケア記録の閲覧・検索 |
| 統計 | `/stats` | 品物・摂食統計ダッシュボード |

### 管理者向け
| 機能 | パス | 説明 |
|------|------|------|
| 設定 | `/staff/input/meal?admin=true` | Webhook・Drive設定 |

---

## フロントエンド構成

```
frontend/src/
├── pages/
│   ├── family/              # 家族向けページ
│   │   ├── FamilyDashboard  # ダッシュボード
│   │   ├── ItemManagement   # 品物一覧（日付ナビ）
│   │   ├── ItemDetail       # 品物詳細
│   │   ├── ItemForm         # 品物登録・編集
│   │   └── PresetManagement # プリセット管理
│   ├── MealInputPage        # 食事入力フォーム
│   ├── ViewPage             # 記録閲覧
│   └── StatsPage            # 統計
├── components/
│   ├── family/              # 家族用コンポーネント
│   │   ├── DateNavigator    # 日付ナビゲーション
│   │   ├── ExpirationAlert  # 期限切れ警告
│   │   └── UnscheduledDatesBanner
│   └── Layout               # 共通レイアウト
├── hooks/                   # カスタムフック
│   ├── useCareItems         # 品物CRUD
│   └── useDemoMode          # デモモード判定
└── types/                   # TypeScript型定義
    └── careItem.ts          # 品物・ステータス型
```

---

## 開発履歴

Phase 1〜38.2まで完了。詳細は `git log` を参照。

E2Eテスト: 328件
