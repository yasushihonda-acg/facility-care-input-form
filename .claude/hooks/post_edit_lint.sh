#!/bin/bash
# Post-Edit/Write Hook: 自動lint実行
# Edit/Writeツール実行後に対象ファイルをlintチェック

# 環境変数からファイルパスを取得
FILE_PATH="${CLAUDE_FILE_PATH:-}"

# ファイルパスがない場合は終了
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# プロジェクトルートを取得
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# フロントエンドのTypeScript/TSXファイルの場合
if [[ "$FILE_PATH" == *"frontend/src/"* ]] && [[ "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  cd "$PROJECT_ROOT/frontend" 2>/dev/null || exit 0

  # ESLintでファイルをチェック（エラーのみ表示）
  npx eslint "$FILE_PATH" --quiet 2>/dev/null
  LINT_EXIT=$?

  if [ $LINT_EXIT -ne 0 ]; then
    echo "⚠️  Lint warning: $FILE_PATH"
  fi
fi

# バックエンドのTypeScriptファイルの場合
if [[ "$FILE_PATH" == *"functions/src/"* ]] && [[ "$FILE_PATH" =~ \.ts$ ]]; then
  cd "$PROJECT_ROOT/functions" 2>/dev/null || exit 0

  # ESLintでファイルをチェック（エラーのみ表示）
  npx eslint "$FILE_PATH" --quiet 2>/dev/null
  LINT_EXIT=$?

  if [ $LINT_EXIT -ne 0 ]; then
    echo "⚠️  Lint warning: $FILE_PATH"
  fi
fi

# 常に成功で終了（hookがブロックしないように）
exit 0
