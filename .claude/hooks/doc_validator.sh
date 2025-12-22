#!/bin/bash
# ドキュメント整合性チェック（コミット前）

# 標準入力からJSONを読み取り
INPUT=$(cat)

# git commit コマンドかどうかチェック
COMMAND=$(echo "$INPUT" | python3 -c "import json,sys; data=json.load(sys.stdin); print(data.get('tool_input',{}).get('command',''))" 2>/dev/null)

if [[ "$COMMAND" == *"git commit"* ]] || [[ "$COMMAND" == *"git add"* ]]; then
    # ステージングされたファイルをチェック
    STAGED=$(git diff --cached --name-only 2>/dev/null)

    # 1. 新規docs/ファイル（archive/以外）をチェック
    NEW_DOCS=$(echo "$STAGED" | grep -E '^docs/[^/]+\.md$' | grep -v 'HANDOVER\|ARCHITECTURE\|API_SPEC\|BUSINESS_RULES\|DATA_MODEL\|SETUP')

    if [ -n "$NEW_DOCS" ]; then
        echo ""
        echo "⚠️  新規ドキュメントファイルが検出されました:"
        echo "$NEW_DOCS"
        echo ""
        echo "📋 ドキュメント更新ルール:"
        echo "   - 新規ファイル作成は禁止"
        echo "   - 既存の6ファイルにセクション追加してください"
        echo "   - 詳細: CLAUDE.md「ドキュメント更新ルール」参照"
        echo ""
    fi

    # 2. archive/への新規追加をチェック
    NEW_ARCHIVE=$(echo "$STAGED" | grep -E '^docs/archive/.*\.md$')

    if [ -n "$NEW_ARCHIVE" ]; then
        echo ""
        echo "⚠️  docs/archive/ への新規ファイル追加が検出されました:"
        echo "$NEW_ARCHIVE"
        echo ""
        echo "📋 アーカイブルール:"
        echo "   - archive/への新規追加は禁止"
        echo "   - 設計メモはコミットメッセージに記載"
        echo "   - 本当に必要な場合のみ追加（シート構造等の参照用）"
        echo ""
    fi
fi

exit 0
