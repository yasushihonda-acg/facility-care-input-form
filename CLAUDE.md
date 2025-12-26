# CLAUDE.md - Claudeへの行動指示

このファイルはClaude Codeの行動ルールを定義します。
環境情報・アカウント設定は `docs/SETUP.md` を参照。

---

## 1. 変更時の自律的チェック（必須）

### UI/UX・表記変更時
コンポーネントの文言・アイコン・表示内容を変更した場合、**指示がなくても**以下を自動で確認・修正すること：

1. **関連コンポーネント**: `grep` で同一文言を検索
2. **E2Eテスト**: テスト名・セレクタに影響がないか確認
3. **ドキュメント**: `docs/HANDOVER.md`, `gh-pages/` の表記
4. **デモデータ**: `frontend/src/data/demo/` 内の該当箇所

### コード変更時
1. **ビルド確認**: `npm run build` が通ること
2. **Lint確認**: `npm run lint` がエラーなしであること
3. **型整合性**: フロントエンド・バックエンド両方で型が一致すること

### バグ修正時
1. **原因分析が先**: DevToolsで根本原因を特定してから修正
2. **ローカルテスト必須**: `npm run build && npm run preview` で確認後にコミット
3. **場当たり的修正は禁止**: 「とりあえずデプロイ」ではなく「理解してから直す」

---

## 2. ドキュメント更新ルール

### 基本原則
- **新規ファイル作成禁止**: 既存ドキュメントにセクション追加
- **「どう使うか」を記載**: 実装詳細はコミットメッセージに残す
- **Phase仕様書は作らない**: 完了した機能は既存ドキュメントに統合

### アクティブドキュメント（6ファイルのみ）
| ファイル | 更新タイミング |
|----------|---------------|
| `docs/HANDOVER.md` | クイックスタートに影響する変更時 |
| `docs/API_SPEC.md` | 新規/変更エンドポイント追加時 |
| `docs/ARCHITECTURE.md` | データフロー変更時 |
| `docs/BUSINESS_RULES.md` | 業務ルール変更時 |
| `docs/DATA_MODEL.md` | Firestore構造変更時 |
| `docs/SETUP.md` | 環境構築手順変更時 |

### 過去仕様書
- `docs/archive/` に保存（参照用）
- 新規追加しない

### 更新判断（自律的に行う）
- 変更完了後、上記6ファイルへの影響を**自動判断**
- 影響がある場合は**指示なしで更新**
- 影響がない場合は更新しない（過剰更新を避ける）
- 判断に迷う場合は更新する（安全側に倒す）

---

## 3. Git・デプロイルール

### コミット・Push（必須）
作業完了時は必ずコミット＆リモートへpushすること。

```bash
git add -A && git commit -m "変更内容" && git push origin main
```

### 本番デプロイ（自動）
- `git push origin main` で GitHub Actions が自動デプロイ
- 手動 `firebase deploy` は不要
- デプロイ確認: `gh run list --limit 3`

### GitHub Pages
- `gh-pages/` の変更も `git push origin main` で自動デプロイ
- ワークフロー: `.github/workflows/gh-pages.yml`

---

## 4. 禁止事項

- `keys/` ディレクトリをGitにコミットしない
- `functions/.env` をGitにコミットしない
- 新規サービスアカウントを作成しない（統一SA: `facility-care-sa`）
- 認証なしのまま本番運用しない（現在はDev Mode）

---

## 5. 参照先

| 情報 | 参照先 |
|------|--------|
| クイックスタート | `docs/HANDOVER.md` |
| 環境・アカウント設定 | `docs/SETUP.md` |
| API仕様 | `docs/API_SPEC.md` |
| システム設計 | `docs/ARCHITECTURE.md` |
| 業務ルール | `docs/BUSINESS_RULES.md` |
