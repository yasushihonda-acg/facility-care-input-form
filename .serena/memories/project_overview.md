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
| POST | `/uploadCareImage` | 画像アップロード（Firebase Storage） |
| GET | `/getCarePhotos` | 写真メタデータ取得 |
| GET | `/getMealFormSettings` | 設定取得 |
| POST | `/updateMealFormSettings` | 設定更新 |
| POST | `/testWebhook` | Webhookテスト |
| ~~POST~~ | ~~`/testDriveAccess`~~ | ~~Driveアクセステスト~~ (Phase 17で削除) |

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

### Phase 11.1: FoodMaster自動蓄積有効化 (2025-12-18)
本番モードでAI生成結果を自動でFoodMasterに保存する機能を有効化。
- `useAISuggest.ts`でデモモード判定を追加
- `saveToFoodMaster: !isDemoMode`を渡すことで本番のみ自動蓄積
- 効果: APIコスト削減、応答速度向上（~2s → ~100ms）、施設固有データ構築

**これは「AIマスター自動登録」または「学習するシステム」と呼ばれる機能です:**
1. 家族が品物を登録 → aiSuggestで賞味期限・保存方法等を自動提案
2. 本番モードの場合、AI生成結果をFoodMasterに自動保存
3. 次回同じ品物が登録されると、FoodMasterからキャッシュヒット（Gemini API不要）
4. 使えば使うほど賢くなり、応答が速くなるシステム

### 直近の修正 (2025-12-18)
- `/settings`ルーティング: 白画面エラー解消（リダイレクト追加）
- GitHub Pages管理者リンク: `/input/meal?admin=true` → `/staff/input/meal?admin=true`
- E2Eテスト: Playwright構文エラー修正（`test.setTimeout` → `test.describe.configure`）
- CLAUDE.md: アプリケーションURLセクション追加（管理者画面URL明記）

**デモデータ**: 15品目（バナナ、みかん、りんご、キウイ、羊羹、黒豆、らっきょう、カステラ、緑茶、りんごジュース、ヨーグルト、チーズ、エンシュア、おにぎり、黒砂糖）

## デモ機能

### デモショーケース（家族向け・スタッフ向け）
- **家族デモURL**: https://facility-care-input-form.web.app/demo
- **スタッフデモURL**: https://facility-care-input-form.web.app/demo/staff (Phase 14)
- **ガイド付きツアー（家族）**: `/demo/showcase`（家族視点の6ステップ）
- **ガイド付きツアー（スタッフ）**: `/demo/staff/showcase`（スタッフ視点の4ステップ）
- **デモモード判定**: `useDemoMode` フック（パスが `/demo` で始まるか判定）
- **シードデータ**: `frontend/src/data/demo/` に15品物、18ログ、9タスク等（家族・スタッフで共有）
- **設計書（家族）**: `docs/DEMO_FAMILY_REDESIGN.md`
- **設計書（スタッフ）**: `docs/DEMO_STAFF_SPEC.md`

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

### FIFO対応 (Phase 12.0)
同じ品物が複数回送られた場合（つぎたしケース）の賞味期限混同を防ぐ機能。

**表示順序**: 賞味期限が近い順 → 送付日が古い順（期限なしは末尾）

**UIコンポーネント**:
- `FIFOWarning.tsx`: 間食提供時に同一品物の推奨表示
- `SameItemAlert.tsx`: 品物詳細で先消費推奨アラート

**設計方針**: 「裏で自然に動く」- デモで強調せず、あって当たり前の機能として動作

**設計書**: `docs/FIFO_DESIGN_SPEC.md`

### 手動登録時プリセット保存提案 (Phase 12.1)
AI提案以外で品物を手動登録した際にも、プリセット保存を提案する機能。

**フロー**:
1. 品物情報を入力して「登録」ボタン押下
2. 登録完了後、ダイアログでプリセット保存を提案
3. ユーザーが「保存して完了」を選択すると、入力内容をプリセットとして保存
4. 「今回だけ」を選択すると、プリセット保存せずに完了

**UIコンポーネント**:
- `SaveManualPresetDialog.tsx`: 手動登録時のプリセット保存ダイアログ
- AI提案時の`SaveAISuggestionDialog.tsx`と同じトンマナ（琥珀色背景、📌アイコン）

**実装ファイル**:
- `frontend/src/components/family/SaveManualPresetDialog.tsx` (新規)
- `frontend/src/pages/family/ItemForm.tsx` (ダイアログ表示ロジック追加)

**設計書**: `docs/PRESET_MANAGEMENT_SPEC.md` セクション5.4, 9

### Phase 13.0: 品物起点の間食記録 (2025-12-19)
品物詳細画面から直接間食記録を作成する機能。

**主な機能**:
- 品物詳細画面に「間食記録を作成」ボタン追加
- SnackRecordForm: 提供量・摂食状況・メモ入力
- submitCareRecord API: Sheet B「間食」列に書き込み
- 記録後に品物タイムラインへ自動反映

**実装ファイル**:
- `frontend/src/components/family/SnackRecordForm.tsx` (新規)
- `frontend/src/pages/family/ItemDetail.tsx` (ボタン追加)
- `functions/src/functions/submitCareRecord.ts` (間食記録対応)

**E2Eテスト**: `item-based-snack.spec.ts` (13件)
**設計書**: `docs/ITEM_BASED_SNACK_RECORD_SPEC.md` セクション3.1-3.3

### Phase 13.1: スケジュール拡張機能 (2025-12-19)
従来のplannedServeDateから柔軟なスケジュール設定を可能にする拡張。

**スケジュールタイプ**:
- `once`: 単発（従来互換）
- `daily`: 毎日
- `weekly`: 曜日指定（複数選択可）
- `specific_dates`: 複数日指定

**タイムスロット**:
- `breakfast`: 朝食時
- `lunch`: 昼食時
- `dinner`: 夕食時
- `snack`: おやつ時（デフォルト）
- `anytime`: いつでも

**UIコンポーネント**:
- `ServingScheduleInput.tsx`: スケジュールタイプ選択・入力
- `WeekdaySelector.tsx`: 曜日選択トグルボタン
- `MultipleDatePicker.tsx`: 複数日選択UI

**ユーティリティ** (`scheduleUtils.ts`):
- `isScheduledForToday()`: 今日が提供予定日か判定
- `formatScheduleDisplay()`: スケジュール表示文字列生成
- `scheduleToPlannedDate()`: 後方互換変換

**E2Eテスト**: `schedule-extension.spec.ts` (7件)
**設計書**: `docs/ITEM_BASED_SNACK_RECORD_SPEC.md` セクション3.4-3.5

### Phase 15: スタッフ用記録入力フォーム統一 (2025-12-19)
スタッフ用記録入力フォームを簡素化・統一。食事タブを削除し「品物から記録」のみに。

**主な変更**:
- 食事タブ削除（主食/副食/注入の入力を除去）
- 入力者名・デイサービス利用・間食補足・特記事項・重要特記事項・写真に統一
- 施設名・利用者名は非表示（マスター設定から自動取得）
- 家族連絡詳細からのダイアログも統一（StaffRecordDialog）

**実装ファイル**:
- `MealInputPage.tsx`: タブ削除、統一フォーム
- `StaffRecordDialog.tsx`: 統一ダイアログコンポーネント（新規）
- `FamilyMessageDetail.tsx`: StaffRecordDialog使用
- `ItemBasedSnackRecord.tsx`: StaffRecordDialog使用

**E2Eテスト**: `staff-record-form.spec.ts` (22件)
**設計書**: `docs/STAFF_RECORD_FORM_SPEC.md`

### Phase 15.6: 摂食割合の数値入力・残り対応 (2025-12-19)
摂食状況の入力方式を絵文字ボタン（😋完食など）から0-10の数値入力に変更。完食でない場合（10未満）に「残った分への対応」を記録。

**主な変更**:
- 絵文字5択 → 数値入力（0-10）+ スライダー
- 残った分への対応（条件付き表示）: 破棄/保存/その他
- ※ 施設入居者向けのため「持ち帰り」は対象外

**実装ファイル**:
- `consumptionLog.ts`: RemainingHandling型・選択肢追加
- `mealForm.ts`: SnackRecord型更新
- `StaffRecordDialog.tsx`: 数値入力UI、残り対応フィールド追加

**E2Eテスト**: STAFF-040〜STAFF-043（4件追加）
**設計書**: `docs/STAFF_RECORD_FORM_SPEC.md` セクション9

### Phase 16: 写真エビデンス表示 (2025-12-19 - 完了)

### Phase 18: チャット連携機能 (2025-12-19 - 完了)
品物ごとのチャットスペースで、スタッフと家族が双方向にやりとりできる機能。

**主な機能**:
- チャット一覧（ChatListPage）: アクティブなスレッドのみ表示
- 品物チャットスペース（ItemChatPage）: スタッフ⇔家族の双方向メッセージ
- フッターにチャットタブ追加（未読バッジ付き）
- 品物詳細画面からチャット開始ボタン

### Phase 15.7: 残り対応による在庫・統計の分離計算 (2025-12-20 完了)
「残った分への対応」（破棄/保存/その他）に応じて在庫計算を分岐する機能。

**設計方針**:
- **破棄した**: 提供量全てを在庫から引く（残りは廃棄）
- **保存した/その他**: 食べた分のみ在庫から引く
- **統計**: 常に「実際に食べた量」のみでカウント（廃棄は統計に含めない）

**新規フィールド**:
- `inventoryDeducted`: 在庫から引いた量
- `wastedQuantity`: 廃棄量（破棄時のみ）

**E2Eテスト**: STAFF-050〜053（4件追加）
**設計書**: `docs/STAFF_RECORD_FORM_SPEC.md` セクション10

### Phase 15.8: ベースページ簡素化 (2025-12-20 完了)
MealInputPage.tsxを大幅簡素化（407行→122行）。品物リスト表示のみに特化。

**TDDアプローチ**:
1. E2Eテスト5件追加（STAFF-060〜064）
2. MealInputPage.tsxからフォーム要素削除
3. ローカル・本番テストパス確認

### Phase 15.9: 写真アップロードUI (2025-12-20 完了)
StaffRecordDialog.tsxに写真アップロード機能を追加。Firebase Storageへ直接保存し、photoUrlをsubmitMealRecordに渡してGoogle Chat Webhookに連携。

**主な機能**:
- ファイルサイズ制限: 10MB以下
- プレビュー表示・削除機能
- Firebase Storage連携（uploadCareImage API）
- Google Chat Webhook連携（submitMealRecordでphotoUrl送信）

**データフロー**:
1. StaffRecordDialogで写真を選択
2. [記録を保存]クリック時にuploadCareImage API呼び出し
3. Firebase Storageにアップロード → photoUrl取得
4. submitMealRecordにphotoUrlを渡す
5. Google Chat Webhookで写真付きメッセージ送信

**E2Eテスト**: STAFF-009, STAFF-070〜072（4件追加）
**設計準拠**: FIREBASE_STORAGE_MIGRATION_SPEC.md セクション5.2

### Phase 19 + 追加修正: 記録のチャット連携・フッター修正 (2025-12-20 - 完了)
スタッフが記録を入力した際にチャットスペースへ自動反映し、ホーム画面に通知を表示する機能。

**Phase 19.1: 記録の自動反映**:
- スタッフの間食記録入力時にチャットへ自動投稿
- `createRecordNotification` 関数で記録内容を通知形式に変換

**Phase 19.2: ホーム通知セクション**:
- `NotificationSection` コンポーネント（家族/スタッフ共通）
- 家族ホーム（FamilyDashboard）とスタッフホーム（StaffHome）に表示
- 通知タイプ: `new_message`, `record_added`, `item_expiring`

**実装ファイル**:
- `frontend/src/components/shared/NotificationSection.tsx` (新規)
- `frontend/src/pages/family/FamilyDashboard.tsx`
- `frontend/src/pages/staff/StaffHome.tsx`

**E2Eテスト**: `record-chat-integration.spec.ts` (8件追加)

**バックエンドAPI**:
| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/sendMessage` | メッセージ送信 |
| GET | `/getMessages` | メッセージ取得 |
| POST | `/markAsRead` | 既読マーク |
| GET | `/getNotifications` | 通知取得 |
| GET | `/getActiveChatItems` | アクティブチャット一覧 |

**Firestoreコレクション**:
- `care_items/{itemId}/messages/{messageId}`: チャットメッセージ
- `residents/{residentId}/notifications/{notificationId}`: 通知

**実装ファイル（バックエンド）**:
- `functions/src/types/index.ts`: チャット関連型定義
- `functions/src/functions/chat.ts`: チャットAPI（新規）
- `functions/src/index.ts`: エクスポート追加

**実装ファイル（フロントエンド）**:
- `frontend/src/types/chat.ts`: チャット型定義（新規）
- `frontend/src/api/index.ts`: チャットAPI関数追加
- `frontend/src/pages/shared/ChatListPage.tsx`: チャット一覧（新規）
- `frontend/src/pages/shared/ItemChatPage.tsx`: 品物チャット（新規）
- `frontend/src/components/FooterNav.tsx`: チャットタブ追加
- `frontend/src/pages/family/ItemDetail.tsx`: チャットリンク追加
- `frontend/src/pages/staff/FamilyMessageDetail.tsx`: チャットリンク追加
- `frontend/src/App.tsx`: チャットルート追加

**E2Eテスト**: `chat-integration.spec.ts` (8件)
**設計書**: `docs/CHAT_INTEGRATION_SPEC.md`

**2025-12-20 追加修正**:
- チャットページフッター修正: `ItemChatPage`・`ChatListPage` にフッターナビ追加
- デモモードチャット対応: 擬似送信（ローカル状態のみ更新）、チャットシードデータ (`demoMessages.ts`)
- getCareItems itemIdパラメータ対応: 個別品物取得のサポート追加

### Phase 17: Firebase Storage 写真連携 (2025-12-19 - 完了)
写真保存先をGoogle DriveからFirebase Storageに移行。

**主な変更**:
- `uploadCareImage`: Google Drive → Firebase Storage に移行
- `getCarePhotos`: 新規API（Firestore care_photosから写真メタデータ取得）
- `testDriveAccess`: 削除（Firebase Storageは同一プロジェクト内のため不要）
- `driveService.ts`: 削除
- `storageService.ts`: 新規（Firebase Storage操作）
- Firestore `care_photos` コレクション追加

**Firestoreインデックス（Phase 17）**:
- `care_photos`: residentId + date + uploadedAt(desc)
スタッフがアップロードした写真を家族向けエビデンス画面で表示する機能。

**主な変更**:
- EvidenceMonitor.tsx: プレースホルダーから実画像表示に変更
- TimelineItem.tsx: デモモード対応のリンクパス修正
- App.tsx: `/demo/family/evidence/:date` ルート追加
- demoFamilyData.ts: 実画像URL（picsum.photos）使用

**実装ファイル**:
- `frontend/src/pages/family/EvidenceMonitor.tsx` (実画像表示)
- `frontend/src/components/family/TimelineItem.tsx` (デモモード対応)
- `frontend/src/data/demoFamilyData.ts` (実画像URL)
- `frontend/src/App.tsx` (デモルート追加)

**E2Eテスト**: `photo-evidence.spec.ts` (5件)
**設計書**: `docs/PHOTO_EVIDENCE_DISPLAY_SPEC.md`

### Phase 20: デモ環境完結（離脱防止）(2025-12-20 完了)
スタッフデモ（/demo/staff）から本番環境への意図しない離脱を防止。

**主な変更**:
- MealInputPage.tsx: 戻るボタンをデモモード対応
- ItemTimeline.tsx: リンクをデモモード対応
- App.tsx: /demo/staff/statsルート追加

**E2Eテスト**: demo-staff-containment.spec.ts (15件)
**設計書**: `docs/DEMO_STAFF_CONTAINMENT.md`

### Phase 20.1: デモモードAPI 500エラー修正 (2025-12-20 完了)
デモページでのgetActiveChatItems/getNotifications API 500エラーを修正。

**原因**:
- FooterNav.tsx/NotificationSection.tsx: デモモードでもAPIを呼び出していた
- Firestoreインデックス不足

**修正**:
- デモモードではAPIをスキップし、ダミーデータを使用
- firestore.indexes.json: 複合インデックス2件追加

**E2Eテスト**: footer-nav-demo.spec.ts (9件)
**設計書**: `docs/FOOTERNAV_DEMO_FIX_SPEC.md`

### Phase 21: チャット機能一時非表示 (2025-12-21 完了)
内部チャット機能（スタッフ⇔家族間）を一時的に非表示化。

**非表示対象**:
- FooterNav: チャットタブ（家族・スタッフ両方）
- App.tsx: チャット関連ルート10件
- ItemDetail.tsx: 「スタッフにチャット」ボタン
- FamilyMessageDetail.tsx: 「家族とチャット」ボタン
- FamilyDashboard/StaffHome: NotificationSection

**非表示対象外**:
- Google Chat Webhook（外部通知）は引き続き動作

**E2Eテスト**: 233件パス + 16件スキップ（chat-integration.spec.ts, record-chat-integration.spec.ts）
**設計書**: `docs/CHAT_FEATURE_HIDE_SPEC.md`
**復元手順**: CHAT_FEATURE_HIDE_SPEC.md セクション6を参照

### Phase 31: カテゴリ簡素化 + タブ固定化 (2025-12-21 完了)
品物カテゴリを7種類から2種類に簡素化し、スタッフ記録フォームのタブ切替を廃止。

**カテゴリ変更**:
- 変更前（7種類）: fruit, snack, drink, dairy, prepared, supplement, other
- 変更後（2種類）: food（食べ物）, drink（飲み物）

**スタッフ記録フォーム**:
- 食べ物カテゴリ → 食事フォーム（摂食割合入力）固定、タブ切替不可
- 飲み物カテゴリ → 水分フォーム（cc入力）固定、タブ切替不可

**後方互換性**: `migrateCategory()` 関数で旧カテゴリを自動変換

**設計書**: ITEM_MANAGEMENT_SPEC.md セクション2.2, STAFF_RECORD_FORM_SPEC.md タブ固定動作

### E2Eテスト（309件パス + 16件スキップ、Phase 21でチャットテストをスキップ）
| ファイル | 件数 | 内容 |
|----------|------|------|
| `demo-page.spec.ts` | 43件 | デモページ基本動作・ナビゲーション |
| `family-user-scenario.spec.ts` | 34件 | 家族シナリオ・パリティ・本番準備 |
| `family-page.spec.ts` | 21件 | 品物詳細・消費ログ・指示対応 |
| `snack-record.spec.ts` | 11件 | 間食記録連携・AIサジェスト |
| `fifo.spec.ts` | 8件 | FIFO機能（期限順ソート・同一品物警告） |
| `item-based-snack.spec.ts` | 13件 | Phase 13.0 品物起点の間食記録 |
| `schedule-extension.spec.ts` | 7件 | Phase 13.1 スケジュール拡張機能 |
| `schedule-display.spec.ts` | 7件 | Phase 13.2 スタッフ向けスケジュール表示 |
| `demo-staff.spec.ts` | 17件 | Phase 14 スタッフ用デモページ |
| `staff-record-form.spec.ts` | 34件 | Phase 15/15.6-15.9 スタッフ用記録入力フォーム（数値入力・残り対応・写真） |
| `photo-evidence.spec.ts` | 5件 | Phase 16 写真エビデンス表示 |
| `chat-integration.spec.ts` | 8件 | Phase 18 チャット連携 |
| `record-chat-integration.spec.ts` | 8件 | Phase 19 記録のチャット連携 |
| `demo-staff-containment.spec.ts` | 15件 | Phase 20 デモ環境完結・離脱防止 |
| `footer-nav-demo.spec.ts` | 9件 | Phase 20.1 デモモードAPI 500修正 |

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
