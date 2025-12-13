# 現在のステータス

> **最終更新**: 2025年12月13日 (Phase 4.1 タブUI・汎用データモデル実装完了)
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
| Phase 3: デプロイ・検証 | 完了 | Sheet A読み取り検証済み |
| Phase 4: デモ版PWA開発 | 完了 | Firebase Hostingデプロイ完了 |
| Phase 4.1: タブUI・汎用データモデル | 完了 | シート別タブ表示対応 |

### 最新の実装内容 (Phase 4.1)

**汎用データモデル対応**:
- スプレッドシートの列構造を解析し、ドキュメント化 (`docs/SHEET_A_STRUCTURE.md`)
- 固定スキーマから汎用型 (列名をキーとしたマップ) に変更
- 各シートのヘッダー行を読み取り、列名→値のマッピングで保存

**タブUI実装**:
- ホーム画面に横スクロール可能なタブバーを追加
- タブをタップするとそのシートのレコード一覧を表示
- 各シートのレコード件数をバッジ表示

**同期UX改善**:
- 同期成功時のトースト通知 (〇シート △件を同期しました)
- 同期エラー時のエラートースト表示
- 同期中のアニメーション表示

### 次のタスク

**データ表示の改善・追加機能**

1. **検索・フィルタ機能**: 利用者名やスタッフ名でレコードをフィルタ
2. **詳細表示**: レコードカードをタップすると詳細モーダルを表示
3. **オフラインキャッシュ強化**: ServiceWorkerでAPI応答をキャッシュ

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
Phase 4.1: タブUI・汎用モデル ████████████████████ 100% (完了)
```

詳細: [docs/ROADMAP.md](./ROADMAP.md)

---

## デプロイ済みリソース

### PWA (Firebase Hosting)

| 項目 | 値 |
|------|-----|
| URL | https://facility-care-input-form.web.app |
| 技術スタック | React + Vite + TailwindCSS v4 + TanStack Query |
| PWA対応 | Service Worker、オフラインキャッシュ対応 |
| UI | タブ形式シート切り替え、トースト通知 |

### Cloud Functions

ベースURL: `https://asia-northeast1-facility-care-input-form.cloudfunctions.net`

| メソッド | パス | 説明 | 状態 |
|----------|------|------|------|
| GET | `/healthCheck` | ヘルスチェック | 動作確認済み |
| POST | `/syncPlanData` | 記録データを同期 (汎用モデル) | 動作確認済み |
| POST | `/submitCareRecord` | ケア実績を入力 | Sheet B共有待ち |
| POST | `/submitFamilyRequest` | 家族要望を送信 | 動作可能 |
| POST | `/uploadCareImage` | 画像をアップロード | Drive権限未確認 |
| GET | `/getPlanData` | 同期済み記録を取得 (シート別フィルタ対応) | 動作可能 |
| GET | `/getFamilyRequests` | 家族要望一覧を取得 | 動作可能 |

### 同期済みデータ

最終同期: 2025-12-13

| シート名 | レコード数 |
|----------|------------|
| バイタル | - |
| 血糖値インスリン投与 | - |
| 往診録 | - |
| 体重 | - |
| カンファレンス録 | - |
| **合計** | **2,488件** |

※ 一部のシート (11シート中5シート) のみ同期されました。残りのシートは空シートの可能性があります。

---

## 実装済みファイル構造

```
facility-care-input-form/
├── frontend/                     # デモ版PWA (React + Vite)
│   ├── src/
│   │   ├── api/index.ts          # API呼び出し (汎用型対応)
│   │   ├── components/
│   │   │   ├── Header.tsx        # ヘッダー (同期ボタン + トースト)
│   │   │   ├── RecordCard.tsx    # レコードカード (汎用データ表示)
│   │   │   ├── SheetCard.tsx     # シートカード
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorMessage.tsx
│   │   ├── hooks/
│   │   │   ├── useSync.ts        # 同期処理 (15分自動同期)
│   │   │   └── usePlanData.ts    # データ取得
│   │   ├── pages/
│   │   │   ├── HomePage.tsx      # タブUI実装
│   │   │   └── SheetDetailPage.tsx
│   │   ├── types/index.ts        # 型定義 (PlanDataRecord等)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             # TailwindCSS v4
│   ├── public/                   # PWAアイコン等
│   ├── vite.config.ts            # Vite + PWA設定
│   └── package.json
├── functions/src/                # Cloud Functions
│   ├── index.ts                  # エントリポイント
│   ├── config/sheets.ts
│   ├── types/index.ts            # 汎用型定義 (PlanData, PlanDataRecord)
│   ├── services/
│   │   ├── sheetsService.ts      # Google Sheets API
│   │   ├── firestoreService.ts   # Firestore (汎用モデル対応)
│   │   └── driveService.ts
│   └── functions/
│       ├── syncPlanData.ts       # 汎用パーシング実装
│       ├── getPlanData.ts        # シート別フィルタ対応
│       └── ...
├── docs/
│   ├── CURRENT_STATUS.md         # このファイル
│   ├── SHEET_A_STRUCTURE.md      # スプレッドシート構造ドキュメント
│   ├── SYNC_STRATEGY.md          # 同期戦略設計書
│   └── ...
├── firebase.json
└── firestore.rules
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
