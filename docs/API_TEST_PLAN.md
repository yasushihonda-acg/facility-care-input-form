---
status: working
scope: test
owner: core-team
last_reviewed: 2025-12-20
---

# API テスト計画書（Firestore undefined エラー検証）

> **📌 統合ドキュメント**: 本文の要点は [TEST_STRATEGY.md](./TEST_STRATEGY.md) に統合されています。

> **作成日**: 2025年12月17日
> **目的**: オプショナルフィールドをundefinedで送信した場合のFirestoreエラー検証
> **実行環境**: 本番環境（安全に実行・クリーンアップ完了）

---

## 1. 背景

`submitCareItem` API で以下のエラーが発生:
```
Value for argument 'data' is not a valid Firestore document.
Cannot use 'undefined' as a Firestore value (found in field 'noteToStaff')
```

**修正**: `functions/src/index.ts` に `ignoreUndefinedProperties: true` を追加

## 2. テスト対象API

| API | リスクレベル | パターン | 備考 |
|-----|-------------|----------|------|
| submitCareItem | 高 | `undefined` 直接使用 | noteToStaff等 |
| createPreset | 高 | `\|\| undefined` | icon, servingDetail等 |
| createProhibition | 高 | `\|\| undefined` | category, reason |
| createTask | 低 | `\|\| null` | null変換済み |
| updateMealFormSettings | 低 | `??` + デフォルト | フォールバック済み |

## 3. テストケース

### 3.1 submitCareItem（必須フィールドのみ）

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/submitCareItem \
  -H "Content-Type: application/json" \
  -d '{
    "residentId": "test-resident-001",
    "userId": "test-user-001",
    "item": {
      "itemName": "テストバナナ",
      "category": "fruit",
      "sentDate": "2025-12-17",
      "quantity": 3,
      "unit": "本",
      "servingMethod": "as_is"
    }
  }'
```

**期待結果**: `{"success": true, "data": {"itemId": "...", "createdAt": "..."}}`

### 3.2 createPreset（必須フィールドのみ）

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/createPreset \
  -H "Content-Type: application/json" \
  -d '{
    "residentId": "test-resident-001",
    "userId": "test-user-001",
    "preset": {
      "name": "テストプリセット",
      "instruction": {
        "content": "テスト指示内容"
      }
    }
  }'
```

**期待結果**: `{"success": true, "data": {"presetId": "...", "createdAt": "..."}}`

### 3.3 createProhibition（必須フィールドのみ）

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/createProhibition \
  -H "Content-Type: application/json" \
  -d '{
    "residentId": "test-resident-001",
    "userId": "test-user-001",
    "prohibition": {
      "itemName": "テスト禁止品目"
    }
  }'
```

**期待結果**: `{"success": true, "data": {"prohibitionId": "...", "createdAt": "..."}}`

### 3.4 createTask（必須フィールドのみ）

```bash
curl -X POST \
  https://asia-northeast1-facility-care-input-form.cloudfunctions.net/createTask \
  -H "Content-Type: application/json" \
  -d '{
    "residentId": "test-resident-001",
    "title": "テストタスク",
    "dueDate": "2025-12-18",
    "priority": "medium"
  }'
```

**期待結果**: `{"success": true, "data": {"taskId": "...", "createdAt": "..."}}`

## 4. テスト結果

| テスト | 実行日時 | 結果 | 備考 |
|--------|----------|------|------|
| submitCareItem | 2025-12-17 11:13:11 | ✅ 成功 | itemId: qDvNFdus1NgO2z4Os1Kz |
| createPreset | 2025-12-17 11:13:25 | ✅ 成功 | presetId: SKu4oTeWHYMhWQCZBYzd |
| createProhibition | 2025-12-17 11:13:28 | ✅ 成功 | prohibitionId: ehCVxZSWWK6RJFJNiEuk |
| createTask | 2025-12-17 11:13:32 | ✅ 成功 | taskId: TSK1765970012550itzs9f |

### 検証結果

**全てのAPIがオプショナルフィールドを省略した状態で正常動作を確認。**

`ignoreUndefinedProperties: true` の設定により、undefined値がFirestoreに渡されても
エラーにならず、フィールド自体が省略された状態で保存される。

## 5. クリーンアップ

テスト後、作成されたテストデータを削除:

```bash
# 実行済み（2025-12-17 11:13:46-56）
curl -X DELETE ".../deleteCareItem?itemId=qDvNFdus1NgO2z4Os1Kz"      # ✅
curl -X DELETE ".../deletePreset?presetId=SKu4oTeWHYMhWQCZBYzd"      # ✅
curl -X DELETE ".../deleteProhibition?residentId=...&prohibitionId=ehCVxZSWWK6RJFJNiEuk"  # ✅
curl -X DELETE ".../deleteTask?taskId=TSK1765970012550itzs9f"         # ✅
```

## 6. 結論

`functions/src/index.ts` に追加した以下の設定により、
オプショナルフィールドが undefined の場合でも Firestore への書き込みが正常に動作する。

```typescript
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});
```

**影響範囲**: 全ての Firestore 書き込み API に適用されるため、
今後新しい API を追加する際も同様の問題は発生しない。

---

## 7. テスト実行の安全性

### 7.1 本番環境への影響

| 項目 | 内容 |
|------|------|
| 実行環境 | 本番 Firestore |
| テストデータ | 一時的に作成後、即座に削除 |
| 本番データへの影響 | なし（分離されたテストID使用） |

### 7.2 データ分離策

テストデータは本番データと明確に区別：

```json
{
  "residentId": "test-resident-api-001",
  "userId": "test-user-api-001",
  "itemName": "APIテストバナナ"
}
```

- `test-` プレフィックス付きID使用
- 実運用では存在しない入居者・ユーザーID
- テスト用であることが明確な日本語名称

### 7.3 クリーンアップ確認

全ての削除APIが `{"success": true}` を返却し、テストデータは完全に削除済み。

### 7.4 今後のテスト推奨方法

より安全なテスト実行のために：

1. **Firebase Emulator 使用**（推奨）
   ```bash
   firebase emulators:start --only functions,firestore
   # localhost:5001 に対してテスト実行
   ```

2. **E2E テスト活用**
   - Playwright でフロントエンドからテスト
   - デモモードはローカルシードデータを使用し、本番APIを呼ばない

3. **テスト専用コレクション**
   - `care_items_test` のような分離コレクションでテスト

---

## 8. 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [API_SPEC.md](./API_SPEC.md) | API仕様書（全エンドポイント） |
| [E2E_TEST_SPEC.md](./E2E_TEST_SPEC.md) | E2Eテスト仕様（フロントエンド） |
| [HANDOVER.md](./HANDOVER.md) | 引き継ぎドキュメント |
