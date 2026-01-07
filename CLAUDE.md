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
4. **E2Eテスト**: 変更に関連するテストを実行し、パスすること

### スモークテスト（コミット前に必須）
目視確認だけでは不十分。**Playwrightで自動検証**すること。

```bash
# 1. ビルド + プレビュー起動
npm run build && npm run preview -- --port 4173 &

# 2. E2Eテストで検証（目視より確実）
npx playwright test e2e/<関連テスト>.spec.ts

# 3. サーバー停止
lsof -ti:4173 | xargs kill
```

**なぜE2Eテストが重要か**:
- CSSプロパティ（sticky等）は目視で判断しにくい
- ブラウザキャッシュ/PWAキャッシュで古い状態を見ている可能性
- 自動テストなら確実に最新ビルドを検証できる

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

### アクティブドキュメント（5ファイルのみ）
| ファイル | 更新タイミング |
|----------|---------------|
| `docs/HANDOVER.md` | クイックスタートに影響する変更時 |
| `docs/API_SPEC.md` | 新規/変更エンドポイント追加時 |
| `docs/ARCHITECTURE.md` | データフロー変更時 |
| `docs/DATA_MODEL.md` | Firestore構造変更時 |
| `docs/SETUP.md` | 環境構築手順変更時 |

### 過去仕様書
- `docs/archive/` に保存（参照用）
- 新規追加しない

### 更新判断（自律的に行う）
- 変更完了後、上記5ファイルへの影響を**自動判断**
- 影響がある場合は**指示なしで更新**
- 影響がない場合は更新しない（過剰更新を避ける）
- **重複を避ける**: 同じ情報は1箇所のみに記載し、他は参照リンク

---

## 3. Git・デプロイルール

### ブランチ戦略（必須）
- **mainへ直接pushしない**
- featureブランチで作業し、PRを作成
- PRレビュー後にマージ（ユーザー承認を待つ）

### PRレビュー（todoに必ず含める）
- 作業開始時のtodoに「PRレビュー依頼」を必ず含める
- `gh pr create` 後、ユーザーに確認を求める
- ユーザー承認後に `gh pr merge --squash --delete-branch`

### 本番デプロイ（自動）
- mainへのマージで GitHub Actions が自動デプロイ
- 手動 `firebase deploy` は不要
- デプロイ確認: `gh run list --limit 3`

### GitHub Pages
- `gh-pages/` の変更も mainマージで自動デプロイ
- ワークフロー: `.github/workflows/gh-pages.yml`

---

## 4. デモ・本番・ツアー整合性ルール

### 設計原則
デモと本番は**同一コンポーネント**を使用し、データソースのみが異なる。
デモツアーは**実装済み機能のみ**を案内する。

### 開発手法（本番ファースト）

**原則: 本番実装が先、デモは後**

```
❌ 従来の問題パターン
デモUI作成 → ハードコードで見た目確認 → 本番実装は後回し（漏れる）

✅ 正しいアプローチ
本番API実装 → 本番で動作確認 → デモはseedデータで検証
```

**新機能開発の流れ:**
1. バックエンドAPI実装（Firestore保存含む）
2. フロントエンド実装（APIを呼び出す）
3. 本番環境で動作確認
4. デモ用seedデータを追加（必要な場合）
5. デモで表示確認

**チェックポイント:**
- [ ] フックで `isDemo` 時にハードコード返却していないか？
- [ ] 本番で空配列・空オブジェクトを返していないか？
- [ ] バックエンドに保存処理があるか？
- [ ] APIレスポンスに必要なフィールドが含まれているか？

```mermaid
graph TD
    subgraph 本番
        F1[/family/*] --> C1[FamilyDashboard等]
        S1[/staff/*] --> C2[StaffNotesPage等]
    end
    subgraph デモ
        F2[/demo/family/*] --> C1
        S2[/demo/staff/*] --> C2
    end
    subgraph ツアー
        T1[DemoShowcase] -.->|案内| F2
        T2[DemoStaffShowcase] -.->|案内| S2
    end
    style C1 fill:#f9f,stroke:#333
    style C2 fill:#9ff,stroke:#333
```

### ルート対照表（デモ ↔ 本番）

| 役割 | 本番パス | デモパス | コンポーネント | ルート | 本番実装 |
|------|----------|----------|----------------|--------|----------|
| **家族ホーム** | /family | /demo/family | FamilyDashboard | ✅ | ✅ |
| **品物管理** | /family/items | /demo/family/items | ItemManagement | ✅ | ✅ |
| **品物登録** | /family/items/new | /demo/family/items/new | ItemForm | ✅ | ✅ |
| **品物詳細** | /family/items/:id | /demo/family/items/:id | ItemDetail | ✅ | ✅ |
| **品物編集** | /family/items/:id/edit | /demo/family/items/:id/edit | ItemEditPage | ✅ | ✅ |
| **プリセット** | /family/presets | /demo/family/presets | PresetManagement | ✅ | ✅ |
| **エビデンス** | /family/evidence/:date | /demo/family/evidence/:date | EvidenceMonitor | ✅ | ✅ |
| **スタッフ注意** | /staff/notes | /demo/staff/notes | StaffNotesPage | ✅ | ✅ |
| **記録入力** | /staff/input/meal | /demo/staff/input/meal | MealInputPage | ✅ | ✅ |
| **家族連絡一覧** | /staff/family-messages | /demo/staff/family-messages | FamilyMessages | ✅ | ✅ |
| **家族連絡詳細** | /staff/family-messages/:id | /demo/staff/family-messages/:id | FamilyMessageDetail | ✅ | ✅ |
| **統計** | /stats | /demo/stats | StatsDashboard | ✅ | ✅ |
| **記録閲覧** | /view | /demo/view | ViewPage | ✅ | ✅ |
| **品物タイムライン** | /items/:id/timeline | /demo/items/:id/timeline | ItemTimeline | ✅ | ⚠️ デモのみ |
| **設定** | /settings | なし（独立） | SettingsPage | ✅ | ✅ |

**凡例:**
- ルート: ルーティング設定の有無
- 本番実装: ✅ = 本番でデータ保存・取得が動作 / ⚠️ = デモのみハードコード（本番未実装）

### ツアー ↔ 機能 対照表

| ツアーステップ | 案内先パス | 説明 | 実装状態 |
|---------------|-----------|------|----------|
| **家族1: 品物登録** | /demo/family/items/new | AI入力サポート | ✅ |
| **家族2: 品物確認** | /demo/family/items | 期限アラート | ✅ |
| **家族3: プリセット** | /demo/family/presets | ワンクリック保存 | ✅ |
| **家族4: 今日の様子** | /demo/family | タイムライン | ✅ |
| **家族5: 傾向分析** | /demo/stats | AI分析 | ✅ |
| **スタッフ1: 注意事項** | /demo/staff/notes | 申し送り確認 | ✅ |
| **スタッフ2: 品物指示** | /demo/staff/input/meal | 提供方法確認 | ✅ |
| **スタッフ3: 間食記録** | /demo/staff/input/meal | 摂食記録入力 | ✅ |
| **スタッフ4: 統計** | /demo/stats | 摂食傾向 | ✅ |

### 削除済み機能（ツアーに含めないこと）

| 機能 | 削除Phase | 理由 |
|------|-----------|------|
| 入居者設定（禁止品目） | Phase 26 | 運用で代替 |
| チャット機能 | Phase 21 | 一時非表示 |
| タスク機能 | Phase 56 | 品物管理で代替 |
| AI提案ボタン | Phase 41 | 一時非表示 |

### E2Eテスト ↔ 実装 整合性

**要注意**: テストが存在しても実装がない場合がある。
```bash
# テストファイルと実装の整合性確認
npx playwright test --list 2>&1 | tail -3
```

### 機能変更時のチェックリスト（必須）

機能を追加・変更・削除した場合、**以下を全て確認**すること：

1. **ルート対照表**: 本番とデモの両方にルートが存在するか
2. **ツアー説明**: 案内内容が実装と一致しているか
   - `frontend/src/pages/demo/DemoShowcase.tsx`（家族用）
   - `frontend/src/pages/demo/DemoStaffShowcase.tsx`（スタッフ用）
3. **デモデータ**: `frontend/src/data/demo/` に必要なデータがあるか
4. **E2Eテスト**: テストが実装と同期しているか（skip/削除の判断）
5. **削除済み機能表**: 削除した機能を上記表に追記

### 不整合発見時の対応

1. **実装あり・ツアーなし**: ツアーにステップ追加
2. **ツアーあり・実装なし**: ツアーからステップ削除
3. **テストあり・実装なし**: テストをskipまたは削除
4. **デモデータなし**: デモデータを追加

---

## 5. 禁止事項

- `keys/` ディレクトリをGitにコミットしない
- `functions/.env` をGitにコミットしない
- 新規サービスアカウントを作成しない（統一SA: `facility-care-sa`）
- 認証なしのまま本番運用しない（現在はDev Mode）
