# チャット連携機能 設計書

> **ステータス**: ✅ 実装完了（Phase 18 + Phase 19）
>
> **最終更新**: 2025年12月20日
>
> **方針**: 段階的実装 - Phase 18でチャット基本機能、Phase 19で記録連携
>
> **実装完了日**: 2025年12月20日（Phase 18.1〜18.5 + Phase 19.1〜19.4 全完了）

---

## 1. 概要

### 1.1 背景・目的

現在のシステムでは、スタッフの記録入力と家族への連絡が分離しています。
本機能により、**品物を中心としたチャット形式のコミュニケーション**を実現し、
スタッフと家族の双方向のやりとりをシームレスにします。

### 1.2 現在の課題

| 現状 | 問題点 |
|------|--------|
| 家族連絡が一方向 | スタッフ→家族のみ、返信できない |
| 品物に関するコミュニケーション手段がない | 質問・確認ができない |
| 情報が分散 | 記録・メッセージ・品物情報が別々のページ |
| 通知機能なし | 新着メッセージに気づきにくい |

### 1.3 ゴール

```
品物ごとのチャットスペースで、スタッフと家族が
双方向にやりとりでき、記録結果も時系列で確認可能
```

### 1.4 設計方針

- **記録入力は既存フローを維持** - MealInputPageなど既存のフォームで入力
- **チャットはメッセージ専用** - 品物に関する質問・確認・連絡のやりとり
- **記録結果は自動反映** - 定期同期などで記録がスレッドに表示される（Phase 19）
- **品物単位がスレッド** - 品物登録ごとにチャットスレッドが作られる
- **チャット一覧はアクティブのみ** - やりとりがあるスレッドのみ表示（視認性向上）
- **フッターにチャット追加** - 独立したビューとしてアクセス可能

---

## 2. 要件整理

### 2.1 機能要件

| # | 機能 | 説明 | 優先度 | Phase | 状態 |
|---|------|------|--------|-------|------|
| F1 | **チャット一覧** | アクティブなスレッドのみ表示 | 高 | 18 | ✅ 完了 |
| F2 | **品物チャットスペース** | 品物ごとにメッセージスレッド | 高 | 18 | ✅ 完了 |
| F3 | **双方向メッセージ** | スタッフ⇔家族の送受信 | 高 | 18 | ✅ 完了 |
| F4 | **チャット開始ボタン** | 品物詳細からチャットを開始 | 高 | 18 | ✅ 完了 |
| F5 | **通知バッジ（フッター）** | 未読メッセージ数を表示 | 中 | 18 | ✅ 完了 |
| F6 | **ホーム通知** | 新着メッセージをホームに表示 | 中 | 19 | ✅ 完了 |
| F7 | **記録の自動反映** | 提供記録がスレッドに自動表示 | 低 | 19 | ✅ 完了 |

**段階的実装の方針**:
- Phase 18: チャット機能の基本（一覧・送受信・通知バッジ）を優先 ✅ 完了
- Phase 19: ホーム通知・記録の自動反映 ✅ 完了

### 2.2 非機能要件

| # | 要件 | 説明 |
|---|------|------|
| N1 | リアルタイム性 | Firestore onSnapshot でリアルタイム更新 |
| N2 | デモモード対応 | 本番書き込みなしでデモ動作 |
| N3 | 後方互換性 | 既存の記録入力・API互換を維持 |

---

## 3. データモデル設計

### 3.1 新規コレクション: `messages`

品物ごとのメッセージスレッドを管理。

```typescript
// Firestore: residents/{residentId}/items/{itemId}/messages/{messageId}
interface Message {
  id: string;
  type: 'text' | 'record' | 'system';  // テキスト / 記録 / システム通知

  // 送信者情報
  senderType: 'staff' | 'family';
  senderName: string;

  // メッセージ内容
  content: string;                      // テキストメッセージ
  recordData?: SnackRecord;             // type='record'の場合の記録データ

  // メタデータ
  createdAt: Timestamp;
  readByStaff: boolean;
  readByFamily: boolean;

  // 関連データ（オプション）
  photoUrl?: string;
  linkedRecordId?: string;              // 関連する記録ID
}
```

### 3.2 既存コレクション拡張: `care_items`

チャット関連フィールドを追加。

```typescript
interface CareItem {
  // ... 既存フィールド ...

  // 追加フィールド（チャット関連）
  hasMessages: boolean;        // チャットが開始されているか（一覧表示フィルタ用）
  unreadCountStaff: number;    // スタッフ未読数
  unreadCountFamily: number;   // 家族未読数
  lastMessageAt?: Timestamp;   // 最終メッセージ日時
  lastMessagePreview?: string; // 最終メッセージのプレビュー（一覧表示用）
}
```

**チャット一覧の表示条件**: `hasMessages === true` の品物のみ表示

### 3.3 新規コレクション: `notifications`

ホーム画面用の通知管理。

```typescript
// Firestore: residents/{residentId}/notifications/{notificationId}
interface Notification {
  id: string;
  type: 'new_message' | 'record_added' | 'item_expiring';
  title: string;
  body: string;

  targetType: 'staff' | 'family' | 'both';
  read: boolean;

  // リンク先
  linkTo: string;  // e.g., '/staff/family-messages/item-123'

  createdAt: Timestamp;
}
```

---

## 4. UI/UX設計

### 4.1 フッター構成

#### スタッフ用（変更後）
```
┌────────────────────────────────────────┐
│  🏠      📋      💬      📊      ⚙️   │
│ ホーム  記録入力 チャット 統計   設定  │
│                  (3)                   │ ← 未読バッジ
└────────────────────────────────────────┘
```

#### 家族用（変更後）
```
┌────────────────────────────────────────┐
│  🏠      📦      💬      📋      📊   │
│ ホーム  品物管理 チャット 記録閲覧 統計│
│                  (2)                   │ ← 未読バッジ
└────────────────────────────────────────┘
```

---

### 4.2 チャット一覧（ChatListPage）

**アクティブなスレッドのみ表示**（`hasMessages === true`）

```
┌─────────────────────────────────────┐
│ ← 戻る      💬 チャット             │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🍇 黒豆（200g）           (2)  │ │  ← 未読2件
│ │ 家族: ありがとうございます！   │ │  ← 最新メッセージ
│ │                        1時間前 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🍊 みかん（5個）               │ │
│ │ 田中: 承知しました              │ │
│ │                          昨日  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ※やりとりがあるスレッドのみ表示    │
│                                     │
└─────────────────────────────────────┘
```

---

### 4.3 品物一覧のチャット開始ボタン

```
┌─────────────────────────────────────┐
│ 📦 品物管理                         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🍇 黒豆（200g）     [💬チャット]│ │  ← チャット開始/継続
│ │ 残り: 180g / 200g              │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🍎 りんご（3個）    [💬チャット]│ │
│ │ 残り: 2個 / 3個                │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🥝 キウイ（2個）    [💬チャット]│ │
│ │ 残り: 2個 / 2個                │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**動作**:
- チャット未開始 → ボタン押下でチャット画面へ遷移、最初のメッセージ送信で `hasMessages: true` に
- チャット開始済み → ボタン押下で既存のチャット画面へ遷移

---

### 4.4 品物チャットスペース（ItemChatPage）

```
┌─────────────────────────────────────┐
│ ← 戻る    黒豆（200g）              │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────┐        │
│  │ 📦 品物登録              │ 家族  │
│  │ 黒豆 200g 送りました     │ 12/15 │
│  │ 1日1粒ずつお願いします   │       │
│  └─────────────────────────┘        │
│                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐        │
│  │ 📝 提供記録（自動反映）  │ 12/16 │
│  │ 黒豆 1粒（完食 10/10）   │       │
│  │ 担当: 田中               │       │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        │
│                                     │
│  ┌─────────────────────────┐        │
│  │ ありがとうございます！   │ 家族  │
│  │ 引き続きよろしく...      │ 12/16 │
│  └─────────────────────────┘        │
│                                     │
│      ┌─────────────────────┐        │
│      │ 承知しました！       │ 田中  │
│      │                     │ 12/16 │
│      └─────────────────────┘        │
│                                     │
├─────────────────────────────────────┤
│ [メッセージを入力...]      [📷][送信]│
└─────────────────────────────────────┘
```

**ポイント**:
- 記録（点線枠）は既存フォームで入力後、自動的にスレッドに反映（Phase 19）
- メッセージ（実線枠）はスタッフ⇔家族の双方向やりとり
- 入力欄はメッセージ送信専用（記録入力は別ページ）

### 4.5 メッセージタイプ別表示

| type | 表示 | 説明 |
|------|------|------|
| `text` | 吹き出し（左右振り分け） | 通常のテキストメッセージ |
| `record` | カード形式（中央） | 提供記録（Phase 19で対応） |
| `system` | グレー背景（中央） | システム通知（期限警告等） |

### 4.6 ホーム通知

```
┌─────────────────────────────────────┐
│ 🔔 新着通知                         │
├─────────────────────────────────────┤
│ 💬 黒豆について新しいメッセージ     │
│    家族: ありがとうございます！     │
│                            1時間前  │
├─────────────────────────────────────┤
│ 📝 みかんの提供記録が追加されました │
│    スタッフ: 田中                   │
│                            2時間前  │
└─────────────────────────────────────┘
```

---

## 5. 段階的実装計画

### 実装の優先順位

```
Phase 18: チャット機能の基本（優先）
├── 18.1: データモデル・API基盤
├── 18.2: チャットUI基盤
├── 18.3: 通知システム
├── 18.4: 家族側チャット連携
└── 18.5: デモモード対応・E2Eテスト

Phase 19: 記録のチャット連携 ✅ 完了
├── 19.1: バックエンド - submitMealRecord拡張 ✅
├── 19.2: フロントエンド - RecordMessageCard ✅
├── 19.3: フロントエンド - ホーム通知セクション ✅
└── 19.4: E2Eテスト・デプロイ ✅
```

---

### Phase 18.1: データモデル・API基盤（バックエンド）

| # | タスク | 成果物 |
|---|--------|--------|
| 1 | `messages` コレクション設計 | Firestore構造 |
| 2 | メッセージCRUD API | `sendMessage`, `getMessages`, `markAsRead` |
| 3 | 未読カウント管理 | Cloud Functions トリガー |
| 4 | 通知API | `getNotifications`, `markNotificationRead` |

**推定工数**: 4-6時間

---

### Phase 18.2: チャットUI基盤（フロントエンド）

| # | タスク | 成果物 |
|---|--------|--------|
| 1 | `ChatListPage` ページ | **チャット一覧画面（NEW）** |
| 2 | `ChatSpace` コンポーネント | メッセージ表示・入力UI |
| 3 | `MessageBubble` コンポーネント | タイプ別メッセージ表示 |
| 4 | `useChatMessages` フック | リアルタイムメッセージ取得 |
| 5 | `ItemChatPage` ページ | 品物チャット画面 |
| 6 | 品物一覧にチャットボタン追加 | `FamilyMessages`/`ItemList` 改修 |

**推定工数**: 8-10時間

---

### Phase 18.3: 通知システム

| # | タスク | 成果物 |
|---|--------|--------|
| 1 | **フッターにチャットアイコン追加** | `FooterNav` 改修（💬アイコン追加） |
| 2 | フッターバッジ表示 | 未読数バッジ表示 |
| 3 | ホーム通知セクション | `NotificationList` |
| 4 | 未読管理ロジック | `useUnreadCount` フック |
| 5 | 通知生成トリガー | Cloud Functions |

**推定工数**: 4-5時間

---

### Phase 18.4: 家族側チャット連携

| # | タスク | 成果物 |
|---|--------|--------|
| 1 | 家族用チャット画面 | `ItemDetail` 拡張 |
| 2 | 家族→スタッフ送信 | 送信UI・API連携 |
| 3 | 家族側通知 | `FamilyDashboard` 改修 |
| 4 | 双方向リアルタイム同期 | onSnapshot設定 |

**推定工数**: 4-5時間

---

### Phase 18.5: デモモード対応・E2Eテスト

| # | タスク | 成果物 |
|---|--------|--------|
| 1 | デモ用チャットデータ | `demoChatMessages.ts` |
| 2 | デモモード判定 | 書き込み安全対策 |
| 3 | E2Eテスト | `chat-integration.spec.ts` |
| 4 | ドキュメント更新 | 各種仕様書更新 |

**推定工数**: 3-4時間

---

### Phase 18 合計工数

| Phase | 内容 | 工数 |
|-------|------|------|
| 18.1 | データモデル・API基盤 | 4-6h |
| 18.2 | チャットUI基盤（ChatListPage含む） | 8-10h |
| 18.3 | 通知システム（フッター改修含む） | 4-5h |
| 18.4 | 家族側チャット連携 | 4-5h |
| 18.5 | デモモード対応・テスト | 3-4h |
| **合計** | | **23-30h** |

---

## 6. Phase 19: 記録のチャット連携（実装完了）

> **ステータス**: ✅ 実装完了（2025年12月20日）

### Phase 19.1: 記録の自動反映（バックエンド）

| # | タスク | 成果物 |
|---|--------|--------|
| 1 | 記録→メッセージ自動変換 | `submitMealRecord` 拡張 |
| 2 | 記録カード表示 | `RecordMessageCard` |
| 3 | 既存記録の同期 | 過去データのマイグレーション |

**仕組み**:
```
1. スタッフがMealInputPage等で記録を入力
   ↓
2. submitMealRecord API が呼ばれる
   ↓
3. Sheet B への書き込み（既存処理）
   ↓
4. 【新規】該当品物のmessagesコレクションに
   type='record' のメッセージを自動作成
   ↓
5. 家族・スタッフがチャットスレッドで記録を確認可能
```

**課題（要検討）**:
- itemId特定: 記録時に「どの品物に対する記録か」を紐付ける方法
- 過去データ: 既存の記録をどこまで遡って反映するか
- パフォーマンス: リアルタイムか、バッチ処理か

**推定工数**: 4-6時間（設計含む）

---

## 7. ルーティング設計

### 7.1 スタッフ用

| パス | ページ | 説明 |
|------|--------|------|
| `/staff` | StaffHome | スタッフホーム（通知表示） |
| `/staff/chats` | **ChatListPage** | **チャット一覧（NEW）** |
| `/staff/family-messages` | FamilyMessages | 家族連絡一覧（品物一覧） |
| `/staff/family-messages/:itemId` | FamilyMessageDetail | 品物詳細 |
| `/staff/family-messages/:itemId/chat` | ItemChatPage | 品物チャット |

### 7.2 家族用

| パス | ページ | 説明 |
|------|--------|------|
| `/family` | FamilyDashboard | 家族ホーム（通知表示） |
| `/family/chats` | **ChatListPage** | **チャット一覧（NEW）** |
| `/family/items/:itemId` | ItemDetail | 品物詳細 |
| `/family/items/:itemId/chat` | ItemChatPage | 品物チャット |

### 7.3 デモ用

| パス | 説明 |
|------|------|
| `/demo/staff/chats` | **スタッフ用デモチャット一覧（NEW）** |
| `/demo/family/chats` | **家族用デモチャット一覧（NEW）** |
| `/demo/staff/family-messages/:itemId/chat` | スタッフ用デモチャット |
| `/demo/family/items/:itemId/chat` | 家族用デモチャット |

---

## 8. API設計

### 8.1 メッセージAPI

#### `POST /sendMessage`

```typescript
// Request
{
  residentId: string;
  itemId: string;
  senderType: 'staff' | 'family';
  senderName: string;
  content: string;
  type: 'text' | 'record';
  recordData?: SnackRecord;
  photoUrl?: string;
}

// Response
{
  success: true;
  data: { messageId: string };
}
```

#### `GET /getMessages`

```typescript
// Query params
?residentId=xxx&itemId=yyy&limit=50&before=timestamp

// Response
{
  success: true;
  data: {
    messages: Message[];
    hasMore: boolean;
  };
}
```

#### `POST /markAsRead`

```typescript
// Request
{
  residentId: string;
  itemId: string;
  readerType: 'staff' | 'family';
}

// Response
{
  success: true;
}
```

### 8.2 通知API

#### `GET /getNotifications`

```typescript
// Query params
?residentId=xxx&targetType=staff&limit=20

// Response
{
  success: true;
  data: {
    notifications: Notification[];
    unreadCount: number;
  };
}
```

---

## 9. 技術的考慮事項

### 9.1 リアルタイム同期

```typescript
// Firestore onSnapshot でリアルタイム更新
const unsubscribe = onSnapshot(
  query(
    collection(db, `residents/${residentId}/items/${itemId}/messages`),
    orderBy('createdAt', 'desc'),
    limit(50)
  ),
  (snapshot) => {
    const messages = snapshot.docs.map(doc => doc.data());
    setMessages(messages);
  }
);
```

### 9.2 未読カウント管理

Cloud Functions トリガーで自動更新:

```typescript
// メッセージ作成時に未読カウントを更新
exports.onMessageCreated = functions.firestore
  .document('residents/{residentId}/items/{itemId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { residentId, itemId } = context.params;

    // 送信者と反対側の未読カウントを増加
    const field = message.senderType === 'staff'
      ? 'unreadCountFamily'
      : 'unreadCountStaff';

    await db.doc(`residents/${residentId}/items/${itemId}`)
      .update({ [field]: FieldValue.increment(1) });
  });
```

### 9.3 パフォーマンス

| 対策 | 説明 |
|------|------|
| ページネーション | 50件ずつ取得、スクロールで追加読み込み |
| インデックス | `messages` に `createdAt` インデックス |
| キャッシュ | TanStack Query でキャッシュ管理 |

---

## 10. 既存機能への影響

### 10.1 変更が必要なファイル（Phase 18）

| ファイル | 変更内容 |
|----------|----------|
| `FamilyMessageDetail.tsx` | チャットへのリンク追加 |
| `ItemDetail.tsx` | チャットへのリンク追加 |
| `FooterNav.tsx` | バッジ表示追加 |
| `StaffHome.tsx` | 通知セクション追加 |
| `FamilyDashboard.tsx` | 通知セクション追加 |

### 10.2 Phase 19 で変更したファイル（実装完了）

| ファイル | 変更内容 |
|----------|----------|
| `functions/src/functions/submitMealRecord.ts` | 記録保存時にtype='record'メッセージ自動作成 |
| `frontend/src/pages/shared/ItemChatPage.tsx` | RecordMessageCard追加（type='record'カード表示） |
| `frontend/src/components/shared/NotificationSection.tsx` | ホーム通知セクション（新規） |
| `frontend/src/pages/staff/StaffHome.tsx` | 通知セクション追加 |
| `frontend/src/pages/family/FamilyDashboard.tsx` | 通知セクション追加 |
| `frontend/src/types/chat.ts` | recordData型にnoteToFamily等追加 |
| `frontend/e2e/record-chat-integration.spec.ts` | E2Eテスト8件（新規） |

### 10.3 後方互換性

- Phase 18では既存APIに変更なし（新規API追加のみ）
- 既存の記録入力フロー（MealInputPage等）はそのまま使用
- チャット機能は既存機能と独立して動作

---

## 11. 次のステップ

1. **本設計書のレビュー・承認**
2. **Phase 18.1 から段階的に実装開始**
3. **各Phase完了時にE2Eテスト・動作確認**
4. **CURRENT_STATUS.md 更新**

---

## 付録: ワイヤーフレーム詳細

### A. スタッフ用 家族連絡一覧（改修後）

```
┌─────────────────────────────────────┐
│ ← 戻る      家族からの連絡          │
├─────────────────────────────────────┤
│ [すべて] [在庫あり] [期限注意] [完了]│
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🍇 黒豆            💬 2        │ │  ← 未読バッジ
│ │ 残り: 180g / 200g              │ │
│ │ 「ありがとうございます！」     │ │  ← 最新メッセージプレビュー
│ │                       12/16    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🍊 みかん                      │ │
│ │ 残り: 3個 / 5個                │ │
│ │                       12/15    │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### B. 品物チャット画面

```
┌─────────────────────────────────────┐
│ ← 戻る    黒豆（200g）              │
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────┐      │
│  │ 📦 品物を送りました        │ 家族 │
│  │ 黒豆 200g                  │      │
│  │ 1日1粒ずつお願いします     │ 12/15│
│  └───────────────────────────┘      │
│                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐      │
│  │ 📝 提供記録（自動反映）     │      │
│  │ 黒豆 1粒（完食 10/10）      │      │
│  │ 担当: 田中                  │ 12/16│
│  │ [写真]                      │      │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘      │
│                                     │
│  ┌───────────────────────────┐      │
│  │ ありがとうございます！     │ 家族 │
│  │ 引き続きよろしくお願いし   │      │
│  │ ます。                     │ 12/16│
│  └───────────────────────────┘      │
│                                     │
│      ┌───────────────────────┐      │
│      │ 承知しました！         │ 田中 │
│      │ 明日も同様に提供       │      │
│      │ いたします。           │ 12/16│
│      └───────────────────────┘      │
│                                     │
├─────────────────────────────────────┤
│ [メッセージを入力...]      [📷][➤] │
└─────────────────────────────────────┘
```

**凡例**:
- 実線枠: メッセージ（スタッフ⇔家族の双方向やりとり）
- 点線枠: 提供記録（既存フォームで入力後、自動的にスレッドに反映）

---

## 12. 実装サマリー（Phase 18 完了）

> **実装日**: 2025年12月19日
>
> **デプロイ**: GitHub Actions CI/CD経由、本番反映済み

### 12.1 実装完了項目

| Sub-Phase | 内容 | 状態 |
|-----------|------|------|
| 18.1 | データモデル・API基盤 | ✅ 完了 |
| 18.2 | チャットUI基盤（ChatListPage, ItemChatPage） | ✅ 完了 |
| 18.3 | 通知システム（フッターにチャットタブ追加） | ✅ 完了 |
| 18.4 | 家族側チャット連携（品物詳細からチャットリンク） | ✅ 完了 |
| 18.5 | デモモード対応・E2Eテスト | ✅ 完了 |

### 12.2 実装ファイル一覧

#### バックエンド（Cloud Functions）

| ファイル | 内容 |
|----------|------|
| `functions/src/types/index.ts` | チャット関連型定義追加（ChatMessage, ChatNotification等） |
| `functions/src/functions/chat.ts` | チャットAPI 5関数（新規） |
| `functions/src/index.ts` | チャットAPIエクスポート追加 |

#### フロントエンド（React）

| ファイル | 内容 |
|----------|------|
| `frontend/src/types/chat.ts` | チャット型定義（新規） |
| `frontend/src/types/index.ts` | チャット型エクスポート追加 |
| `frontend/src/api/index.ts` | チャットAPI関数追加、getCareItem追加 |
| `frontend/src/pages/shared/ChatListPage.tsx` | チャット一覧ページ（新規） |
| `frontend/src/pages/shared/ItemChatPage.tsx` | 品物チャットページ（新規） |
| `frontend/src/components/FooterNav.tsx` | チャットタブ追加（未読バッジ付き） |
| `frontend/src/pages/family/ItemDetail.tsx` | 「スタッフにチャット」リンク追加 |
| `frontend/src/pages/staff/FamilyMessageDetail.tsx` | 「家族とチャット」リンク追加 |
| `frontend/src/App.tsx` | チャット関連ルート追加 |

#### テスト

| ファイル | 内容 |
|----------|------|
| `frontend/e2e/chat-integration.spec.ts` | E2Eテスト 8件（新規） |

### 12.3 API一覧

| 関数名 | HTTPメソッド | 説明 |
|--------|--------------|------|
| `sendMessage` | POST | メッセージ送信 |
| `getMessages` | GET | メッセージ取得（品物ID指定） |
| `markAsRead` | POST | 既読マーク（スタッフ/家族別） |
| `getNotifications` | GET | 通知一覧取得 |
| `getActiveChatItems` | GET | アクティブチャット一覧取得 |

### 12.4 ルーティング

| パス | コンポーネント | 説明 |
|------|----------------|------|
| `/staff/chats` | ChatListPage | スタッフ用チャット一覧 |
| `/staff/chat/:id` | ItemChatPage | スタッフ用品物チャット |
| `/family/chats` | ChatListPage | 家族用チャット一覧 |
| `/family/chat/:id` | ItemChatPage | 家族用品物チャット |
| `/demo/staff/chats` | ChatListPage | デモ：スタッフ用チャット一覧 |
| `/demo/staff/chat/:id` | ItemChatPage | デモ：スタッフ用品物チャット |
| `/demo/family/chats` | ChatListPage | デモ：家族用チャット一覧 |
| `/demo/family/chat/:id` | ItemChatPage | デモ：家族用品物チャット |

### 12.5 フッター構成（実装後）

#### スタッフ用
```
[記録閲覧] [記録入力] [チャット] [家族連絡] [統計]
                         ↑
                    未読バッジ付き
```

#### 家族用
```
[ホーム] [品物管理] [チャット] [記録閲覧] [統計]
                       ↑
                  未読バッジ付き
```

### 12.6 Phase 19 実装完了

| # | 機能 | 説明 | 状態 |
|---|------|------|------|
| F6 | ホーム通知 | 新着メッセージ・記録をホームに表示 | ✅ 完了 |
| F7 | 記録の自動反映 | 提供記録がスレッドに自動表示 | ✅ 完了 |

**E2Eテスト追加**: `record-chat-integration.spec.ts`（8件）
- RECORD-CHAT-001〜002: 記録カード表示
- RECORD-CHAT-003〜005: ホーム通知
- RECORD-CHAT-006〜007: スタイル検証
- RECORD-CHAT-008: デモモード対応

---

**関連ドキュメント**:
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 進捗管理
- [HANDOVER.md](./HANDOVER.md) - 引き継ぎドキュメント
- [API_SPEC.md](./API_SPEC.md) - API仕様書
