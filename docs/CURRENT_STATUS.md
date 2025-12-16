# 現在のステータス

> **最終更新**: 2025年12月16日 (Phase 9.1 バグ修正完了)
>
> このファイルは、会話セッションをクリアした後でも開発を継続できるよう、現在の進捗状況を記録しています。

---

## クイックリファレンス

| 項目 | 値 |
|------|-----|
| **デモURL** | https://facility-care-input-form.web.app |
| **リポジトリ** | https://github.com/yasushihonda-acg/facility-care-input-form |
| **GitHub Pages** | https://yasushihonda-acg.github.io/facility-care-input-form/ |
| **引き継ぎドキュメント** | [HANDOVER.md](./HANDOVER.md) |
| **ロードマップ** | [ROADMAP.md](./ROADMAP.md) |

---

## 次のタスク

### Phase 9.2: ConsumptionLog API・UI実装

**設計書**: [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md)

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | ConsumptionLog 型定義（frontend/backend） | 未着手 |
| 2 | recordConsumption API 実装 | 未着手 |
| 3 | getConsumptionLogs API 実装 | 未着手 |
| 4 | CareItem 型拡張（initialQuantity, currentQuantity, consumptionSummary） | 未着手 |
| 5 | ConsumptionRecordModal コンポーネント作成 | 未着手 |
| 6 | useConsumptionLogs フック作成 | 未着手 |
| 7 | 在庫バー（InventoryBar）コンポーネント作成 | 未着手 |

### Phase 9.3: 統計ダッシュボード拡張

| ステップ | 内容 | 状態 |
|----------|------|------|
| 1 | 在庫サマリーAPI実装 | 未着手 |
| 2 | 食品傾向分析API実装 | 未着手 |
| 3 | 摂食傾向タブ実装 | 未着手 |
| 4 | 在庫バーグラフ実装 | 未着手 |

### その他のタスク（将来）

| 機能 | 説明 | 優先度 |
|------|------|--------|
| FoodMaster 食品マスタ | AI提案との連携、食品別統計 | 中 |
| 摂食傾向分析API（aiAnalyze） | Gemini連携 | 中 |
| 週次レポート生成（aiReport） | Gemini連携 | 中 |
| ケア指示のFirestore保存 | モックデータ → Firestore永続化 | 中 |
| 写真エビデンス表示 | Google Drive画像を家族ビューで表示 | 中 |
| CSVエクスポート | 表示中のデータをCSVでダウンロード | 低 |

---

## 最近の完了タスク

### Phase 9.1 バグ修正 - useStats無限ループ (2025-12-16)

**問題**: 統計ビュー（/stats）が「データを読み込み中...」のまま停止

**原因**: `useStats`フックで`include`配列が毎回新しい参照になり、`useEffect`の無限ループが発生

**修正**:
- `useRef`でinclude配列の初回値を固定（参照変化を完全無視）
- `hasFetchedRef`フラグで初回フェッチのみ実行を保証

**修正ファイル**: `frontend/src/hooks/useStats.ts`

**教訓**: 配列/オブジェクトをカスタムフックのオプションとして受け取る場合、`useRef`で初回値を固定するのが最も確実

---

### Phase 9.0/9.1 在庫・消費追跡システム設計・実装 (2025-12-16)

**設計書**: [INVENTORY_CONSUMPTION_SPEC.md](./INVENTORY_CONSUMPTION_SPEC.md)

**実装内容**:
- View構成設計（スタッフ向け/家族向けページ分離）
- ItemTimeline.tsx（品物タイムライン共有ページ）
- ルーティング整備（/staff/*, /family/*, /view）

---

### Phase 8.6/8.7 プリセット管理・AI自動ストック (2025-12-16)

**設計書**: [PRESET_MANAGEMENT_SPEC.md](./PRESET_MANAGEMENT_SPEC.md)

**実装ファイル（新規）**:
- `functions/src/functions/presets.ts` - プリセットCRUD API
- `frontend/src/pages/family/PresetManagement.tsx` - プリセット管理画面
- `frontend/src/hooks/usePresets.ts` - プリセットCRUDフック
- `frontend/src/components/family/SaveAISuggestionDialog.tsx` - AI提案保存ダイアログ

**機能**:
- プリセット管理画面（カテゴリ別フィルタ、検索、CRUD）
- AI提案をワンクリックで「いつもの指示」として保存
- 出所バッジ（手動📌 / AI🤖）

---

### Phase 8.4拡張 AI提案UI統合 (2025-12-15)

**設計書**: [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) (セクション8)

**実装ファイル（新規）**:
- `frontend/src/components/family/AISuggestion.tsx` - AI提案カードコンポーネント

**機能**: 品物名入力時に自動で賞味期限・保存方法・提供方法を提案

---

## 開発ロードマップ進捗

```
Phase 1-4: 基盤・デモ版PWA          ████████████████████ 100% (完了)
Phase 5.x: 食事入力・設定機能        ████████████████████ 100% (完了)
Phase 6.0: フッターナビゲーション    ████████████████████ 100% (完了)
Phase 7.0-7.1: 家族向け・予実管理    ████████████████████ 100% (完了)
Phase 8.0: 設計ドキュメント          ████████████████████ 100% (完了)
Phase 8.1: 品物管理基盤              ████████████████████ 100% (完了)
Phase 8.2: タスク管理                ████████████████████ 100% (完了)
Phase 8.3: 統計ダッシュボード        ████████████████████ 100% (完了)
Phase 8.4: Gemini AI連携            ████████████████████ 100% (完了)
Phase 8.5: プリセット統合            ████████████████████ 100% (完了)
Phase 8.6: プリセット管理基盤        ████████████████████ 100% (完了)
Phase 8.7: AI自動ストック            ████████████████████ 100% (完了)
Phase 9.0: 在庫・消費追跡設計        ████████████████████ 100% (完了)
Phase 9.1: ルーティング・ページ実装  ████████████████████ 100% (完了)
Phase 9.2: ConsumptionLog API・UI   ░░░░░░░░░░░░░░░░░░░░   0% (次のタスク)
Phase 9.3: 統計ダッシュボード拡張    ░░░░░░░░░░░░░░░░░░░░   0% (計画中)
```

詳細: [docs/ROADMAP.md](./ROADMAP.md)

---

## デプロイ済みリソース

### PWA (Firebase Hosting)

| 項目 | 値 |
|------|-----|
| URL | https://facility-care-input-form.web.app |
| 技術スタック | React + Vite + TailwindCSS v4 + TanStack Query |
| PWA対応 | Service Worker、オフラインキャッシュ対応 |

### 主要Cloud Functions

ベースURL: `https://asia-northeast1-facility-care-input-form.cloudfunctions.net`

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/healthCheck` | ヘルスチェック |
| POST | `/syncPlanData` | 記録データを同期 |
| POST | `/submitMealRecord` | 食事記録を入力 |
| GET | `/getPlanData` | 同期済み記録を取得 |
| GET | `/getMealFormSettings` | フォーム初期値設定を取得 |
| GET | `/getStats` | 統計データ取得 |
| POST | `/aiSuggest` | AI品物入力補助 |
| GET/POST | `/presets/*` | プリセットCRUD |
| Scheduler | `/generateDailyTasks` | タスク自動生成（毎日6時） |

---

## 重要な情報

### サービスアカウント

**統一済み**: 全用途で単一のサービスアカウントを使用

```
facility-care-sa@facility-care-input-form.iam.gserviceaccount.com
```

### スプレッドシート共有状態

| シート | ID | 権限 |
|--------|-----|------|
| Sheet A (記録の結果) | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` | 閲覧者 |
| Sheet B (実績入力先) | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` | 編集者 |

### Dev Mode設定

- 認証: なし（`allUsers` に `cloudfunctions.invoker` 付与済み）
- Firestore: 全開放（`allow read, write: if true;`）
- **注意**: 本番移行時に必ず認証を実装すること

---

## 再開時の手順

1. `docs/CURRENT_STATUS.md` を読んで現在の進捗を確認
2. https://facility-care-input-form.web.app でPWAの動作確認
3. 「次のタスク」セクションから作業を再開

---

## AIエージェントへの指示

会話をクリアした後、このプロジェクトの開発を継続する場合は、以下のように指示してください：

```
facility-care-input-form プロジェクトの開発を継続してください。
docs/CURRENT_STATUS.md を読んで、次のタスクから再開してください。
```
