# Phase 35: 同期間隔調整（15分→1時間）

## 概要
Cloud Schedulerの差分同期間隔を15分から1時間に変更。GAS（Google Apps Script）側の同期間隔と整合性を確保。

## 変更日
2025-12-21

## 変更内容

### Cloud Scheduler更新
```bash
gcloud scheduler jobs update http sync-plan-data-incremental \
  --location=asia-northeast1 \
  --schedule="0 * * * *" \
  --project=facility-care-input-form
```

- **Before**: `*/15 * * * *`（15分毎）
- **After**: `0 * * * *`（毎時0分）

### ドキュメント更新一覧
| ファイル | 更新内容 |
|----------|----------|
| docs/SYNC_STRATEGY.md | セクション2.1, 3.1, 8.1, 10.2を更新 |
| docs/ARCHITECTURE.md | セクション10.2, 10.3, Mermaid図を更新 |
| docs/CURRENT_STATUS.md | Phase 35を完了リストに追加 |
| docs/HANDOVER.md | Cloud Schedulerジョブ一覧を更新 |
| docs/ROADMAP.md | 複数セクションの同期間隔記載を更新 |
| docs/PLAN_RESULT_MANAGEMENT.md | データフロー図・制約事項を更新 |
| docs/FAMILY_UX_DESIGN.md | データフロー図を更新 |
| gh-pages/index.html | Phase 35進捗を追加 |
| gh-pages/architecture.html | 同期間隔の記載を更新 |

## 技術詳細

### Cloud Schedulerジョブ一覧（最終状態）
| ジョブ名 | スケジュール | 用途 |
|----------|-------------|------|
| sync-plan-data-incremental | `0 * * * *` | 差分同期（毎時0分） |
| sync-plan-data-full | `0 3 * * *` | フルリフレッシュ（毎日3時） |
| firebase-schedule-generateDailyTasks | `0 6 * * *` | タスク自動生成（毎日6時） |

### 変更理由
- GAS側（スプレッドシート）が1時間毎に同期を実行
- Firestore側も1時間毎に合わせることで、無駄な同期を削減
- コスト最適化とシステム負荷軽減

## コミット
- Hash: `06c0890` (初回変更)
- 追加コミット: ドキュメント整備分（別コミット予定）

## 関連ドキュメント
- docs/SYNC_STRATEGY.md
- docs/ARCHITECTURE.md
- docs/HANDOVER.md
