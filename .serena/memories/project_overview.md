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
Phase 1〜43完了。詳細は `git log` を参照。

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

## E2Eテスト
394件定義（Phase 41まで）

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
