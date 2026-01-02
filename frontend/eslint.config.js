import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // React 19の新しい厳格なルールを警告レベルに調整
      // 初期化パターンや状態遷移検出での setState は許容
      'react-hooks/set-state-in-effect': 'warn',
      // Date.now() などの表示用計算は許容
      'react-hooks/purity': 'warn',
      // 依存配列の厳格チェック（意図的な省略がある場合もあるため警告に）
      'react-hooks/exhaustive-deps': 'warn',
      // 未使用変数: _プレフィックスは許可
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // React Compiler memoization: 厳格すぎるため警告に
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
])
