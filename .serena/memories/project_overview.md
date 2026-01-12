# プロジェクト概要: facility-care-input-form

## 目的
介護施設向けコミュニケーションアプリ（PWA）。家族とスタッフ間の情報共有を実現。

## 主要URL
- **本番**: https://facility-care-input-form.web.app
- **デモ（家族）**: https://facility-care-input-form.web.app/demo
- **デモ（スタッフ）**: https://facility-care-input-form.web.app/demo/staff
- **GitHub Pages**: https://yasushihonda-acg.github.io/facility-care-input-form/

## 技術スタック
| カテゴリ | 技術 |
|----------|------|
| Frontend | React 19 + Vite 7 + TypeScript + TailwindCSS v4 |
| Backend | Cloud Functions (Firebase) + Node.js 20 |
| Database | Cloud Firestore |
| Auth | Firebase Authentication (Google) |
| AI | Gemini 2.5 Flash |
| External | Google Sheets API, Google Chat Webhook |

## ディレクトリ構成
```
facility-care-input-form/
├── CLAUDE.md          # 開発ルール（必読）
├── frontend/          # React PWA
│   ├── src/           # ソースコード
│   └── e2e/           # E2Eテスト (Playwright)
├── functions/         # Cloud Functions
├── docs/              # ドキュメント（5ファイル + archive/）
└── gh-pages/          # GitHub Pages
```

## 主要ドキュメント
| ファイル | 内容 |
|----------|------|
| `CLAUDE.md` | 開発ルール・チェックリスト |
| `docs/HANDOVER.md` | クイックスタート・引き継ぎ |
| `docs/ARCHITECTURE.md` | システム設計 |
| `docs/API_SPEC.md` | API仕様 |
| `docs/DATA_MODEL.md` | Firestore構造 |

## 認証情報
- **SA**: `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com`
- **Sheet A（読取）**: `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w`
- **Sheet B（書込）**: `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0`

## 主要機能（Phase 62まで実装済み）

### 家族向け
- 品物管理（登録・編集・詳細・提供スケジュール）
- 品物一括登録（Excelファイルから複数品物を一括登録）
- プリセット管理（検索・ソート・グループ化対応）
- エビデンスモニター
- 統計ダッシュボード・AI分析

### スタッフ向け
- 注意事項管理（優先度・期間設定）
- 品物操作通知（家族依頼タブ）
- 記録入力フォーム（食事・水分）
- 記録閲覧（シート別表示、相関分析、グラフ）

### システム
- Firebase Authentication（Google + ドメイン/メール許可リスト）
- ロールベースリダイレクト（家族専用/スタッフ専用）
- PWA自動更新（version.json比較）
- Google Chat画像同期

## 同期スケジュール
- **差分同期**: 毎時0分（新規レコードのみ）
- **完全同期**: 午前3時（洗い替え）

## PWA更新戦略
- `version.json`: ビルド時にタイムスタンプ生成
- 起動時/画面復帰時にサーバーと比較
- バージョン差異 → キャッシュ削除 → 自動リロード

## 認証フロー
1. Firebase Auth（Googleログイン）
2. 許可リスト: aozora-cg.comドメイン + kinuekamachi@gmail.com
3. ロール判定: メール/ドメイン → 強制リダイレクト

## AI機能
- **品物名正規化**: Gemini 2.5 Flash Lite（POST /normalizeItemName）
- **記録閲覧チャット**: Gemini 2.5 Flash（POST /chatWithRecords）
- **階層的要約**: daily → weekly → monthly

## 非表示/削除済み機能
- AI提案ボタン（ENABLE_AI_SUGGESTION = false）
- タスク機能（Phase 56で削除、品物管理で代替）
- チャット機能（一時非表示）

## 開発フロー
- mainへ直接pushしない
- featureブランチ → PR → レビュー → マージ
- mainマージで自動デプロイ（GitHub Actions）
