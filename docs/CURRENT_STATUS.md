# 現在のステータス

> **最終更新**: 2025年12月13日 (Phase 4.5 デザイン改善計画策定完了)
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
| Phase 4.2: テーブルビュー | 完了 | 検索・ソート・詳細モーダル実装 |
| Phase 4.3: 全シート同期+年月フィルタ | 完了 | バッチ分割・年月フィルタUI |
| Phase 4.4: シート表示順序修正 | 完了 | SHEET_A_ORDERによるソート |

### 最新の実装内容 (Phase 4.4)

**テーブルビュー実装**:
- カードビューからテーブルビューに変更
- シートのカラム名を動的にヘッダー表示
- 横スクロール対応

**検索フィルタ**:
- 入居者名・スタッフ名での部分一致検索
- リアルタイムフィルタ適用
- 検索結果件数表示

**ソート機能**:
- 日時、入居者名、スタッフ名でソート可能
- 昇順/降順切り替え
- ドロップダウンUIで選択

**ページネーション**:
- 50件/ページ表示
- 前へ/次へボタン
- 現在ページ/総ページ数表示

**詳細モーダル（中央配置）**:
- テーブル行タップで詳細表示
- 画面中央にフェードイン表示
- 全カラムをラベル:値形式で縦並び表示
- セル内改行（\n）を正しく改行表示
- 背景タップ/×ボタン/ESCで閉じる

### Phase 4.3: 全シート同期 + 年月フィルタ ✅ 完了

**解決した問題**: Firestoreバッチ制限（500件/バッチ）を400件ずつのバッチ分割で解消

**実装内容**:

1. **バックエンド修正（バッチ分割）** ✅
   - `firestoreService.ts` を修正
   - `BATCH_SIZE = 400` で分割書き込み
   - 全11シート、13,615件が同期成功

2. **フロントエンド修正（年・月フィルタUI）** ✅
   - `YearPaginator.tsx` - 年切り替え（◀ 2025年 ▶）
   - `MonthFilter.tsx` - 月フィルタ（全月/1月〜12月）
   - `HomePage.tsx` - 状態管理・フィルタ適用

3. **デプロイ・動作確認** ✅
   - Firebase Functions再デプロイ完了
   - curl検証: 全シート同期成功
   - Firebase Hosting再デプロイ完了

### Phase 4.4: シート表示順序修正 ✅ 完了

**問題**: APIレスポンスのシート順序がスプレッドシートのタブ順序と異なっていた

**原因**: `getPlanData.ts` で `Map.entries()` から配列作成時、Firestoreクエリの返却順序に依存していた

**解決策**: 明示的なシート順序定義（`SHEET_A_ORDER`）を追加し、APIレスポンスをソート

**修正ファイル**:
1. `functions/src/config/sheets.ts` - `SHEET_A_ORDER` 定数追加
2. `functions/src/functions/getPlanData.ts` - シート順序でソート処理追加
3. `docs/SHEET_A_STRUCTURE.md` - シート順序情報を追記

**シート順序（スプレッドシート元順序）**:
1. 食事
2. 水分摂取量
3. 排便・排尿
4. バイタル
5. 口腔ケア
6. 内服
7. 特記事項
8. 血糖値インスリン投与
9. 往診録
10. 体重
11. カンファレンス録

**検証**: curl で確認済み、スプレッドシートの元順序と一致

### Phase 4.5: デザイン改善 📋 計画中

> **詳細**: [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) を参照

**プロWebデザイナーによるレビュー結果**:

| 問題 | 詳細 |
|------|------|
| 視覚的階層の欠如 | 要素間の区別がつきにくい、視線誘導不足 |
| カラーパレット単調 | 青一色で単調、アクセントカラーなし |
| タイポグラフィ | 見出し・本文の区別が曖昧 |
| レイアウト | 余白不足、モバイル最適化不足 |

**改善計画（優先度順）**:

1. **高優先度**: カラーパレット適用、ヘッダー改善、月フィルタ・タブ改善
2. **中優先度**: シート別アイコン追加、ボトムナビゲーション
3. **低優先度**: ダークモード対応

**作成ドキュメント**:
- `docs/DESIGN_GUIDELINES.md` - デザインガイドライン（カラー、タイポ、コンポーネント）

### 次のタスク

**Phase 4.5 実装**: DESIGN_GUIDELINES.md に基づくUI改善実装

### 将来の機能追加（オプション）

1. **CSVエクスポート**: 表示中のデータをCSVでダウンロード
2. **オフラインキャッシュ強化**: ServiceWorkerでAPI応答をキャッシュ

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
Phase 1: 基盤構築 + CI/CD        ████████████████████ 100% (完了)
Phase 2: バックエンド実装         ████████████████████ 100% (完了)
Phase 3: デプロイ・検証           ████████████████████ 100% (完了)
Phase 4: デモ版PWA開発           ████████████████████ 100% (完了)
Phase 4.1: タブUI・汎用モデル     ████████████████████ 100% (完了)
Phase 4.2: テーブルビュー・検索    ████████████████████ 100% (完了)
Phase 4.3: 全シート同期+年月フィルタ████████████████████ 100% (完了)
Phase 4.4: シート表示順序修正     ████████████████████ 100% (完了)
Phase 4.5: デザイン改善          ░░░░░░░░░░░░░░░░░░░░   0% (計画中)
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
│   ├── DESIGN_GUIDELINES.md      # デザインガイドライン（Phase 4.5）
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
