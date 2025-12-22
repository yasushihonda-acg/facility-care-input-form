---
status: canonical
scope: core
owner: core-team
last_reviewed: 2025-12-20
---

# 業務ルール仕様書

## 1. 概要

本ドキュメントは、システム実装における**業務ルール**と**意図的な仕様（ハック）**を定義します。

> **重要**: 本書に記載された仕様は、既存システムとの互換性や業務要件に基づく**意図的な設計**です。
> 将来のAIエージェントや開発者がこれらを「バグ」や「非効率なコード」と誤認して修正しないよう、
> 各仕様の**理由（Why）**を明記しています。

---

## 2. Bot連携ハック（間食入力時の特殊処理）

### 2.1 背景と目的

施設では既存のGoogle Apps Script (GAS) Botが稼働しており、スプレッドシートの特定の列を監視して
Google Chatへ通知を送信しています。このBotは「重要」フラグを検知するロジックで動作しています。

新アプリからの入力もこのBot通知の対象とするため、**既存Botを改修せずに連携する**必要があります。

### 2.2 仕様

| 条件 | 処理内容 |
|------|----------|
| 入力種別が「間食 (Snack)」の場合 | 以下の特殊処理を適用 |

#### 特殊処理の詳細

1. **内容の格納先変更**
   - 通常: `間食内容` 列に記録
   - 実際: `特記事項` 列に記録

2. **重要度フラグの強制設定**
   - `重要度` 列に文字列 `"重要"` をセット

3. **目的**
   - 既存GAS Botが `重要度 == "重要"` の行を検知
   - Google Chatへ通知が自動送信される

### 2.3 実装コード例

```typescript
// submitCareRecord.ts 内での処理

interface CareRecordInput {
  staffId: string;
  residentId: string;
  recordType: 'meal' | 'snack' | 'hydration';
  content: string;
  timestamp: string;
}

function buildSheetRow(input: CareRecordInput): string[] {
  const row: Record<string, string> = {
    timestamp: input.timestamp,
    staffId: input.staffId,
    residentId: input.residentId,
    mealContent: '',
    snackContent: '',
    hydrationAmount: '',
    specialNotes: '',    // 特記事項
    importance: '',      // 重要度
  };

  if (input.recordType === 'snack') {
    // ===== BOT連携ハック =====
    // 間食の場合は専用列ではなく特記事項に入れ、
    // 重要度を "重要" にセットしてBot通知をトリガー
    row.specialNotes = `【間食】${input.content}`;
    row.importance = '重要';
    // ========================
  } else if (input.recordType === 'meal') {
    row.mealContent = input.content;
  } else if (input.recordType === 'hydration') {
    row.hydrationAmount = input.content;
  }

  return Object.values(row);
}
```

### 2.4 注意事項

> **絶対に変更禁止**: この仕様は既存Botとの互換性を維持するための意図的な設計です。
> 「専用列に入れるべき」「重要度は動的に判定すべき」といった改善提案は、
> 既存Bot側の改修が完了するまで実施しないでください。

---

## 3. FAXデータ仕様（非定型テキストの取り扱い）

### 3.1 背景と目的

施設への指示はFAXで届くことが多く、その内容は非常に詳細かつ非定型です。
例えば食事制限の指示には以下のような情報が含まれます：

- 「キウイは輪切り4等分をさらに半分に」
- 「トマトは皮をむいてから提供」
- 「アレルギーではないが、本人が嫌がるため出さない」
- 「月・水・金のみ禁止」

これらの情報は**正規化（構造化）するとニュアンスが失われる**ため、
元のテキストをそのまま保持する設計としています。

### 3.2 仕様

| フィールド | 型 | 正規化 | 理由 |
|------------|-----|--------|------|
| `instructions` (詳細指示) | `string` | しない | 調理手順の細かいニュアンスを保持 |
| `conditionalBan` (条件付き禁止) | `string` | しない | 曜日・時間・状況による条件を保持 |
| `mealRestrictions` (食事制限) | `string[]` | 部分的に可 | 禁止食材名のリスト化は許可 |
| `rawData` (元データ) | `object` | しない | スプレッドシートの元データを完全保持 |

### 3.3 データ例

```json
{
  "residentId": "R001",
  "residentName": "山田太郎",
  "mealRestrictions": ["キウイ", "そば", "ピーナッツ"],
  "instructions": "キウイは輪切り4等分をさらに半分にして提供。皮は必ず剥く。種が多い部分は避ける。",
  "conditionalBan": "トマトは月・水・金のみ禁止（週3回のリハビリ後は消化に負担がかかるため）。それ以外の曜日は少量なら可。",
  "rawData": {
    "A": "R001",
    "B": "山田太郎",
    "C": "キウイ、そば、ピーナッツ",
    "D": "キウイは輪切り4等分をさらに半分にして提供。皮は必ず剥く。種が多い部分は避ける。",
    "E": "トマトは月・水・金のみ禁止（週3回のリハビリ後は消化に負担がかかるため）。それ以外の曜日は少量なら可。"
  }
}
```

### 3.4 同期処理での注意点

```typescript
// syncPlanData.ts 内での処理

function parseSheetRow(row: string[]): PlanData {
  return {
    residentId: row[0],
    residentName: row[1],
    // 食材名のみリスト化（カンマ区切りで分割）
    mealRestrictions: row[2] ? row[2].split('、').map(s => s.trim()) : [],
    // ===== FAXデータ仕様 =====
    // 以下のフィールドは正規化せず、テキストをそのまま保持
    instructions: row[3] || '',      // 非定型のまま
    conditionalBan: row[4] || '',    // 非定型のまま
    // ==========================
    rawData: {
      A: row[0],
      B: row[1],
      C: row[2],
      D: row[3],
      E: row[4],
    },
    syncedAt: new Date(),
  };
}
```

### 3.5 注意事項

> **正規化禁止**: `instructions` と `conditionalBan` フィールドを構造化データに変換しないでください。
> 「JSON形式に変換すべき」「条件をパースして曜日配列にすべき」といった改善は、
> 情報の欠損リスクがあるため禁止です。

---

## 4. シート別アクセス制御

### 4.1 仕様

| シート | 許可操作 | 禁止操作 |
|--------|----------|----------|
| Sheet A (記録の結果) | Read | Write, Update, Delete |
| Sheet B (実績入力先) | Append | Read, Update, Delete |

### 4.2 実装での強制

```typescript
// sheetsService.ts

const SHEET_A_ID = '1Gf8QTbGyKB7rn5QQa5cYOg1NNYWMV8lzqySdbDkfG-w';
const SHEET_B_ID = '1OrpUVoDfUECXCTrKOGKLwN_4OQ9dlg7cUTCPGLDGHV0';

// Sheet A は読み取り専用
export async function readFromSheetA(range: string): Promise<string[][]> {
  // 実装
}

// Sheet A への書き込みは禁止
export async function writeToSheetA(): Promise<never> {
  throw new Error('FORBIDDEN: Sheet A is read-only. See BUSINESS_RULES.md');
}

// Sheet B は追記専用
export async function appendToSheetB(values: string[][]): Promise<void> {
  // 実装（append のみ）
}

// Sheet B の読み取り・更新は禁止
export async function readFromSheetB(): Promise<never> {
  throw new Error('FORBIDDEN: Sheet B is write-only. See BUSINESS_RULES.md');
}
```

---

## 5. 画像連携ルール

### 5.1 フロー

1. アプリから画像をアップロード
2. Cloud Run function で受信
3. Google Drive の指定フォルダにアップロード
4. 公開URLを生成
5. Sheet B の該当列にURLを記録

### 5.2 Drive フォルダ構成

```
CareRecordImages/
├── 2024/
│   ├── 01/
│   │   ├── R001_20240115_120000.jpg
│   │   └── R002_20240115_130000.jpg
│   └── 02/
└── 2025/
```

### 5.3 ファイル命名規則

```
{residentId}_{YYYYMMDD}_{HHmmss}.{extension}
```

例: `R001_20240115_120000.jpg`

---

## 6. 投稿ID生成ルール

### 6.1 背景と目的

既存システムでは、各記録種別ごとにプレフィックスを持つ投稿IDで管理されています。
新アプリからの入力も同じルールに準拠し、システム間の整合性を保ちます。

### 6.2 投稿ID形式

#### 本番用（実際の記録）

```
{PREFIX}{YYYYMMDDHHmmssSSS}{RANDOM6}
```

| 要素 | 説明 | 例 |
|------|------|-----|
| `PREFIX` | 記録種別プレフィックス（3文字） | `MEL` |
| `YYYYMMDDHHmmssSSS` | タイムスタンプ（年月日時分秒ミリ秒、17桁） | `20251214182056917` |
| `RANDOM6` | 重複防止用ランダム数字（6桁） | `838123` |

**完成例**: `MEL20251214182056917838123`（約26文字）

#### 記録種別プレフィックス一覧

| プレフィックス | 記録種別 |
|---------------|----------|
| `MEL` | 食事 (Meal) |
| `HYD` | 水分補給 (Hydration) |
| `ORC` | 排せつ (Oral Care) |
| `MED` | 服薬 (Medicine) |
| `NTC` | 申送り (Notice) |
| `WTM` | 体温 (Weight/Temperature) |
| `CNF` | 面会 (Conference) |

#### テスト用（管理者テスト送信）

テスト送信であることを明示するため、異なる形式を使用：

```
TEST-{YYYYMMDDHHmmss}
```

**例**: `TEST-20251215071725`

### 6.3 実装コード

```typescript
// sheetsService.ts

/**
 * 投稿IDを生成
 * フォーマット: MEL{YYYYMMDDHHmmssSSS}{ランダム6桁}
 * 例: MEL20251214182118164542
 *
 * 既存システムの投稿ID形式に準拠:
 * - HYD: 水分補給, ORC: 排せつ, MED: 服薬, NTC: 申送り, WTM: 体温, CNF: 面会
 * - MEL: 食事
 */
function generatePostId(): string {
  const now = new Date();
  const dateStr = now.toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 17);
  // ランダム6桁
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, "0");
  return `MEL${dateStr}${random}`;
}
```

### 6.4 注意事項

> **既存システム互換**: 投稿IDの形式を変更すると、既存の集計スクリプトやBotが正常に動作しなくなる可能性があります。
> プレフィックスや桁数の変更は、既存システムとの調整が完了するまで禁止です。

---

## 7. プリセット機能（いつもの指示）

### 7.1 概要

プリセットは**よく使う指示をテンプレート化**し、品物登録時に簡単に適用できる機能です。

### 7.2 現行仕様

| 項目 | 仕様 |
|------|------|
| 適用フィールド | カテゴリ、保存方法、提供方法、詳細、申し送り、残り処置 |
| 適用方法 | プリセット選択時に品物フォームへ自動入力 |
| サジェスト | キーワードマッチで候補表示 |

### 7.3 条件の扱い

特別な条件（「体調不良時は除外」など）は、プリセットではなく**品物登録フォームの「スタッフへの申し送り」フィールド**に記載します。

- 提供日時の条件 → 提供スケジュールで設定（weekly等）
- その他の条件 → スタッフへの申し送りに記載

スタッフへの申し送りは、スタッフ記録画面で青背景ボックスとして目立つ形で表示されます。

---

## 8. 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|------|------------|----------|------|
| 2025-12-15 | 1.1.0 | 投稿ID生成ルールを追加 | - |
| 2024-XX-XX | 1.0.0 | 初版作成 | - |
