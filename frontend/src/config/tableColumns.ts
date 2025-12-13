/**
 * テーブルビュー表示カラム設定
 *
 * 設計書: docs/TABLE_VIEW_COLUMNS.md
 *
 * デモ版の前提:
 * - 入居者は1名のみ（蒲地 キヌヱ様）のため、入居者カラムは非表示
 * - 施設も単一のため、施設カラムは非表示
 */

export interface ColumnDef {
  /** 元のヘッダー名（データキー） */
  originalHeader: string;
  /** 表示用ラベル */
  displayLabel: string;
  /** 文字数制限（超過時は"..."で省略） */
  truncate?: number;
  /** バッジ表示設定 */
  badge?: {
    /** 表示条件（値に含まれる文字列） */
    condition: string;
    /** バッジ色 */
    color: 'red' | 'yellow' | 'green' | 'blue';
  };
}

export interface SheetColumnConfig {
  sheetName: string;
  columns: ColumnDef[];
}

/**
 * シート別表示カラム設定
 */
export const SHEET_COLUMNS: SheetColumnConfig[] = [
  {
    sheetName: '食事',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '食事はいつのことですか？', displayLabel: '時間帯' },
      { originalHeader: '主食の摂取量は何割ですか？', displayLabel: '主食' },
      { originalHeader: '副食の摂取量は何割ですか？', displayLabel: '副食' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: '水分摂取量',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '水分量はいくらでしたか？', displayLabel: '水分量(cc)' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: '排便・排尿',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '排便はありましたか？', displayLabel: '排便' },
      { originalHeader: '排尿はありましたか？', displayLabel: '排尿' },
      { originalHeader: '排尿量は何ccでしたか？', displayLabel: '排尿量(cc)' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: 'バイタル',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '体温（KT）はいくつでしたか？', displayLabel: '体温' },
      { originalHeader: '最高血圧（BP）はいくつでしたか？', displayLabel: '血圧(高)' },
      { originalHeader: '最低血圧（BP）はいくつでしたか？', displayLabel: '血圧(低)' },
      { originalHeader: '脈拍（P）はいくつでしたか？', displayLabel: '脈拍' },
      { originalHeader: '酸素飽和度（SpO2）はいくつですか？', displayLabel: 'SpO2' },
    ],
  },
  {
    sheetName: '口腔ケア',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '口腔ケアはいつのことですか？', displayLabel: '時間帯' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: '内服',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '内服はいつのことですか？', displayLabel: 'タイミング' },
      { originalHeader: '何時に頓服薬を飲まれましたか？', displayLabel: '頓服時刻' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: '特記事項',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      {
        originalHeader: '重要特記事項集計表に反映させますか？',
        displayLabel: '重要度',
        badge: { condition: '重要/', color: 'red' },
      },
      { originalHeader: '特記事項', displayLabel: '内容', truncate: 50 },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: '血糖値インスリン投与',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '測定時間は？', displayLabel: '測定時間' },
      { originalHeader: '血糖値は？', displayLabel: '血糖値' },
      { originalHeader: 'インスリン投与時間は？', displayLabel: '投与時間' },
      { originalHeader: 'インスリン投与単位は？', displayLabel: '投与量' },
    ],
  },
  {
    sheetName: '往診録',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: 'Drは誰ですか？', displayLabel: '担当医' },
      { originalHeader: '次回往診日はいつですか？', displayLabel: '次回往診' },
      {
        originalHeader: '看護業務の変更・追加がありますか？',
        displayLabel: '指示変更',
        badge: { condition: '変更・追加あり', color: 'yellow' },
      },
    ],
  },
  {
    sheetName: '体重',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: '何キロでしたか？', displayLabel: '体重(kg)' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
    ],
  },
  {
    sheetName: 'カンファレンス録',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
      { originalHeader: 'カンファレンス録', displayLabel: '内容', truncate: 50 },
      { originalHeader: '自社で対応すべき事項は何ですか？', displayLabel: '対応事項', truncate: 30 },
      {
        originalHeader: '重要特記事項集計表に反映させますか？',
        displayLabel: '重要度',
        badge: { condition: '重要/', color: 'red' },
      },
    ],
  },
];

/**
 * シート名から表示カラム設定を取得
 */
export function getSheetColumns(sheetName: string): ColumnDef[] {
  const config = SHEET_COLUMNS.find(c => c.sheetName === sheetName);
  if (config) {
    return config.columns;
  }

  // 設定がない場合はデフォルト（日時 + 担当のみ）
  return [
    { originalHeader: 'タイムスタンプ', displayLabel: '日時' },
    { originalHeader: 'あなたの名前は？', displayLabel: '担当' },
  ];
}
