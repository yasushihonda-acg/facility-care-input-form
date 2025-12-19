# 写真エビデンス表示機能設計書

> **作成日**: 2025年12月19日
> **最終更新**: 2025年12月19日
>
> **Phase**: 16（デモ実装）→ Phase 17（本番実装）
>
> **関連**: [FIREBASE_STORAGE_MIGRATION_SPEC.md](./FIREBASE_STORAGE_MIGRATION_SPEC.md), [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md)

---

## 1. 概要

### 1.1 目的

スタッフがアップロードした写真を家族画面（エビデンス・モニター）で表示し、「指示通りに実施されたか」を写真で確認できるようにする。

### 1.2 実装状況

| 項目 | Phase 16（デモ） | Phase 17（本番） |
|------|------------------|------------------|
| 写真アップロード | Google Drive | Firebase Storage |
| 写真メタデータ保存 | なし | Firestore `care_photos` |
| 家族画面表示 | デモデータ（picsum.photos） | Firestoreから取得 |
| Google Chat連携 | なし | 写真URL含むメッセージ |

### 1.3 重要な制約

| 制約 | 対応方針 |
|------|----------|
| **Sheet Bのカラム構造は変更不可** | 写真URLはSheet Bに保存しない |
| **写真メタデータはFirestoreに保存** | `care_photos` コレクションを使用 |

---

## 2. データフロー

### 2.1 アップロード〜保存フロー（Phase 17）

```
┌─────────────────────────────────────────────────────────────┐
│                     スタッフ操作フロー                        │
└─────────────────────────────────────────────────────────────┘

[PWA: 食事入力フォーム]
    │
    ├─→ 1. 写真撮影/選択
    │     │
    │     └─→ POST /uploadCareImage
    │           ├─→ Firebase Storage にアップロード
    │           ├─→ Firestore care_photos にメタデータ保存
    │           └─→ レスポンス: { photoId, photoUrl, storagePath }
    │
    ├─→ 2. フォームに photoUrl をセット（state管理）
    │
    └─→ 3. 記録送信
          │
          └─→ POST /submitMealRecord (photoUrl 含む)
                ├─→ Sheet B に書き込み（※写真URLは含めない）
                └─→ Google Chat Webhook 送信（写真URL含む）
```

### 2.2 表示フロー

```
┌─────────────────────────────────────────────────────────────┐
│                     家族閲覧フロー                           │
└─────────────────────────────────────────────────────────────┘

[PWA: エビデンス・モニター]
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

---

## 3. Firestore スキーマ

### 3.1 care_photos コレクション

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

### 3.2 インデックス

```
care_photos: residentId + date + mealTime + uploadedAt(DESC)
```

---

## 4. API仕様

### 4.1 uploadCareImage（修正）

**エンドポイント**: `POST /uploadCareImage`

**リクエスト**:
```
Content-Type: multipart/form-data

Fields:
- staffId: string (必須)
- residentId: string (必須)
- mealTime: string (オプション、デフォルト: snack)
- date: string (オプション、デフォルト: 今日 YYYY-MM-DD)
- image: File (必須)
```

**レスポンス**:
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

### 4.2 getCarePhotos（新規）

**エンドポイント**: `GET /getCarePhotos`

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
        "uploadedAt": "2025-12-19T12:00:00.000Z",
        "staffName": "スタッフA"
      }
    ]
  },
  "timestamp": "..."
}
```

### 4.3 submitMealRecord（拡張）

**リクエスト追加フィールド**:
```typescript
interface SubmitMealRecordRequest {
  // ...既存フィールド（変更なし）...

  // Phase 17 追加
  photoUrl?: string;  // Firebase Storage 公開URL（Webhook送信用）
}
```

**処理**:
1. Sheet B に書き込み（photoUrlは**含めない**）
2. Google Chat Webhook 送信（photoUrlがあればメッセージに追加）
3. レスポンス返却

---

## 5. フロントエンド実装

### 5.1 EvidenceMonitor.tsx

**Phase 16（デモ）- 実装済み**:
```tsx
// デモデータから photoUrl を表示
{evidence.result.photoUrl.startsWith('http') ? (
  <img
    src={evidence.result.photoUrl}
    alt="提供直前の写真"
    data-testid="evidence-photo"
    className="w-full h-full object-cover"
    loading="lazy"
  />
) : null}
```

**Phase 17（本番）- 追加実装**:
```tsx
// Firestore から写真を取得
const { data: photos, isLoading } = useCarePhotos({
  residentId,
  date,
  mealTime,
});

// 表示
{isLoading ? (
  <div>読み込み中...</div>
) : photos && photos.length > 0 ? (
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

### 5.2 useCarePhotos フック（新規）

```typescript
// frontend/src/hooks/useCarePhotos.ts
import { useQuery } from '@tanstack/react-query';
import { getCarePhotos } from '../api';

interface UseCarePhotosParams {
  residentId: string;
  date: string;
  mealTime: string;
}

export function useCarePhotos({ residentId, date, mealTime }: UseCarePhotosParams) {
  return useQuery({
    queryKey: ['carePhotos', residentId, date, mealTime],
    queryFn: () => getCarePhotos({ residentId, date, mealTime }),
    enabled: !!residentId && !!date && !!mealTime,
  });
}
```

### 5.3 MealInputPage.tsx（修正）

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
    photoUrl, // Webhook送信用
  });
};
```

---

## 6. E2Eテスト

### 6.1 テストファイル

`frontend/e2e/photo-evidence.spec.ts`（Phase 16 実装済み）

### 6.2 テストケース

| ID | テスト内容 | 期待結果 | 状態 |
|----|-----------|----------|------|
| PHOTO-001 | エビデンス画面で写真が表示される | `<img>` タグが存在し、src属性にURLが設定 | ✅ Pass |
| PHOTO-002 | 写真がない場合はプレースホルダ表示 | 📷アイコンまたはメッセージ表示 | ✅ Pass |
| PHOTO-003 | 家族ダッシュボードから写真リンク機能 | エビデンス画面に遷移 | ✅ Pass |
| PHOTO-010 | 記録入力画面に写真アップロードUI | ファイル入力が存在 | ✅ Pass |
| PHOTO-011 | 写真を選択できる | ファイル選択可能 | ✅ Pass |

### 6.3 デモデータ

```typescript
// demoFamilyData.ts
photoUrl: 'https://picsum.photos/seed/kiwi/800/600',
```

---

## 7. 実装ステップ

### Phase 16（デモ）- 完了

| # | タスク | 状態 |
|---|--------|------|
| 1 | E2Eテスト作成 | ✅ 完了 |
| 2 | デモデータに実画像URL追加 | ✅ 完了 |
| 3 | EvidenceMonitor実画像表示 | ✅ 完了 |
| 4 | TimelineItemデモモード対応 | ✅ 完了 |
| 5 | App.tsxデモルート追加 | ✅ 完了 |

### Phase 17（本番）- 未着手

| # | タスク | ファイル |
|---|--------|----------|
| 1 | Firebase Storage移行 | [FIREBASE_STORAGE_MIGRATION_SPEC.md](./FIREBASE_STORAGE_MIGRATION_SPEC.md) 参照 |
| 2 | Firestore care_photos設計 | 同上 |
| 3 | getCarePhotos API | 同上 |
| 4 | useCarePhotosフック | 同上 |
| 5 | EvidenceMonitor本番対応 | 同上 |
| 6 | MealInputPage写真URL連携 | 同上 |
| 7 | Google Chat写真URL連携 | 同上 |

---

## 8. 注意事項

### 8.1 Sheet B変更禁止

**重要**: Sheet Bのカラム構造は変更してはいけません。写真URLは以下の方法で管理：

- **保存先**: Firestore `care_photos` コレクション
- **紐づけ**: residentId + date + mealTime でクエリ
- **Sheet B**: 写真URL列は追加しない

### 8.2 パフォーマンス

- `loading="lazy"` 属性で遅延読み込み
- 将来的に画像の圧縮・リサイズを検討

### 8.3 後方互換性

- `photoUrl` はオプショナルフィールド
- 写真なしの記録は従来通り動作
- デモモードは既存のpicsum.photos URLを継続使用

---

## 9. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-19 | 初版作成 |
| 2025-12-19 | Phase 16（デモ）実装完了 |
| 2025-12-19 | Sheet B変更禁止の制約を反映、Firestore保存に修正 |
