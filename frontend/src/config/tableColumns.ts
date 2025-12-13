/**
 * テーブルビュー表示カラム設定
 *
 * 設計書: docs/TABLE_VIEW_COLUMNS.md
 *
 * デモ版の前提:
 * - 入居者は1名のみ（蒲地 キヌヱ様）のため、入居者カラムは非表示
 * - 施設も単一のため、施設カラムは非表示
 *
 * カラム幅の目安:
 * - 日時: 140px
 * - 時間帯/タイミング: 80px
 * - 数値（割/cc/kg等）: 80px
 * - 担当/担当医: 100px
 * - 内容プレビュー: flex-1
 * - バッジ付きカラム: 120px
 */

export interface ColumnDef {
  /** 元のヘッダー名（データキー） */
  originalHeader: string;
  /** 表示用ラベル */
  displayLabel: string;
  /** カラム幅（例: "140px", "80px", "flex-1"） */
  width?: string;
  /** 文字数制限（超過時は"..."で省略） */
  truncate?: number;
  /** バッジ表示設定 */
  badge?: {
    /** 表示条件（値に含まれる文字列） */
    condition: string;
    /** バッジ色 */
    color: 'red' | 'yellow' | 'green' | 'blue';
  };
  /** ソート種別（デフォルト: string） */
  sortType?: 'string' | 'number' | 'date';
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
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '食事はいつのことですか？', displayLabel: '時間帯', width: '80px' },
      { originalHeader: '主食の摂取量は何割ですか？', displayLabel: '主食', width: '80px', sortType: 'number' },
      { originalHeader: '副食の摂取量は何割ですか？', displayLabel: '副食', width: '80px', sortType: 'number' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: '水分摂取量',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '水分量はいくらでしたか？', displayLabel: '水分量(cc)', width: '100px', sortType: 'number' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: '排便・排尿',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '排便はありましたか？', displayLabel: '排便', width: '100px' },
      { originalHeader: '排尿はありましたか？', displayLabel: '排尿', width: '100px' },
      { originalHeader: '排尿量は何ccでしたか？', displayLabel: '排尿量(cc)', width: '100px', sortType: 'number' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: 'バイタル',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '体温（KT）はいくつでしたか？', displayLabel: '体温', width: '80px', sortType: 'number' },
      { originalHeader: '最高血圧（BP）はいくつでしたか？', displayLabel: '血圧(高)', width: '80px', sortType: 'number' },
      { originalHeader: '最低血圧（BP）はいくつでしたか？', displayLabel: '血圧(低)', width: '80px', sortType: 'number' },
      { originalHeader: '脈拍（P）はいくつでしたか？', displayLabel: '脈拍', width: '80px', sortType: 'number' },
      { originalHeader: '酸素飽和度（SpO2）はいくつですか？', displayLabel: 'SpO2', width: '80px', sortType: 'number' },
    ],
  },
  {
    sheetName: '口腔ケア',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '口腔ケアはいつのことですか？', displayLabel: '時間帯', width: '80px' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: '内服',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '内服はいつのことですか？', displayLabel: 'タイミング', width: '100px' },
      { originalHeader: '何時に頓服薬を飲まれましたか？', displayLabel: '頓服時刻', width: '100px' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: '特記事項',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      {
        originalHeader: '重要特記事項集計表に反映させますか？',
        displayLabel: '重要度',
        width: '120px',
        badge: { condition: '重要/', color: 'red' },
      },
      { originalHeader: '特記事項', displayLabel: '内容', width: 'flex-1', truncate: 50 },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: '血糖値インスリン投与',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '測定時間は？', displayLabel: '測定時間', width: '100px' },
      { originalHeader: '血糖値は？', displayLabel: '血糖値', width: '80px', sortType: 'number' },
      { originalHeader: 'インスリン投与時間は？', displayLabel: '投与時間', width: '100px' },
      { originalHeader: 'インスリン投与単位は？', displayLabel: '投与量', width: '80px', sortType: 'number' },
    ],
  },
  {
    sheetName: '往診録',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: 'Drは誰ですか？', displayLabel: '担当医', width: '140px' },
      { originalHeader: '次回往診日はいつですか？', displayLabel: '次回往診', width: '120px', sortType: 'date' },
      {
        originalHeader: '看護業務の変更・追加がありますか？',
        displayLabel: '指示変更',
        width: '120px',
        badge: { condition: '変更・追加あり', color: 'yellow' },
      },
    ],
  },
  {
    sheetName: '体重',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: '何キロでしたか？', displayLabel: '体重(kg)', width: '100px', sortType: 'number' },
      { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
    ],
  },
  {
    sheetName: 'カンファレンス録',
    columns: [
      { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
      { originalHeader: 'カンファレンス録', displayLabel: '内容', width: 'flex-1', truncate: 50 },
      { originalHeader: '自社で対応すべき事項は何ですか？', displayLabel: '対応事項', width: '200px', truncate: 30 },
      {
        originalHeader: '重要特記事項集計表に反映させますか？',
        displayLabel: '重要度',
        width: '120px',
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
    { originalHeader: 'タイムスタンプ', displayLabel: '日時', width: '140px', sortType: 'date' },
    { originalHeader: 'あなたの名前は？', displayLabel: '担当', width: '100px' },
  ];
}
