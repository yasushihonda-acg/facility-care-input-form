# タスク完了時のチェックリスト

## セッション開始時の注意

### キャッチアップ報告のルール
- 「次のアクション候補」は**具体的な未完了タスクがある場合のみ**記載
- mainがclean・ドキュメント最新・CI成功の場合 → 「未完了タスクなし」と明記
- 一般的なメンテナンス作業（E2Eテスト実行、ドキュメント整備など）を候補として挙げない
- 次のアクションがない場合 → 「新しい要件待ち」と報告

## コード変更後

### フロントエンド変更時
```bash
# 1. Lint実行
cd frontend && npm run lint

# 2. ビルド確認
cd frontend && npm run build

# 3. 動作確認 (ローカル)
cd frontend && npm run dev
# → http://localhost:5173 で確認
```

### バックエンド変更時
```bash
# 1. Lint実行
npm run lint --prefix functions

# 2. ビルド確認
npm run build --prefix functions

# 3. Emulator で動作確認
firebase emulators:start --only functions,firestore
```

### APIテスト（バックエンド変更時）
```bash
# curlでAPIテスト（本番環境）
# テストデータは必ずクリーンアップすること
# 詳細は docs/API_TEST_PLAN.md 参照

# 例: submitCareItem テスト
curl -X POST "https://asia-northeast1-facility-care-input-form.cloudfunctions.net/submitCareItem" \
  -H "Content-Type: application/json" \
  -d '{"residentId":"test-xxx","userId":"test-xxx","item":{...}}'

# 推奨: Emulatorを使用した安全なテスト
firebase emulators:start --only functions,firestore
# localhost:5001 に対してテスト
```

### E2Eテスト実行
```bash
# ビルド + ローカルテスト
cd frontend && npm run build
npm run preview -- --port 4173 &
npx playwright test

# 特定のテストを実行
npx playwright test e2e/demo-page.spec.ts

# 本番環境でテスト
BASE_URL=https://facility-care-input-form.web.app npx playwright test

# テスト件数: 487件定義
# 主要テストファイル:
# - demo-page: 43件
# - family-user-scenario: 34件
# - staff-record-form: 34件
# - family-page: 21件
# - item-edit: 23件
# - demo-staff: 17件
# - demo-staff-containment: 15件
# - item-based-snack: 13件
# - schedule-start-date: 13件
# - remaining-handling: 10件
# - demo-stats-ai: 9件
# - footer-nav-demo: 9件
# - snack-record: 11件
# - fifo: 8件
# - schedule-extension: 7件
# - family-notify: 7件
# - schedule-display: 7件
# - photo-evidence: 5件
# - preset-navigation: 5件
# ※ chat-integration/record-chat-integration は Phase 21 で非表示中（スキップ）
```

## デプロイ

### フロントエンドデプロイ
```bash
cd frontend && npm run build
firebase deploy --only hosting
```

### バックエンドデプロイ
```bash
npm run build --prefix functions
firebase deploy --only functions
# または GitHub Actions 経由 (main へ push)
```

## Git操作 (必須)

> **重要**: mainへ直接pushしない。featureブランチ→PR→マージ

### PRフロー（定型）
```bash
# 1. featureブランチ作成
git checkout -b <type>/<short-description>
# 例: feat/add-feature, fix/bug-name, docs/update-readme

# 2. ビルド + スモークテスト（必須）
cd frontend && npm run build
npm run preview -- --port 4173 &
# → http://localhost:4173 で変更箇所を目視確認
# 確認後: lsof -ti:4173 | xargs kill

# 3. E2Eテストで検証（目視より確実）
npx playwright test e2e/<関連テスト>.spec.ts
# CSSプロパティ等は目視では判断しにくいため自動テスト推奨

# 4. コミット
git add -A
git commit -m "feat/fix/docs: 変更内容"

# 4. Push & PR作成
git push -u origin <branch-name>
gh pr create --title "タイトル" --body "## Summary\n- 変更点\n\n## Test plan\n- [x] テスト内容"

# 5. PR内容を表示（レビュー用）
gh pr view <number>
gh pr diff <number>

# 6. ユーザー承認後にマージ
gh pr merge <number> --squash --delete-branch

# 7. mainに戻る
git checkout main && git pull

# 8. CI/CD確認
gh run list --limit 3
```

### PRレビュー時の出力テンプレート
```
PR作成後、以下を提示：
1. PR URL
2. 差分内容（gh pr diff）
3. 「問題なければマージしますか？」と明確に確認
```

## ドキュメント更新

### 更新対象（変更がある場合のみ）
- `docs/HANDOVER.md` - パス・機能一覧に影響する変更時
- `gh-pages/index.html` - Phase進捗・リンク変更時

### 整合性チェック（Phase完了時）
```bash
# 古いパス参照がないか確認
grep -r "admin=true" docs/ gh-pages/ --include="*.md" --include="*.html" 2>/dev/null

# 新規ドキュメントがdocs/直下にないか確認（archive/に移動すべき）
ls docs/*.md | grep -v -E "(HANDOVER|API_SPEC|ARCHITECTURE|DATA_MODEL|SETUP)\.md"
```

### ルール確認
- 新規ファイル作成禁止 → 既存ドキュメントに追記 or archive/に配置
- Phase仕様書は作らない → コミットメッセージに詳細を残す

## 動作確認URL

- **デモサイト**: https://facility-care-input-form.web.app
- **API**: https://asia-northeast1-facility-care-input-form.cloudfunctions.net/
