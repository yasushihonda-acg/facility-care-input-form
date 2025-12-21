---
status: working
scope: status
owner: core-team
last_reviewed: 2025-12-21
links:
  - docs/status/2025/2025-W51.md
  - docs/HANDOVER.md
  - docs/ROADMAP.md
---

# 現在のステータス

> **最終更新**: 2025年12月21日 (Phase 30完了)
>
> このファイルは現在の進捗の**要約**です。詳細は週次ステータスを参照してください。

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
| **ドキュメント目次** | [INDEX.md](./INDEX.md) |
| **E2Eテスト** | 309件（28件スキップ含む）（2025-12-21時点、Phase 30追加+7件）|

---

## 今週の概要 (2025-W51: 12/16-12/22)

**詳細**: [status/2025/2025-W51.md](./status/2025/2025-W51.md)

### 完了Phase一覧

| Phase | 内容 | 完了日 |
|-------|------|--------|
| **Phase 30** | **家族操作・入力無し通知** | 12/21 |
| Phase 29 | 水分記録機能（タブ式UI） | 12/21 |
| Phase 28 | 提供方法選択肢整理 | 12/21 |
| Phase 27 | クイックアクセスレイアウト修正 | 12/21 |
| Phase 26 | 入居者設定削除 | 12/21 |
| Phase 25 | 全文検索機能 | 12/21 |
| Phase 24 | カラムリサイズ機能 | 12/21 |
| Phase 23 | 記録閲覧ソート改善（日時順） | 12/21 |
| Phase 22 | 品物編集機能 | 12/21 |
| Phase 21 | チャット機能一時非表示 | 12/21 |
| Phase 20.1 | デモモードAPI 500エラー修正 | 12/20 |
| Phase 20 | デモ環境完結（離脱防止） | 12/20 |
| Phase 19 | 記録のチャット連携 | 12/20 |
| Phase 18 | チャット連携機能 | 12/19 |
| Phase 17 | Firebase Storage 写真連携 | 12/18 |
| Phase 16 | 写真エビデンス表示機能 | 12/18 |
| Phase 15 | スタッフ用記録入力フォーム統一 | 12/18 |
| Phase 14 | スタッフ用デモページ | 12/18 |
| Phase 13 | 品物起点の間食記録・スケジュール拡張 | 12/19 |
| Phase 12 | FIFO・プリセット保存提案 | 12/18 |
| Phase 11 | FoodMaster食品マスタ | 12/18 |
| Phase 9.x | 禁止ルール・統計拡張 | 12/17 |

### 進行中

現在進行中のPhaseはありません。

### 本日の修正 (12/21)

- **Phase 30完了**: 家族操作・入力無し通知
  - 管理者設定に「監視通知Webhook URL」欄を追加
  - 品物登録時（submitCareItem）にGoogle Chat通知
  - 品物編集時（updateCareItem）にGoogle Chat通知
  - 毎日16時に食事/水分記録の入力無しチェック（checkDailyRecords）
  - Firestoreに日次記録ログ（daily_record_logs）を自動保存
  - メッセージフォーマット: #品物登録📦, #品物編集✏️, #入力無し警告⚠️
  - E2Eテスト7件追加（5件パス、2件スキップ=API依存）
  - 設計書: [FAMILY_NOTIFY_SPEC.md](./FAMILY_NOTIFY_SPEC.md)

- **Phase 29完了**: 水分記録機能（タブ式UI）
  - StaffRecordDialogをタブ式UIに変更（食事🍪 / 水分💧）
  - カテゴリ連動デフォルトタブ選択（drink→水分タブ、その他→食事タブ）
  - 水分量自動計算（ml/cc/l/コップ対応）
  - 水分摂取量シート連携: `1su5K9TjmzMfKc8OIK2aZYXCfuDrNeIRM0a3LUCFcct4`
  - submitHydrationRecord Cloud Function新規追加
  - Google Chat Webhook通知（#水分摂取💧タグ）
  - **水分タブにも「残った分への対応」追加**（食事タブと同じ仕様）
    - 全量消費時は非表示、未消費時は必須
    - 選択肢: 破棄した/保存した/その他
  - E2Eテスト17件追加（16/17パス、1件スキップ）
  - 本番デプロイ完了・動作確認済み
  - テスト書き込み確認済（水分摂取量シートへの書き込みテスト成功）

- **Phase 28完了**: 提供方法選択肢整理
  - 品物登録の「提供方法」から「冷やす」「ミキサー」を削除
  - ServingMethod型から`cooled`/`blended`を削除
  - 選択肢を7→5に削減（UI簡素化）
  - 設計書: [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) セクション10

- **Phase 27完了**: クイックアクセスカードレイアウト修正
  - FamilyDashboard.tsx: grid-cols-2 → 1列フル幅レイアウトに変更
  - タスクカードが画面幅いっぱいに表示されるように改善
  - Phase 26で入居者設定削除後の隙間を解消
  - 設計書: [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md) Phase 27セクション追加

- **Phase 26完了**: 入居者設定削除
  - ResidentSettings.tsx: ファイル削除
  - App.tsx: ルート定義コメントアウト
  - FamilyDashboard.tsx, DemoHome.tsx, DemoShowcase.tsx: リンク/ステップ削除
  - E2Eテスト: 関連テスト5件スキップ
  - ドキュメント: ITEM_MANAGEMENT_SPEC.md, FAMILY_UX_DESIGN.md, PRESET_MANAGEMENT_SPEC.md, ROADMAP.md更新
  - 理由: 禁止ルールUIは将来的にプリセット管理に統合予定

- **Phase 25完了**: 全文検索機能 (`6fba279`)
  - DataTable.tsx: 検索対象をスタッフ名から全カラムに拡張
  - スタッフ名、タイムスタンプ、全データカラム値で検索可能
  - 特記事項の内容、時間帯、数値など全てが検索対象
  - E2Eテスト: fulltext-search.spec.ts 7件追加
  - 設計書: [TABLE_VIEW_COLUMNS.md](./TABLE_VIEW_COLUMNS.md) 全文検索機能仕様追加

- **Phase 24完了**: カラムリサイズ機能 (`b2ac2bd`)
  - DataTable.tsx: カラム幅ドラッグ調整機能追加
  - リサイズハンドル: カラムヘッダー右端をドラッグで幅調整
  - ダブルクリック: デフォルト幅にリセット
  - 最小幅制限: minWidth設定による下限保護
  - 日時カラム幅: 140px→165pxに拡大（切れ表示を修正）
  - E2Eテスト: column-resize.spec.ts 7件追加
  - 設計書: [TABLE_VIEW_COLUMNS.md](./TABLE_VIEW_COLUMNS.md) カラムリサイズ仕様追加

- **Phase 23完了**: 記録閲覧ページの日時ソート改善 (`71ab408`)
  - DataTable.tsx: 日時ソートを文字列比較からDate変換比較に変更
  - 問題: toLocaleStringが0埋めを保証しないため、9:00 vs 18:00で順序が崩れていた
  - 修正: Dateオブジェクトに変換して比較することで、正確な日時順ソートを実現
  - E2Eテスト: view-page-sort.spec.ts 4件追加
  - 設計書: [TABLE_VIEW_COLUMNS.md](./TABLE_VIEW_COLUMNS.md) ソートアルゴリズム更新

- **UX改善**: 冗長な「タイムラインを見る」リンク削除 (`e4eede4`)
  - ItemDetail.tsx: 別ページへの遷移リンクを削除
  - 理由: 「タイムライン（履歴）」セクションで同じ情報を表示しているため冗長
  - 設計書: [VIEW_ARCHITECTURE_SPEC.md](./VIEW_ARCHITECTURE_SPEC.md) セクション4.3
  - 設計書: [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) セクション9.4.4

- **Phase 22.3拡張完了**: 編集履歴デモデータ追加 (`41c1dfc`)
  - demoItemEvents.ts: 品物イベント（編集履歴）デモデータ追加
  - itemEvent.ts: ItemEvent型定義とヘルパー関数
  - useItemEvents.ts: 品物イベント取得フック
  - ItemDetail.tsx: 編集イベントをタイムラインに統合表示（登録・編集・提供を時系列表示）
  - E2Eテスト: item-edit.spec.ts 23件（+2件追加: 変更内容・実行者表示確認）
  - 設計書: [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) セクション9.4

- **Phase 22完了**: 品物編集機能 (`e5fb97a`)
  - ItemEditPage.tsx: 品物編集ページ（家族用）追加
  - ItemDetail.tsx: 編集ボタン追加
  - App.tsx: 編集ページルート追加
  - E2Eテスト: item-edit.spec.ts 19件追加
  - 設計書: [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) セクション9

- **Phase 21完了**: チャット機能一時非表示 (`78d2f38`)
  - 内部チャット機能（スタッフ⇔家族間）を一時的に非表示化
  - FooterNav: チャットタブ（家族・スタッフ両方）をコメントアウト
  - App.tsx: チャット関連ルート10件をコメントアウト
  - ItemDetail.tsx: 「スタッフにチャット」ボタン非表示
  - FamilyMessageDetail.tsx: 「家族とチャット」ボタン非表示
  - FamilyDashboard/StaffHome: NotificationSection非表示
  - E2Eテスト: chat-integration.spec.ts, record-chat-integration.spec.ts をスキップ
  - 設計書: [CHAT_FEATURE_HIDE_SPEC.md](./CHAT_FEATURE_HIDE_SPEC.md)
  - **注意**: Google Chat Webhook（外部通知）は非表示対象外

### 過去の修正 (12/20)

- チャットページフッターナビゲーション追加 (`a062897`)
- デモモードチャット擬似動作対応 (`647a21b`)
- getCareItems itemIdパラメータ対応 (`583905c`)
- **Phase 15.7完了**: 残り対応による在庫・統計の分離計算 (`ce07bf8`)
  - 破棄時は提供量全てを在庫から引く
  - 保存時は食べた分のみ在庫から引く
  - 廃棄量(wastedQuantity)を記録・表示
  - E2Eテスト4件追加（STAFF-050〜053）
- **Phase 15.7 仕上げ** (`3923c82`)
  - フロントエンドがremainingHandlingをAPIに送信するよう修正
  - snack_onlyモードでの二重記録防止
- **Phase 15.8完了**: ベースページ簡素化 (`14b61a8`)
  - MealInputPage.tsxからフォーム要素を削除（407行→122行）
  - 品物リスト表示のみに簡素化、入力は各品物のダイアログで完結
  - E2Eテスト5件追加（STAFF-060〜064）
  - TDDアプローチで実装：Red→Green→本番検証完了
- **Phase 15.9完了**: 写真アップロード機能追加 (`2bd7bff`)
  - StaffRecordDialog.tsxに写真アップロードUI追加
  - プレビュー・削除機能、ファイルサイズ制限（10MB以下）
  - uploadCareImage APIでFirebase Storageにアップロード
  - E2Eテスト4件追加（STAFF-009, STAFF-070〜072）
  - 設計の不整合修正: セクション3.1の項目10が未実装だった問題を解決
- **Phase 15.9 設計準拠修正**: photoURL連携完成 (`1ee4518`)
  - uploadCareImageからphotoUrlを取得しsubmitMealRecordに渡す
  - FIREBASE_STORAGE_MIGRATION_SPEC.md セクション5.2に準拠
  - Google Chat Webhook連携用のphotoUrl連携を完成
- **写真アップロード設計の整合性監査** (`a60bf40`)
  - アーキテクチャ・データフロー・シーケンス検証完了
  - PHOTO_UPLOAD_SPEC.md: 非推奨マーク追加（Phase 17移行済み）
  - STAFF_RECORD_FORM_SPEC.md: データフロー図修正、完了ステータス反映
  - 本番E2Eテスト4件パス（写真アップロード機能）
- **Phase 20完了**: デモ環境完結（離脱防止）
  - スタッフデモからの本番環境離脱問題を修正
  - MealInputPage.tsx: 戻るボタンをデモモード対応
  - ItemTimeline.tsx: リンクをデモモード対応
  - App.tsx: `/demo/staff/stats`ルートを追加
  - E2Eテスト15件追加（demo-staff-containment.spec.ts）
  - TDDアプローチで実装：Red→Green→回帰テストパス
  - 設計書: [DEMO_STAFF_CONTAINMENT.md](./DEMO_STAFF_CONTAINMENT.md)
- **Phase 20.1完了**: デモモードAPI 500エラー修正 (`29570f7`)
  - FooterNav.tsx: デモモードでgetActiveChatItems API呼び出しをスキップ
  - NotificationSection.tsx: デモモードでgetNotifications API呼び出しをスキップ
  - Firestoreインデックス追加: care_items (residentId, hasMessages, lastMessageAt)
  - Firestoreインデックス追加: notifications (targetType, createdAt)
  - E2Eテスト9件追加（footer-nav-demo.spec.ts）
  - TDDアプローチで実装：Red→Green→本番検証完了
  - 設計書: [FOOTERNAV_DEMO_FIX_SPEC.md](./FOOTERNAV_DEMO_FIX_SPEC.md)

---

## 週次ステータス履歴

| 週 | 期間 | リンク |
|----|------|--------|
| W51 | 12/16-12/22 | [2025-W51.md](./status/2025/2025-W51.md) |

---

## 次のタスク

### Phase 22 完了（品物編集機能）

| ステップ | 内容 | 状態 |
|----------|------|------|
| 22.1 | 品物編集UI実装（ItemEditPage.tsx） | ✅完了 |
| 22.2 | タイムスタンプ表示（登録日時・更新日時） | ✅完了 |
| 22.3 | 編集履歴タイムライン表示 | ✅完了 |
| 22.4 | E2Eテスト作成（19件追加） | ✅完了 |
| 22.5 | ビルド・デプロイ・動作確認 | ✅完了 |

> **設計書**: [ITEM_MANAGEMENT_SPEC.md](./ITEM_MANAGEMENT_SPEC.md) セクション9
> **コミット**: `e5fb97a` (Phase 22), `41c1dfc` (Phase 22.3), `e4eede4` (UX改善)
> **テスト結果**: 267件（16件スキップ含む）

### チャット機能について

内部チャット機能は一時非表示中です。復元手順は [CHAT_FEATURE_HIDE_SPEC.md](./CHAT_FEATURE_HIDE_SPEC.md) セクション6を参照してください。

### 将来

| 機能 | 説明 | 優先度 |
|------|------|--------|
| 週次レポート生成（aiReport） | Gemini連携による週次サマリー自動生成 | 中 |
| ケア指示のFirestore保存 | モックデータ → Firestore永続化 | 中 |
| CSVエクスポート | 表示中のデータをCSVでダウンロード | 低 |
| プッシュ通知 | FCMによるモバイル通知 | 低 |

---

## 開発ロードマップ進捗

詳細は [ROADMAP.md](./ROADMAP.md) を参照

```
Phase 1-8   ████████████████████  100% (基盤・コア機能)
Phase 9-13  ████████████████████  100% (在庫・消費・間食連携)
Phase 14-17 ████████████████████  100% (デモ・フォーム・写真)
Phase 18-19 ████████████████████  100% (チャット連携)
Phase 20-22 ████████████████████  100% (デモ完結・品物編集)
Phase 23+   ░░░░░░░░░░░░░░░░░░░░    0% (将来機能)
```

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

| カテゴリ | 主要エンドポイント |
|----------|-------------------|
| 基本 | `/healthCheck`, `/syncPlanData`, `/getPlanData` |
| 記録 | `/submitMealRecord`, `/getMealFormSettings` |
| AI | `/aiSuggest`, `/aiAnalyze` |
| 管理 | `/presets/*`, `/prohibitions/*`, `/careItems/*` |
| チャット | `/getMessages`, `/sendMessage`, `/getActiveChatItems` |

詳細は [API_SPEC.md](./API_SPEC.md) を参照

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
2. 必要に応じて週次ステータス（`docs/status/2025/`）で詳細確認
3. https://facility-care-input-form.web.app でPWAの動作確認
4. 「次のタスク」セクションから作業を再開

---

## AIエージェントへの指示

会話をクリアした後、このプロジェクトの開発を継続する場合は、以下のように指示してください：

```
facility-care-input-form プロジェクトの開発を継続してください。
docs/CURRENT_STATUS.md を読んで、次のタスクから再開してください。
```
