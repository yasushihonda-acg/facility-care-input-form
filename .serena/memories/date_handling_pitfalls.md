# 日付処理の落とし穴

## toISOString()のUTC問題（2025-12-26修正）

### 問題
```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);  // JST 12/26 00:00
const todayStr = today.toISOString().split('T')[0];  // → "2025-12-25" (UTC!)
```

`toISOString()`はUTC時間を返すため、日本時間の0時がUTCでは前日の15時になり、日付比較がずれる。

### 修正方法
```javascript
function getLocalDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
```

### 影響を受けた箇所
- `ItemBasedSnackRecord.tsx`: `isMissedSchedule`, `isRecordedToday`

### 対策
- 日付文字列が必要な場合は`getTodayString()`を使う（scheduleUtils.ts）
- `toISOString()`は避ける（UTC時間になるため）
- `formatDateString()`でローカル時間フォーマット

### 修正済み箇所（PR #77）
**フロントエンド**:
- `scheduleUtils.ts`: `getTodayString()`追加
- `demoFamilyData.ts`, `FamilyDashboard.tsx`, `StaffHome.tsx`
- `demoStaffNotes.ts`, `useStats.ts`

**バックエンド**:
- `scheduleUtils.ts`: `getTodayString()`追加（日本時間対応）
  - `toLocaleDateString('sv-SE', {timeZone: 'Asia/Tokyo'})`使用
- `getStats.ts`, `taskGenerator.ts`

---

## スケジュールタイプ別フィールド（2025-12-26修正）

### ServingSchedule型のフィールド
| タイプ | 使用フィールド |
|--------|---------------|
| `once` | `date` (提供予定日) |
| `specific_dates` | `dates` (複数の提供予定日) |
| `daily` / `weekly` | `startDate` (開始日) |

### 教訓
- union型を扱う際は`switch`文で全パターンを網羅
- タイプをまとめて処理しない（共通フィールドがない場合）
- TypeScriptの型チェックに頼りきらない
