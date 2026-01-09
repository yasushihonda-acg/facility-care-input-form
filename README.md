# 施設ケア入力フォーム

介護施設向けコミュニケーションアプリ - スタッフの記録入力と家族への情報共有を実現するPWA

## リンク

| リンク | 説明 |
|--------|------|
| [本番サイト](https://facility-care-input-form.web.app) | PWAアプリ（認証必須） |
| [デモ（家族）](https://facility-care-input-form.web.app/demo) | ガイド付きデモ |
| [デモ（スタッフ）](https://facility-care-input-form.web.app/demo/staff) | スタッフ向けデモ |
| [GitHub Pages](https://yasushihonda-acg.github.io/facility-care-input-form/) | プロジェクト紹介 |

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| Frontend | React 19 + Vite 7 + TypeScript + TailwindCSS v4 |
| Backend | Cloud Functions (Firebase) + Node.js 20 |
| Database | Cloud Firestore |
| Auth | Firebase Authentication (Google) |
| External | Google Sheets API, Google Chat Webhook |
| CI/CD | GitHub Actions |

---

## ドキュメント

> **開発を始める前に [docs/HANDOVER.md](./docs/HANDOVER.md) を参照してください**

| ファイル | 内容 |
|----------|------|
| [CLAUDE.md](./CLAUDE.md) | Claude Code行動指示・開発ルール |
| [docs/HANDOVER.md](./docs/HANDOVER.md) | **クイックスタート・引き継ぎ** |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | システム設計・認証フロー |
| [docs/API_SPEC.md](./docs/API_SPEC.md) | API仕様（全エンドポイント） |
| [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) | Firestore構造・型定義 |
| [docs/SETUP.md](./docs/SETUP.md) | 環境構築手順 |

---

## クイックスタート

```bash
# 認証設定
gh auth switch --user yasushihonda-acg
gcloud config set account yasushi.honda@aozora-cg.com
firebase use facility-care-input-form

# 開発サーバー起動
cd frontend && npm run dev
```

詳細は [docs/HANDOVER.md](./docs/HANDOVER.md) を参照。

---

## プロジェクト構成

```
facility-care-input-form/
├── CLAUDE.md          # 開発ルール
├── frontend/          # React PWA
│   ├── src/           # ソースコード
│   └── e2e/           # E2Eテスト (Playwright)
├── functions/         # Cloud Functions
├── docs/              # ドキュメント
└── gh-pages/          # GitHub Pages
```

---

## 開発ルール

- **mainへ直接pushしない** → featureブランチ → PR → マージ
- **コミット前にビルド確認** → `npm run build && npm run lint`
- 詳細は [CLAUDE.md](./CLAUDE.md) を参照

---

## ライセンス

Private - All rights reserved
