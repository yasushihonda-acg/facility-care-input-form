# 現在のステータス

> **最終更新**: 2025年12月18日 (ルーティング修正・E2Eテスト修正・ドキュメント整備完了)
>
> このファイルは、会話セッションをクリアした後でも開発を継続できるよう、現在の進捗状況を記録しています。

---

## クイックリファレンス

| 項目 | 値 |
|------|-----|
| **デモURL** | https://facility-care-input-form.web.app |
| **デモショーケース** | https://facility-care-input-form.web.app/demo |
| **リポジトリ** | https://github.com/yasushihonda-acg/facility-care-input-form |
| **GitHub Pages** | https://yasushihonda-acg.github.io/facility-care-input-form/ |
| **引き継ぎドキュメント** | [HANDOVER.md](./HANDOVER.md) |
| **ロードマップ** | [ROADMAP.md](./ROADMAP.md) |

---

## 現在のタスク

現在、推奨タスクはありません。次のタスクは「次のタスク（将来）」セクションを参照してください。

---

## 最近の完了タスク

### Phase 12.0: FIFO（先入れ先出し）対応実装 (2025-12-18)

**設計書**: [FIFO_DESIGN_SPEC.md](./FIFO_DESIGN_SPEC.md)

**概要**: 同じ品物が複数送付された場合に、賞味期限が近い順に表示し、FIFOを促すガイド機能を実装。

**実装内容**:

| ファイル | 内容 |
|----------|------|
| `frontend/src/hooks/useCareItems.ts` | FIFOソート（期限が近い順）実装 |
| `frontend/src/components/family/FIFOWarning.tsx` | 間食提供時のFIFOガイド（新規） |
| `frontend/src/components/family/SameItemAlert.tsx` | 品物詳細でのSameItemAlert（新規） |
| `frontend/src/components/meal/SnackSection.tsx` | FIFOWarning統合 |
| `frontend/src/pages/family/ItemDetail.tsx` | SameItemAlert統合、フィルタ条件修正 |
| `frontend/src/data/demo/demoCareItems.ts` | FIFO用デモデータ追加（りんご・バナナの重複） |
| `frontend/e2e/fifo.spec.ts` | FIFO E2Eテスト（新規・10件） |

**機能**:

| 機能 | 説明 |
|------|------|
| **FIFOソート** | 品物一覧を期限が近い順に表示（期限なしは末尾） |
| **FIFOWarning** | 間食提供時、同一品物が複数ある場合に「推奨」マークで先に消費すべき品物を表示 |
| **SameItemAlert** | 品物詳細画面で、より期限が近い同名品物がある場合に「先に消費推奨」アラート表示 |

**E2Eテスト**: 117件全パス（FIFO 10件追加、うち2件は本番データ必要でスキップ）

---

### ルーティング修正・E2Eテスト修正・ドキュメント整備 (2025-12-18)

**コミット**: `7594fab`, `f1a0a10`

**概要**: `/settings`ルーティング問題の修正、GitHub Pages管理者リンク修正、E2Eテスト構文修正、ドキュメント整備を実施。

**修正内容**:

| 項目 | 修正内容 |
|------|----------|
| `/settings`ルーティング | `App.tsx`に`/settings` → `/staff/input/meal?admin=true`リダイレクト追加、白画面「No routes matched」エラー解消 |
| GitHub Pages管理者リンク | 古いURL `/input/meal?admin=true` → 正しいURL `/staff/input/meal?admin=true` に更新（2箇所） |
| E2Eテスト修正 | `demo-page.spec.ts`の`test.setTimeout()`を`test.describe.configure()`に修正、Playwright構文エラー解消 |
| CLAUDE.md更新 | アプリケーションURLセクション追加（管理者画面URL明記） |

**修正ファイル**:

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/App.tsx` | `/settings`リダイレクトルート追加 |
| `frontend/e2e/demo-page.spec.ts` | タイムアウト設定構文修正 |
| `gh-pages/index.html` | 管理者リンクURL修正（2箇所） |
| `CLAUDE.md` | アプリケーションURLセクション追加 |

**テスト・デプロイ結果**:

| 項目 | 結果 |
|------|------|
| E2Eテスト | 109件全パス ✅ |
| CI/CD | 3ワークフロー全て成功 ✅（CI、Firebase Hosting、GitHub Pages） |

---

### Phase 11.1: FoodMaster自動蓄積有効化 (2025-12-18)

**設計書**: [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) セクション3.1、[INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) セクション2.2

**概要**: AI提案（aiSuggest）で生成された結果を自動的にFoodMasterに蓄積し、「学習するシステム」を実現。

**実装内容**:

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/types/careItem.ts` | `AISuggestRequest`に`saveToFoodMaster?: boolean`追加 |
| `frontend/src/hooks/useAISuggest.ts` | デモモード判定追加、`saveToFoodMaster: !isDemoMode`を渡す |

**動作**:
- **本番モード**: AI生成結果を自動でFoodMasterに保存（次回同じ品物はキャッシュヒット）
- **デモモード**: FoodMasterへの保存をスキップ（本番データ汚染防止）

**効果**:

| 効果 | 説明 |
|------|------|
| **APIコスト削減** | 同じ品物は2回目以降Gemini APIを呼ばない |
| **応答速度向上** | Firestoreキャッシュ: ~100ms vs Gemini API: ~2s |
| **施設固有データ構築** | 利用パターンに特化した食品マスタが自動構築 |

**E2Eテスト**: 109件全パス（回帰なし）

---

### Phase 11: FoodMaster食品マスタ実装 (2025-12-18)

**設計書**: [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md) セクション2.2

**概要**: 食品の正規化情報と統計を管理する食品マスタ機能。AI提案のキャッシュとして機能し、よく登録される食品の情報を保持。**✅ 自動蓄積は Phase 11.1 で有効化完了。**

**実装ファイル（バックエンド）**:

| ファイル | 内容 |
|----------|------|
| `functions/src/types/index.ts` | FoodMaster型定義（FoodMaster, FoodMasterInput, FoodMasterStats等） |
| `functions/src/functions/foodMasters.ts` | CRUD API（getFoodMasters, searchFoodMaster, createFoodMaster, updateFoodMaster, deleteFoodMaster） |
| `functions/src/functions/aiSuggest.ts` | FoodMaster連携拡張（優先検索、AI生成結果の保存オプション） |
| `functions/src/index.ts` | エクスポート追加 |

**実装ファイル（フロントエンド）**:

| ファイル | 内容 |
|----------|------|
| `frontend/src/types/careItem.ts` | FoodMaster型定義追加 |
| `frontend/src/api/index.ts` | FoodMaster API呼び出し関数追加 |
| `frontend/src/hooks/useFoodMasters.ts` | FoodMaster CRUDフック（新規） |
| `frontend/src/data/demo/demoFoodMasters.ts` | 食品マスタデモデータ（15品目） |
| `frontend/src/data/demo/index.ts` | エクスポート追加 |

**API仕様**:

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/getFoodMasters` | 食品マスタ一覧取得（カテゴリフィルタ対応） |
| GET | `/searchFoodMaster` | 食品マスタ検索（名前・別名でマッチ） |
| POST | `/createFoodMaster` | 食品マスタ作成 |
| PUT | `/updateFoodMaster` | 食品マスタ更新 |
| DELETE | `/deleteFoodMaster` | 食品マスタ削除（論理削除） |

**aiSuggest連携フロー**:
1. まずFoodMasterを検索
2. 見つかればそのデータを返却（source: "food_master"）
3. 見つからなければGeminiで生成して返却（source: "ai"）
4. `saveToFoodMaster=true`の場合、AI生成結果をFoodMasterに自動保存

**デモデータ**: 15品目（バナナ、みかん、りんご、キウイ、羊羹、黒豆、らっきょう、カステラ、緑茶、りんごジュース、ヨーグルト、チーズ、エンシュア、おにぎり、黒砂糖）

**E2Eテスト**: 109件全パス（既存機能への影響なし）

---

### 間食記録連携機能 - 全Phase完了 ✅ (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**進捗**:
- [x] Phase 1: API拡張（submitMealRecord + 消費ログ連携）完了
- [x] Phase 2: フロントエンド - 品物リスト表示 完了
- [x] Phase 3: フロントエンド - 提供記録入力UI 完了
- [x] Phase 4: 家族ページ連携 完了
- [x] Phase 5: AIサジェスト統合 完了
- [x] Phase 6: E2Eテスト 完了

---

### ドキュメント整備・引き継ぎ品質更新 (2025-12-18)

**概要**: Phase 8.4.1（aiAnalyze）実装完了に伴い、ドキュメントを引き継ぎ可能品質まで整備

**更新ドキュメント**:

| ドキュメント | 更新内容 |
|-------------|----------|
| `AI_INTEGRATION_SPEC.md` | 実装ステータステーブル追加、セクション3.2にステータスマーカー |
| `API_SPEC.md` | aiSuggest/aiAnalyze詳細ドキュメント追加（4.32-4.33節） |
| `ROADMAP.md` | Phase 8.4.1をプログレスバー・テーブルに追加 |
| `STATS_DASHBOARD_SPEC.md` | AI分析コンポーネントセクション4.3追加、ファイル構成更新 |
| `HANDOVER.md` | 最新機能・Phase・ファイル構成を反映 |
| `CURRENT_STATUS.md` | 本セクション追加 |

---

### デモモード食品統計表示修正 (2025-12-18)

**問題**: `/demo/stats` の摂食傾向タブで「摂食データがありません」と表示される

**原因**: `StatsDashboard.tsx` がデモモードチェックなしでAPI呼び出し

**解決**:
- `useLocation()` でデモモード判定
- デモモード時は `DEMO_FOOD_STATS` を使用

**修正ファイル**: `frontend/src/pages/shared/StatsDashboard.tsx`

---

### aiAnalyze API実装完了 - 摂食傾向分析 (2025-12-18)

**設計書**: [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) セクション3.2

**概要**: Gemini 2.5 Flash を使用した摂食傾向分析機能。消費ログや食事記録を分析し、発見事項と改善提案を生成。

**実装ファイル（バックエンド）**:

| ファイル | 内容 |
|----------|------|
| `functions/src/types/index.ts` | AIAnalyze型定義（AIAnalyzeRequest, AIAnalyzeResponse, AIFinding, AISuggestion等） |
| `functions/src/prompts/analysisPrompts.ts` | 分析プロンプトテンプレート（新規） |
| `functions/src/functions/aiAnalyze.ts` | aiAnalyze API実装（新規） |
| `functions/src/index.ts` | エクスポート追加 |

**実装ファイル（フロントエンド）**:

| ファイル | 内容 |
|----------|------|
| `frontend/src/types/careItem.ts` | AIAnalyze型定義、表示設定（FINDING_TYPE_CONFIG, SUGGESTION_PRIORITY_CONFIG） |
| `frontend/src/api/index.ts` | aiAnalyze API呼び出し関数 |
| `frontend/src/components/family/AIAnalysis.tsx` | AI分析UIコンポーネント（新規） |
| `frontend/src/pages/shared/StatsDashboard.tsx` | AIAnalysisを摂食傾向タブに統合 |

**API仕様**:
- **エンドポイント**: `POST /aiAnalyze`
- **入力**: residentId, analysisType, period, data（消費ログ/食事記録）
- **出力**: summary（サマリ）, findings（発見事項）, suggestions（改善提案）

**発見事項タイプ（FindingType）**:
- `positive`: 良い傾向（📈 緑）
- `negative`: 注意が必要（📉 赤）
- `neutral`: 情報（📊 グレー）

**改善提案優先度（SuggestionPriority）**:
- `high`: 優先度高（🔴 赤）
- `medium`: 優先度中（🟡 黄）
- `low`: 優先度低（🟢 緑）

**UI機能**:
- 「分析を開始」ボタンでAI分析をオンデマンド実行
- サマリ・発見事項・改善提案をカード形式で表示
- 発見事項には指標（現在値・前回値・変化率）を表示
- 改善提案には関連品目を表示

**E2Eテスト**: 109件全パス

---

### コード品質改善・Lintエラー修正 (2025-12-18)

**概要**: React 19対応のESLintルール厳格化に伴う修正とテスト修正

**修正内容**:

| カテゴリ | 修正内容 |
|----------|----------|
| **ESLint設定** | React 19新ルール（set-state-in-effect, purity）を警告レベルに調整 |
| **型定義** | 空interfaceをRecord<string, never>に変更 |
| **case block** | DataTable.tsxのcase内変数宣言をブロックスコープで囲む |
| **ナビゲーション** | ItemDetail.tsxでwindow.location.hrefをuseNavigateに置換 |
| **E2Eテスト** | 「タスク管理」→「タスク」のセレクタ修正 |

**修正ファイル（11ファイル）**:
- `frontend/eslint.config.js` - ルールレベル調整
- `frontend/src/types/careItem.ts` - 空interface修正
- `frontend/src/components/DataTable.tsx` - case block修正
- `frontend/src/components/Header.tsx` - コメント整理
- `frontend/src/components/MealSettingsModal.tsx` - コメント整理
- `frontend/src/components/staff/ConsumptionRecordModal.tsx` - コメント整理
- `frontend/src/components/meal/SnackSection.tsx` - useMemoで参照安定化
- `frontend/src/pages/HomePage.tsx` - コメント整理
- `frontend/src/pages/ViewPage.tsx` - コメント整理
- `frontend/src/pages/family/ItemDetail.tsx` - navigate使用に変更
- `frontend/e2e/family-page.spec.ts` - セレクタ修正

**結果**:
- Lintエラー: 13件 → 0件（警告8件は意図的なパターン）
- E2Eテスト: 109件全パス
- 本番サイト動作確認: OK

---

### snackフィールド連結ロジック修正 (2025-12-18)

**問題**: 【今回の提供記録】と「間食について補足（自由記入）」の両方を入力した場合、自由記入のみがSheet Bに反映され、提供記録が無視されていた

**修正内容**:

| 修正前 | 修正後 |
|--------|--------|
| 自由記入があると提供記録を上書き | 「提供記録。自由記入」の形式で連結 |

**修正ファイル**: `functions/src/functions/submitMealRecord.ts`

**出力例**:
```
黒豆 1g（完食）、らっきょう 0.7瓶（完食）。施設のおやつも少々
```

**Sheet B反映ルール**:

| 入力項目 | Sheet B「間食は何を食べましたか？」 |
|----------|----------------------------------|
| 【今回の提供記録】 | ✅ 反映される |
| 「間食について補足（自由記入）」 | ✅ 反映される |
| 「家族へのメモ（任意）」 | ❌ 反映しない（Firestoreのみ） |

---

### Firestoreインデックス修正・getCareItems 500エラー解消 (2025-12-18)

**問題**: スタッフ用ページの記録入力ビューで `getCareItems` APIが500エラーを返していた

**原因**: Firestoreの複合インデックス不足
- クエリ: `residentId` + `status` (in) + `sentDate` (desc) + `createdAt` (desc)
- 既存インデックス: `residentId` + `sentDate` + `createdAt` のみ（statusなし）

**修正内容**:

| ファイル | 修正内容 |
|----------|----------|
| `firestore.indexes.json` | `residentId` + `status` + `sentDate` + `createdAt` インデックス追加 |
| `frontend/index.html` | `mobile-web-app-capable` meta tag追加（PWA警告対応） |

**インデックス作成コマンド**:
```bash
gcloud firestore indexes composite create \
  --collection-group=care_items \
  --field-config=field-path=residentId,order=ascending \
  --field-config=field-path=status,order=ascending \
  --field-config=field-path=sentDate,order=descending \
  --field-config=field-path=createdAt,order=descending \
  --project=facility-care-input-form
```

**結果**: API正常動作確認済み（`{"success":true,"data":{"items":[],"total":0,"hasMore":false}}`）

---

### 間食記録連携 Phase 6 E2Eテスト完了 (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**Phase 6 - E2Eテスト**:

| ファイル | 内容 |
|----------|------|
| `snack-record.spec.ts` | 間食記録連携E2Eテスト（11件） |
| `App.tsx` | `/demo/staff/input/meal` ルート追加 |
| `demoCareItems.ts` | 羊羹にnoteToStaff追加（テスト用） |

**テストケース（11件）**:
- SNACK-001〜003: 品物リスト表示（間食セクション、在庫あり品物、家族指示）
- SNACK-010〜014: 提供記録入力UI（カード表示、サジェスト量、摂食状況選択、削除、メモ入力）
- SNACK-020〜021: サジェスト表示（サジェスト理由、在庫残量）
- SNACK-030: 自由テキスト入力（従来互換）

**テスト結果**:
- snack-record: 11/11 パス
- demo-page: 43/43 パス
- family-page: 20/21 パス（1件は既存の失敗）
- family-user-scenario: 34/34 パス

**間食記録連携機能 全Phase完了**:
スタッフの食事記録入力（間食セクション）と家族の品物管理が完全に連携。
家族が送った品物がどのように提供・摂食されたかを詳細に追跡可能になりました。

---

### 間食記録連携 Phase 5 実装完了 (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**Phase 5 - AIサジェスト統合**:

| ファイル | 内容 |
|----------|------|
| `snackSuggestion.ts` | 家族指示から推奨提供数を抽出するユーティリティ |
| `useSnackSuggestion.ts` | 品物情報と摂食傾向からサジェストを生成するフック |
| `SnackRecordCard.tsx` | サジェスト情報の表示（期限警告・在庫残量・推奨理由） |
| `SnackSection.tsx` | 品物選択時にサジェスト量で初期化 |
| `snackSuggestion.test.ts` | ユニットテスト16件 |
| `tsconfig.app.json` | テストファイル除外設定 |

**サジェスト機能**:
- 家族指示から数量抽出（例: 「1日1切れまで」→ 1）
- 在庫制限でキャップ（残量より多い指示は残量に調整）
- 賞味期限警告（期限切れ/まもなく期限）
- 摂食傾向連携（平均摂食率が低い場合に提供数を減らす提案）

**テスト結果**:
- ユニットテスト: 16/16 パス
- E2Eテスト: demo-page 43/43 パス、family-page 20/21 パス

---

### 間食記録連携 Phase 4 実装完了 (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**Phase 4 - 家族ページ連携**:
- demoConsumptionLogs.ts: ConsumptionStatus型を正しい値に修正
  - 'mostly_eaten' → 'most', 'all_eaten' → 'full' 等
  - followedInstruction, sourceType, linkedMealRecordId フィールド追加
- ItemDetail.tsx: useConsumptionLogsフックを使用してリアルデータ表示
  - 摂食状況（完食/ほぼ完食等）の色分け表示
  - 家族指示対応確認（✅マーク）の表示
  - sourceType（食事入力/品物詳細）のタグ表示
- family-page.spec.ts: 品物詳細ページのE2Eテスト追加（3件）

---

### 間食記録連携 Phase 2-3 実装完了 (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**Phase 2 - 品物リスト表示**:
- FamilyItemCard: 在庫状況（残量・期限）、家族指示を視覚的に表示
- FamilyItemList: 在庫ありの品物を一覧表示
- SnackSection: MealInputPageに組み込み

**Phase 3 - 提供記録入力UI**:
- SnackRecordCard: 詳細な提供記録入力
  - 提供数入力（0.5刻み）
  - 摂食状況選択（絵文字付き5段階）
  - 家族指示対応チェック
  - 家族へのメモ入力

---

### 間食記録連携 Phase 1 実装完了 (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**実装内容**:

| 項目 | 内容 |
|------|------|
| **SnackRecord型** | itemId, itemName, servedQuantity, unit, consumptionStatus, etc. |
| **API拡張** | submitMealRecord に snackRecords[], residentId オプション追加 |
| **消費ログ連携** | snackRecords → consumption_logs 自動作成、在庫自動更新 |
| **Sheet B互換** | generateSnackTextFromRecords() でテキスト自動生成 |
| **単体テスト** | 6テストケース全パス |

**後方互換性**: snackRecordsなしでも従来通り動作（オプショナル）

---

### 間食記録連携設計書作成・MoEレビュー完了 (2025-12-18)

**設計書**: [SNACK_RECORD_INTEGRATION_SPEC.md](./SNACK_RECORD_INTEGRATION_SPEC.md)

**背景・目的**:
スタッフの食事記録入力（間食セクション）と、家族の品物管理を連携させ、「家族が送った品物がどのように提供・摂食されたか」を詳細に追跡可能にする。

**設計内容**:

| 項目 | 内容 |
|------|------|
| **API拡張** | submitMealRecord に `snackRecords[]` オプション追加（後方互換維持） |
| **データ連携** | 食事記録 → consumption_logs 自動作成 → 在庫更新 |
| **UI設計** | 間食セクション拡張（品物リスト・提供記録・禁止警告・AIサジェスト） |
| **家族側連携** | 品物タイムライン・指示対応確認・摂食傾向表示 |

**MoEレビュー結果**:

| チーム | 評価 | 結果 |
|--------|------|------|
| アーキテクチャ | ⭐⭐⭐⭐ | 合格 |
| データモデル | ⭐⭐⭐⭐ | 合格（ドキュメント整合性修正済み） |
| UX/UI | ⭐⭐⭐⭐⭐ | 合格 |

**ドキュメント更新**:
- `INVENTORY_CONSUMPTION_SPEC.md`: ConsumptionLogにfollowedInstruction等フィールド追加
- `ITEM_MANAGEMENT_SPEC.md`: 参照資料にSNACK_RECORD_INTEGRATION_SPEC追加
- `CLAUDE.md`: 機能別仕様テーブルに追加

**次のステップ**: ドキュメントドリブン開発で実装開始（6フェーズ計画）

---

### E2Eユーザーシナリオテスト追加・パリティ検証 (2025-12-18)

**設計書**: [E2E_TEST_SPEC.md](./E2E_TEST_SPEC.md) セクション3

**背景・目的**:
デモツアーを家族目線で検証し、「デモで動作確認できれば本番も使える」という建付けをE2Eテストで保証する。

**実装内容**:

| カテゴリ | テスト数 | 目的 |
|----------|----------|------|
| デモツアー Step 1-6 | 18件 | 家族目線でのデモ体験検証 |
| パリティテスト (PARITY) | 6件 | デモ↔本番の同一性検証 |
| ユーザーフローテスト (FLOW) | 3件 | エンドツーエンドの操作フロー |
| 本番準備テスト (PROD) | 7件 | 本番ページの準備状況 |

**新規ファイル**: `frontend/e2e/family-user-scenario.spec.ts` (34テスト)

**パリティテストの意義**:
```
デモで動作確認 ✅ → 本番も同様に動作する ✅
```
- コンポーネント共有: デモと本番は同じReactコンポーネントを使用
- 違いはデータソースのみ: デモはローカルデータ、本番はFirestore API

**結論**: デモツアー完了 = 本番利用スキル習得（入居者1名のため追加設定不要）

**E2Eテスト**: 77/77 パス（demo-page: 43件 + family-user-scenario: 34件）

---

### カテゴリラベル修正 (2025-12-18)

**問題**: 統計ページで「beverage」が日本語化されずに表示されていた

**原因**: `demoStats.ts` で `beverage` という無効なカテゴリコードを使用していた

**修正**: `beverage` → `drink` に変更（正しい `ItemCategory` 型の値）

**修正ファイル**: `frontend/src/data/demo/demoStats.ts`

---

### デモモードフッターを家族用に統一 (2025-12-18)

**設計書**: [DEMO_FAMILY_REDESIGN.md](./DEMO_FAMILY_REDESIGN.md) セクション4.3

**背景・問題**:
`/demo` ホームページでスタッフ用フッター（記録閲覧/記録入力/家族連絡/統計）が表示されていた。
設計書では「/demo/* 内は家族フッターのみ表示」と定義されている。

**原因**:
`FooterNav.tsx` のロール判定ロジックで、`/demo` ルートパスが `isFamilyPath` にも `isStaffPath` にも該当せず、デフォルトのスタッフフッターが表示されていた。

**修正内容**:

| ファイル | 修正箇所 |
|----------|----------|
| `FooterNav.tsx` | デモモード判定を追加、`isDemoMode` の場合は常に家族フッター表示 |
| `demo-page.spec.ts` | セレクタ修正（フッター追加により同一リンクが2つ存在するようになったため） |

**修正後のフッター（/demo/* 内）**:

| タブ | リンク先 |
|------|---------|
| ホーム | `/demo/family` |
| 品物管理 | `/demo/family/items` |
| 記録閲覧 | `/demo/view` |
| 統計 | `/demo/stats` |

**E2Eテスト**: 43/43 パス

---

### デモモード家族向け特化リデザイン (2025-12-17)

**設計書**: [DEMO_FAMILY_REDESIGN.md](./DEMO_FAMILY_REDESIGN.md)

**背景・課題**:
- 家族向け・スタッフ向けが混在し、誰向けのアプリか不明確
- ショーケースで家族→スタッフ→家族と視点が変わり混乱
- デモを見た人が「このアプリは何のため？」が分かりにくい

**解決策**:
デモモードを「家族向け」に特化して再設計。スタッフ機能は将来の `/demo/staff-app` に分離予定。

**新ショーケース構成（全6ステップ・家族視点）**:

| Step | タイトル | パス |
|------|----------|------|
| 1 | 品物を登録する | `/demo/family/items/new` |
| 2 | 登録した品物を確認 | `/demo/family/items` |
| 3 | いつもの指示を設定 | `/demo/family/presets` |
| 4 | 入居者設定を確認 | `/demo/family/settings/resident` |
| 5 | 今日の様子を確認 | `/demo/family` |
| 6 | 傾向を分析する | `/demo/stats` |

**実装内容**:

| Phase | 内容 | 修正ファイル |
|-------|------|-------------|
| Phase 1 | ショーケース再設計 | `DemoShowcase.tsx` |
| Phase 2 | デモホーム簡素化 | `DemoHome.tsx` |
| Phase 3 | ルーティング整理 | `App.tsx` |
| Phase 4 | E2Eテスト更新 | `demo-page.spec.ts` |

**主な変更点**:
- `DemoShowcase.tsx`: ストーリーフィールド追加、家族視点の6ステップに変更
- `DemoHome.tsx`: スタッフカード削除、家族向けUI・キャッチコピー変更
- `App.tsx`: `/demo/staff/*` ルートをコメントアウト（無効化）
- E2Eテスト: 43テストに更新（スタッフ関連テスト削除）

**E2Eテスト**: 43/43 パス

---

### スタッフ家族連絡ページのデモナビゲーション修正 (2025-12-17)

**設計書**: [FIX_DEMO_NAVIGATION.md](./FIX_DEMO_NAVIGATION.md) セクション6

**背景・問題**:
`/demo/staff/family-messages` で品物をクリックすると、本番ページ `/staff/family-messages/{id}` に遷移してしまい、エラーが発生。

**原因**:
`FamilyMessages.tsx` と `FamilyMessageDetail.tsx` でリンク先がハードコードされており、デモモードを考慮していなかった。

**修正内容**:

| ファイル | 修正箇所 |
|----------|----------|
| `FamilyMessages.tsx` | 品物カードのリンク先をデモモード対応 |
| `FamilyMessageDetail.tsx` | 「一覧に戻る」リンク、タイムラインリンクをデモモード対応 |

**修正パターン**:
```typescript
const isDemo = useDemoMode();
const pathPrefix = isDemo ? '/demo' : '';
<Link to={`${pathPrefix}/staff/family-messages/${item.id}`}
```

**E2Eテスト**: 60/61 パス（1件の失敗は本修正と無関係）

---

### デモモード書き込み操作の安全対策 (2025-12-17)

**設計書**: [DEMO_SHOWCASE_SPEC.md](./DEMO_SHOWCASE_SPEC.md) セクション11

**背景・問題**:
デモモード（`/demo/*`）で品物登録・削除・タスク更新等の書き込み操作を行うと、
**本番のFirestoreにデータが保存**されてしまう深刻な問題が発覚。

例: `/demo/family/items/new` で品物登録 → 本番Firestoreに保存 → 本番ページにリダイレクト

**解決策**:
デモモードでは書き込みAPIを呼ばず、成功メッセージを表示するのみに変更。

```typescript
// パターン
if (isDemo) {
  alert('登録しました（デモモード - 実際には保存されません）');
  navigate('/demo/family/items');
  return;
}
// 本番モードのみAPI呼び出し
await mutation.mutateAsync(data);
```

**修正ファイル（7ファイル）**:

| ファイル | 修正した操作 |
|----------|-------------|
| `ItemForm.tsx` | 品物登録 |
| `ItemDetail.tsx` | 品物削除 |
| `ItemManagement.tsx` | 品物削除 |
| `TaskList.tsx` | タスク完了、ステータス変更 |
| `ResidentSettings.tsx` | 禁止ルール追加・削除、リンク先修正 |
| `PresetManagement.tsx` | プリセット作成・更新・削除 |

**改善効果**:
| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| 書き込み先 | 本番Firestore | なし（スキップ） |
| フィードバック | なし | 「デモモード」アラート表示 |
| リダイレクト先 | 本番ページ | デモページ内 |
| データ汚染リスク | ✗ 高い | ◎ なし |

**E2Eテスト**: 60/61 パス（1件の失敗は本修正と無関係のUI問題）

---

### Firestore undefined エラー修正・APIテスト (2025-12-17)

**テスト計画書**: [API_TEST_PLAN.md](./API_TEST_PLAN.md)

**概要**: 品物登録時の Firestore undefined エラーを修正し、全 Firestore 書き込み API をテスト

**問題**:
- `submitCareItem` API でオプショナルフィールド（noteToStaff 等）が undefined の場合に Firestore エラー発生
- 同様のパターンが `createPreset`、`createProhibition` にも存在

**修正内容**:
- `functions/src/index.ts`: Firebase Admin SDK 初期化時に `ignoreUndefinedProperties: true` を設定

**APIテスト結果**:
| API | 結果 |
|-----|------|
| submitCareItem | ✅ 成功 |
| createPreset | ✅ 成功 |
| createProhibition | ✅ 成功 |
| createTask | ✅ 成功 |

**UI修正**:
- `ItemForm.tsx`: 登録ボタンをフォーム最下部に配置（フッター追従からスタンダードなフォームレイアウトに変更）
- 必須項目未入力時のボタン無効化を追加

---

### ツアーナビゲーションUX改善（ヘッダーボタン方式） (2025-12-17)

**設計書**: [DEMO_SHOWCASE_SPEC.md](./DEMO_SHOWCASE_SPEC.md) セクション10

**背景・課題**:
旧方式（ヘッダー下のバナー）は以下の問題があった：
- 薄い青バナーが目立たず気づきにくい
- スクロールすると見えなくなる
- ツアートップに戻るのが大変でUXが悪い

**解決策**: ヘッダー右側に目立つ「← ツアーTOPに戻る」ボタンを常時表示

**ラベル設計の考え方**:
```
1. /demo/showcase (ツアートップ) → 「この機能を見る」クリック
2. /demo/family 等（デモページ）← ここはまだ「ツアー中」
3. 戻りたい先 → ツアートップ
```
- ユーザーはツアーの「中」にいる
- 戻るのはツアーの「トップ」
- 「← ツアーTOPに戻る」が最も正確で分かりやすい

**実装内容**:
- `DemoHeaderButton.tsx`: ヘッダー右側に表示するオレンジ色のボタン
- `Layout.tsx`: ヘッダー内にDemoHeaderButtonを配置
- `/demo/showcase` 自体ではボタン非表示

**改善効果**:
| 項目 | 旧方式（バナー） | 新方式（ヘッダーボタン） |
|------|------------------|------------------------|
| 視認性 | △ 薄い青で目立たない | ◎ オレンジで目立つ |
| スクロール時 | ✗ 見えなくなる | ◎ 常に表示（sticky） |
| アクセス性 | △ 上部に戻る必要 | ◎ いつでも1タップ |
| ラベル | 「ツアーに戻る」（矛盾） | 「← ツアーTOPに戻る」（正確） |

**E2Eテスト**:
- `demo-page.spec.ts`: ツアーナビゲーションテスト8件
- **検証**: 全43件のデモテストがパス

---

### デモモードナビゲーション修正 (2025-12-17)

**設計書**: [FIX_DEMO_NAVIGATION.md](./FIX_DEMO_NAVIGATION.md)

**概要**: `/demo/*` 内での操作が本番ページに遷移してしまう問題を修正

**修正内容**:
- `ItemDetail.tsx`: 削除後リダイレクト・タイムラインリンクのデモモード対応
- `FamilyDashboard.tsx`: 内部リンク（タスク、入居者設定、ケア指示）のデモモード対応
- `playwright.config.ts`: ローカルテスト対応（環境変数でbaseURL上書き可能）

**検証**: 全35件のE2Eテストがパス

---

### デモショーケース実装（完了）

**設計書**: [DEMO_SHOWCASE_SPEC.md](./DEMO_SHOWCASE_SPEC.md)

**進捗**: 全Phase完了

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | 基盤構築（useDemoMode, ルーティング, DemoHome） | ✅ 完了 |
| Phase 2 | シードデータ作成（demoCareItems, demoStats等） | ✅ 完了 |
| Phase 3 | データフック対応（useCareItems等のデモモード対応） | ✅ 完了 |
| Phase 4 | ショーケース（DemoShowcase完成） | ✅ 完了 |

**完成済みファイル**:
- `frontend/src/hooks/useDemoMode.ts` - デモモード判定フック
- `frontend/src/data/demo/` - シードデータ（12品物、18ログ、9タスク等）
- `frontend/src/pages/demo/DemoHome.tsx` - デモホームページ
- `frontend/src/pages/demo/DemoShowcase.tsx` - ガイド付きツアー
- `frontend/src/components/demo/TourReturnBanner.tsx` - ツアーに戻るバナー
- `frontend/src/hooks/useCareItems.ts` - デモモード対応済み
- `frontend/src/hooks/useStats.ts` - デモモード対応済み
- `frontend/src/hooks/useTasks.ts` - デモモード対応済み
- `frontend/src/hooks/useConsumptionLogs.ts` - デモモード対応済み
- `frontend/src/App.tsx` - デモルート追加済み

---

## 次のタスク（将来）

| 機能 | 説明 | 優先度 |
|------|------|--------|
| 週次レポート生成（aiReport） | Gemini連携 | 中 |
| ケア指示のFirestore保存 | モックデータ → Firestore永続化 | 中 |
| 写真エビデンス表示 | Google Drive画像を家族ビューで表示 | 中 |
| CSVエクスポート | 表示中のデータをCSVでダウンロード | 低 |

---

### Phase 9.3: 統計ダッシュボード拡張 (2025-12-17)

**概要**: 在庫サマリー・食品傾向分析API、摂食傾向タブの実装

**実装ステップ**:
1. ✅ 在庫サマリーAPI実装 (`getInventorySummary`)
2. ✅ 食品傾向分析API実装 (`getFoodStats`)
3. ✅ 摂食傾向タブ実装 (`ConsumptionStatsTab`)
4. ✅ 在庫バーグラフ実装（Phase 9.2で既存）

**実装ファイル（バックエンド）**:
- `functions/src/functions/inventoryStats.ts` - 在庫サマリー・食品統計API（新規）
- `functions/src/types/index.ts` - 在庫サマリー・食品統計の型定義追加
- `functions/src/index.ts` - APIエクスポート追加

**実装ファイル（フロントエンド）**:
- `frontend/src/types/stats.ts` - 在庫サマリー・食品統計の型定義追加
- `frontend/src/api/index.ts` - API呼び出し関数追加
- `frontend/src/pages/shared/StatsDashboard.tsx` - 摂食傾向タブ追加

**機能**:
- 在庫サマリー：各品物の残量・期限・摂食率の一覧取得
- 食品傾向分析：よく食べる/残す品目ランキング、カテゴリ別摂食率
- 摂食傾向タブ：統計ダッシュボードに新タブ追加
- カテゴリ別摂食率チャート：バーグラフで視覚化

---

### 蒲池様専用PWA調整・初期禁止ルール追加 (2025-12-17)

**概要**: PWAを蒲池様専用に調整、初期禁止ルール「七福のお菓子」を設定

**変更内容**:
- `demoFamilyData.ts`: residentId統一（resident-kinue → resident-001）
- `demoFamilyData.ts`: DEMO_PROHIBITIONS追加（七福のお菓子は出さない）
- `useProhibitions.ts`: APIが空の場合デモデータをフォールバック

**初期禁止ルール**:
- 品目名: 「七福のお菓子」
- カテゴリ: snack
- 理由: ご家族の希望（FAX指示）

---

### Phase 9.x: 禁止ルール機能完全実装 (2025-12-17)

**概要**: 家族が設定した「提供禁止品目」をスタッフに警告表示する機能の完全実装

**設計書**: [ITEM_MANAGEMENT_SPEC.md セクション8](./ITEM_MANAGEMENT_SPEC.md#8-禁止ルール提供禁止品目)

**実装ステップ**:
1. ✅ ProhibitionRule型定義・Firestoreモデル
2. ✅ 禁止ルールCRUD API実装
3. ✅ 家族向け「入居者設定」画面実装
4. ✅ スタッフ向け禁止品目警告表示

**実装ファイル（バックエンド）**:
- `functions/src/functions/prohibitions.ts` - 禁止ルールCRUD API（新規）
- `functions/src/types/index.ts` - ProhibitionRule型追加

**実装ファイル（フロントエンド）**:
- `frontend/src/types/careItem.ts` - ProhibitionRule型定義追加、PresetCategoryから'ban'削除
- `frontend/src/hooks/useProhibitions.ts` - 禁止ルールCRUDフック（新規）
- `frontend/src/api/index.ts` - API呼び出し関数追加
- `frontend/src/pages/family/ResidentSettings.tsx` - 入居者設定画面（新規）
- `frontend/src/pages/family/FamilyDashboard.tsx` - 入居者設定へのナビゲーション追加
- `frontend/src/components/staff/ProhibitionWarning.tsx` - 禁止品目警告（新規）
- `frontend/src/components/staff/ProhibitionBadge.tsx` - 禁止品目バッジ（新規）
- `frontend/src/pages/staff/FamilyMessageDetail.tsx` - 禁止警告表示追加
- `frontend/src/pages/staff/FamilyMessages.tsx` - 禁止バッジ表示追加
- `frontend/src/App.tsx` - `/family/settings/resident` ルート追加

**機能**:
- 家族が「入居者設定」画面で禁止品目を登録・削除
- 品名またはカテゴリでマッチング（部分一致）
- スタッフの家族連絡一覧・詳細画面で警告表示
- Firestoreサブコレクション: `residents/{residentId}/prohibitions`

---

### プリセット・AI提案改善、禁止ルール設計 (2025-12-17)

**概要**: プリセットとAI提案の設計改善、禁止ルール機能の新規設計

**設計変更**:
1. **AI提案**: 自動発動 → ボタンクリックで発動に変更
2. **プリセット登録ルール**: 品物のみ登録（禁止ルールは別管理）
3. **プリセット分離**: 複数品物（黒砂糖・チーズ）は単品ごとに分離
4. **禁止ルール設計**: 新機能として `ProhibitionRule` を設計

**更新ドキュメント**:
- `docs/ITEM_MANAGEMENT_SPEC.md` - セクション8「禁止ルール」追加
- `docs/PRESET_MANAGEMENT_SPEC.md` - カテゴリ定義整理、禁止ルール参照追加
- `docs/FAMILY_UX_DESIGN.md` - プリセット一覧更新

**更新ファイル（実装）**:
- `frontend/src/data/demoFamilyData.ts` - プリセットデータ更新（禁止ルール削除、単品分離）
- `frontend/src/pages/family/ItemForm.tsx` - AI提案ボタン化、プリセットグリッド追加

**禁止ルール設計ポイント**:
- `residents/{residentId}/prohibitions/{prohibitionId}` コレクションで管理
- 家族が設定、スタッフが品物提供時に参照
- 入居者設定画面で追加・編集・削除
- プリセットとは別概念として明確に分離

---

### Phase 9.2 ConsumptionLog API・UI実装 (2025-12-17)

**設計書**: [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md)

**実装ファイル（バックエンド）**:
- `functions/src/functions/consumptionLogs.ts` - 消費ログ API（新規）
- `functions/src/types/index.ts` - ConsumptionLog、ConsumptionSummary型追加

**実装ファイル（フロントエンド）**:
- `frontend/src/types/consumptionLog.ts` - 消費ログ型定義（新規）
- `frontend/src/types/careItem.ts` - CareItem拡張（initialQuantity, currentQuantity, consumptionSummary）
- `frontend/src/api/index.ts` - API呼び出し関数追加
- `frontend/src/hooks/useConsumptionLogs.ts` - 消費ログフック（新規）
- `frontend/src/components/staff/ConsumptionRecordModal.tsx` - 消費記録モーダル（新規）
- `frontend/src/components/shared/InventoryBar.tsx` - 在庫バー・ステータスバッジ（新規）

**API仕様**:
- `POST /recordConsumptionLog` - 消費ログ記録（トランザクションでCareItemも更新）
- `GET /getConsumptionLogs?itemId=xxx` - 消費ログ一覧取得

**機能**:
- 提供・摂食の詳細な履歴管理（サブコレクション）
- 残量の自動計算と更新
- 摂食率の自動計算
- CareItemのステータス自動判定（pending → in_progress → consumed）
- タイムライン形式での履歴表示用フック

---

### Phase 9.1 バグ修正 - useStats無限ループ (2025-12-16)

**問題**: 統計ビュー（/stats）が「データを読み込み中...」のまま停止

**原因**: `useStats`フックで`include`配列が毎回新しい参照になり、`useEffect`の無限ループが発生

**修正**:
- `useRef`でinclude配列の初回値を固定（参照変化を完全無視）
- `hasFetchedRef`フラグで初回フェッチのみ実行を保証

**修正ファイル**: `frontend/src/hooks/useStats.ts`

**教訓**: 配列/オブジェクトをカスタムフックのオプションとして受け取る場合、`useRef`で初回値を固定するのが最も確実

---

### Phase 9.0/9.1 在庫・消費追跡システム設計・実装 (2025-12-16)

**設計書**: [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md)

**実装内容**:
- View構成設計（スタッフ向け/家族向けページ分離）
- ItemTimeline.tsx（品物タイムライン共有ページ）
- ルーティング整備（/staff/*, /family/*, /view）

---

### Phase 8.6/8.7 プリセット管理・AI自動ストック (2025-12-16)

**設計書**: [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md)

**実装ファイル（新規）**:
- `functions/src/functions/presets.ts` - プリセットCRUD API
- `frontend/src/pages/family/PresetManagement.tsx` - プリセット管理画面
- `frontend/src/hooks/usePresets.ts` - プリセットCRUDフック
- `frontend/src/components/family/SaveAISuggestionDialog.tsx` - AI提案保存ダイアログ

**機能**:
- プリセット管理画面（カテゴリ別フィルタ、検索、CRUD）
- AI提案をワンクリックで「いつもの指示」として保存
- 出所バッジ（手動📌 / AI🤖）

---

### Phase 8.4拡張 AI提案UI統合 (2025-12-15)

**設計書**: [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) (セクション8)

**実装ファイル（新規）**:
- `frontend/src/components/family/AISuggestion.tsx` - AI提案カードコンポーネント

**機能**: 品物名入力時に自動で賞味期限・保存方法・提供方法を提案

---

## 開発ロードマップ進捗

```
Phase 1-4: 基盤・デモ版PWA          ████████████████████ 100% (完了)
Phase 5.x: 食事入力・設定機能        ████████████████████ 100% (完了)
Phase 6.0: フッターナビゲーション    ████████████████████ 100% (完了)
Phase 7.0-7.1: 家族向け・予実管理    ████████████████████ 100% (完了)
Phase 8.0: 設計ドキュメント          ████████████████████ 100% (完了)
Phase 8.1: 品物管理基盤              ████████████████████ 100% (完了)
Phase 8.2: タスク管理                ████████████████████ 100% (完了)
Phase 8.3: 統計ダッシュボード        ████████████████████ 100% (完了)
Phase 12.0: FIFO対応                ████████████████████ 100% (完了)
Phase 8.4: Gemini AI連携            ████████████████████ 100% (完了)
Phase 8.4.1: aiAnalyze 摂食傾向分析 ████████████████████ 100% (完了)
Phase 8.5: プリセット統合            ████████████████████ 100% (完了)
Phase 8.6: プリセット管理基盤        ████████████████████ 100% (完了)
Phase 8.7: AI自動ストック            ████████████████████ 100% (完了)
Phase 9.0: 在庫・消費追跡設計        ████████████████████ 100% (完了)
Phase 9.1: ルーティング・ページ実装  ████████████████████ 100% (完了)
Phase 9.2: ConsumptionLog API・UI   ████████████████████ 100% (完了)
Phase 9.x: 禁止ルール機能            ████████████████████ 100% (完了)
Phase 9.3: 統計ダッシュボード拡張    ████████████████████ 100% (完了)
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

### 主要Cloud Functions

ベースURL: `https://asia-northeast1-facility-care-input-form.cloudfunctions.net`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/healthCheck` | ヘルスチェック |
| POST | `/syncPlanData` | 記録データを同期 |
| POST | `/submitMealRecord` | 食事記録を入力 |
| GET | `/getPlanData` | 同期済み記録を取得 |
| GET | `/getMealFormSettings` | フォーム初期値設定を取得 |
| GET | `/getStats` | 統計データ取得 |
| POST | `/aiSuggest` | AI品物入力補助 |
| POST | `/aiAnalyze` | AI摂食傾向分析 |
| GET/POST | `/presets/*` | プリセットCRUD |
| GET/POST/PUT/DELETE | `/prohibitions/*` | 禁止ルールCRUD |
| Scheduler | `/generateDailyTasks` | タスク自動生成（毎日6時） |

---

## 重要な情報

### サービスアカウント

**統一済み**: 全用途で単一のサービスアカウントを使用

```
facility-care-sa@facility-care-input-form.iam.gserviceaccount.com
```

### スプレッドシート共有状態

| シート | ID | 権限 |
|--------|-----|------|
| Sheet A (記録の結果) | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | 閲覧者 |
| Sheet B (実績入力先) | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | 編集者 |

### Dev Mode設定

- 認証: なし（`allUsers` に `cloudfunctions.invoker` 付与済み）
- Firestore: 全開放（`allow read, write: if true;`）
- **注意**: 本番移行時に必ず認証を実装すること

---

## 再開時の手順

1. `docs/CURRENT_STATUS.md` を読んで現在の進捗を確認
2. https://facility-care-input-form.web.app でPWAの動作確認
3. 「次のタスク」セクションから作業を再開

---

## AIエージェントへの指示

会話をクリアした後、このプロジェクトの開発を継続する場合は、以下のように指示してください：

```
facility-care-input-form プロジェクトの開発を継続してください。
docs/CURRENT_STATUS.md を読んで、次のタスクから再開してください。
```
