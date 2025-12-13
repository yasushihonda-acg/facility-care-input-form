# 同期処理の競合防止設計書

> **作成日**: 2025-12-14
> **更新日**: 2025-12-14
> **関連インシデント**: Firestoreデータ重複問題（2025-12-14発生・解決）

---

## 1. インシデント概要

### 1.1 発生した問題

Firestoreの`plan_data`コレクションにおいて、全レコードが2重に保存されている状態が発生。

**症状**:
- 食事シート: 1000件中ユニークタイムスタンプ500件（2倍の重複）
- 同じタイムスタンプ・スタッフ名で異なるドキュメントIDのレコードが存在
- UIのテーブルビューで全行が2回表示される

### 1.2 原因分析

**直接原因**: 複数の`syncPlanData`処理が同時に実行され、Race Condition（競合状態）が発生

**発生メカニズム**:
```
時刻T1: 同期プロセスA開始 → 既存データ削除開始
時刻T2: 同期プロセスB開始 → 既存データ削除開始（Aの削除前のデータを参照）
時刻T3: プロセスA削除完了 → 新規データ挿入
時刻T4: プロセスB削除完了 → 新規データ挿入（Aが挿入したデータを削除できていない）
結果: プロセスAとBの両方がデータを挿入 → 2倍の重複
```

**ログ証跡**:
```
Deleting 3006 docs in 8 batches: 口腔ケア  ← 実際のレコード数の2倍
Inserting 1503 records in 4 batches for 口腔ケア
```

### 1.3 解決方法

再同期を実行し、洗い替え処理でデータを正常化。

---

## 2. 現状の同期アーキテクチャ

### 2.1 現在の実装

```typescript
// firestoreService.ts - syncPlanData
async function syncPlanData(sheetName, records) {
  // 1. 既存データを削除（バッチ分割）
  const existingDocs = await collection.where("sheetName", "==", sheetName).get();
  for (batch of existingDocs) {
    await batch.delete();
  }

  // 2. 新しいデータを追加（バッチ分割）
  for (batch of records) {
    await batch.set();
  }
}
```

**問題点**:
- 削除と追加の間に他のプロセスが介入可能
- 排他制御がない
- 同期状態の管理がない

### 2.2 同期のトリガーポイント

| トリガー | 発生条件 | リスク |
|----------|----------|--------|
| 手動同期ボタン | ユーザー操作 | 連打による多重実行 |
| 15分自動同期 | PWAのsetInterval | ブラウザタブ多重起動時 |
| Cloud Scheduler | 定期実行（未実装） | 他トリガーとの競合 |

---

## 3. 再発防止策（設計）

### 3.1 短期対策（Phase 1）：フロントエンドでの制御 ✅ 実装済み

**実装コスト**: 低
**効果**: 手動同期の連打防止

**実装ファイル**: `frontend/src/hooks/useSync.ts`

```typescript
// useSync.ts - 競合防止機能
const SYNC_COOLDOWN_MS = 30 * 1000; // 30秒クールダウン

// localStorage keys
const LS_LAST_SYNCED_AT = 'lastSyncedAt';
const LS_SYNC_IN_PROGRESS = 'syncInProgress';

// 同期可能かどうかをチェック
const canSync = useCallback((): boolean => {
  // 自タブで同期中
  if (syncMutation.isPending) return false;

  // 他タブで同期中（localStorage経由）
  const syncInProgress = localStorage.getItem(LS_SYNC_IN_PROGRESS);
  if (syncInProgress) return false;

  // クールダウン期間チェック
  const lastSync = getLastSyncedAt();
  if (lastSync && Date.now() - lastSync.getTime() < SYNC_COOLDOWN_MS) {
    return false;
  }
  return true;
}, [...]);

// storageイベントで他タブの同期を検知
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === LS_SYNC_IN_PROGRESS) {
      setIsOtherTabSyncing(!!e.newValue);
    }
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

**実装済み対策**:
- ✅ 同期中は再実行をブロック（isPending チェック）
- ✅ クールダウン期間（30秒）の間は手動同期をブロック
- ✅ タブ間での同期状態共有（localStorage + storage イベント）
- ✅ 同期ボタンにクールダウン残り秒数を表示
- ✅ 自動同期（15分間隔）はクールダウンを無視

### 3.2 中期対策（Phase 2）：バックエンドでの排他制御

**実装コスト**: 中
**効果**: サーバー側での確実な排他制御

#### 3.2.1 Firestoreでのロック実装

```typescript
// syncLockService.ts
const LOCK_COLLECTION = 'sync_locks';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5分

async function acquireSyncLock(sheetName: string): Promise<boolean> {
  const lockRef = db.collection(LOCK_COLLECTION).doc(sheetName);

  return db.runTransaction(async (transaction) => {
    const lockDoc = await transaction.get(lockRef);
    const now = Timestamp.now();

    if (lockDoc.exists) {
      const lockData = lockDoc.data();
      const lockAge = now.toMillis() - lockData.acquiredAt.toMillis();

      // タイムアウトしていなければロック取得失敗
      if (lockAge < LOCK_TIMEOUT_MS) {
        return false;
      }
    }

    // ロック取得
    transaction.set(lockRef, {
      acquiredAt: now,
      executionId: generateExecutionId(),
    });
    return true;
  });
}

async function releaseSyncLock(sheetName: string): Promise<void> {
  await db.collection(LOCK_COLLECTION).doc(sheetName).delete();
}
```

#### 3.2.2 同期処理への統合

```typescript
// syncPlanData.ts（改修後）
async function syncPlanDataHandler(req, res) {
  const sheetNames = await getSheetASheetNames();

  for (const sheetName of sheetNames) {
    // ロック取得
    const lockAcquired = await acquireSyncLock(sheetName);
    if (!lockAcquired) {
      logger.warn(`Skipping ${sheetName}: another sync in progress`);
      continue;
    }

    try {
      // 同期処理
      await syncToFirestore(sheetName, records);
    } finally {
      // ロック解放
      await releaseSyncLock(sheetName);
    }
  }
}
```

### 3.3 長期対策（Phase 3）：アーキテクチャ改善

**実装コスト**: 高
**効果**: 根本的な競合問題の解消

#### 3.3.1 差分同期への移行

現在の「洗い替え」から「差分同期」へ移行し、削除フェーズを不要にする。

```typescript
// 差分同期の概念
async function differentialSync(sheetName, records) {
  // タイムスタンプベースのユニークキーを生成
  for (const record of records) {
    const docId = generateDeterministicId(sheetName, record.timestamp, record.staffName);
    await collection.doc(docId).set(record, { merge: true });
  }

  // 古いデータのみ削除（オプション）
  // ...
}
```

#### 3.3.2 Cloud Tasks によるキュー制御

```typescript
// 同期リクエストをCloud Tasksキューに投入
async function enqueueSyncTask(sheetName: string) {
  const client = new CloudTasksClient();
  await client.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        url: `${FUNCTION_URL}/syncSheet`,
        body: Buffer.from(JSON.stringify({ sheetName })),
      },
    },
  });
}
```

キューの設定で同時実行数を1に制限することで、競合を防止。

---

## 4. 実装優先度

| Phase | 対策 | 優先度 | 状態 |
|-------|------|--------|------|
| 1 | フロントエンド同期ボタンのデバウンス | 高 | ✅ 実装済み (2025-12-14) |
| 1 | クールダウン期間（30秒） | 高 | ✅ 実装済み (2025-12-14) |
| 1 | タブ間同期状態共有 | 中 | ✅ 実装済み (2025-12-14) |
| 2 | Firestore分散ロック | 中 | 未実装（本番移行前に検討） |
| 3 | 差分同期 | 低 | 未実装（将来検討） |
| 3 | Cloud Tasks キュー | 低 | 未実装（将来検討） |

---

## 5. 監視・検知

### 5.1 重複検知クエリ

定期的に以下のクエリで重複を検知：

```javascript
// Firestoreで重複チェック（管理者向け）
const duplicates = await db.collection('plan_data')
  .where('sheetName', '==', targetSheet)
  .get()
  .then(snapshot => {
    const counts = {};
    snapshot.docs.forEach(doc => {
      const key = `${doc.data().timestamp}_${doc.data().staffName}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).filter(([_, count]) => count > 1);
  });
```

### 5.2 ログ監視

Cloud Loggingで以下のパターンを監視：
- `Deleting X docs` の X が `Inserting Y records` の Y の2倍以上
- 同一シートに対する同期開始ログが短時間に複数回出現

---

## 6. 復旧手順

重複が発生した場合の復旧手順：

1. **確認**: APIで重複状態を確認
   ```bash
   curl -s "https://...cloudfunctions.net/getPlanData?sheetName=食事" | \
     jq '[.data.records[].timestamp] | unique | length'
   ```

2. **再同期**: 手動で同期を実行（他の同期が走っていないことを確認）
   ```bash
   curl -X POST "https://...cloudfunctions.net/syncPlanData" \
     -H "Content-Type: application/json" \
     -d '{"triggeredBy": "recovery"}'
   ```

3. **検証**: 重複が解消されたことを確認
   ```bash
   # totalCount と uniqueTimestamps が一致することを確認
   curl -s "https://...cloudfunctions.net/getPlanData?sheetName=食事" | \
     jq '{totalCount: .data.totalCount, uniqueTimestamps: ([.data.records[].timestamp] | unique | length)}'
   ```

---

## 7. 関連ドキュメント

- [ARCHITECTURE.md](./ARCHITECTURE.md) - システム全体設計
- [DEMO_PWA_SPEC.md](./DEMO_PWA_SPEC.md) - 同期仕様
- [API_SPEC.md](./API_SPEC.md) - syncPlanData API仕様
