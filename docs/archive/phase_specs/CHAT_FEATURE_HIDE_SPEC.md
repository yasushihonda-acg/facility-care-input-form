---
status: working
scope: feature-toggle
owner: core-team
last_reviewed: 2025-12-21
---

# チャット機能非表示化仕様書

> **目的**: スタッフ-家族間チャット機能を一時的に非表示化する

---

## 1. 対象範囲

### 1.1 非表示対象（内部チャット機能）

| コンポーネント/ファイル | 場所 | 非表示内容 |
|-------------------------|------|------------|
| **FooterNav.tsx** | 214-258行 (家族), 417-461行 (スタッフ) | チャットタブ全体 |
| **App.tsx** | ルート定義 | ChatListPage, ItemChatPage の10ルート |
| **ItemDetail.tsx** | 395-408行 | 「スタッフにチャット」ボタン |
| **FamilyMessageDetail.tsx** | 247-260行 | 「家族とチャット」ボタン |
| **NotificationSection.tsx** | 全体 | チャット通知セクション |
| **ChatListPage.tsx** | shared/ | チャット一覧ページ（ルート削除で対応） |
| **ItemChatPage.tsx** | shared/ | チャットページ（ルート削除で対応） |

### 1.2 非表示対象外（Google Chat Webhook - 外部通知）

以下は「Google Chat Webhook」機能であり、今回の非表示対象外：

| コンポーネント | 理由 |
|---------------|------|
| **MealSettingsModal.tsx** | Google Chat Webhook URL設定（外部通知） |
| **StaffRecordDialog.tsx** | 記録投稿時のWebhook送信（外部通知） |

---

## 2. 非表示化方針

### 2.1 実装方針

**アプローチ**: 条件付きレンダリング（フィーチャーフラグ不使用、直接コメントアウト）

理由:
- 一時的な非表示のため、シンプルなコメントアウトで対応
- 復元時に容易に戻せる
- 複雑なフィーチャーフラグシステムは不要

### 2.2 変更箇所詳細

#### 2.2.1 FooterNav.tsx

```tsx
// 家族用チャットタブ（214-258行付近）をコメントアウト
// {/* Phase 21: チャット機能一時非表示
//   <FooterTab ... />
// */}

// スタッフ用チャットタブ（417-461行付近）をコメントアウト
// {/* Phase 21: チャット機能一時非表示
//   <FooterTab ... />
// */}
```

#### 2.2.2 App.tsx

```tsx
// チャットルート（10件）をコメントアウト
// {/* Phase 21: チャット機能一時非表示
//   <Route path="/staff/chats" ... />
//   <Route path="/staff/chat/:id" ... />
//   ...
// */}
```

#### 2.2.3 ItemDetail.tsx

```tsx
// 「スタッフにチャット」ボタン（395-408行）をコメントアウト
// {/* Phase 21: チャット機能一時非表示
//   <Link to={...}>スタッフにチャット</Link>
// */}
```

#### 2.2.4 FamilyMessageDetail.tsx

```tsx
// 「家族とチャット」ボタン（247-260行）をコメントアウト
// {/* Phase 21: チャット機能一時非表示
//   <Link to={...}>家族とチャット</Link>
// */}
```

#### 2.2.5 NotificationSection.tsx

```tsx
// コンポーネント全体を条件付きで非表示化
// または呼び出し元でコンポーネントを使用しないよう変更
```

---

## 3. E2Eテスト対応

### 3.1 スキップ対象テスト

| テストファイル | テスト数 | 対応 |
|---------------|----------|------|
| chat-integration.spec.ts | 16件 | 全テストスキップ |
| record-chat-integration.spec.ts | 8件 | 全テストスキップ |
| footer-nav-demo.spec.ts | 一部 | getActiveChatItems関連テストをスキップ |

### 3.2 スキップ方法

```typescript
// chat-integration.spec.ts
test.describe.skip('Chat Integration Tests', () => {
  // Phase 21: チャット機能一時非表示のためスキップ
  ...
});

// record-chat-integration.spec.ts
test.describe.skip('Record Chat Integration Tests', () => {
  // Phase 21: チャット機能一時非表示のためスキップ
  ...
});
```

---

## 4. 実装手順

### Step 1: FooterNav.tsx のチャットタブ非表示
- 家族用チャットタブをコメントアウト
- スタッフ用チャットタブをコメントアウト
- getActiveChatItems API呼び出しをコメントアウト

### Step 2: App.tsx のルート非表示
- ChatListPage, ItemChatPage のimport文をコメントアウト
- 関連する10ルートをコメントアウト

### Step 3: ItemDetail.tsx のチャットボタン非表示
- 「スタッフにチャット」リンクをコメントアウト

### Step 4: FamilyMessageDetail.tsx のチャットボタン非表示
- 「家族とチャット」リンクをコメントアウト

### Step 5: NotificationSection.tsx の対応
- チャット通知の表示を無効化
- または呼び出し元での使用を停止

### Step 6: E2Eテストの調整
- chat-integration.spec.ts を全スキップ
- record-chat-integration.spec.ts を全スキップ
- footer-nav-demo.spec.ts の関連テストを調整

### Step 7: ビルド・動作確認
- `npm run build` でビルドエラーがないことを確認
- `npm run lint` でリントエラーがないことを確認
- E2Eテスト実行で残りのテストがパスすることを確認

---

## 5. 復元手順（将来）

チャット機能を再度有効化する場合：

1. 各ファイルの `Phase 21: チャット機能一時非表示` コメントを検索
2. コメントアウトを解除
3. E2Eテストの `test.describe.skip` を `test.describe` に戻す
4. ビルド・テスト実行

---

## 6. 影響範囲

### 6.1 ユーザー影響

| ユーザータイプ | 影響 |
|---------------|------|
| スタッフ | フッターからチャットタブが消える、品物詳細からチャットボタンが消える |
| 家族 | フッターからチャットタブが消える、品物詳細からチャットボタンが消える |
| 管理者 | 影響なし（Google Chat Webhook設定は維持） |

### 6.2 API影響

- `getActiveChatItems` API は呼び出されなくなる
- `sendMessage`, `getMessages` API は呼び出されなくなる
- API自体は削除せず、フロントエンドからの呼び出しを停止

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-21 | 初版作成（Phase 21: チャット機能非表示化） |
