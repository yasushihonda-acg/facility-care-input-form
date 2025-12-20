---
status: working
scope: ops
owner: core-team
last_reviewed: 2025-12-20
---

# Firebase Storage 移行設計書

> **作成日**: 2025年12月19日
> **最終更新**: 2025年12月19日
>
> **Phase**: 17（写真ストレージ移行）
>
> **ステータス**: ✅ 実装完了・本番デプロイ済み
>
> このドキュメントは、写真アップロード機能をGoogle DriveからFirebase Storageへ移行する設計仕様を定義します。

---

## 実装ステータス

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 17.1 | Firebase Storage基盤準備 | ✅ 完了 |
| Phase 17.2 | バックエンド - Storage移行 | ✅ 完了 |
| Phase 17.3 | バックエンド - 写真取得API | ✅ 完了 |
| Phase 17.4 | バックエンド - Webhook連携・型拡張 | ✅ 完了 |
| Phase 17.5 | バックエンド - クリーンアップ | ✅ 完了 |
| Phase 17.6 | フロントエンド実装 | ✅ 完了 |
| Phase 17.7 | ドキュメント更新 | ✅ 完了 |
| Phase 17.8 | テスト・デプロイ・本番確認 | ✅ 完了 |

---

## 1. 概要

### 1.1 移行理由

| 問題点 | 詳細 |
|--------|------|
| **Google Chat権限問題** | Google Driveの画像は権限設定（ログイン必須）の問題で、Google Chatでプレビュー画像が正しく表示されない |
| **複雑な権限設定** | サービスアカウントへのフォルダ共有、管理者によるフォルダID設定が必要 |
| **第1世代関数の制約** | Cloud Functions第1世代ではfirebase.jsonのSA指定が効かず、gcloudコマンドでの設定が必要 |

### 1.2 移行後のメリット

| メリット | 詳細 |
|----------|------|
| **公開URL** | Firebase Storageの公開URLはログイン不要でアクセス可能 |
| **Google Chat連携** | Webhook投稿にURLを含めればプレビュー画像が表示される |
| **設定簡素化** | 管理画面からDriveフォルダID設定が不要に |
| **Firebase統合** | 同一Firebase プロジェクト内で完結 |

### 1.3 重要な制約

| 制約 | 対応方針 |
|------|----------|
| **Sheet Bのカラム構造は変更不可** | 写真URLはSheet Bに保存しない |
| **写真メタデータはFirestoreに保存** | 新規コレクション `care_photos` を使用 |

---

## 2. 現状（Google Drive）

### 2.1 アーキテクチャ

```
[PWA: 食事入力フォーム]
    │ 写真選択
    ↓
[POST /uploadCareImage (multipart/form-data)]
    │
    ├─→ Firestore: settings/mealFormDefaults
    │     └─→ driveUploadFolderId を取得
    │
    └─→ Google Drive API
          └─→ {driveUploadFolderId}/{YYYY}/{MM}/{filename}
               │
               └─→ 公開設定 (role: reader, type: anyone)
                    │
                    └─→ URL返却: https://drive.google.com/uc?id={fileId}
```

### 2.2 関連ファイル

| ファイル | 役割 | 移行後 |
|----------|------|--------|
| `functions/src/services/driveService.ts` | Drive APIラッパー | **削除** |
| `functions/src/functions/uploadCareImage.ts` | アップロードAPI | **修正** |
| `functions/src/functions/testDriveAccess.ts` | Driveフォルダテスト | **削除** |
| `functions/src/functions/mealFormSettings.ts` | 設定API | **修正**（driveUploadFolderId削除）|
| `frontend/src/components/MealSettingsModal.tsx` | 設定UI | **修正**（Driveフォルダ設定削除）|

---

## 3. 移行後（Firebase Storage）

### 3.1 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                   写真アップロードフロー                       │
└─────────────────────────────────────────────────────────────┘

[PWA: 食事入力フォーム]
    │ 写真選択
    ↓
[POST /uploadCareImage (multipart/form-data)]
    │
    ├─→ Firebase Storage にアップロード
    │     └─→ gs://facility-care-input-form.appspot.com/
    │           └─→ care-photos/{YYYY}/{MM}/{residentId}_{timestamp}.jpg
    │
    ├─→ Firestore に写真メタデータ保存  ← ★ 新規
    │     └─→ care_photos/{documentId}
    │           └─→ { residentId, mealTime, date, photoUrl, ... }
    │
    └─→ レスポンス: { photoUrl, storagePath, photoId }


┌─────────────────────────────────────────────────────────────┐
│                   食事記録送信フロー                          │
└─────────────────────────────────────────────────────────────┘

[POST /submitMealRecord]
    │
    ├─→ Sheet B に書き込み（従来通り、写真URLなし）
    │
    ├─→ Google Chat Webhook 送信
    │     └─→ メッセージ本文 + 写真URL（photoUrlがある場合）
    │
    └─→ レスポンス: { success, postId }


┌─────────────────────────────────────────────────────────────┐
│                   家族閲覧フロー                              │
└─────────────────────────────────────────────────────────────┘

[PWA: 家族ダッシュボード / エビデンス・モニター]
    │
    └─→ Firestore クエリ: care_photos
          │ where residentId == X
          │ where date == Y
          │ where mealTime == Z
          │
          └─→ { photoUrl: "https://firebasestorage.googleapis.com/..." }
                │
                └─→ <img src={photoUrl} /> で実画像表示
```

### 3.2 Firebase Storage 構造

```
gs://facility-care-input-form.appspot.com/
└── care-photos/
    └── {YYYY}/
        └── {MM}/
            ├── resident123_20251219_120000_abc123.jpg
            ├── resident123_20251219_143000_def456.png
            └── ...
```

### 3.3 Firestore コレクション設計

**コレクション**: `care_photos`

```typescript
// Firestore: care_photos/{photoId}
interface CarePhoto {
  // 識別子
  photoId: string;          // ドキュメントID（自動生成）

  // 紐づけ情報
  residentId: string;       // 入居者ID
  date: string;             // 日付 (YYYY-MM-DD)
  mealTime: string;         // 食事タイミング (breakfast/lunch/dinner/snack)

  // 写真情報
  photoUrl: string;         // Firebase Storage 公開URL
  storagePath: string;      // Storage内のパス
  fileName: string;         // ファイル名
  mimeType: string;         // image/jpeg, image/png 等
  fileSize: number;         // バイト数

  // メタデータ
  staffId: string;          // アップロードしたスタッフID
  staffName?: string;       // スタッフ名（オプション）
  uploadedAt: string;       // アップロード日時 (ISO8601)

  // 将来拡張用
  postId?: string;          // 食事記録の投稿IDとの紐づけ（オプション）
}
```

**インデックス**:
```
care_photos: residentId + date + mealTime
```

### 3.4 公開URL形式

```
https://firebasestorage.googleapis.com/v0/b/facility-care-input-form.appspot.com/o/care-photos%2F2025%2F12%2Fresident123_20251219_120000_abc123.jpg?alt=media
```

---

## 4. Storage セキュリティルール

### 4.1 storage.rules（新規作成）

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // care-photos: 読み取りは公開、書き込みは認証済みまたはCloud Functions
    match /care-photos/{allPaths=**} {
      // 読み取り: 誰でも可能（Google Chat表示用、家族画面用）
      allow read: if true;

      // 書き込み: 開発モードでは全開放
      // 本番移行時は認証チェック追加
      allow write: if true;
    }
  }
}
```

> **注意**: 現在は開発モード（Dev Mode）のため全開放。本番移行時に認証ルールを実装。

---

## 5. API変更

### 5.1 uploadCareImage（修正）

**エンドポイント**: `POST /uploadCareImage`

**変更内容**:
- Google Drive → Firebase Storage に変更
- Firestore `care_photos` コレクションに写真メタデータを保存

**リクエスト（変更なし）**:
```
Content-Type: multipart/form-data

Fields:
- staffId: string (必須)
- residentId: string (必須)
- mealTime: string (オプション、デフォルト: snack)
- date: string (オプション、デフォルト: 今日)
- image: File (必須)
```

**レスポンス（拡張）**:
```json
{
  "success": true,
  "data": {
    "photoId": "abc123def456",
    "fileName": "resident123_20251219_120000_abc123.jpg",
    "photoUrl": "https://firebasestorage.googleapis.com/v0/b/.../o/care-photos%2F...",
    "storagePath": "care-photos/2025/12/resident123_20251219_120000_abc123.jpg"
  },
  "timestamp": "2025-12-19T12:00:00.000Z"
}
```

### 5.2 submitMealRecord（修正）

**変更内容**:
- リクエストに `photoUrl` フィールドを追加（オプション）
- Sheet B への書き込みは**変更なし**（写真URLは書き込まない）
- Google Chat Webhook メッセージに写真URLを追加

**リクエスト（拡張）**:
```typescript
interface SubmitMealRecordRequest {
  // ...既存フィールド（変更なし）...

  // Phase 17 追加
  photoUrl?: string;  // Firebase Storage 公開URL
}
```

**処理フロー**:
```
1. Sheet B に書き込み（従来通り、photoUrlは含めない）
2. Google Chat Webhook 送信（photoUrlがあればメッセージに追加）
3. レスポンス返却
```

### 5.3 Google Chat Webhook メッセージ拡張

**変更前**:
```
【七福の里_山田太郎様】
#食事🍚

記録者：スタッフA
...
【投稿ID】：MEL20251219120000123456
```

**変更後**:
```
【七福の里_山田太郎様】
#食事🍚

記録者：スタッフA
...
【投稿ID】：MEL20251219120000123456

📷 https://firebasestorage.googleapis.com/v0/b/.../o/care-photos%2F...
```

> Google Chatは画像URLを含むメッセージでプレビュー表示をサポート

### 5.4 getCarePhotos（新規API）

**エンドポイント**: `GET /getCarePhotos`

**用途**: 家族画面から写真を取得

**リクエスト**:
```
GET /getCarePhotos?residentId=xxx&date=2025-12-19&mealTime=lunch
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "photoId": "abc123",
        "photoUrl": "https://firebasestorage.googleapis.com/...",
        "mealTime": "lunch",
        "uploadedAt": "2025-12-19T12:00:00.000Z"
      }
    ]
  },
  "timestamp": "..."
}
```

---

## 6. フロントエンド変更

### 6.1 MealSettingsModal.tsx（修正）

**削除する項目**:
- 「写真保存先フォルダID」入力フィールド
- 「Google DriveのフォルダURLからIDを取得」ヘルプテキスト
- 「アクセステスト」ボタン

**UIイメージ（変更後）**:
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
│  ─────── Google Chat 通知設定 ───────        │
│                                              │
│  通常Webhook URL                             │
│  ┌────────────────────────────────────────┐  │
│  │ https://chat.googleapis.com/...        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  重要Webhook URL                             │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ℹ️ 写真は自動的に保存されます（設定不要）       │
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐ │
│  │      クリア       │  │       保存       │ │
│  └──────────────────┘  └──────────────────┘ │
└──────────────────────────────────────────────┘
```

### 6.2 EvidenceMonitor.tsx（修正）

**変更内容**:
- Firestore `care_photos` から写真URLを取得
- 実画像を表示

```tsx
// 写真取得フック（新規）
const { data: photos } = useCarePhotos({
  residentId,
  date,
  mealTime,
});

// 表示
{photos && photos.length > 0 ? (
  <img
    src={photos[0].photoUrl}
    alt="提供写真"
    data-testid="evidence-photo"
    className="w-full h-full object-cover"
    loading="lazy"
  />
) : (
  <div className="text-gray-400">
    <span className="text-5xl">📷</span>
    <p>写真なし</p>
  </div>
)}
```

### 6.3 MealInputPage.tsx（修正）

**変更内容**:
- 写真アップロード後、photoUrlを保持
- submitMealRecord 時に photoUrl を送信

```tsx
const [photoUrl, setPhotoUrl] = useState<string | null>(null);

// 写真アップロード成功時
const handlePhotoUpload = async (file: File) => {
  const result = await uploadCareImage({
    file,
    staffId,
    residentId,
    mealTime,
    date: today,
  });
  setPhotoUrl(result.photoUrl);
};

// 記録送信時
const handleSubmit = async () => {
  await submitMealRecord({
    ...formData,
    photoUrl, // Firebase Storage URL
  });
};
```

---

## 7. 削除対象

### 7.1 Cloud Functions

| 関数 | 理由 |
|------|------|
| `testDriveAccess` | Driveフォルダテスト不要 |

### 7.2 サービス

| ファイル | 理由 |
|----------|------|
| `functions/src/services/driveService.ts` | Drive API不要 |

### 7.3 設定項目

| 項目 | 理由 |
|------|------|
| `driveUploadFolderId` (Firestore settings) | フォルダ指定不要 |
| `DRIVE_CONFIG` (sheets.ts) | 不要 |

### 7.4 型定義

| 型/フィールド | 理由 |
|---------------|------|
| `MealFormSettings.driveUploadFolderId` | 不要 |
| `UpdateMealFormSettingsRequest.driveUploadFolderId` | 不要 |

---

## 8. Firebase CLI 設定

### 8.1 Storage有効化

```bash
# Firebase Storageを有効化（初回のみ）
firebase init storage

# storage.rules が作成される
```

### 8.2 firebase.json 更新

```json
{
  "storage": {
    "rules": "storage.rules"
  },
  "hosting": { ... },
  "functions": { ... },
  "firestore": { ... }
}
```

### 8.3 デプロイ

```bash
# Storageルールをデプロイ
firebase deploy --only storage

# Firestoreインデックス（care_photos用）
firebase deploy --only firestore:indexes
```

---

## 9. 実装ステップ

### Phase 17.1: 基盤準備

| # | タスク | ファイル | 確認方法 |
|---|--------|----------|----------|
| 1 | Firebase Storage有効化 | CLI | Firebaseコンソールで確認 |
| 2 | storage.rules作成 | `storage.rules` | ファイル存在確認 |
| 3 | firebase.json更新（storage追加） | `firebase.json` | storage設定追加確認 |
| 4 | firestore.indexes.json更新（care_photos追加） | `firestore.indexes.json` | インデックス追加確認 |
| 5 | Storageルールデプロイ | CLI | `firebase deploy --only storage` |
| 6 | Firestoreインデックスデプロイ | CLI | `firebase deploy --only firestore:indexes` |

### Phase 17.2: バックエンド - Storage移行

| # | タスク | ファイル |
|---|--------|----------|
| 1 | storageService.ts作成 | `functions/src/services/storageService.ts` |
| 2 | uploadCareImage修正（Drive→Storage） | `functions/src/functions/uploadCareImage.ts` |
| 3 | 型定義追加（CarePhoto, UploadCareImageResponse拡張） | `functions/src/types/index.ts` |
| 4 | ビルド確認 | `npm run build --prefix functions` |

### Phase 17.3: バックエンド - 写真取得API

| # | タスク | ファイル |
|---|--------|----------|
| 1 | getCarePhotos作成 | `functions/src/functions/getCarePhotos.ts` |
| 2 | index.tsにエクスポート追加 | `functions/src/index.ts` |

### Phase 17.4: バックエンド - Webhook連携・型拡張

| # | タスク | ファイル |
|---|--------|----------|
| 1 | SubmitMealRecordRequest に photoUrl追加 | `functions/src/types/index.ts` |
| 2 | MealRecordForChat型にphotoUrl追加 | `functions/src/types/index.ts` |
| 3 | googleChatService.ts修正（写真URL含む） | `functions/src/services/googleChatService.ts` |
| 4 | submitMealRecord修正（photoUrl受け取り→Webhook送信） | `functions/src/functions/submitMealRecord.ts` |

### Phase 17.5: バックエンド - クリーンアップ

| # | タスク | ファイル |
|---|--------|----------|
| 1 | driveService.ts削除 | `functions/src/services/driveService.ts` |
| 2 | testDriveAccess.ts削除 | `functions/src/functions/testDriveAccess.ts` |
| 3 | index.tsからtestDriveAccess export削除 | `functions/src/index.ts` |
| 4 | MealFormSettingsからdriveUploadFolderId削除 | `functions/src/types/index.ts` |
| 5 | UpdateMealFormSettingsRequestからdriveUploadFolderId削除 | `functions/src/types/index.ts` |
| 6 | sheets.tsからDRIVE_CONFIG削除 | `functions/src/config/sheets.ts` |
| 7 | mealFormSettings.ts修正（driveUploadFolderId処理削除） | `functions/src/functions/mealFormSettings.ts` |

### Phase 17.6: フロントエンド

| # | タスク | ファイル |
|---|--------|----------|
| 1 | 型定義追加（CarePhoto, UploadCareImageRequest/Response） | `frontend/src/types/index.ts` |
| 2 | SubmitMealRecordRequest に photoUrl追加 | `frontend/src/types/index.ts` |
| 3 | MealFormSettingsからdriveUploadFolderId削除 | `frontend/src/types/index.ts` |
| 4 | UpdateMealFormSettingsRequestからdriveUploadFolderId削除 | `frontend/src/types/index.ts` |
| 5 | uploadCareImage API関数追加 | `frontend/src/api/index.ts` |
| 6 | getCarePhotos API関数追加 | `frontend/src/api/index.ts` |
| 7 | testDriveAccess API関数削除 | `frontend/src/api/index.ts` |
| 8 | useCarePhotosフック作成 | `frontend/src/hooks/useCarePhotos.ts` |
| 9 | MealSettingsModal修正（Driveフォルダ設定削除） | `frontend/src/components/MealSettingsModal.tsx` |
| 10 | MealInputPage修正（写真アップロード→photoUrl送信） | `frontend/src/pages/MealInputPage.tsx` |
| 11 | EvidenceMonitor修正（Firestore から写真取得） | `frontend/src/pages/family/EvidenceMonitor.tsx` |

### Phase 17.7: ドキュメント更新

| # | タスク | ファイル |
|---|--------|----------|
| 1 | PHOTO_UPLOAD_SPEC.md更新（Firebase Storage対応） | `docs/PHOTO_UPLOAD_SPEC.md` |
| 2 | API_SPEC.md更新（getCarePhotos追加、testDriveAccess削除） | `docs/API_SPEC.md` |
| 3 | CLAUDE.md更新（Drive共有設定削除） | `CLAUDE.md` |
| 4 | SETTINGS_MODAL_UI_SPEC.md更新（Driveフォルダ設定削除） | `docs/SETTINGS_MODAL_UI_SPEC.md` |

### Phase 17.8: テスト・デプロイ

| # | タスク | 確認方法 |
|---|--------|----------|
| 1 | バックエンドビルド確認 | `npm run build --prefix functions` |
| 2 | バックエンドLint確認 | `npm run lint --prefix functions` |
| 3 | フロントエンドビルド確認 | `cd frontend && npm run build` |
| 4 | フロントエンドLint確認 | `cd frontend && npm run lint` |
| 5 | Functionsデプロイ | `firebase deploy --only functions` |
| 6 | Storageルールデプロイ | `firebase deploy --only storage` |
| 7 | Hostingデプロイ | `firebase deploy --only hosting` |
| 8 | 本番動作確認（写真アップロード） | 手動テスト |
| 9 | 本番動作確認（家族画面写真表示） | 手動テスト |
| 10 | 本番動作確認（Google Chat写真URL） | 手動テスト |
| 11 | E2Eテスト実行 | `npx playwright test` |

---

## 10. 後方互換性

### 10.1 既存データ

Google Driveにアップロード済みの画像は**そのまま残存**：
- 既存のURLは引き続きアクセス可能
- 新規アップロードのみFirebase Storageを使用
- Firestoreの `care_photos` コレクションは新規データのみ

### 10.2 移行不要

- 既存画像のマイグレーションは不要
- Sheet Bの構造変更なし
- 既存のFirestoreデータ変更なし

---

## 11. リスクと対策

| リスク | 対策 |
|--------|------|
| Storage料金 | 無料枠内（5GB）で十分。超過時は料金発生 |
| URL形式変更 | 新規アップロードのみ影響。既存は維持 |
| セキュリティ | storage.rulesで読み取りのみ公開 |
| Firestoreインデックス | 事前に作成しておく |

---

## 12. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-19 | 初版作成 |
| 2025-12-19 | Sheet B変更不可の制約を反映、Firestore保存に修正 |
