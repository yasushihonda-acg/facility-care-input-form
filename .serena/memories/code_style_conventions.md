# コードスタイル・規約

## 全般

- **言語**: TypeScript
- **命名規則**: 
  - 変数・関数: camelCase
  - 型・インターフェース: PascalCase
  - 定数: UPPER_SNAKE_CASE
- **インデント**: 2スペース
- **セミコロン**: あり

## フロントエンド (`frontend/`)

### ESLint設定
- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`

### React規約
- 関数コンポーネント使用
- カスタムフックは `use` プレフィックス
- 型定義は `types/` ディレクトリに集約

### TailwindCSS
- v4使用（`@tailwindcss/vite`）
- カスタムプロパティは `index.css` の `@theme` で定義

### ファイル構成
```
pages/      - ページコンポーネント (HomePage, MealInputPage)
components/ - UI部品 (Header, DataTable, Modal等)
hooks/      - カスタムフック (useSync, usePlanData)
api/        - API呼び出し関数
types/      - 型定義
config/     - 設定ファイル (tableColumns等)
```

## バックエンド (`functions/`)

### ESLint設定
- `eslint-config-google`
- `@typescript-eslint/eslint-plugin`

### Cloud Functions規約
- onRequest形式でHTTPエンドポイント定義
- CORSはミドルウェアで処理
- レスポンス形式: `{ success: boolean, data?: T, error?: string }`

### ファイル構成
```
functions/    - 各エンドポイント (syncPlanData, submitMealRecord等)
services/     - サービス層 (sheetsService, firestoreService)
types/        - 型定義
config/       - 設定 (sheets.ts)
```

### サービス層
- `sheetsService.ts`: Google Sheets API操作
- `firestoreService.ts`: Firestore操作
- `driveService.ts`: Google Drive操作

## CI/CD

- main ブランチへのpush/PRでCI実行
- functions/ 変更時に自動デプロイ
- Firebase CLI使用
