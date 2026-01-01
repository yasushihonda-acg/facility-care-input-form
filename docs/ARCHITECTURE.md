---
status: canonical
scope: core
owner: core-team
last_reviewed: 2025-12-23
---

# システムアーキテクチャ設計書

## 1. プロジェクト概要

**プロジェクト名**: 蒲地様プロジェクト（入居者様ご家族向けコミュニケーションアプリ）

**目的**: 介護施設における既存の業務フロー（スプレッドシート・FAX）を維持しつつ、モバイルアプリで以下の機能を提供する：
- 記録の閲覧（ケアプラン・指示内容）
- 実績の入力（食事介助記録など）
- 要望の送信（ご家族からの詳細なケア要望）

**フェーズ**: プロトタイプ / 機能検証（Dev Mode）

---

## 2. 開発モード (Dev Mode) 方針

> **重要**: 本フェーズでは機能検証を優先し、認証機能は実装しません。

| 項目 | 設定 |
|------|------|
| Firebase Authentication | 未実装 |
| Cloud Run functions | `--allow-unauthenticated` |
| Firestore Security Rules | `allow read, write: if true;` |
| ユーザー識別 | リクエストボディで `userId` / `staffId` を受け取る |

**リスク認識**: 本設定は検証環境専用です。本番環境への移行時には必ず認証・認可を実装すること。

---

## 3. インフラストラクチャ構成

### 使用サービス

| サービス | 用途 |
|----------|------|
| Cloud Run functions (2nd gen) | APIエンドポイント |
| Cloud Firestore | 家族要望データ、同期データ、写真メタデータの保存 |
| Firebase Storage | 写真ファイルの保存・公開URL生成（Phase 17） |
| Google Sheets API | スプレッドシートの読み取り・書き込み |

---

## 4. データフロー定義（4つのフロー）

本システムは4つの独立したデータフローで構成されます。それぞれの役割を厳密に区別してください。

### Flow A: 記録参照フロー (Read-Only Sync)

**概要**: 施設側が管理する「指示・計画マスタ」を読み取り専用で同期

| 属性 | 値 |
|------|-----|
| **Role** | Read-Only Source (Source of Truth) |
| **Sheet ID** | `1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w` |
| **Sheet URL** | https://docs.google.com/spreadsheets/d/1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w/edit |
| **操作** | 読み取りのみ（書き込み禁止） |
| **同期方式** | 洗い替え（全シートスキャン → Firestoreへミラーリング） |

**データ内容例**:
- 食事制限・禁止食材
- 調理方法の詳細指示（例：キウイの切り方）
- 条件付き禁止事項

### Flow B: 実績入力フロー (Write-Only Log)

**概要**: スタッフがアプリから入力したケア実績を記録

| 属性 | 値 |
|------|-----|
| **Role** | Write-Only Destination |
| **Sheet ID** | `1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0` |
| **Sheet URL** | https://docs.google.com/spreadsheets/d/1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0/edit |
| **操作** | 追記のみ（読み取り・更新禁止） |
| **特殊仕様** | Bot連携ハック（詳細は BUSINESS_RULES.md 参照） |

**データ内容例**:
- 食事介助記録
- 間食記録（特殊処理あり）
- 水分摂取記録

### Flow C: 家族要望フロー (Firestore Database)

**概要**: ご家族からの品物送付・提供指示を管理

| 属性 | 値 |
|------|-----|
| **Role** | アプリ内完結データ |
| **Storage** | Cloud Firestore (`careItems`, `presets`, `tasks` collection) |
| **操作** | 読み書き可能 |

**データ内容例**:
- 品物の送付情報（送付日・数量・賞味期限）
- 提供指示（カット方法・提供温度・申し送り）
- プリセット（よく使う指示の保存）
- タスク（賞味期限アラート等）

#### Flow C 詳細: 家族向け機能（『遠隔ケア・コックピット』）

> **詳細設計**: [HANDOVER.md](./HANDOVER.md) を参照

**解決する課題**:
| 課題 | 現状（FAX） | 解決策（アプリ） |
|------|------------|------------------|
| 指示の不透明さ | FAXを送っても実施確認できない | 写真付きエビデンスで実施確認 |
| 手書きの手間 | 詳細な指示を毎回手書き | プリセット機能で効率化 |
| 在庫管理 | 何がどれだけ残っているか不明 | 品物管理で可視化 |

**2つのビュー**:
| ビュー | パス | 説明 |
|--------|------|------|
| 家族ホーム | `/family` | タイムライン形式で1日の食事状況を確認 |
| エビデンス・モニター | `/family/evidence/:date` | Plan（指示）とResult（実績）を対比表示 |

**データ結合ロジック**:
```
Plan（Flow A/C）─┬─ targetDate    ─┐
                 ├─ mealTime      ─┼─→ JOIN → エビデンス対比表示
Result（Flow B）─┴─ menuName(opt) ─┘
```

### Flow D: AIチャット分析フロー (Phase 45)

**概要**: ケア記録に関する質問にAIが回答（RAG構成）

| 属性 | 値 |
|------|-----|
| **Role** | Read-Only AI Analysis |
| **データソース** | Firestore `plan_data`（Flow A同期データ） |
| **AIモデル** | Gemini 2.5 Flash (asia-northeast1) |
| **キャッシュ** | インメモリ（TTL 5分）で7秒短縮 |

**処理フロー**:
```
ユーザー質問 → キーワード抽出 → 関連レコード抽出（最大150-200件）
    ↓
重要レコード優先表示 → Gemini 2.5 Flash → 回答生成 + フォローアップ質問
```

**相関分析 (Phase 45.2/45.3)**:
- 頓服×排便: 頓服服用日を抽出し同日の排便記録と相関分析
- バイタル異常: 高血圧(140+)、発熱(37.5+)を自動検出
- Few-shot例でAI回答の一貫性向上

**キャッシュ戦略 (Phase 45.1)**:
- Cloud Functionsインスタンス内のインメモリキャッシュ
- TTL 5分でFirestoreクエリをスキップ
- ウォームインスタンスでのみ有効

### 階層的要約システム (Phase 46)

**目的**: 事前要約により RAG の効率・品質を大幅向上

#### 階層構造

```
レベル1: 月次サマリー（月末同期時に生成）
  └─ レベル2: 週次サマリー（週末同期時に生成）
       └─ レベル3: 日次サマリー（毎日同期時に生成）
            └─ レベル4: 生レコード（現状のplan_data）
```

| レベル | 生成タイミング | トークン数 | 内容例 |
|--------|---------------|-----------|--------|
| 月次 | 月末同期時 | ~500 | 「12月は頓服3回、全て排便あり。体重微減傾向」 |
| 週次 | 週末同期時 | ~300 | 「W51: バイタル安定、水分摂取量平均1.2L」 |
| 日次 | 毎日同期時 | ~150 | 「12/28: 頓服服用→翌日排便あり、食事摂取率80%」 |

#### 再帰的検索フロー

```
質問: 「頓服と排泄の関係は？」
  ↓
Step 1: 月次サマリーを検索 → 「12月は頓服3回...」（全体傾向把握）
  ↓
Step 2: 該当週のサマリーを検索 → 「W50: 頓服12/13...」（絞り込み）
  ↓
Step 3: 該当日の生レコードを取得 → 詳細データ（エビデンス）
  ↓
AIに渡すコンテキスト: 月次要約 + 関連週次要約 + 関連日次詳細
```

#### 期待効果

| 指標 | 現状（Phase 45） | 改善後（Phase 46） |
|------|-----------------|-------------------|
| RAGコンテキストサイズ | 150-200レコード（生データ） | 要約10件 + 詳細30件 |
| 長期トレンド分析 | 不可（直近データのみ） | **可能**（月次要約活用） |
| 応答精度 | 局所的 | 全体傾向 + 詳細 |

#### 要約生成AI

| 用途 | モデル | 理由 |
|------|--------|------|
| 日次要約 | Gemini 2.5 Flash Lite | 低コスト・高速 |
| 週次/月次要約 | Gemini 2.5 Flash | より高品質な要約 |

---

## 5. システム構成図

```mermaid
graph TD
    subgraph "Client Layer"
        APP[Mobile App<br/>Flutter/React Native]
    end

    subgraph "API Layer - Cloud Run functions"
        FUNC_SYNC[syncPlanData<br/>記録同期]
        FUNC_CARE[submitCareRecord<br/>実績入力]
        FUNC_ITEM[submitCareItem<br/>品物管理]
        FUNC_IMG[uploadCareImage<br/>画像連携]
    end

    subgraph "Data Layer"
        FS[(Cloud Firestore)]
        STORAGE[(Firebase Storage)]
    end

    subgraph "External Data Sources"
        SHEET_A[/"Sheet A (Read-Only)<br/>ID: ...DkfG-w<br/>【記録の結果/参照】"/]
        SHEET_B[/"Sheet B (Write-Only)<br/>ID: ...DGHV0<br/>【実績入力先】"/]
        BOT[Existing GAS Bot<br/>Google Chat通知]
    end

    %% Client to Functions (No Auth)
    APP -->|"POST (No Auth)"| FUNC_SYNC
    APP -->|"POST (No Auth)"| FUNC_CARE
    APP -->|"POST (No Auth)"| FUNC_ITEM
    APP -->|"POST (No Auth)"| FUNC_IMG

    %% Flow A: Read-Only Sync
    FUNC_SYNC -->|"Read Only"| SHEET_A
    FUNC_SYNC -->|"Upsert (洗い替え)"| FS

    %% Flow B: Write-Only Log
    FUNC_CARE -->|"Append Only"| SHEET_B
    SHEET_B -.->|"Trigger (重要フラグ検知)"| BOT

    %% Flow C: Item Management
    FUNC_ITEM -->|"Write"| FS

    %% Image Flow
    FUNC_IMG -->|"Upload"| STORAGE
    STORAGE -->|"Public URL"| FUNC_IMG
    FUNC_IMG -->|"メタデータ"| FS

    %% Styling
    classDef readonly fill:#e3f2fd,stroke:#1976d2
    classDef writeonly fill:#fff3e0,stroke:#f57c00
    classDef firestore fill:#e8f5e9,stroke:#388e3c

    class SHEET_A readonly
    class SHEET_B writeonly
    class FS firestore
```

---

## 6. データモデル

### Firestore Collections

#### `plan_data` (Flow A 同期先) - 汎用データモデル

> **注意**: 各シートのカラム構造が異なるため、固定スキーマではなく汎用データモデルを採用しています。

```typescript
interface PlanDataRecord {
  id: string;                    // ドキュメントID（sheetName_rowIndex形式）
  sheetName: string;             // 元シート名
  timestamp: string;             // 日時列（各シートの1列目）
  staffName: string;             // スタッフ名（検出された場合）
  residentName: string;          // 入居者名（検出された場合）
  data: Record<string, string>;  // 列名→値のマッピング（汎用データ）
  rawRow: string[];              // 元データ行（配列形式）
  syncedAt: Timestamp;           // 同期日時
}
```

**汎用データモデルの特徴**:
- `data` フィールドに各シートのヘッダー行を解析し、列名をキーとしたマップで保存
- シートごとに異なるカラム構造を柔軟に扱える
- フロントエンドでシート別にカラムを動的表示可能

**同期時のパース処理**:
1. 各シートの1行目をヘッダーとして取得
2. 2行目以降をデータ行として処理
3. ヘッダー名と値を `data` マップにマッピング
4. 共通フィールド (`timestamp`, `staffName`, `residentName`) を個別に抽出

#### Flow C コレクション

> **詳細**: [DATA_MODEL.md](./DATA_MODEL.md) を参照

**Firestoreコレクション構成**:
```
firestore/
├── careItems/                 # 品物管理（送付品）
│   └── {itemId}
├── presets/                   # プリセット（いつもの指示）
│   └── {presetId}
├── tasks/                     # タスク（賞味期限アラート等）
│   └── {taskId}
├── staffNotes/                # スタッフ注意事項
│   └── {noteId}
├── plan_data/                 # 同期済み記録データ（Flow A）
│   └── {recordId}
└── settings/                  # アプリ設定
    └── mealFormDefaults
```

---

## 7. 実装予定ファイル構成

```
src/
├── config/
│   └── sheets.ts              # スプレッドシートID・URL定数
├── functions/
│   ├── syncPlanData.ts        # Flow A: 記録同期
│   ├── submitCareRecord.ts    # Flow B: 実績入力
│   ├── submitCareItem.ts      # Flow C: 品物管理
│   ├── uploadCareImage.ts     # 画像アップロード
│   └── getCarePhotos.ts       # 写真取得（Phase 17）
├── services/
│   ├── sheetsService.ts       # Sheets API ラッパー
│   ├── firestoreService.ts    # Firestore ラッパー
│   └── storageService.ts      # Firebase Storage ラッパー（Phase 17）
└── types/
    └── index.ts               # 型定義

firestore.rules                 # セキュリティルール（Dev Mode: 全開放）
```

---

## 8. セキュリティルール (Dev Mode)

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // WARNING: Dev Mode - 本番環境では必ず認証を実装すること
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 9. 関連ドキュメント

### アクティブドキュメント（6ファイル）

| ドキュメント | 内容 |
|--------------|------|
| [HANDOVER.md](./HANDOVER.md) | **引き継ぎ・クイックスタート**（再開時に最初に読む） |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | システム設計（本ファイル） |
| [API_SPEC.md](./API_SPEC.md) | API仕様書（Dev Mode） |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | 業務ルール・Bot連携ハック |
| [DATA_MODEL.md](./DATA_MODEL.md) | データモデル定義 |
| [SETUP.md](./SETUP.md) | 環境セットアップガイド（CLI版） |

### 過去の仕様書

| ドキュメント | 内容 |
|--------------|------|
| [archive/SYNC_CONCURRENCY.md](./archive/SYNC_CONCURRENCY.md) | 同期処理の競合防止設計 |
| [archive/SHEET_B_STRUCTURE.md](./archive/SHEET_B_STRUCTURE.md) | Sheet B（書き込み先）構造 |

---

## 10. デモ版PWA仕様

### 10.1 概要

デモ版では**読み取り専用**のPWAを提供し、Sheet A（記録の結果）の全シートデータをモバイルで閲覧可能にする。

### 10.2 機能スコープ

| 機能 | デモ版 | 将来版 |
|------|--------|--------|
| シート閲覧（全11シート） | ✅ | ✅ |
| 1時間ごと自動同期 | ✅ | ✅ |
| 手動同期 | ✅ | ✅ |
| 実績入力（Sheet B書き込み） | ❌ | ✅ |
| 画像アップロード | ❌ | ✅ |
| 家族要望送信 | ❌ | ✅ |

### 10.3 同期仕様

| 項目 | 仕様 |
|------|------|
| 差分同期 | 1時間ごと（Cloud Scheduler）- 新規レコードのみ追加 |
| 完全同期 | 日次 午前3時（Cloud Scheduler）- 洗い替え |
| 手動更新 | Firestoreキャッシュ再取得のみ（**同期は行わない**） |
| 同期対象 | Sheet A 全11シート（13,603件） |
| 同期トリガー | **Cloud Schedulerのみ**（競合防止） |
| 重複防止 | **決定論的ドキュメントID**により原理的に排除 |

> **重要**: 同期処理の競合防止のため、`syncPlanData`はCloud Schedulerからのみ呼び出されます。
> - **差分同期**（1時間ごと）: 新規レコードのみ追加、削除なし（GASの更新間隔と整合）
> - **完全同期**（日次）: 洗い替えでデータ整合性担保
> - **コスト削減**: 月$144 → $5-15（90%以上削減）
> 詳細は [SYNC_CONCURRENCY.md](./archive/SYNC_CONCURRENCY.md) を参照。

#### データ取得戦略（遅延読み込み）

フロントエンドでの記録閲覧は、**年月単位の遅延読み込み**で効率化。

```
1. 初回アクセス: シート一覧 + 月別件数を取得（サマリーモード）
2. シート選択時: 選択年月のレコードのみ取得
3. 月変更時: 選択月のレコードをオンデマンド取得
```

**利点**:
- 1リクエストあたりのデータ量を抑制（月30〜100件程度）
- Firestoreクエリコスト最適化
- 初回表示の高速化

**API使用例**:
```http
# シート一覧と月別件数（初回）
GET /getPlanData

# 2024年12月のバイタルデータ（月選択時）
GET /getPlanData?sheetName=バイタル&year=2024&month=12
```

### 10.4 システム構成（デモ版）

```mermaid
graph LR
    subgraph "Scheduler"
        CS[Cloud Scheduler<br/>1時間間隔]
    end

    subgraph "Client"
        PWA[PWA<br/>React + Vite]
    end

    subgraph "Backend"
        CF_SYNC[syncPlanData]
        CF_GET[getPlanData]
    end

    subgraph "Data"
        SA[(Sheet A<br/>Read-Only)]
        FS[(Firestore)]
    end

    CS -->|"1時間ごと"| CF_SYNC
    CF_SYNC -->|"Read"| SA
    CF_SYNC -->|"Write"| FS
    PWA -->|"表示用"| CF_GET
    CF_GET -->|"Read"| FS
```

> **注**: PWAからsyncPlanDataへの直接呼び出しは廃止。Cloud Schedulerが唯一の同期トリガー。

### 10.5 PWA更新戦略

Service Workerによるキャッシュで、新バージョンが即座に反映されない問題に対応。

| 設定項目 | 値 | 説明 |
|----------|-----|------|
| `registerType` | `autoUpdate` | バックグラウンドで自動更新 |
| `skipWaiting` | `true` | 新SW即座にアクティブ化 |
| `clientsClaim` | `true` | 全タブを即座に制御 |

#### 更新フロー

1. **デプロイ**: 新しいアセット（JS/CSS）がFirebase Hostingにアップロード
2. **SW検知**: Service Workerが1分ごとに更新をチェック
3. **通知表示**: 更新があれば「新しいバージョンがあります」バナーを表示
4. **ユーザー操作**: 「更新」ボタンでリロード、または「後で」で延期

#### 関連ファイル

| ファイル | 役割 |
|----------|------|
| `vite.config.ts` | PWA設定（workbox） |
| `PWAUpdateNotification.tsx` | 更新通知UIコンポーネント |

### 10.6 廃棄指示フロー（Phase 49）

家族が期限切れ品物の廃棄をスタッフに依頼し、スタッフが完了を確認するフロー。

```mermaid
sequenceDiagram
    participant F as 家族
    participant App as アプリ
    participant S as スタッフ

    F->>App: 廃棄ボタン押下
    App->>App: status: pending_discard
    App-->>F: 「スタッフに通知中...」表示
    App-->>S: 家族依頼タブにバッジ表示

    S->>App: 注意事項ページを開く
    App-->>S: 家族依頼タブ（自動選択）
    App-->>S: 廃棄指示を目立つ色で表示

    S->>App: 廃棄完了ボタン押下
    App->>App: status: discarded
    App-->>F: 品物が一覧から消える
```

#### ステータス遷移

| ステータス | 説明 | 家族側表示 | スタッフ側表示 |
|------------|------|-----------|---------------|
| `pending` / `in_progress` | 期限切れ | 廃棄ボタン表示 | - |
| `pending_discard` | 廃棄指示中 | 「通知中...」表示 | 廃棄指示セクション |
| `discarded` | 廃棄完了 | 一覧から消える | 一覧から消える |

#### 関連ファイル

| ファイル | 役割 |
|----------|------|
| `ExpirationAlert.tsx` | 期限切れアラート（家族側） |
| `StaffNotesPage.tsx` | 注意事項ページ（スタッフ側） |
| `useCareItems.ts` | useRequestDiscard / useConfirmDiscard |

---

## 11. 開発状況

**Phase 1〜40 完了**

実装済み機能・パス一覧は [HANDOVER.md](./HANDOVER.md) を参照。

### 将来の機能（検討中）

| 機能 | 説明 |
|------|------|
| 週次レポート | Gemini AI による週次サマリー自動生成 |
| CSVエクスポート | 表示データのダウンロード |
