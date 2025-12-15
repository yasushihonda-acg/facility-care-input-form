# 現在のステータス

> **最終更新**: 2025年12月16日 (Phase 8.2 タスク管理機能 完了)
>
> このファイルは、会話セッションをクリアした後でも開発を継続できるよう、現在の進捗状況を記録しています。

---

## 引き継ぎ情報

**引き継ぎドキュメント**: [HANDOVER.md](./HANDOVER.md) を参照

**プロジェクト紹介ページ**: https://yasushihonda-acg.github.io/facility-care-input-form/
- Mermaid図付きのプロジェクト概要・アーキテクチャ図
- GitHub Pages自動デプロイ（`gh-pages/` ディレクトリ）

---

## プロジェクト概要

**リポジトリ**: https://github.com/yasushihonda-acg/facility-care-input-form

**目的**: 介護施設向けコミュニケーションアプリのプロトタイプ（デモ版）を開発・公開する

**デモURL**: https://facility-care-input-form.web.app

---

## 現在の進捗

### ✅ 完了: Phase 8.2 タスク管理機能

**コンセプト**: スタッフ向けのタスク管理・追跡システム（賞味期限警告、提供リマインダー等）

**設計書**: [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md)

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | Task型定義（frontend/backend共通） | ✅ 完了 |
| 2 | バックエンドAPI実装（createTask, getTasks, updateTask, deleteTask） | ✅ 完了 |
| 3 | フロントエンドAPI呼び出し関数・カスタムフック | ✅ 完了 |
| 4 | タスク一覧UI（TaskList.tsx） | ✅ 完了 |
| 5 | FamilyDashboardにタスクバッジ追加 | ✅ 完了 |
| 6 | ビルド確認・デプロイ | ✅ 完了 |

**実装ファイル（新規）**:
- `frontend/src/types/task.ts` - タスク管理型定義
- `frontend/src/hooks/useTasks.ts` - カスタムフック
- `frontend/src/pages/family/TaskList.tsx` - タスク一覧ページ
- `functions/src/functions/tasks.ts` - バックエンドAPI

**実装ファイル（修正）**:
- `frontend/src/App.tsx` - ルーティング追加（/family/tasks）
- `frontend/src/api/index.ts` - API呼び出し関数追加
- `frontend/src/pages/family/FamilyDashboard.tsx` - タスクバッジ・クイックリンク追加
- `functions/src/index.ts` - APIエンドポイント追加
- `functions/src/types/index.ts` - バックエンド型定義追加

**アクセス方法**:
- タスク一覧: `/family/tasks`
- 家族ホームからクイックリンクでアクセス可能

**タスク種別**:
- `expiration_warning` - 賞味期限警告
- `serve_reminder` - 提供リマインダー
- `restock_alert` - 在庫切れアラート
- `care_instruction` - ケア指示確認
- `custom` - カスタムタスク

**次のステップ**:
- タスク自動生成ロジック（Cloud Scheduler連携）は Phase 8.2.1 で実装予定

---

### ✅ 完了: Phase 8.1 品物管理基盤

**コンセプト**: 家族が送付した品物を管理・追跡するシステム

**設計書**: [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md)

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | CareItem型定義（frontend/backend共通） | ✅ 完了 |
| 2 | バックエンドAPI実装（submitCareItem, getCareItems, updateCareItem, deleteCareItem） | ✅ 完了 |
| 3 | フロントエンドAPI呼び出し関数・カスタムフック | ✅ 完了 |
| 4 | 品物一覧UI（ItemManagement.tsx） | ✅ 完了 |
| 5 | 品物登録フォーム（ItemForm.tsx） | ✅ 完了 |
| 6 | ルーティング追加（/family/items, /family/items/new） | ✅ 完了 |
| 7 | ビルド確認・デプロイ | ✅ 完了 |

**実装ファイル（新規）**:
- `frontend/src/types/careItem.ts` - 品物管理型定義
- `frontend/src/hooks/useCareItems.ts` - カスタムフック
- `frontend/src/pages/family/ItemManagement.tsx` - 品物一覧ページ
- `frontend/src/pages/family/ItemForm.tsx` - 品物登録フォーム
- `functions/src/functions/careItems.ts` - バックエンドAPI

**実装ファイル（修正）**:
- `frontend/src/App.tsx` - ルーティング追加
- `frontend/src/api/index.ts` - API呼び出し関数追加
- `functions/src/index.ts` - APIエンドポイント追加
- `functions/src/types/index.ts` - バックエンド型定義追加

**アクセス方法**:
- 品物一覧: `/family/items`
- 品物登録: `/family/items/new`

---

### ✅ 完了: Phase 8.0 設計ドキュメント（品物管理・タスク管理・統計・AI連携）

**コンセプト**: 家族向け品物管理、スタッフ向けタスク管理、統計ダッシュボード、Gemini AI連携機能の詳細設計

**実装プランファイル**: `.claude/plans/elegant-imagining-aho.md`

**Phase 8 設計方針**:
1. **既存システム維持**: Sheet B（15カラム）・Webhook通知は変更しない
2. **分岐保存**: 既存フィールド→Sheet B、新規フィールド→Firestore
3. **postIdによる紐付け**: 既存記録と品物データを共通キーで関連付け
4. **段階的実装**: Phase 8.1から順に独立してデプロイ可能
5. **ユーザータイプ分離**: スタッフ用/家族用/管理者用でページを明確に分ける

**作成した設計ドキュメント**:

| ドキュメント | 内容 |
|-------------|------|
| [USER_ROLE_SPEC.md](./USER_ROLE_SPEC.md) | ユーザータイプ別ページ・権限設計 |
| [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) | 品物管理機能詳細設計 |
| [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md) | タスク管理機能詳細設計 |
| [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md) | 統計ダッシュボード設計 |
| [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) | Gemini 2.5 Flash AI連携設計 |

**3つのユーザータイプ**:
| ロール | アクセス方法 | 主な機能 |
|--------|-------------|---------|
| 管理者 | `?admin=true` | システム設定・マスタ管理 |
| スタッフ | `?role=staff` (デフォルト) | 記録入力・家族指示の実行 |
| 家族 | `?role=family` | 品物送付登録・ケア指示・状況確認 |

**次の実装Phase（Phase 8.1〜）**:
| Phase | 内容 | 優先度 |
|-------|------|--------|
| Phase 8.1 | 品物管理基盤（Firestore + API + UI） | 高 |
| Phase 8.2 | タスク管理（自動生成 + スケジューラ） | 高 |
| Phase 8.3 | 統計ダッシュボード（SVGグラフ + 共有ビュー） | 中 |
| Phase 8.4 | Gemini AI連携（入力補助 + 分析） | 中 |
| Phase 8.5 | Push通知（FCM + リマインダー） | 低 |

---

### ✅ 完了: Phase 7.1 予実管理（Plan/Result連携）

**コンセプト**: スタッフの食事入力が家族ビューに自動反映

**設計書**: [PLAN_RESULT_MANAGEMENT.md](./PLAN_RESULT_MANAGEMENT.md)

**設計方針**: 読み取り時JOIN（バックエンド修正ゼロ・コスト増なし・シンプル）

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | 設計書作成（PLAN_RESULT_MANAGEMENT.md） | ✅ 完了 |
| 2 | 食事時間マッピングユーティリティ作成 | ✅ 完了 |
| 3 | MealResult型定義追加 | ✅ 完了 |
| 4 | useFamilyMealRecordsフック作成 | ✅ 完了 |
| 5 | EvidenceMonitor修正（実データ取得） | ✅ 完了 |
| 6 | FamilyDashboard修正（実データ反映） | ✅ 完了 |
| 7 | ビルド確認 | ✅ 完了 |

**予実管理データフロー**:
```
食事入力(スタッフ) → Sheet B → 同期(15分毎) → Firestore plan_data/
                                                    ↓
家族ビュー → useFamilyMealRecords → 日付+食事時間でフィルタ → 表示
                                                    ↑
家族指示(Plan) → モックデータ (将来: Firestore care_instructions/)
```

**実装ファイル（新規）**:
- `frontend/src/utils/mealTimeMapping.ts` - 食事時間マッピング
- `frontend/src/hooks/useFamilyMealRecords.ts` - 実績データ取得フック
- `docs/PLAN_RESULT_MANAGEMENT.md` - 設計ドキュメント

**実装ファイル（修正）**:
- `frontend/src/types/family.ts` - MealResult型追加
- `frontend/src/pages/family/EvidenceMonitor.tsx` - 実データ取得対応
- `frontend/src/pages/family/FamilyDashboard.tsx` - タイムライン実データ反映
- `frontend/src/data/demoFamilyData.ts` - 型整合性修正

---

### ✅ 完了: Phase 7.0 家族向け機能（Flow C拡張）

**コンセプト**: 『遠隔ケア・コックピット』- FAXの代替となる入力機能と、安心を提供する確認画面

**設計書**: [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md)

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | UX設計書作成（FAMILY_UX_DESIGN.md） | ✅ 完了 |
| 2 | ARCHITECTURE.md更新（Flow C詳細追記） | ✅ 完了 |
| 3 | 家族向け型定義（frontend/src/types/family.ts） | ✅ 完了 |
| 4 | デモ用モックデータ（frontend/src/data/demoFamilyData.ts） | ✅ 完了 |
| 5 | フッターナビ3タブ化（FooterNav.tsx） | ✅ 完了 |
| 6 | Layoutコンポーネント拡張（ヘッダー対応） | ✅ 完了 |
| 7 | View C: 家族ホーム（FamilyDashboard.tsx） | ✅ 完了 |
| 8 | View A: エビデンス・モニター（EvidenceMonitor.tsx） | ✅ 完了 |
| 9 | View B: ケア仕様ビルダー（RequestBuilder.tsx） | ✅ 完了 |
| 10 | ルーティング追加（App.tsx） | ✅ 完了 |
| 11 | ビルド確認 | ✅ 完了 |
| 12 | 予実管理（Phase 7.1）| ✅ 完了 |

**3つのビュー**:
| ビュー | パス | 説明 |
|--------|------|------|
| 家族ホーム | `/family` | タイムライン形式で1日の食事状況確認 |
| エビデンス・モニター | `/family/evidence/:date` | Plan（指示）とResult（実績）を対比表示 |
| ケア仕様ビルダー | `/family/request` | 構造化されたケア指示作成（プリセット＋If-Then） |

**実装ファイル**:
- `frontend/src/types/family.ts` - 家族向け型定義（CareInstruction, MealResult等）
- `frontend/src/data/demoFamilyData.ts` - デモ用モックデータ（蒲池様FAX内容）
- `frontend/src/components/Layout.tsx` - ヘッダー対応拡張
- `frontend/src/components/FooterNav.tsx` - 3タブ化
- `frontend/src/components/family/TimelineItem.tsx` - タイムラインアイテム
- `frontend/src/pages/family/FamilyDashboard.tsx` - View C
- `frontend/src/pages/family/EvidenceMonitor.tsx` - View A
- `frontend/src/pages/family/RequestBuilder.tsx` - View B
- `frontend/src/App.tsx` - ルーティング追加
- `frontend/src/utils/mealTimeMapping.ts` - 食事時間マッピング
- `frontend/src/hooks/useFamilyMealRecords.ts` - 実績データ取得フック

---

### ✅ 完了: Phase 5.7 設定モーダルUI改善

**背景**:
- 設定モーダルのフッターが「クリア/保存」となっており、「クリア」と「キャンセル」を誤解しやすい
- 誤操作で全設定がクリアされるリスクがあった

**設計書**: [SETTINGS_MODAL_UI_SPEC.md](./SETTINGS_MODAL_UI_SPEC.md)

**実装完了**:

| 変更点 | Before | After |
|--------|--------|-------|
| フッター左ボタン | クリア | キャンセル |
| フッター右ボタン | 保存 | 保存（変更なし） |
| クリア機能 | フッターボタン | 本文下部の赤テキストリンク |
| クリア確認 | なし | 確認ダイアログ追加 |

**実装ファイル**:
- `frontend/src/components/MealSettingsModal.tsx` - UI改善・確認ダイアログ追加

---

### ✅ 完了: Phase 5.6 写真アップロードフォルダ設定

**背景**:
- 写真アップロード時の保存先フォルダをハードコードではなく管理者が指定可能にしたい
- 既存の共有フォルダを使用できるようにする

**設計書**: [PHOTO_UPLOAD_SPEC.md](./PHOTO_UPLOAD_SPEC.md)

**アップロードフロー**:
```
[写真選択] → [POST /uploadCareImage]
    ├─→ Firestore: driveUploadFolderId を取得
    ├─→ 設定済み: {指定フォルダ}/{YYYY}/{MM}/{filename}
    └─→ 未設定: CareRecordImages/{YYYY}/{MM}/{filename} (後方互換)
```

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | 型定義拡張（backend + frontend） | ✅ 完了 |
| 2 | 設定API拡張（mealFormSettings.ts） | ✅ 完了 |
| 3 | driveService修正（フォルダID対応） | ✅ 完了 |
| 4 | uploadCareImage修正（設定読み取り） | ✅ 完了 |
| 5 | フロントエンド設定UI拡張 | ✅ 完了 |
| 6 | デプロイ・動作確認 | ✅ 完了 |

**管理者設定項目（追加）**:
| 項目 | 説明 |
|------|------|
| driveUploadFolderId | 写真保存先Google DriveフォルダID |

**フォルダID取得方法**:
```
URL: https://drive.google.com/drive/folders/1ABC123xyz
フォルダID: 1ABC123xyz
```

**サービスアカウント権限**:
管理者が指定するフォルダに編集者権限を付与:
```
facility-care-sa@facility-care-input-form.iam.gserviceaccount.com
```

**実装ファイル**:
- `functions/src/types/index.ts` - driveUploadFolderId 追加
- `functions/src/functions/mealFormSettings.ts` - フォルダID保存対応
- `functions/src/services/driveService.ts` - 指定フォルダ対応
- `functions/src/functions/uploadCareImage.ts` - 設定読み取り追加
- `frontend/src/types/index.ts` - フロントエンド型定義拡張
- `frontend/src/components/MealSettingsModal.tsx` - フォルダID設定UI追加

---

### ✅ 完了: Phase 5.5 Google Chat Webhook連携

**背景**:
- 食事記録入力時にGoogle Chatスペースへ自動通知したい
- 「重要」フラグが付いた記録は別スペースにも追加通知

**設計書**: [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md)

**通知フロー**:
```
[食事記録入力] → [Sheet B書き込み成功]
    ├─→ [通常Webhook] 全記録を通知
    └─→ [重要Webhook] isImportant="重要" のみ追加通知
```

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | 設計書作成 | ✅ 完了 |
| 2 | 型定義拡張 | ✅ 完了 |
| 3 | Webhook送信サービス作成 | ✅ 完了 |
| 4 | 設定API拡張（Webhook URL保存） | ✅ 完了 |
| 5 | submitMealRecord修正（Webhook送信追加） | ✅ 完了 |
| 6 | フロントエンド設定UI拡張 | ✅ 完了 |
| 7 | デプロイ・動作確認 | ✅ 完了 |

**管理者設定項目（追加）**:
| 項目 | 説明 |
|------|------|
| webhookUrl | 通常Webhook URL（全記録通知） |
| importantWebhookUrl | 重要Webhook URL（重要記録のみ追加通知） |

**実装ファイル**:
- `functions/src/services/googleChatService.ts` - Webhook送信サービス（新規）
- `functions/src/types/index.ts` - MealFormSettings, MealRecordForChat型拡張
- `functions/src/functions/mealFormSettings.ts` - Webhook URL保存対応
- `functions/src/functions/submitMealRecord.ts` - Webhook送信処理追加
- `frontend/src/types/index.ts` - フロントエンド型定義拡張
- `frontend/src/components/MealSettingsModal.tsx` - Webhook URL設定UI追加

---

### ✅ 完了: Phase 5.4 管理者による初期値設定（admin パラメータ）

**背景**:
- Phase 5.3でコード内定数としてグローバル初期値を管理していた
- ユーザー要件: 初期値変更をコード修正なしで管理者が変更できるようにしたい

**実装内容**:

1. **バックエンドAPI（Cloud Functions）** ✅
   - `getMealFormSettings` - 設定取得（全ユーザー）
   - `updateMealFormSettings` - 設定更新（admin=trueパラメータ必須）
   - Firestore `settings/mealFormDefaults` に保存

2. **フロントエンド** ✅
   - `useMealFormSettings.ts` - 設定取得・更新フック
   - `MealSettingsModal.tsx` - 設定モーダル（テキスト入力）
   - `MealInputPage.tsx` - admin モード検知・設定適用

3. **選択肢制限** ✅
   - 施設・デイサービスは**管理者設定の初期値のみ**選択可能
   - 他の選択肢（デモ用定数）は表示しない
   - 未設定時は「選んでください」のみ表示

4. **デイサービス初期値** ✅
   - 「デイサービスの利用中ですか？」: 常に「利用中ではない」が初期選択
   - 「どこのデイサービスですか？」: 常に未選択（空）が初期値

**設計方針**:
- 初期値はFirestoreに保存、全ユーザーに等しく適用
- 管理者は `?admin=true` パラメータでアクセスして設定変更
- 一般ユーザーは設定UIを見ることができない

**アクセス方法**:
- 通常モード: https://facility-care-input-form.web.app/input/meal
- 管理者モード: https://facility-care-input-form.web.app/input/meal?admin=true

**API仕様**:
```
GET  /getMealFormSettings          - 設定取得（認証不要）
POST /updateMealFormSettings?admin=true - 設定更新（adminパラメータ必須）
```

**設定項目**:
| 項目 | 説明 |
|------|------|
| defaultFacility | デフォルト施設名 |
| defaultResidentName | デフォルト利用者名 |
| defaultDayServiceName | デフォルトデイサービス名 |

---

### ✅ 完了: Phase 5.3 グローバル初期値設定（コード定数版）

> **注意**: Phase 5.4で置き換えられました。現在はFirestore + API方式です。

**背景**:
- 食事入力フォームの初期値設定機能について、当初はユーザー個別設定（LocalStorage）で実装
- ユーザー要件: 全ユーザー共通の初期値であるべき、各ユーザーが個別に変更できてはNG

**実装内容**:
- 初期値は「コード内定数」として管理 → **Phase 5.4でFirestore方式に変更**

---

### ✅ 完了: Phase 6.0 フッターナビゲーション基盤

> **詳細設計**: [FOOTER_NAVIGATION_SPEC.md](./FOOTER_NAVIGATION_SPEC.md) / [ROADMAP.md](./ROADMAP.md)

**実装内容**:

1. **フッターナビゲーション**
   - 2タブ構成（記録閲覧 / 記録入力）
   - 選択タブは色反転（白文字 + Primary背景）で視認性向上
   - iOS Safe Area対応

2. **ルーティング**
   - `/view` - 記録閲覧（旧HomePage）
   - `/input/meal` - 食事記録入力（直接遷移）
   - 中間画面（InputPage）は削除済み

3. **UX改善**
   - 「記録入力」1タップで食事入力フォームへ直接遷移
   - FABボタン廃止

**画面フロー**:
```
┌─────────────────┐      ┌─────────────────┐
│   記録閲覧      │ ←→  │   食事記録      │
│   (/view)       │      │   (/input/meal) │
└─────────────────┘      └─────────────────┘
        ↑                        ↑
        └────── フッターナビ ──────┘
```

**成果物**:
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/FooterNav.tsx`
- `frontend/src/pages/ViewPage.tsx`

---

### ✅ 完了: Phase 5.10 設定モーダルキャンセル時リセット修正

**背景**:
- 設定モーダルでテスト送信だけ実行して保存せずにキャンセルしても、次回モーダルを開いた時に前回の入力値やテスト結果が残っていた
- ユーザーが混乱するため、キャンセル時は完全にリセットすべき

**設計書**: [SETTINGS_MODAL_UI_SPEC.md](./SETTINGS_MODAL_UI_SPEC.md)

**問題の原因**:
- Reactコンポーネントは`isOpen=false`でも破棄されず、メモリ上に状態が保持される
- `handleCancel`でリセットしても、モーダルを閉じる前にリセットされるため、次回開いた時に反映されない

**解決策**:
- `useEffect`で`isOpen`を監視し、`isOpen=true`（モーダルが開いた時）に`resetAllStates()`を実行
- これによりモーダルを開く度に必ずpropsの設定値で初期化される

**実装ファイル（修正）**:
- `frontend/src/components/MealSettingsModal.tsx` - useEffectでisOpen監視追加

**コミット履歴**:
- `52774c7` fix: キャンセル時に設定・テスト状態をリセット（初回修正）
- `bef8087` fix: モーダルを開いた時に状態をリセット（最終修正）

---

### ✅ 完了: Phase 5.9 デイサービス選択肢固定リスト化

**背景**:
- デイサービス選択が管理者設定の単一値のみで運用に対応できなかった
- 複数のデイサービス施設から選択する必要があった

**設計書**: [DAY_SERVICE_OPTIONS_SPEC.md](./DAY_SERVICE_OPTIONS_SPEC.md)

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | 設計書作成 | ✅ 完了 |
| 2 | mealForm.ts に DAY_SERVICE_OPTIONS 定数追加 | ✅ 完了 |
| 3 | MealInputPage.tsx 修正（固定リスト使用） | ✅ 完了 |
| 4 | MealSettingsModal.tsx 修正（defaultDayServiceName削除） | ✅ 完了 |
| 5 | ビルド確認 | ✅ 完了 |
| 6 | デプロイ | ✅ 完了 |

**デイサービス選択肢（固定リスト）**:
1. 武
2. 田上
3. 笹貫
4. 下荒田
5. 東千石
6. 南栄
7. 永吉
8. 七福の里

**実装ファイル（修正）**:
- `frontend/src/types/mealForm.ts` - DAY_SERVICE_OPTIONS定数追加
- `frontend/src/pages/MealInputPage.tsx` - 固定リスト使用に変更
- `frontend/src/components/MealSettingsModal.tsx` - defaultDayServiceNameフィールド削除

---

### ✅ 完了: Phase 5.8 管理設定テスト機能

**背景**:
- Webhook URLやDriveフォルダIDの設定を保存前にテストしたい
- 誤設定による運用トラブルを事前に防止

**設計書**: [ADMIN_TEST_FEATURE_SPEC.md](./ADMIN_TEST_FEATURE_SPEC.md)

**実装完了**:

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | testWebhook関数作成 | ✅ 完了 |
| 2 | testDriveAccess関数作成 | ✅ 完了 |
| 3 | functions/index.ts更新 | ✅ 完了 |
| 4 | api/index.ts更新（フロントエンド） | ✅ 完了 |
| 5 | MealSettingsModal.tsx修正 | ✅ 完了 |
| 6 | ビルド確認 | ✅ 完了 |
| 7 | デプロイ | ✅ 完了 |
| 8 | ドキュメント更新 | ✅ 完了 |

**テスト機能**:
| 機能 | 説明 |
|------|------|
| Webhookテスト送信 | 入力したURLにテストメッセージを送信して動作確認 |
| Driveフォルダ接続テスト | 入力したフォルダIDへのアクセス権限を確認 |

**実装ファイル（新規）**:
- `functions/src/functions/testWebhook.ts` - Webhookテスト送信関数
- `functions/src/functions/testDriveAccess.ts` - Driveアクセステスト関数

**実装ファイル（修正）**:
- `functions/src/index.ts` - エンドポイント追加
- `frontend/src/api/index.ts` - API呼び出し関数追加
- `frontend/src/components/MealSettingsModal.tsx` - テストボタンUI追加

**UI機能**:
- テストボタン（「テスト送信」/「接続テスト」）
- 5秒間のクールダウン防止
- 成功/失敗のインライン表示（緑/赤テキスト）
- フォルダ名表示（Driveテスト成功時）

**v1.1改善（2025-12-15）**:
- Webhookテスト: 本番形式（食事記録形式）のテストメッセージに変更
- Driveテスト: エラー時に親切なアドバイス表示
  - 404: フォルダID取得方法を案内
  - 403: サービスアカウント共有手順を詳細表示

**v1.2 サービスアカウント統一修正（2025-12-15）**:
- 問題: Cloud Functionsがデフォルトで App Engine SA を使用していた
- 試行: `firebase.json` に `serviceAccount` を明示的に指定
- 発見: **firebase.jsonのserviceAccountは第2世代関数のみ対応**
- 結論: 第1世代関数には別の対応が必要

**v1.3 第1世代関数SA修正（2025-12-15）**:
- 問題: `firebase.json` の `serviceAccount` フィールドはCloud Functions第2世代のみ対応
- 原因: このプロジェクトの関数は第1世代で動作していた
- 修正: gcloudコマンドで直接サービスアカウントを指定してデプロイ
  ```bash
  gcloud functions deploy testDriveAccess \
    --service-account=facility-care-sa@facility-care-input-form.iam.gserviceaccount.com
  ```
- 結果: ✅ testDriveAccess関数が正しいSAで実行され、Driveフォルダテスト成功

---

### 次のタスク

#### Phase 8.2.1: タスク自動生成ロジック（次に実装予定）

**設計書**: [TASK_MANAGEMENT_SPEC.md](./TASK_MANAGEMENT_SPEC.md)

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | タスク自動生成関数（taskGenerator.ts） | 未着手 |
| 2 | 賞味期限警告タスク生成（expiration_warning） | 未着手 |
| 3 | 提供リマインダータスク生成（serve_reminder） | 未着手 |
| 4 | 在庫切れアラートタスク生成（restock_alert） | 未着手 |
| 5 | Cloud Scheduler設定（毎日午前6時） | 未着手 |

#### Phase 8.3: 統計ダッシュボード

**設計書**: [STATS_DASHBOARD_SPEC.md](./STATS_DASHBOARD_SPEC.md)

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | 統計API実装（getStats） | 未着手 |
| 2 | 統計ダッシュボードUI（StatsDashboard.tsx） | 未着手 |
| 3 | グラフコンポーネント（SVG/Chart.js） | 未着手 |

#### その他のタスク

| 機能 | 説明 | 優先度 |
|------|------|--------|
| ケア指示のFirestore保存 | モックデータ → Firestore永続化 | 中 |
| 写真エビデンス表示 | Google Drive画像を家族ビューで表示 | 中 |
| 複数入居者対応 | residentIdでの厳密フィルタ | 中 |
| CSVエクスポート | 表示中のデータをCSVでダウンロード | 低 |
| オフラインキャッシュ強化 | ServiceWorkerでAPI応答をキャッシュ | 低 |

---

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

### Phase 5.2: 食事入力フォームAPI実装 ✅ 完了

> **詳細**: [MEAL_INPUT_FORM_SPEC.md](./MEAL_INPUT_FORM_SPEC.md) / [SHEET_B_STRUCTURE.md](./SHEET_B_STRUCTURE.md)

**実装内容**:

1. **フロントエンド修正** ✅
   - `frontend/src/types/mealForm.ts` に `dayServiceName` フィールド追加
   - `frontend/src/pages/MealInputPage.tsx` に条件付きフィールド「どこのデイサービスですか？」追加
   - バリデーション追加（「利用中」選択時は必須）
   - API呼び出し実装

2. **バックエンド型定義修正** ✅
   - `functions/src/types/index.ts` に `SubmitMealRecordRequest` / `MealRecordRow` 追加
   - Sheet B の15カラム構成に完全対応

3. **バックエンドAPI実装** ✅
   - `functions/src/functions/submitMealRecord.ts` 新規作成
   - `functions/src/services/sheetsService.ts` に `appendMealRecordToSheetB` 追加
   - シート名「フォームの回答 1」対応

4. **デプロイ・動作確認** ✅
   - GitHub Actions経由でデプロイ完了
   - curl検証: Sheet B書き込み成功（行番号26274, 26275）

**検証結果**:
```bash
# テスト1: 基本データ
curl -X POST ".../submitMealRecord" -d '{"staffName":"テスト太郎","facility":"あおぞら荘",...}'
→ {"success":true,"data":{"postId":"MEL20251214132211230123456","sheetRow":26274}}

# テスト2: デイサービス利用中
curl -X POST ".../submitMealRecord" -d '{"dayServiceUsage":"利用中","dayServiceName":"デイサービスあおぞら",...}'
→ {"success":true,"data":{"postId":"MEL20251214132220143654321","sheetRow":26275}}
```

> **投稿ID形式**: `MEL{YYYYMMDDHHmmssSSS}{6桁乱数}`（約26文字）
> 既存システムの投稿IDプレフィックス（HYD, ORC, MED, NTC, WTM, CNF）に準拠

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
| フィールド数 | 14（条件付き1を含む） |
| 必須フィールド | 6 + 条件付き必須1 |
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
Phase 1: 基盤構築 + CI/CD          ████████████████████ 100% (完了)
Phase 2: バックエンド実装           ████████████████████ 100% (完了)
Phase 3: デプロイ・検証             ████████████████████ 100% (完了)
Phase 4: デモ版PWA開発             ████████████████████ 100% (完了)
Phase 4.1: タブUI・汎用モデル       ████████████████████ 100% (完了)
Phase 4.2: テーブルビュー・検索      ████████████████████ 100% (完了)
Phase 4.3: 全シート同期+年月フィルタ  ████████████████████ 100% (完了)
Phase 4.4: シート表示順序修正       ████████████████████ 100% (完了)
Phase 4.5: デザイン改善            ████████████████████ 100% (完了)
Phase 4.7: テーブルビュー表示カラム   ████████████████████ 100% (完了)
Phase 4.8: テーブル最適化            ████████████████████ 100% (完了)
Phase 4.9: 同期競合防止+コスト最適化  ████████████████████ 100% (完了)
Phase 5.0: 食事入力フォームUI       ████████████████████ 100% (完了)
Phase 5.1: Sheet B SA接続          ████████████████████ 100% (完了)
Phase 5.2: 食事入力フォームAPI      ████████████████████ 100% (完了)
Phase 5.3: グローバル初期値設定      ████████████████████ 100% (完了)
Phase 5.4: 管理者初期値設定(admin)   ████████████████████ 100% (完了)
Phase 5.5: Google Chat Webhook連携  ████████████████████ 100% (完了)
Phase 5.6: 写真アップロードフォルダ設定 ████████████████████ 100% (完了)
Phase 5.7: 設定モーダルUI改善       ████████████████████ 100% (完了)
Phase 6.0: フッターナビゲーション基盤 ████████████████████ 100% (完了)
Phase 7.0: 家族向け機能(Flow C)     ████████████████████ 100% (完了)
Phase 7.1: 予実管理(Plan/Result連携) ████████████████████ 100% (完了)
Phase 5.8: 管理設定テスト機能       ████████████████████ 100% (完了)
Phase 5.9: デイサービス選択肢固定リスト ████████████████████ 100% (完了)
Phase 5.10: 設定モーダルキャンセル修正 ████████████████████ 100% (完了)
Phase 8.0: 設計ドキュメント作成        ████████████████████ 100% (完了)
Phase 8.1: 品物管理基盤               ████████████████████ 100% (完了)
Phase 8.2: タスク管理                 ████████████████████ 100% (完了)
Phase 8.2.1: タスク自動生成           ░░░░░░░░░░░░░░░░░░░░   0% (次に実装)
Phase 8.3: 統計ダッシュボード         ░░░░░░░░░░░░░░░░░░░░   0%
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
| POST | `/submitMealRecord` | 食事記録を入力 | ✅ 動作確認済み |
| POST | `/submitCareRecord` | ケア実績を入力 (deprecated) | 非推奨 |
| POST | `/submitFamilyRequest` | 家族要望を送信 | 動作可能 |
| POST | `/uploadCareImage` | 画像をアップロード | Drive権限未確認 |
| GET | `/getPlanData` | 同期済み記録を取得 (シート別フィルタ対応) | 動作可能 |
| GET | `/getFamilyRequests` | 家族要望一覧を取得 | 動作可能 |
| GET | `/getMealFormSettings` | 食事フォーム初期値設定を取得 | ✅ 動作確認済み |
| POST | `/updateMealFormSettings?admin=true` | 食事フォーム初期値設定を更新 | ✅ 動作確認済み |

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
│   │   │   ├── Layout.tsx        # レイアウト (Header + Footer)
│   │   │   ├── FooterNav.tsx     # フッターナビ (3タブ)
│   │   │   ├── DataTable.tsx     # テーブルビュー
│   │   │   ├── DetailModal.tsx   # 詳細モーダル
│   │   │   ├── YearPaginator.tsx # 年切り替え
│   │   │   ├── MonthFilter.tsx   # 月フィルタ
│   │   │   ├── MealSettingsModal.tsx # 初期値設定モーダル
│   │   │   └── family/           # 家族向けコンポーネント
│   │   │       └── TimelineItem.tsx  # タイムラインアイテム
│   │   ├── config/
│   │   │   └── tableColumns.ts   # シート別カラム設定
│   │   ├── data/
│   │   │   └── demoFamilyData.ts # 家族向けデモデータ（蒲池様FAX）
│   │   ├── hooks/
│   │   │   ├── useSync.ts        # 同期処理
│   │   │   ├── usePlanData.ts    # データ取得
│   │   │   ├── useMealFormSettings.ts # 初期値設定取得
│   │   │   └── useFamilyMealRecords.ts # 家族ビュー用食事実績取得
│   │   ├── pages/
│   │   │   ├── ViewPage.tsx      # 記録閲覧（旧HomePage）
│   │   │   ├── MealInputPage.tsx # 食事入力フォーム
│   │   │   └── family/           # 家族向けページ
│   │   │       ├── FamilyDashboard.tsx  # View C: 家族ホーム
│   │   │       ├── EvidenceMonitor.tsx  # View A: エビデンス・モニター
│   │   │       └── RequestBuilder.tsx   # View B: ケア仕様ビルダー
│   │   ├── types/
│   │   │   ├── index.ts          # 型定義 (PlanDataRecord等)
│   │   │   ├── mealForm.ts       # 食事フォーム型定義
│   │   │   └── family.ts         # 家族向け型定義
│   │   ├── utils/
│   │   │   └── mealTimeMapping.ts # 食事時間マッピング
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
│   │   ├── googleChatService.ts  # Google Chat Webhook送信 ← New!
│   │   └── driveService.ts
│   └── functions/
│       ├── syncPlanData.ts       # 汎用パーシング実装
│       ├── getPlanData.ts        # シート別フィルタ対応
│       ├── mealFormSettings.ts   # 初期値設定API ← New!
│       └── ...
├── docs/
│   ├── CURRENT_STATUS.md         # このファイル（再開時に最初に読む）
│   ├── FAMILY_UX_DESIGN.md       # 家族向けUX設計（Phase 7.0）
│   ├── PLAN_RESULT_MANAGEMENT.md # 予実管理設計（Phase 7.1）
│   ├── SHEET_A_STRUCTURE.md      # Sheet A（読み取り）構造
│   ├── SHEET_B_STRUCTURE.md      # Sheet B（書き込み）構造
│   ├── MEAL_INPUT_FORM_SPEC.md   # 食事入力フォーム設計書
│   ├── SYNC_STRATEGY.md          # 同期戦略設計書
│   ├── SYNC_CONCURRENCY.md       # 同期競合防止設計
│   ├── DESIGN_GUIDELINES.md      # デザインガイドライン
│   ├── TABLE_VIEW_COLUMNS.md     # テーブルビュー表示カラム設計
│   ├── GOOGLE_CHAT_WEBHOOK_SPEC.md # Google Chat Webhook仕様
│   ├── PHOTO_UPLOAD_SPEC.md       # 写真アップロード仕様
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
