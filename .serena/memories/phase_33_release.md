# Phase 33 Release: 残ったものへの処置指示機能

## 完了日: 2025-12-21

## 概要
家族が品物登録時に「残った場合の処置」を事前に指示できるようにし、スタッフの記録入力時にその指示に従った選択を促す機能。

## 実装内容

### 1. 型定義 (careItem.ts)
- `RemainingHandlingInstruction` 型追加: 'discarded' | 'stored' | 'none'
- `REMAINING_HANDLING_INSTRUCTION_OPTIONS` 定数追加
- `CareItem` / `CareItemInput` に `remainingHandlingInstruction` フィールド追加
- `getRemainingHandlingInstructionLabel()` 関数追加

### 2. 家族用UI
- **ItemForm.tsx**: 品物登録時に処置指示を設定可能
- **ItemEditPage.tsx**: 品物編集時に処置指示を変更可能
- 選択肢: 指定なし / 破棄してください / 保存してください
- 注意書き表示: 「※ 指示がある場合、スタッフは指示通りの対応のみ選択可能になります」

### 3. スタッフ用UI (StaffRecordDialog.tsx)
- 家族指示がある場合:
  - 指示バナー表示（💡ご家族からの指示があります / 📌 破棄してください）
  - 該当選択肢を自動選択
  - 他の選択肢を非活性化（家族指示により選択不可）
- 家族指示がない場合: 従来通り全選択肢から選択可能

### 4. E2Eテスト
- remaining-handling-instruction.spec.ts: 10件追加
  - RHI-001〜004: 品物登録フォームの処置指示UI
  - RHI-005〜006: 品物編集フォーム（スキップ: デモデータ依存）
  - RHI-007〜009: スタッフ記録ダイアログ
  - RHI-010: 型定義とUI一致確認

## 設計書
- docs/REMAINING_HANDLING_INSTRUCTION_SPEC.md

## テスト結果
- 全E2Eテスト: 319件（248パス、39スキップ）
- Phase 33テスト: 10件（6パス、4スキップ）

## 後方互換性
- 既存の品物データには `remainingHandlingInstruction` フィールドがない
- フィールドがない場合は「指示なし」として扱う（undefined = 従来動作）
