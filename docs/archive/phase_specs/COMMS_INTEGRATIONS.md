---
status: working
scope: integration
owner: core-team
last_reviewed: 2025-12-20
links:
  - docs/CHAT_INTEGRATION_SPEC.md
  - docs/AI_INTEGRATION_SPEC.md
  - docs/GOOGLE_CHAT_WEBHOOK_SPEC.md
  - docs/MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md
---

# コミュニケーション・連携機能

> **統合ドキュメント**: 本ドキュメントはコミュニケーション・外部連携機能を集約した概観ガイドです。

---

## 1. 概要

本プロジェクトにおける通知・チャット・AI連携機能の全体像を定義します。

### 機能一覧

| 機能 | 説明 | ステータス | 詳細仕様 |
|------|------|-----------|----------|
| **チャット連携** | スタッフ-家族間メッセージング | ✅ canonical | [CHAT_INTEGRATION_SPEC.md](./CHAT_INTEGRATION_SPEC.md) |
| **Google Chat Webhook** | 記録投稿時の通知送信 | working | [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) |
| **AI連携 (Gemini)** | 品物入力補助・レポート生成 | working | [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) |
| **品物×ケア統合分析** | MoEアーキテクチャ分析 | working | [MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md](./MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md) |

---

## 2. システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                    コミュニケーション層                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   チャット   │   │ Google Chat  │   │   AI連携    │        │
│  │  (Firestore) │   │  (Webhook)   │   │  (Gemini)   │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Cloud Functions (API)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Frontend (PWA)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. チャット連携

**詳細仕様**: [CHAT_INTEGRATION_SPEC.md](./CHAT_INTEGRATION_SPEC.md) ✅ 実装完了

### 3.1 機能概要

- スタッフ-家族間のリアルタイムメッセージング
- 未読バッジ表示
- ケア記録へのリンク機能

### 3.2 データモデル

```
Firestore: messages/{messageId}
├── content: string        // メッセージ本文
├── sender: 'staff' | 'family'
├── timestamp: Timestamp
├── readBy: string[]       // 既読ユーザーID
└── linkedRecordId?: string // 関連ケア記録ID
```

### 3.3 フッター表示

| ユーザー | タブ位置 | アイコン |
|----------|----------|----------|
| スタッフ | 5番目 | 💬 |
| 家族 | 4番目 | 💬 |

---

## 4. Google Chat Webhook

**詳細仕様**: [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md)

### 4.1 機能概要

- 食事記録投稿時に Google Chat スペースへ通知
- Webhook URL は設定画面から管理

### 4.2 通知フロー

```
[スタッフ入力] → [submitMealRecord API] → [Google Chat Webhook] → [通知投稿]
```

### 4.3 メッセージ形式

```
#食事🍚
入居者名: 蒲地様
日付:2025/12/20
時間帯: 昼食
主食: 10割
副食: 10割
...
```

---

## 5. AI連携 (Gemini)

**詳細仕様**: [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md)

### 5.1 機能一覧

| 機能 | 用途 | ステータス |
|------|------|-----------|
| `aiSuggest` | 品物入力時の補完提案 | working |
| `aiAnalyze` | 消費パターン分析 | 計画中 |
| `aiReport` | 週次レポート生成 | 計画中 |

### 5.2 技術スタック

- **モデル**: Gemini 1.5 Pro (Vertex AI)
- **リージョン**: asia-northeast1

### 5.3 FoodMaster連携

AI提案結果を `foodMaster` コレクションに自動蓄積し、再利用。

---

## 6. 品物×ケア統合分析

**詳細仕様**: [MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md](./MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md)

- MoE（Mixture of Experts）アーキテクチャ分析
- 品物消費とケア記録の相関分析（将来機能）

---

## 7. 権限・セキュリティ

| 機能 | 認証 | 認可 |
|------|------|------|
| チャット | Firestore Rules | 送信者ロール検証 |
| Webhook | 設定画面からURL管理 | 管理者のみ設定可 |
| AI連携 | サービスアカウント | API経由のみ |

---

## 8. 関連ドキュメント

- [CHAT_INTEGRATION_SPEC.md](./CHAT_INTEGRATION_SPEC.md) - チャット連携詳細
- [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) - Webhook詳細
- [AI_INTEGRATION_SPEC.md](./AI_INTEGRATION_SPEC.md) - AI連携詳細
- [MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md](./MOE_ANALYSIS_ITEM_CARE_INTEGRATION.md) - 統合分析

---

## 更新履歴

| 日付 | 変更内容 |
|------|----------|
| 2025-12-20 | 統合ドキュメント作成 |
