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

### 統計・AI (Phase 8.3-8.4.1)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getStats` | 統計データ取得 |
| POST | `/aiSuggest` | AI品物入力補助（Gemini） |
| POST | `/aiAnalyze` | AI摂食傾向分析（Gemini） |

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

### 間食記録連携 (Phase 10)
スタッフ食事入力と家族品物管理の連携機能。
- 食事記録入力時に家族が送った品物リストを表示
- AIサジェスト（推奨提供数・期限警告）
- 消費ログ自動記録
- 関連コンポーネント: `SnackSection`, `FamilyItemList`, `SnackRecordCard`
- 設計書: `docs/SNACK_RECORD_INTEGRATION_SPEC.md`

**Sheet B書き込みルール（snackフィールド）**:
- `snackRecords[]` のみ: `黒豆 1g（完食）、らっきょう 0.7瓶（ほぼ完食）`
- `snack`（自由記入）のみ: そのまま保存
- 両方入力: `{snackRecordsから生成}。{snack自由記入}` の形式で連結
- 注意: `snackRecords[].noteToFamily` はSheet Bには反映されない（Firestoreのみ）

### 統計拡張 (Phase 9.3)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getInventorySummary` | 在庫サマリー取得 |
| GET | `/getFoodStats` | 食品傾向分析取得 |

### FoodMaster食品マスタ (Phase 11)
| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getFoodMasters` | 食品マスタ一覧取得 |
| GET | `/searchFoodMaster` | 食品マスタ検索（名前・別名） |
| POST | `/createFoodMaster` | 食品マスタ作成 |
| PUT | `/updateFoodMaster` | 食品マスタ更新 |
| DELETE | `/deleteFoodMaster` | 食品マスタ削除（論理削除） |

**aiSuggest連携フロー**:
1. まずFoodMasterを検索
2. 見つかればそのデータを返却（source: "food_master"）
3. 見つからなければGeminiで生成して返却（source: "ai"）
4. `saveToFoodMaster=true`の場合、AI生成結果をFoodMasterに自動保存

**デモデータ**: 15品目（バナナ、みかん、りんご、キウイ、羊羹、黒豆、らっきょう、カステラ、緑茶、りんごジュース、ヨーグルト、チーズ、エンシュア、おにぎり、黒砂糖）

## デモ機能

### デモショーケース（家族向け特化）
- **URL**: https://facility-care-input-form.web.app/demo
- **ガイド付きツアー**: `/demo/showcase`（家族視点の6ステップ）
- **デモモード判定**: `useDemoMode` フック（パスが `/demo` で始まるか判定）
- **シードデータ**: `frontend/src/data/demo/` に12品物、18ログ、9タスク等
- **設計書**: `docs/DEMO_FAMILY_REDESIGN.md`
- **スタッフ機能**: 無効化（将来 `/demo/staff-app` として復活予定）

### ツアーナビゲーション（ヘッダーボタン）
- `/demo/*` ページ（`/demo/showcase` 除く）でヘッダー右側にオレンジ色のボタン表示
- 「← ツアーTOPに戻る」ボタン（ユーザーはツアー中、戻るのはツアートップ）
- スクロールしても常に見える（sticky header）
- `frontend/src/components/demo/DemoHeaderButton.tsx`

### デモモードフッター統一 (2025-12-18)
- `/demo/*` 内では常に家族用フッター（ホーム/品物管理/記録閲覧/統計）を表示
- `FooterNav.tsx` で `isDemoMode` 判定を追加
- 設計書: DEMO_FAMILY_REDESIGN.md セクション4.3に準拠

### デモモード書き込み安全対策
- デモモード（`/demo/*`）での書き込み操作は本番Firestoreに保存されない
- 書き込み時にアラート表示: 「〇〇しました（デモモード - 実際には保存されません）」
- リダイレクト先もデモページ内に維持
- 対象: ItemForm, ItemDetail, ItemManagement, TaskList, ResidentSettings, PresetManagement
- 設計書: `docs/DEMO_SHOWCASE_SPEC.md` セクション11
- 品質チェック: `docs/QUALITY_CHECK_DEMO_WRITE_OPS.md`

### E2Eテスト（109件）
| ファイル | 件数 | 内容 |
|----------|------|------|
| `demo-page.spec.ts` | 43件 | デモページ基本動作・ナビゲーション |
| `family-user-scenario.spec.ts` | 34件 | 家族シナリオ・パリティ・本番準備 |
| `family-page.spec.ts` | 21件 | 品物詳細・消費ログ・指示対応 |
| `snack-record.spec.ts` | 11件 | 間食記録連携・AIサジェスト |

- **パリティテスト**: デモと本番で同じUIが表示されることを検証
- **実行**: `cd frontend && npx playwright test`

## 重要な設定

### Firestoreインデックス（トラブルシューティング）
複合クエリ（複数フィールドでの絞り込み+ソート）を使用する場合、Firestoreは事前にインデックスを作成する必要がある。

**getCareItems API**で以下のエラーが発生した場合:
```
9 FAILED_PRECONDITION: The query requires an index
```

解決方法:
1. エラーメッセージ内のURLからFirestoreコンソールでインデックスを作成
2. または `firestore.indexes.json` に追加して `gcloud firestore indexes create` でデプロイ

現在定義済みのインデックス:
- `care_items`: residentId + status + sentDate(DESC) + createdAt(DESC)

詳細: `docs/HANDOVER.md` セクション8.1.1

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
