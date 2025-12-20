---
status: working
scope: status
owner: core-team
last_reviewed: 2025-12-20
links:
  - docs/status/2025/2025-W51.md
  - docs/HANDOVER.md
  - docs/ROADMAP.md
---

# 現在のステータス

> **最終更新**: 2025年12月20日 (Phase 20完了)
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
| **E2Eテスト** | 240件パス（2025-12-20時点、Phase 20追加15件含む） |

---

## 今週の概要 (2025-W51: 12/16-12/22)

**詳細**: [status/2025/2025-W51.md](./status/2025/2025-W51.md)

### 完了Phase一覧

| Phase | 内容 | 完了日 |
|-------|------|--------|
| **Phase 20** | デモ環境完結（離脱防止） | 12/20 |
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

### 本日の修正 (12/20)

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

---

## 週次ステータス履歴

| 週 | 期間 | リンク |
|----|------|--------|
| W51 | 12/16-12/22 | [2025-W51.md](./status/2025/2025-W51.md) |

---

## 次のタスク

### Phase 15.9 完了（写真アップロード機能）

| ステップ | 内容 | 状態 |
|----------|------|------|
| 15.9.1 | 設計ドキュメント更新・不整合修正 | ✅完了 |
| 15.9.2 | E2Eテスト追加（TDD: 4件失敗確認） | ✅完了 |
| 15.9.3 | StaffRecordDialog.tsx 写真UI実装 | ✅完了 |
| 15.9.4 | ローカルテスト実行・確認 | ✅完了 |
| 15.9.5 | コミット・Push（自動デプロイ） | ✅完了 |
| 15.9.6 | 本番E2Eテスト実行・動作確認 | ✅完了 |

> **設計書**: [STAFF_RECORD_FORM_SPEC.md](./STAFF_RECORD_FORM_SPEC.md) セクション12
> **コミット**: `2bd7bff`
> **テスト結果**: 34 passed (staff-record-form全テスト)

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
Phase 20+   ░░░░░░░░░░░░░░░░░░░░    0% (将来機能)
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
