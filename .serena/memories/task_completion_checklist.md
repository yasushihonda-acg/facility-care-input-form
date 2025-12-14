# タスク完了時のチェックリスト

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

> **重要**: 作業完了時は必ずコミット＆pushすること

```bash
# 1. 変更確認
git status

# 2. コミット
git add -A
git commit -m "feat/fix/docs: 変更内容"

# 3. Push
git push origin main

# 4. CI/CD確認
gh run list --limit 3
```

## ドキュメント更新

- `docs/CURRENT_STATUS.md` を更新して進捗を反映
- 新機能追加時は関連ドキュメントも更新

## 動作確認URL

- **デモサイト**: https://facility-care-input-form.web.app
- **API**: https://asia-northeast1-facility-care-input-form.cloudfunctions.net/
