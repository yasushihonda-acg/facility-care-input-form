# Phase 20.1 Release Information

## Status
- phase.20.1.status: completed 2025-12-20, prod-verified

## Problem Fixed
- デモモード（/demo/*）でのAPI 500エラーを修正
- getActiveChatItems, getNotifications が Firestore 複合インデックス未定義で500エラー

## Root Causes
1. FooterNav.tsx: デモモードでもAPIを呼び出していた
2. NotificationSection.tsx: デモモードでもAPIを呼び出していた
3. Firestore: 複合インデックス未定義

## Code Changes

### FooterNav.tsx
- lines 78-126: isDemoMode判定追加
- デモモードではダミーデータ（familyUnreadCount=2, staffUnreadCount=1）を使用

### NotificationSection.tsx
- lines 38-91: isDemo判定追加
- デモモードではダミー通知データを使用

### firestore.indexes.json
- +care_items: residentId, hasMessages, lastMessageAt
- +notifications (COLLECTION_GROUP): targetType, createdAt

## E2E Tests
- e2e.phase20.1: FND-001〜003, FND-010〜013, FND-020〜021
- Total: 9 tests passed on production

## Design Document
- docs/FOOTERNAV_DEMO_FIX_SPEC.md

## Release Commits
- release.commits: 29570f7, 1ce166f

## TDD Approach
- Red: 6 tests failed (500 errors, API calls in demo mode)
- Green: 9 tests passed after fix
- Regression: 15 tests (demo-staff-containment) passed
