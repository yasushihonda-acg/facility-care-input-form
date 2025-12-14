# 現在のステータス

> **最終更新**: 2025年12月14日 (Phase 5.1 Sheet B サービスアカウント接続完了)
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

### Phase 4.5: デザイン改善 ✅ 完了

> **詳細**: [DESIGN_GUIDELINES.md](./DESIGN_GUIDELINES.md) / [ROADMAP.md](./ROADMAP.md) を参照

**実装完了内容**:

1. **カラーシステム導入**
   - Primary (#2563EB), Secondary (#10B981), Warning, Error定義
   - Tailwind CSS v4 @theme によるカスタムプロパティ
   - カスタムシャドウ（card, card-hover, header）

2. **ヘッダー改善**
   - グラデーション背景（Primary → Primary Dark）
   - アイコン追加、サブタイトル表示
   - 同期ステータスバッジ形式に変更
   - ガラスモーフィズム風の同期ボタン

3. **月フィルタ改善**
   - ピル形式ボタン（rounded-full）
   - アクティブ状態にシャドウ
   - スクロールヒントグラデーション追加

4. **シートタブ改善**
   - アイコン追加（絵文字：🍽️💧🚻❤️🦷💊📝💉🩺⚖️👥）
   - カード風タブデザイン
   - レコード数バッジ

5. **年ページネーター改善**
   - カード風年表示
   - 44px以上のタッチターゲット
   - カレンダーアイコン追加

6. **検索バー折りたたみ式**
   - デフォルト非表示
   - 🔍アイコンボタンで展開
   - クリア・閉じるボタン付き

### Phase 4.7: テーブルビュー表示カラム ✅ 完了

> **詳細**: [TABLE_VIEW_COLUMNS.md](./TABLE_VIEW_COLUMNS.md) を参照

**目的**: 各シートの目的に最適化されたテーブルビュー表示を実現

**実装完了内容**:

1. **設定ファイル作成**
   - `frontend/src/config/tableColumns.ts`
   - 11シート全ての表示カラム設定を定義
   - バッジ表示・文字数制限の設定

2. **DataTable.tsx 修正**
   - シート別カラム設定を使用したテーブル表示
   - 入居者カラム・施設カラムの非表示（デモ版前提）
   - 重要度・指示変更のバッジ表示
   - 長文カラムの省略表示（50文字/30文字）

3. **シート別表示カラム**
   - 食事: 日時、時間帯、主食、副食、担当
   - 水分摂取量: 日時、水分量(cc)、担当
   - 排便・排尿: 日時、排便、排尿、排尿量(cc)、担当
   - バイタル: 日時、体温、血圧(高/低)、脈拍、SpO2
   - 口腔ケア: 日時、時間帯、担当
   - 内服: 日時、タイミング、頓服時刻、担当
   - 特記事項: 日時、重要度(バッジ)、内容(50文字)、担当
   - 血糖値インスリン投与: 日時、測定時間、血糖値、投与時間、投与量
   - 往診録: 日時、担当医、次回往診、指示変更(バッジ)
   - 体重: 日時、体重(kg)、担当
   - カンファレンス録: 日時、内容(50文字)、対応事項(30文字)、重要度(バッジ)

### Phase 4.8: テーブル最適化 ✅ 完了

> **詳細**: [TABLE_VIEW_COLUMNS.md](./TABLE_VIEW_COLUMNS.md)

**実装内容**:
- カラム幅を設計仕様どおりに適用（日時140px、数値80px、担当100px等）
- 全カラムでソート可能に（sortType: string/number/date対応）
- table-fixedレイアウトで幅を固定
- ソートドロップダウンを動的生成

### Phase 4.9: 同期競合防止 + コスト最適化 ✅ 完了

> **詳細**: [SYNC_CONCURRENCY.md](./SYNC_CONCURRENCY.md)

**問題**:
- フロントエンドの同期ボタン連打や複数端末からの同時アクセスでRace Conditionが発生
- 洗い替え（delete-then-insert）中に別プロセスが実行され、データ重複が発生

**解決策（Cloud Scheduler + 決定論的ID）**:

| 対策 | 内容 |
|------|------|
| **単一トリガー** | Cloud Schedulerが唯一の同期トリガー（競合なし） |
| **差分同期** | 15分間隔（新規レコードのみ追加、削除なし） |
| **完全同期** | 日次午前3時（洗い替えでデータ整合性担保） |
| **決定論的ID** | MD5ハッシュ（シート名+日時+スタッフ名+入居者名）で重複を原理的に排除 |
| **フロントエンド簡素化** | syncPlanData呼び出し廃止、キャッシュ更新のみ |

**コスト最適化**:
- 従来: 毎回13,000件削除+挿入 = 月$144
- 改善後: 差分同期（merge:true）+ 日次完全同期 = 月$5-15
- **削減率: 90%以上**

**検証結果**:
- 完全同期後: 13,615レコード（全てユニーク）
- 差分同期後: 13,615レコード（全てユニーク）
- **重複なし確認済み**

**Cloud Schedulerジョブ**:
| ジョブ名 | スケジュール | モード |
|----------|--------------|--------|
| `sync-plan-data-incremental` | `*/15 * * * *` (15分毎) | 差分同期 |
| `sync-plan-data-full` | `0 3 * * *` (午前3時) | 完全同期 |

### Phase 5.0: 食事入力フォームUI実装 ✅ 完了

> **詳細**: [SHEET_B_STRUCTURE.md](./SHEET_B_STRUCTURE.md) / [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md)

**実装内容**:

1. **型定義・定数** ✅
   - `frontend/src/types/mealForm.ts`
   - MealInputForm インターフェース
   - 施設・利用者・摂取量等の選択肢定数

2. **フォームUI** ✅
   - `frontend/src/pages/MealInputPage.tsx`
   - 13フィールド（必須6、任意7）
   - 施設選択に連動した利用者リスト
   - バリデーション・送信処理（デモ版）

3. **ナビゲーション** ✅
   - `/input/meal` ルート追加
   - ホーム画面にFABボタン（+）追加

**動作確認**:
- URL: https://facility-care-input-form.web.app/input/meal
- ホーム画面右下の「+」ボタンからアクセス可能

### Phase 5.1: Sheet B サービスアカウント接続 ✅ 完了

**完了内容**:
- サービスアカウント (`facility-care-sa@...`) へのSheet B共有が完了
- API接続確認済み（読み取り・書き込み可能）

**確認結果**:
- シート名: `フォームの回答 1` ✅
- カラム数: 15 ✅
- カラム構成: ドキュメント通り ✅

---

### 次のタスク

**Phase 5.2: バックエンド実装修正**:
- `functions/src/config/sheets.ts` の `SHEET_B_COLUMNS` をドキュメントに合わせて修正
- `functions/src/services/sheetsService.ts` のカラムマッピングを修正
- `functions/src/functions/submitCareRecord.ts` のリクエスト型を `MealInputForm` に合わせる

**オプション機能**:
1. CSVエクスポート: 表示中のデータをCSVでダウンロード
2. オフラインキャッシュ強化: ServiceWorkerでAPI応答をキャッシュ

---

### 完了済み（デモ版）

**Sheet B 構造分析** ✅ 完了

> 詳細: [SHEET_B_STRUCTURE.md](./SHEET_B_STRUCTURE.md)

| シート名 | 用途 | カラム数 |
|----------|------|----------|
| フォームの回答 1 | 食事記録の入力先 | 15 |

**Sheet B サービスアカウント共有** ✅ 完了

| サービスアカウント | 共有先 | 権限 | 状態 |
|-------------------|--------|------|------|
| `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` | Sheet B | 編集者 | ✅ 完了（2025-12-14） |

**食事入力フォーム設計** ✅ 完了

> 詳細: [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md)

| 項目 | 内容 |
|------|------|
| フィールド数 | 13 |
| 必須フィールド | 6 |
| 入力タイプ | テキスト、ドロップダウン、ラジオボタン、ファイル選択 |

**食事入力フォームUI実装** ✅ 完了

| 項目 | 内容 |
|------|------|
| ルート | `/input/meal` |
| ナビゲーション | ホーム画面のFABボタン（+） |
| 機能 | フォーム入力、バリデーション、送信（デモ版） |

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
Phase 4.5: デザイン改善          ████████████████████ 100% (完了)
Phase 4.7: テーブルビュー表示カラム ████████████████████ 100% (完了)
Phase 4.8: テーブル最適化          ████████████████████ 100% (完了)
Phase 4.9: 同期競合防止+コスト最適化 ████████████████████ 100% (完了)
Phase 5.0: 食事入力フォームUI     ████████████████████ 100% (完了)
Phase 5.1: Sheet B SA接続        ████████████████████ 100% (完了)
Phase 5.2: バックエンド実装修正    ░░░░░░░░░░░░░░░░░░░░   0% (次のタスク)
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

最終同期: 2025-12-14（完全同期による重複解消）

| シート名 | レコード数 |
|----------|------------|
| 食事 | - |
| 水分摂取量 | - |
| 排便・排尿 | - |
| バイタル | - |
| 口腔ケア | - |
| 内服 | - |
| 特記事項 | - |
| 血糖値インスリン投与 | - |
| 往診録 | - |
| 体重 | - |
| カンファレンス録 | - |
| **合計** | **13,615件** |

同期方式:
- **差分同期**: 15分間隔（Cloud Scheduler）
- **完全同期**: 毎日午前3時（Cloud Scheduler）

---

## 実装済みファイル構造

```
facility-care-input-form/
├── frontend/                     # デモ版PWA (React + Vite)
│   ├── src/
│   │   ├── api/index.ts          # API呼び出し (汎用型対応)
│   │   ├── components/
│   │   │   ├── Header.tsx        # ヘッダー (同期ボタン + トースト)
│   │   │   ├── DataTable.tsx     # テーブルビュー
│   │   │   ├── DetailModal.tsx   # 詳細モーダル
│   │   │   ├── YearPaginator.tsx # 年切り替え
│   │   │   ├── MonthFilter.tsx   # 月フィルタ
│   │   │   └── ...
│   │   ├── config/
│   │   │   └── tableColumns.ts   # シート別カラム設定
│   │   ├── hooks/
│   │   │   ├── useSync.ts        # 同期処理
│   │   │   └── usePlanData.ts    # データ取得
│   │   ├── pages/
│   │   │   ├── HomePage.tsx      # ホーム（タブUI + FAB）
│   │   │   ├── MealInputPage.tsx # 食事入力フォーム ← New!
│   │   │   └── SheetDetailPage.tsx
│   │   ├── types/
│   │   │   ├── index.ts          # 型定義 (PlanDataRecord等)
│   │   │   └── mealForm.ts       # 食事フォーム型定義 ← New!
│   │   ├── App.tsx               # ルーティング
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
│   ├── CURRENT_STATUS.md         # このファイル（再開時に最初に読む）
│   ├── SHEET_A_STRUCTURE.md      # Sheet A（読み取り）構造
│   ├── SHEET_B_STRUCTURE.md      # Sheet B（書き込み）構造 ← New!
│   ├── MEAL_INPUT_FORM_SPEC.md   # 食事入力フォーム設計書 ← New!
│   ├── SYNC_STRATEGY.md          # 同期戦略設計書
│   ├── SYNC_CONCURRENCY.md       # 同期競合防止設計
│   ├── DESIGN_GUIDELINES.md      # デザインガイドライン
│   ├── TABLE_VIEW_COLUMNS.md     # テーブルビュー表示カラム設計
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
| Sheet A (記録の結果) | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | 閲覧者 | ✅ 完了 |
| Sheet B (実績入力先) | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | 編集者 | ✅ 完了 |

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
