# プロジェクト概要: facility-care-input-form

## 目的
介護施設向けコミュニケーションアプリのプロトタイプ（デモ版）。
Google スプレッドシートとの連携を行い、介護記録の閲覧・入力を実現する。

## 主要URL
- **本番サイト**: https://facility-care-input-form.web.app
- **デモ（家族）**: https://facility-care-input-form.web.app/demo
- **デモ（スタッフ）**: https://facility-care-input-form.web.app/demo/staff
- **GitHub Pages**: https://yasushihonda-acg.github.io/facility-care-input-form/

## 技術スタック

### フロントエンド (`frontend/`)
- React 19 + TypeScript + Vite 7 + TailwindCSS v4
- TanStack Query + React Router v7
- PWA対応 (vite-plugin-pwa)

### バックエンド (`functions/`)
- Cloud Functions (Firebase) + Node.js 20
- Firebase Admin SDK + Google APIs (Sheets, Drive)
- Firestore

## ディレクトリ構成
```
facility-care-input-form/
├── CLAUDE.md          # 開発設定・アカウント
├── frontend/          # React PWA
│   ├── src/           # ソースコード
│   └── e2e/           # E2Eテスト (Playwright)
├── functions/         # Cloud Functions
├── docs/              # ドキュメント（6ファイル + archive/）
└── gh-pages/          # GitHub Pages
```

## 主要ドキュメント
| ファイル | 内容 |
|----------|------|
| `docs/HANDOVER.md` | 引き継ぎ（クイックスタート） |
| `docs/ARCHITECTURE.md` | システム設計 |
| `docs/API_SPEC.md` | API仕様 |
| `docs/BUSINESS_RULES.md` | 業務ルール |
| `docs/archive/` | 過去のPhase仕様書 |

## 認証情報
- **SA**: `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com`
- **Sheet A（読取）**: `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w`
- **Sheet B（書込）**: `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0`

## プリセット型定義（Phase 41.2で更新）

```typescript
// 品物フォームへの適用値
itemCategory?: ItemCategory;
storageMethod?: StorageMethod;
servingMethod?: ServingMethod;
servingMethodDetail?: string;
noteToStaff?: string;
remainingHandlingInstruction?: RemainingHandlingInstruction;

// @deprecated 後方互換性のため保持
processingDetail?: string;
instruction?: { content: string; };
```

データフロー:
1. PresetFormModal / SaveManualPresetDialog → 全フィールドで保存
2. Backend API (createPreset/updatePreset) → 全フィールドを保存・返却
3. ItemForm.handleApplyPreset → 全フィールドをフォームに適用

## AI機能（Phase 41で一時非表示）

以下の機能はフロントエンドで非表示化（ENABLE_AI_SUGGESTION = false）:
- 品物登録フォームの「AI提案」ボタン
- AISuggestionコンポーネント
- SaveAISuggestionDialog

バックエンドAPI（将来の再有効化用に保持）:
- POST /aiSuggest
- POST /getPresetSuggestions
- POST /saveAISuggestionAsPreset

## 開発履歴
Phase 1〜43.1完了。詳細は `git log` を参照。

- **Phase 44**: 品物名正規化AI（Gemini 2.5 Flash Lite）
  - POST /normalizeItemName API
  - ItemForm: 品物名入力後、統計用表示名を自動提案

- **Phase 45**: 記録閲覧AIチャットボット
  - POST /chatWithRecords API（Gemini 2.5 Flash）
  - ViewPage: FAB + ドロワーUIでAIチャット
  - plan_dataをRAGコンテキストに質問応答
  - デモモードでも実データ使用（モック応答なし）

- **Phase 45.1**: RAG高速化（インメモリキャッシュ）
  - planDataCache.ts: TTL 5分のインメモリキャッシュ
  - キャッシュHIT時: 約6秒（キャッシュMISS時: 約13秒→7秒短縮）
  - Cloud Functionsウォームインスタンスでのみ有効

- **Phase 45.2**: シート間相関分析改善
  - システムプロンプトに相関分析指示を追加
  - extractBalancedRecords: 複数シートから均等に抽出
  - 頓服日付を抽出し、対象日の排便データを優先取得
  - formatRecordsByDate: 重要レコード（頓服・排便あり）を最優先表示
  - 結果: 頓服×排泄の相関を正しく分析可能に

- **Phase 45.3**: 相関パターン追加・Few-shot例
  - 相関パターン追加: バイタル×内服、食事×体重、血糖×食事
  - 重要レコード判定拡張: 高血圧(140+)、発熱(37.5+)、高血糖(180+)
  - Few-shot例をシステムプロンプトに追加（頓服×排便、水分×排尿、バイタル異常）
  - 水分×排尿: 排尿回数4+の日を抽出して相関分析
  - 動作確認: 頓服×排泄✅、バイタル異常✅、水分傾向✅
  - 既知の制限: 「水分摂取と排尿の関係」直接質問は空応答になることがある
    → 代替: 「脱水の傾向は？」「水分摂取量が少ない日は？」で同等情報取得可能

- **Phase 46**: 階層的要約システム（RAG品質向上）
- **Phase 47**: AIチャットMarkdownレンダリング強化
- **Phase 48**: ViewPage機能拡張
  - 相関分析タブ: マグミット×排便の相関表示（ページネーション対応）
  - グラフタブ: Recharts導入、バイタル/排泄/体重/水分の折れ線グラフ
  - 表示期間拡張: 2024年〜現在年を固定表示
  - sticky固定: 年・月・タブを画面上部に固定
  - モバイル最適化: グラフラベル重なり修正、フォント縮小
  - **遅延読み込み**: 
    - getPlanData APIにyear/monthパラメータ追加
    - サーバーサイドでFirestoreクエリフィルタ（limit制限なし）
    - PlanData型にyear/monthフィールド追加（同期時に自動抽出）
    - Firestoreインデックス追加: sheetName + year + month + timestamp
  - react-markdown + remark-gfm 導入
  - テーブル・箇条書き・太字対応
  - システムプロンプトにMarkdown出力指示追加
  - syncPlanData実行時に日次/週次/月次要約を自動生成
  - 階層: monthly → weekly → daily → raw records
  - plan_data_summariesコレクション追加
  - GET /getSummaries: 要約一覧取得
  - POST /generateSummary: 手動要約生成
  - 相関検出: 頓服×排便、バイタル異常
  - 日次はFlash Lite、週次/月次はFlash 2.5で生成

主要機能:
- 家族向け品物管理・プリセット管理
- スタッフ向け記録入力フォーム・注意事項管理
- Google Chat Webhook連携

フッター構成（並び順統一）:
- 家族用: ホーム → 品物管理 → 記録閲覧 → 統計
- スタッフ用: 注意事項 → 記録入力 → 記録閲覧 → 統計
- Firebase Storage写真連携
- 統計ダッシュボード・AI分析

## PWA更新戦略

Service Workerキャッシュによる更新遅延問題に対応:
- `skipWaiting: true` - 新SW即座にアクティブ化
- `clientsClaim: true` - 全タブを即座に制御
- `PWAUpdateNotification.tsx` - 更新通知バナーUI
- ビルドタイムスタンプをコンソール出力（デバッグ用）

詳細: docs/ARCHITECTURE.md セクション10.5

## 同期スケジュール

Cloud Schedulerによる自動同期:
- **差分同期**: 毎時0分（1時間間隔）- 新規レコードのみ追加
- **完全同期**: 午前3時 - 洗い替え

UI表示（ViewPage/HomePageフッター）:
- 「最終同期: HH:mm / 次回自動同期: 毎時00分（約N分後）」
- 最終同期時間: APIレスポンス（getPlanData.lastSyncedAt）から取得
- 次回同期時間: 次の正時（00分）までの残り時間を計算

## Phase 52: Firebase Authentication & OAuth Chat API（2026-01-03）
- Firebase Authentication導入（Googleログイン）
- 許可リスト（aozora-cg.comドメイン + kinuekamachi@gmail.com）
- Chat APIをOAuth対応に変更（ユーザートークンでアクセス）
- care_photosにsourceフィールド追加（direct_upload / google_chat）
- E2Eテスト認証バイパス（VITE_E2E_TEST環境変数）
- Firestore/Storageセキュリティルール更新（認証必須）

## E2Eテスト
444件定義（Phase 52まで）

## Phase 50: 記録閲覧シート表示設定（2026-01-03）
- 設定ページ（/settings）に「記録閲覧 表示設定」セクション追加
- シートごとに表示/非表示をチェックボックスで切り替え
- 「すべて表示」「すべて非表示」ボタンで一括操作
- 設定はFirestore（settings/mealFormDefaults.hiddenSheets）に保存
- ViewPageで非表示シートをフィルタリング

## 相関分析タブ（Phase 48 + バグ修正）
- データソース: **内服シート**（特記事項シートではない）
- 検索条件: タイミング=頓服 かつ マグミット含む
- 時刻取得: 「何時に頓服薬を飲まれましたか？」フィールド
- 検索キーワード: マグミット, ﾏｸﾞﾐｯﾄ, まぐみっと, 酸化マグネシウム

## Git運用（2026-01-03更新）
- **mainへ直接pushしない**
- featureブランチで作業 → PR作成 → レビュー後マージ
- PRレビューはtodoに必ず含める

## ドキュメント更新方針

### 基本原則
- 新規ファイル作成禁止（既存ドキュメントに追記）
- 「何を作ったか」ではなく「どう使うか」を記載
- 一時的な実装メモはコミットメッセージに残す

### アクティブドキュメント（6ファイルのみ）
1. HANDOVER.md - クイックスタート・引き継ぎ
2. ARCHITECTURE.md - システム設計
3. API_SPEC.md - API仕様
4. BUSINESS_RULES.md - 業務ルール
5. DATA_MODEL.md - データモデル
6. SETUP.md - 環境構築

### 過去仕様書
- docs/archive/に保存（参照用）
- 新規Phase仕様書は作成しない
