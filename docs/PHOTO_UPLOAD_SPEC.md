# 写真アップロード機能設計書

> **最終更新**: 2025年12月15日
>
> このドキュメントは写真アップロード機能の設計仕様を定義します。

---

## 概要

| 項目 | 値 |
|------|-----|
| **機能名** | 写真アップロード |
| **用途** | 食事記録フォームから画像をGoogle Driveに保存 |
| **保存先** | Google Drive（管理者指定フォルダ） |
| **フォルダ指定** | フォルダIDを管理者設定で指定可能 |

---

## 現在の実装状況

### 既存実装

| コンポーネント | ファイル | 状態 |
|---------------|----------|------|
| Drive APIサービス | `functions/src/services/driveService.ts` | 実装済み |
| アップロードAPI | `functions/src/functions/uploadCareImage.ts` | 実装済み |
| フォルダ設定 | `functions/src/config/sheets.ts` | ハードコード |

### 現在の問題点

1. **フォルダがハードコード**: `DRIVE_CONFIG.ROOT_FOLDER_NAME = "CareRecordImages"` でフォルダ名を定義
2. **フォルダ自動作成**: 存在しない場合は自動でフォルダを作成する仕組み
3. **任意のフォルダ指定不可**: 既存の共有フォルダを使用できない

---

## 要件

### 必須要件

1. **フォルダID指定**: Google DriveのフォルダIDを管理者が設定可能
2. **管理者設定UI**: `?admin=true` パラメータで設定画面にアクセス
3. **後方互換性**: フォルダID未設定時は既存の自動フォルダ作成を使用

### フォルダID取得方法

Google DriveのフォルダURLからフォルダIDを取得：

```
URL: https://drive.google.com/drive/folders/1ABC123xyz
フォルダID: 1ABC123xyz
```

---

## アーキテクチャ

### データフロー

```
┌─────────────────────────────────────────────────────────────┐
│                     管理者設定フロー                          │
└─────────────────────────────────────────────────────────────┘
[PWA: /input/meal?admin=true]
    │
    ├─→ GET /getMealFormSettings
    │     └─→ Firestore: settings/mealFormDefaults
    │           └─→ driveUploadFolderId を取得
    │
    └─→ POST /updateMealFormSettings?admin=true
          └─→ Firestore: settings/mealFormDefaults
                └─→ driveUploadFolderId を保存

┌─────────────────────────────────────────────────────────────┐
│                     写真アップロードフロー                     │
└─────────────────────────────────────────────────────────────┘
[PWA: 食事入力フォーム]
    │ 写真選択
    ↓
[POST /uploadCareImage (multipart/form-data)]
    │
    ├─→ Firestore: settings/mealFormDefaults を読み取り
    │     └─→ driveUploadFolderId を取得
    │
    ├─→ driveUploadFolderId が設定済み？
    │     │
    │     ├─ YES → 指定フォルダにアップロード
    │     │         └─→ Google Drive: {driveUploadFolderId}/{YYYY}/{MM}/{filename}
    │     │
    │     └─ NO  → 自動フォルダを使用（後方互換）
    │               └─→ Google Drive: CareRecordImages/{YYYY}/{MM}/{filename}
    │
    └─→ レスポンス: { fileId, publicUrl, thumbnailUrl }
```

### フォルダ構造

管理者がフォルダIDを指定した場合：

```
指定フォルダ/
├── 2025/
│   ├── 01/
│   │   ├── resident123_20250101_120000.jpg
│   │   └── resident456_20250101_143000.png
│   ├── 02/
│   │   └── ...
│   └── 12/
│       └── ...
```

フォルダID未指定時（後方互換）：

```
CareRecordImages/          ← 自動作成
├── 2025/
│   ├── 01/
│   │   └── ...
```

---

## 設定項目

### MealFormSettings 型定義（拡張）

```typescript
export interface MealFormSettings {
  // 既存フィールド
  defaultFacility: string;
  defaultResidentName: string;
  defaultDayServiceName: string;
  webhookUrl?: string;
  importantWebhookUrl?: string;

  // 追加フィールド
  driveUploadFolderId?: string;  // Google DriveフォルダID

  updatedAt: string;
}
```

### UpdateMealFormSettingsRequest 型定義（拡張）

```typescript
export interface UpdateMealFormSettingsRequest {
  // 既存フィールド
  defaultFacility?: string;
  defaultResidentName?: string;
  defaultDayServiceName?: string;
  webhookUrl?: string;
  importantWebhookUrl?: string;

  // 追加フィールド
  driveUploadFolderId?: string;
}
```

---

## API仕様

### GET /getMealFormSettings

レスポンスに `driveUploadFolderId` を追加：

```json
{
  "success": true,
  "data": {
    "defaultFacility": "あおぞら荘",
    "defaultResidentName": "山田 太郎",
    "defaultDayServiceName": "",
    "webhookUrl": "https://chat.googleapis.com/...",
    "importantWebhookUrl": "",
    "driveUploadFolderId": "1ABC123xyz",
    "updatedAt": "2025-12-15T02:30:00.000Z"
  },
  "timestamp": "..."
}
```

### POST /updateMealFormSettings?admin=true

リクエストボディに `driveUploadFolderId` を追加可能：

```json
{
  "driveUploadFolderId": "1ABC123xyz"
}
```

### POST /uploadCareImage

変更なし（内部でフォルダIDを取得して使用）

---

## 管理者設定UI

### MealSettingsModal.tsx 追加項目

| 項目 | ラベル | 入力タイプ | 説明 |
|------|--------|-----------|------|
| driveUploadFolderId | 写真保存先フォルダID | テキスト入力 | Google DriveのフォルダID |

### UI設計

```
┌──────────────────────────────────────────────┐
│           グローバル初期値設定                  │
│           [管理者]                            │
├──────────────────────────────────────────────┤
│                                              │
│  デフォルト施設                                │
│  ┌────────────────────────────────────────┐  │
│  │ あおぞら荘                              │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  デフォルト利用者名                            │
│  ┌────────────────────────────────────────┐  │
│  │ 山田 太郎                               │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  デフォルトデイサービス                        │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─────── Google Chat 通知設定 ───────        │
│                                              │
│  通常Webhook URL                             │
│  ┌────────────────────────────────────────┐  │
│  │ https://chat.googleapis.com/...        │  │
│  └────────────────────────────────────────┘  │
│  全ての食事記録を通知                          │
│                                              │
│  重要Webhook URL                             │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│  「重要」選択時のみ追加通知                     │
│                                              │
│  ─────── 写真アップロード設定 ───────         │
│                                              │
│  写真保存先フォルダID                          │
│  ┌────────────────────────────────────────┐  │
│  │ 1ABC123xyz                             │  │
│  └────────────────────────────────────────┘  │
│  Google DriveのフォルダURLからIDを取得         │
│  例: https://drive.google.com/drive/folders/ │
│       [ID] ← この部分                         │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │      クリア       │  │       保存       │ │
│  └──────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 実装ステップ

| Phase | 内容 | ファイル |
|-------|------|----------|
| 1 | 型定義拡張 | `functions/src/types/index.ts`, `frontend/src/types/index.ts` |
| 2 | 設定API拡張 | `functions/src/functions/mealFormSettings.ts` |
| 3 | driveService修正 | `functions/src/services/driveService.ts` |
| 4 | uploadCareImage修正 | `functions/src/functions/uploadCareImage.ts` |
| 5 | フロントエンド設定UI | `frontend/src/components/MealSettingsModal.tsx` |
| 6 | デプロイ・動作確認 | - |

---

## 権限要件

### サービスアカウント権限

写真アップロード機能が動作するには、サービスアカウントに以下の権限が必要：

| 権限 | 対象 | 説明 |
|------|------|------|
| Google Drive API | `drive.file` スコープ | ファイルアップロード・共有設定変更 |

### フォルダ共有設定

管理者が指定するフォルダは、サービスアカウントに**編集者**権限で共有が必要：

```
サービスアカウント: facility-care-sa@facility-care-input-form.iam.gserviceaccount.com
権限: 編集者
```

---

## エラーハンドリング

### フォルダID関連エラー

| エラーコード | 状況 | 対応 |
|-------------|------|------|
| `DRIVE_API_ERROR` | フォルダにアクセス権がない | 「指定されたフォルダにアクセスできません。サービスアカウントに編集者権限を付与してください。」 |
| `DRIVE_API_ERROR` | フォルダが存在しない | 「指定されたフォルダが見つかりません。フォルダIDを確認してください。」 |

### フォールバック

フォルダIDが設定されていても、アクセスに失敗した場合は自動フォルダを使用しない（エラーを返す）。
これにより、管理者が意図しないフォルダへの保存を防ぐ。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-15 | 初版作成（設計書） |
