# 写真エビデンス表示機能設計書

> **作成日**: 2025年12月19日
> **Phase**: 16
> **関連**: [PHOTO_UPLOAD_SPEC.md](./PHOTO_UPLOAD_SPEC.md), [FAMILY_UX_DESIGN.md](./FAMILY_UX_DESIGN.md)

---

## 1. 概要

### 1.1 目的

スタッフがアップロードした写真を家族画面（エビデンス・モニター）で表示し、「指示通りに実施されたか」を写真で確認できるようにする。

### 1.2 現状の問題

| 項目 | 現状 | 問題点 |
|------|------|--------|
| 写真アップロード | `uploadCareImage` API実装済み | ✅ 動作する |
| 食事記録 | `submitMealRecord` API実装済み | ❌ photoUrlフィールドがない |
| 家族画面 | `EvidenceMonitor.tsx` 実装済み | ❌ プレースホルダのみ表示 |

**根本原因**: 写真URLと食事記録が紐づいていない

### 1.3 解決策

```
[スタッフ]
1. 写真撮影 → uploadCareImage → publicUrl取得
2. 食事記録入力 → submitMealRecord(photoUrl含む) → Sheet B & Firestore保存

[家族]
3. エビデンス画面 → getPlanData/getMealRecords → photoUrl取得
4. photoUrlから実画像を表示
```

---

## 2. データフロー

### 2.1 アップロード〜保存フロー

```
┌─────────────────────────────────────────────────────────────┐
│                     スタッフ操作フロー                        │
└─────────────────────────────────────────────────────────────┘

[PWA: 食事入力フォーム]
    │
    ├─→ 1. 写真撮影/選択
    │     │
    │     └─→ POST /uploadCareImage
    │           ├─→ Google Drive にアップロード
    │           └─→ レスポンス: { publicUrl, thumbnailUrl, fileId }
    │
    ├─→ 2. フォームに photoUrl をセット（hidden or state）
    │
    └─→ 3. 記録送信
          │
          └─→ POST /submitMealRecord (photoUrl 含む)
                ├─→ Sheet B に書き込み（写真URL列追加）
                └─→ Firestore meal_records に保存（photoUrl含む）
```

### 2.2 表示フロー

```
┌─────────────────────────────────────────────────────────────┐
│                     家族閲覧フロー                           │
└─────────────────────────────────────────────────────────────┘

[PWA: エビデンス・モニター]
    │
    └─→ GET /getPlanData または Firestore クエリ
          │
          └─→ レスポンス: { ..., photoUrl: "https://drive.google.com/..." }
                │
                └─→ <img src={photoUrl} /> で実画像表示
```

---

## 3. API変更

### 3.1 SubmitMealRecordRequest 型拡張

```typescript
export interface SubmitMealRecordRequest {
  // ...既存フィールド...

  // === Phase 16: 写真エビデンス ===
  photoUrl?: string;      // Google Drive公開URL
  thumbnailUrl?: string;  // サムネイルURL（高速表示用）
}
```

### 3.2 Sheet B カラム追加

| 列 | 名前 | 内容 |
|----|------|------|
| (新規) | 写真URL | Google Drive公開URL |

**注意**: Sheet Bのカラム追加は既存のBot連携に影響しないよう、末尾に追加する

### 3.3 Firestore meal_records スキーマ

```typescript
// Firestore: meal_records/{recordId}
interface MealRecord {
  // ...既存フィールド...

  // Phase 16 追加
  photoUrl?: string;
  thumbnailUrl?: string;
}
```

---

## 4. フロントエンド変更

### 4.1 食事入力フォーム（MealInputPage.tsx）

```typescript
// 写真アップロード後の状態管理
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

// uploadCareImage 成功時
const handlePhotoUpload = async (file: File) => {
  const result = await uploadCareImage(file, staffId, residentId);
  setPhotoUrl(result.publicUrl);
  setThumbnailUrl(result.thumbnailUrl);
};

// submitMealRecord 時に photoUrl を含める
const handleSubmit = async () => {
  await submitMealRecord({
    ...formData,
    photoUrl,
    thumbnailUrl,
  });
};
```

### 4.2 エビデンス・モニター（EvidenceMonitor.tsx）

```tsx
// 現在（プレースホルダ）
{evidence.result.photoUrl && (
  <div className="...">
    <span className="text-5xl mb-2">📷</span>
    <p>（デモ用プレースホルダ）</p>
  </div>
)}

// Phase 16 後（実画像表示）
{evidence.result.photoUrl && (
  <div className="...">
    <img
      src={evidence.result.photoUrl}
      alt="提供写真"
      className="w-full h-full object-cover"
      loading="lazy"
    />
  </div>
)}
```

---

## 5. Google Drive 公開設定

### 5.1 現在の実装（driveService.ts）

`uploadImage` 関数内で、アップロード後に公開設定を行っている：

```typescript
// ファイルを公開設定（anyone with link can view）
await drive.permissions.create({
  fileId: file.data.id,
  requestBody: {
    role: 'reader',
    type: 'anyone',
  },
});
```

### 5.2 公開URL形式

```
https://drive.google.com/uc?id={fileId}&export=view
```

または

```
https://lh3.googleusercontent.com/d/{fileId}
```

**注意**: Google Driveの公開URLは直接`<img src>`で使用可能

---

## 6. 実装ステップ

| Phase | 内容 | ファイル |
|-------|------|----------|
| 16.1 | E2Eテスト作成（TDD） | `frontend/e2e/photo-evidence.spec.ts` |
| 16.2 | 型定義拡張 | `functions/src/types/index.ts`, `frontend/src/types/` |
| 16.3 | submitMealRecord拡張 | `functions/src/functions/submitMealRecord.ts` |
| 16.4 | フロントエンド - 写真URL送信 | `frontend/src/pages/MealInputPage.tsx` |
| 16.5 | フロントエンド - 実画像表示 | `frontend/src/pages/family/EvidenceMonitor.tsx` |
| 16.6 | E2Eテスト実行・修正 | - |
| 16.7 | 本番デプロイ | `firebase deploy` |
| 16.8 | 本番検証 | E2Eテスト on 本番URL |

---

## 7. E2Eテスト仕様

### 7.1 テストケース

| ID | テスト内容 | 期待結果 |
|----|-----------|----------|
| PHOTO-001 | エビデンス画面に写真が表示される | `<img>` タグが存在し、src属性にURLが設定されている |
| PHOTO-002 | 写真がない場合はプレースホルダ表示 | 📷アイコンが表示される |
| PHOTO-003 | 写真クリックで拡大表示（将来） | モーダルで大きく表示 |

### 7.2 デモデータ

テスト用にデモデータに`photoUrl`を追加：

```typescript
// demoFamilyData.ts
export const DEMO_EVIDENCE_DATA: EvidenceData = {
  // ...
  result: {
    // ...
    photoUrl: 'https://picsum.photos/800/600', // テスト用ダミー画像
  },
};
```

---

## 8. 注意事項

### 8.1 CORS

Google DriveのURLは直接`<img src>`で使用可能だが、一部のブラウザでCORSエラーが発生する可能性がある。その場合は：

1. `lh3.googleusercontent.com` 形式のURLを使用
2. または、Cloud Functions経由でプロキシ

### 8.2 パフォーマンス

- `thumbnailUrl` を使用して初期表示を高速化
- `loading="lazy"` 属性で遅延読み込み
- 将来的に画像の圧縮・リサイズを検討

### 8.3 後方互換性

- `photoUrl` はオプショナルフィールド
- 既存の記録（photoUrlなし）は従来通り動作

---

## 9. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-19 | 初版作成 |
