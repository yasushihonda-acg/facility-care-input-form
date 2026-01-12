/**
 * Excel一括登録用のパーサーユーティリティ
 */

import * as XLSX from 'xlsx';
import {
  ITEM_UNITS,
  type ItemCategory,
  type ServingMethod,
  type StorageMethod,
  type ServingTimeSlot,
  type RemainingHandlingInstruction,
} from '../types/careItem';
import type {
  ExcelTemplateRow,
  ParsedBulkItem,
  ValidationError,
  ValidationWarning,
} from '../types/bulkImport';
import {
  EXCEL_COLUMN_HEADERS,
  CATEGORY_LABEL_TO_VALUE,
  SERVING_METHOD_LABEL_TO_VALUE,
  TIME_SLOT_LABEL_TO_VALUE,
  STORAGE_METHOD_LABEL_TO_VALUE,
  HANDLING_LABEL_TO_VALUE,
  DROPDOWN_OPTIONS,
} from '../types/bulkImport';

/**
 * Excelシリアル値を日付文字列に変換
 */
function excelDateToString(serial: number): string {
  // Excelの日付シリアル値は1900年1月1日を1とする
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const date = new Date(utcValue);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付文字列を正規化 (YYYY/MM/DD or YYYY-MM-DD -> YYYY-MM-DD)
 */
function normalizeDateString(dateStr: string | number | undefined): string | null {
  if (dateStr === undefined || dateStr === null || dateStr === '') {
    return null;
  }

  // Excelシリアル値の場合
  if (typeof dateStr === 'number') {
    return excelDateToString(dateStr);
  }

  // 文字列の場合
  const str = String(dateStr).trim();

  // YYYY/MM/DD形式
  const slashMatch = str.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // YYYY-MM-DD形式
  const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

/**
 * カテゴリラベルを内部値に変換
 */
function convertCategory(label: string | undefined): ItemCategory | null {
  if (!label) return null;
  return CATEGORY_LABEL_TO_VALUE[label.trim()] ?? null;
}

/**
 * 提供方法ラベルを内部値に変換
 */
function convertServingMethod(label: string | undefined): ServingMethod | null {
  if (!label) return null;
  return SERVING_METHOD_LABEL_TO_VALUE[label.trim()] ?? null;
}

/**
 * 提供タイミングラベルを内部値に変換
 */
function convertTimeSlot(label: string | undefined): ServingTimeSlot | null {
  if (!label) return null;
  return TIME_SLOT_LABEL_TO_VALUE[label.trim()] ?? null;
}

/**
 * 保存方法ラベルを内部値に変換
 */
function convertStorageMethod(label: string | undefined): StorageMethod | null {
  if (!label) return null;
  return STORAGE_METHOD_LABEL_TO_VALUE[label.trim()] ?? null;
}

/**
 * 残った場合の処置ラベルを内部値に変換
 */
function convertHandling(label: string | undefined): RemainingHandlingInstruction | null {
  if (!label) return null;
  return HANDLING_LABEL_TO_VALUE[label.trim()] ?? null;
}

/**
 * 行データをバリデーションしてパース
 */
function parseRow(row: Partial<ExcelTemplateRow>, rowIndex: number): ParsedBulkItem {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 品物名（必須）
  const itemName = row['品物名']?.toString().trim() ?? '';
  if (!itemName) {
    errors.push({ field: '品物名', message: '品物名は必須です' });
  }

  // カテゴリ（必須）
  const categoryLabel = row['カテゴリ']?.toString().trim();
  const category = convertCategory(categoryLabel);
  if (!category) {
    errors.push({
      field: 'カテゴリ',
      message: 'カテゴリは「食べ物」または「飲み物」を入力してください',
    });
  }

  // 数量（任意、空欄=数量管理しない）
  let quantity: number | undefined;
  const rawQuantity = row['数量'];
  if (rawQuantity !== undefined && rawQuantity !== null && rawQuantity !== '') {
    // 全角数字を半角に変換
    const normalizedQuantity = String(rawQuantity)
      .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
      .trim();
    const num = Number(normalizedQuantity);
    if (isNaN(num) || num < 1) {
      errors.push({ field: '数量', message: '数量は1以上の数値を入力してください' });
    } else {
      quantity = num;
    }
  }

  // 単位（空欄→「個」、無効な単位→「個」に自動修正）
  let unit = row['単位']?.toString().trim() ?? '';
  const originalUnit = unit;
  if (!unit) {
    unit = '個';
  } else if (!ITEM_UNITS.includes(unit)) {
    // 無効な単位は「個」に自動修正し、警告を追加
    warnings.push({
      field: '単位',
      message: `「${originalUnit}」は対応していない単位のため「個」に変換されました`,
      originalValue: originalUnit,
      correctedValue: '個',
    });
    unit = '個';
  }

  // 提供方法（必須）
  const servingMethodLabel = row['提供方法']?.toString().trim();
  const servingMethod = convertServingMethod(servingMethodLabel);
  if (!servingMethod) {
    errors.push({
      field: '提供方法',
      message: '提供方法は「そのまま」「カット」「皮むき」「温める」「その他」から選択してください',
    });
  }

  // 提供日（必須）
  const servingDate = normalizeDateString(row['提供日']);
  if (!servingDate) {
    errors.push({ field: '提供日', message: '提供日はYYYY/MM/DD形式で入力してください' });
  }

  // 提供タイミング（必須）
  const timeSlotLabel = row['提供タイミング']?.toString().trim();
  const servingTimeSlot = convertTimeSlot(timeSlotLabel);
  if (!servingTimeSlot) {
    errors.push({
      field: '提供タイミング',
      message: '提供タイミングは「朝食時」「昼食時」「夕食時」「おやつ時」「いつでも」から選択してください',
    });
  }

  // 賞味期限（任意）
  const expirationDate = normalizeDateString(row['賞味期限']) ?? undefined;

  // 保存方法（任意）
  const storageMethodLabel = row['保存方法']?.toString().trim();
  const storageMethod = storageMethodLabel ? convertStorageMethod(storageMethodLabel) : undefined;
  if (storageMethodLabel && !storageMethod) {
    errors.push({
      field: '保存方法',
      message: '保存方法は「常温」「冷蔵」「冷凍」から選択してください',
    });
  }

  // 申し送り（任意）
  const noteToStaff = row['申し送り']?.toString().trim() || undefined;

  // 残った場合の処置（空欄→「指定なし」）
  const handlingLabel = row['残った場合の処置']?.toString().trim();
  let remainingHandlingInstruction: RemainingHandlingInstruction = 'none'; // デフォルト
  if (handlingLabel) {
    const converted = convertHandling(handlingLabel);
    if (converted) {
      remainingHandlingInstruction = converted;
    } else {
      errors.push({
        field: '残った場合の処置',
        message: '処置は「指定なし」「破棄してください」「保存してください」から選択してください',
      });
    }
  }

  // 処置の条件（任意）
  const remainingHandlingCondition = row['処置の条件']?.toString().trim() || undefined;

  return {
    rowIndex,
    raw: row,
    parsed: {
      itemName,
      category: category ?? 'food',
      quantity,
      unit,
      servingMethod: servingMethod ?? 'as_is',
      servingDate: servingDate ?? '',
      servingTimeSlot: servingTimeSlot ?? 'anytime',
      expirationDate,
      storageMethod: storageMethod ?? undefined,
      noteToStaff,
      remainingHandlingInstruction,
      remainingHandlingCondition,
    },
    errors,
    warnings,
    isDuplicate: false,
  };
}

/**
 * ガイド行かどうかを判定
 */
function isGuideRow(row: Partial<ExcelTemplateRow>): boolean {
  const itemName = row['品物名']?.toString().trim() ?? '';
  return itemName === '↓ここから入力↓' || itemName.startsWith('↓');
}

/**
 * サンプル行かどうかを判定
 */
function isSampleRow(row: Partial<ExcelTemplateRow>): boolean {
  const itemName = row['品物名']?.toString().trim() ?? '';
  return itemName.startsWith('【サンプル】');
}

/**
 * Excelファイルをパースして品物リストを返す
 */
export async function parseExcelFile(file: File): Promise<ParsedBulkItem[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // 「入力シート」を探す。なければ最初のシートを使用
        const inputSheetName = workbook.SheetNames.find(name => name === '入力シート');
        const targetSheetName = inputSheetName ?? workbook.SheetNames[0];
        const worksheet = workbook.Sheets[targetSheetName];

        // JSONに変換（ヘッダー行をキーとして使用）
        const allRows = XLSX.utils.sheet_to_json<Partial<ExcelTemplateRow>>(worksheet, {
          defval: '',
        });

        // ガイド行とサンプル行をフィルタリング
        const dataRows = allRows.filter(row => {
          // ガイド行をスキップ
          if (isGuideRow(row)) return false;
          // サンプル行をスキップ
          if (isSampleRow(row)) return false;
          // 空行をスキップ（品物名が空）
          const itemName = row['品物名']?.toString().trim() ?? '';
          if (!itemName) return false;
          return true;
        });

        // 各行をパース（元のExcel行番号を計算）
        const parsedItems: ParsedBulkItem[] = dataRows.map((row) => {
          // allRowsでの元のインデックスを取得
          const originalIndex = allRows.indexOf(row);
          // Excel行番号は2から開始（ヘッダー行が1）
          return parseRow(row, originalIndex + 2);
        });

        resolve(parsedItems);
      } catch {
        reject(new Error('Excelファイルの読み込みに失敗しました'));
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * テンプレートExcelを生成してダウンロード（ExcelJS使用）
 */
export async function downloadTemplate(): Promise<void> {
  // ExcelJSを動的インポート（バンドルサイズ最適化）
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  // === 説明シート ===
  const instructionSheet = workbook.addWorksheet('使い方');
  instructionSheet.getColumn(1).width = 80;

  const instructionData = [
    ['品物一括登録テンプレート - 使い方'],
    [''],
    ['【重要】入力前に必ずお読みください'],
    [''],
    ['1. サンプル行の削除'],
    ['   「入力シート」の3行目・4行目は入力例（サンプル）です。'],
    ['   品物名が「【サンプル】」で始まる行は、必ず削除してから入力してください。'],
    [''],
    ['2. 入力開始位置'],
    ['   2行目は入力ガイドです。削除しないでください。'],
    ['   3行目から品物を入力してください。'],
    [''],
    ['3. 必須項目（※必ず入力）'],
    ['   - 品物名'],
    ['   - カテゴリ（食べ物 / 飲み物）'],
    ['   - 提供方法（そのまま / カット / 皮むき / 温める / その他）'],
    ['   - 提供日（YYYY/MM/DD形式 例: 2026/01/20）'],
    ['   - 提供タイミング（朝食時 / 昼食時 / 夕食時 / おやつ時 / いつでも）'],
    [''],
    ['4. 任意項目'],
    ['   - 数量: 空欄の場合は「数量を管理しない」として登録されます'],
    ['   - 単位: 空欄の場合は「個」が自動設定されます'],
    ['   - 賞味期限: YYYY/MM/DD形式'],
    ['   - 保存方法: 常温 / 冷蔵 / 冷凍'],
    ['   - 申し送り: スタッフへの特別な指示'],
    ['   - 残った場合の処置: 空欄の場合は「指定なし」が自動設定されます'],
    ['   - 処置の条件: 「食べかけの場合」など条件を記述'],
    [''],
    ['5. ドロップダウンリスト'],
    ['   カテゴリ・単位・提供方法・提供タイミング・保存方法・処置の列は'],
    ['   セルをクリックすると選択肢が表示されます。'],
    [''],
    ['6. 重複チェック'],
    ['   「品物名 + 提供日 + 提供タイミング」が同じ品物は'],
    ['   既に登録済みとして自動でスキップされます。'],
    [''],
    ['7. アップロード'],
    ['   入力が完了したら、このファイルを保存して'],
    ['   品物一括登録画面からアップロードしてください。'],
  ];

  instructionData.forEach((row) => {
    instructionSheet.addRow(row);
  });

  // === 入力シート ===
  const inputSheet = workbook.addWorksheet('入力シート');

  // 列幅設定
  const columnWidths = [35, 14, 10, 10, 14, 14, 16, 14, 12, 30, 20, 20];
  columnWidths.forEach((width, index) => {
    inputSheet.getColumn(index + 1).width = width;
  });

  // 1行目: ヘッダー
  const headerRow = inputSheet.addRow([...EXCEL_COLUMN_HEADERS]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  });

  // 2行目: ガイド行
  const guideRow = inputSheet.addRow([
    '↓ここから入力↓',
    '選択してください',
    '空欄可',
    '選択（空欄→個）',
    '選択してください',
    'YYYY/MM/DD',
    '選択してください',
    'YYYY/MM/DD',
    '空欄可',
    '自由記述',
    '空欄→指定なし',
    '自由記述',
  ]);
  guideRow.eachCell((cell) => {
    cell.font = { color: { argb: 'FF888888' }, italic: true };
  });

  // 3-4行目: サンプル行
  const sample1 = inputSheet.addRow([
    '【サンプル】りんご ※この行は削除',
    '食べ物',
    3,
    '個',
    'カット',
    '2026/01/20',
    'おやつ時',
    '2026/01/25',
    '冷蔵',
    '皮を剥いて8等分にカット',
    '破棄してください',
    '食べかけの場合',
  ]);
  sample1.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF0E0' }, // 薄いオレンジ
    };
  });

  const sample2 = inputSheet.addRow([
    '【サンプル】オレンジジュース ※この行は削除',
    '飲み物',
    '',
    '',
    'そのまま',
    '2026/01/20',
    '朝食時',
    '2026/02/01',
    '冷蔵',
    '',
    '',
    '',
  ]);
  sample2.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF0E0' }, // 薄いオレンジ
    };
  });

  // F列（提供日）とH列（賞味期限）に日付書式を設定
  inputSheet.getColumn(6).numFmt = 'yyyy/mm/dd'; // F列: 提供日
  inputSheet.getColumn(8).numFmt = 'yyyy/mm/dd'; // H列: 賞味期限

  // データ検証（ドロップダウンリスト）を設定
  // B列: カテゴリ（3行目〜100行目）
  for (let row = 3; row <= 100; row++) {
    inputSheet.getCell(`B${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"食べ物,飲み物"'],
      showErrorMessage: true,
      errorTitle: '入力エラー',
      error: 'カテゴリは「食べ物」または「飲み物」を選択してください',
    };
  }

  // E列: 提供方法（3行目〜100行目）
  for (let row = 3; row <= 100; row++) {
    inputSheet.getCell(`E${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"そのまま,カット,皮むき,温める,その他"'],
      showErrorMessage: true,
      errorTitle: '入力エラー',
      error: '提供方法を選択してください',
    };
  }

  // G列: 提供タイミング（3行目〜100行目）
  for (let row = 3; row <= 100; row++) {
    inputSheet.getCell(`G${row}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['"朝食時,昼食時,夕食時,おやつ時,いつでも"'],
      showErrorMessage: true,
      errorTitle: '入力エラー',
      error: '提供タイミングを選択してください',
    };
  }

  // I列: 保存方法（3行目〜100行目）
  for (let row = 3; row <= 100; row++) {
    inputSheet.getCell(`I${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"常温,冷蔵,冷凍"'],
      showErrorMessage: true,
      errorTitle: '入力エラー',
      error: '保存方法を選択してください',
    };
  }

  // D列: 単位（3行目〜100行目）- ITEM_UNITSに準拠
  for (let row = 3; row <= 100; row++) {
    inputSheet.getCell(`D${row}`).dataValidation = {
      type: 'list',
      allowBlank: true, // 空欄→「個」が自動設定
      formulae: ['"個,ケ,パック,本,袋,箱,枚,g,ml,cc"'],
      showErrorMessage: true,
      errorTitle: '入力エラー',
      error: '単位を選択してください',
    };
  }

  // K列: 残った場合の処置（3行目〜100行目）
  for (let row = 3; row <= 100; row++) {
    inputSheet.getCell(`K${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"指定なし,破棄してください,保存してください"'],
      showErrorMessage: true,
      errorTitle: '入力エラー',
      error: '処置を選択してください',
    };
  }

  // ファイルをダウンロード
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const fileName = `品物一括登録テンプレート_${dateStr}.xlsx`;

  // ブラウザでダウンロード
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * ドロップダウン選択肢を取得（UI表示用）
 */
export function getDropdownOptions() {
  return DROPDOWN_OPTIONS;
}
