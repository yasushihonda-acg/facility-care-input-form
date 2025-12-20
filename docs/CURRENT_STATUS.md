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

> **最終更新**: 2025年12月21日 (Phase 22完了)
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
| **E2Eテスト** | 265件（16件スキップ含む）（2025-12-21時点、Phase 22.3追加21件）|

---

## 今週の概要 (2025-W51: 12/16-12/22)

**詳細**: [status/2025/2025-W51.md](./status/2025/2025-W51.md)

### 完了Phase一覧

| Phase | 内容 | 完了日 |
|-------|------|--------|
| **Phase 22** | **品物編集機能** | 12/21 |
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

### 本日の修正 (12/21)

- **Phase 22.3完了**: タイムライン表示拡張
  - ItemDetail.tsx: 「タイムライン（履歴）」セクション追加
  - data-testid追加: item-timeline, event-created, event-served
  - E2Eテスト: item-edit.spec.ts 21件（locator構文修正含む）
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
> **コミット**: `e5fb97a`
> **テスト結果**: 252件パス + 16件スキップ

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
