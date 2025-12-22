# Phase 38.2 Release Notes

## リリース日
2025-12-22

## 概要
品物管理ページの日付ナビゲーション中心リデザイン

## 主な変更点

### UI変更
1. **日付ナビゲーション** (`DateNavigator.tsx`)
   - 日/週/月 表示モード切替
   - 矢印ボタンで前後移動（◀ ▶）
   - カレンダーアイコンで日付選択
   - 「今日」ボタンで即座に戻る

2. **期限切れアラート** (`ExpirationAlert.tsx`)
   - ページ上部に常時表示
   - 直接「廃棄」アクション可能
   - 確認ダイアログ付き
   - デモモード対応

3. **未設定日通知改善** (`UnscheduledDatesBanner.tsx`)
   - 期間変更: 1/2/3ヶ月から選択
   - 除外フィルタ: 毎日除外/週末除外

4. **ステータスフィルタタブ削除**
   - 全て/未提供/提供済み/消費済み タブを完全削除
   - 日付ベースフィルタリングに一本化

### データモデル拡張
```typescript
// CareItem型に追加
discardedAt?: string;      // 廃棄日時（ISO8601）
discardedBy?: string;      // 廃棄実行者
discardReason?: string;    // 廃棄理由
```

### 新規フック
- `useExpiredItems(residentId)` - 期限切れ品物取得
- `useDiscardItem()` - 廃棄処理mutation

## 影響ファイル
- `frontend/src/components/family/DateNavigator.tsx` (NEW)
- `frontend/src/components/family/ExpirationAlert.tsx` (NEW)
- `frontend/src/components/family/UnscheduledDatesBanner.tsx` (MODIFIED)
- `frontend/src/pages/family/ItemManagement.tsx` (MODIFIED)
- `frontend/src/hooks/useCareItems.ts` (MODIFIED)
- `frontend/src/types/careItem.ts` (MODIFIED)
- `docs/archive/PHASE_38_2_ITEM_MANAGEMENT_REDESIGN.md` (NEW)

## 動作確認URL
https://facility-care-input-form.web.app/demo/family/items

## 関連コミット
`6a2b65e` - feat(Phase 38.2): 品物管理UI日付ナビゲーション中心リデザイン
