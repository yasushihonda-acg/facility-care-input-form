# Phase 29 Release Information

## Status
- phase.21.status: completed 2025-12-21, prod-deployed

## Purpose
- 内部チャット機能（スタッフ⇔家族間）を一時的に非表示化
- Google Chat Webhook（外部通知）は非表示対象外

## Code Changes

### FooterNav.tsx
- チャットタブ（家族・スタッフ両方）をコメントアウト
- MessageSquare アイコンのナビアイテムを非表示

### App.tsx
- チャット関連ルート10件をコメントアウト
- /chat/*, /family/chat/*, /staff/chat/* ルートを非表示

### ItemDetail.tsx
- 「スタッフにチャット」ボタン非表示

### FamilyMessageDetail.tsx
- 「家族とチャット」ボタン非表示

### FamilyDashboard.tsx / StaffHome.tsx
- NotificationSection コンポーネントを非表示（インポートはコメントアウト）

## E2E Tests
- chat-integration.spec.ts: 16件全てスキップ（test.describe.skip）
- record-chat-integration.spec.ts: 既存テストがスキップ
- 結果: 233件パス + 16件スキップ

## Design Document
- docs/CHAT_FEATURE_HIDE_SPEC.md

## Release Commit
- 78d2f38 feat(Phase 21): チャット機能一時非表示

## Restoration Guide
- CHAT_FEATURE_HIDE_SPEC.md セクション6 に復元手順を記載
- コメントアウトを解除するだけで復元可能
