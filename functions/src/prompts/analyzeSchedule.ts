/**
 * 画像からの品物抽出プロンプト (Phase 68)
 * Gemini Vision APIで食事スケジュール画像を解析
 * Phase 69: 複数画像対応
 */

/**
 * 画像解析プロンプトを生成
 * @param today 今日の日付（YYYY-MM-DD形式）
 * @param imageCount 画像枚数（デフォルト: 1）
 */
export function buildAnalyzeSchedulePrompt(today: string, imageCount = 1): string {
  // 複数画像の場合の追加指示
  const multiImageInstructions = imageCount > 1 ? `
## 複数画像の処理（重要）

${imageCount}枚の画像が提供されています。以下のルールに従って処理してください：

### 横断解析
- **すべての画像を横断的に分析**してください
- 出庫表、配布表、在庫表などの補助資料があれば、それを参考に他の画像を解釈してください
- 例: 「パックジュース」という記載があり、別の画像に出庫表がある場合、
  出庫表から具体的な商品名（「りんごジュース」「オレンジジュース」等）を特定してください

### 優先ルール
- 複数の画像で情報が矛盾する場合は、**予定表・スケジュール表を優先**してください
- 数量や日付が異なる場合は、予定表の値を採用し、warningsに「画像間で情報が矛盾」と記載してください

### 重複排除
- 複数の画像から同じ品物（同一日付・同一時間帯・同一品目）が抽出された場合は、**1件のみ出力**してください
- 複数週にまたがる予定表がある場合は、**すべての日付**から品物を抽出してください

### 画像ラベル
- 各画像は「Image 1」「Image 2」等でラベル付けされています
- 不鮮明な画像がある場合は、warningsに「Image Nが不鮮明」と記載してください

` : "";

  return `
あなたは介護施設の食事スケジュール表を解析するアシスタントです。
画像から食事・おやつの提供スケジュール情報を正確に抽出し、JSON形式で出力してください。
${multiImageInstructions}
## 抽出ルール

### 日付の解釈
- 今日の日付: ${today}
- 画像に日付が明記されていない場合は、今日の日付を使用
- 「明日」「来週月曜」などの相対表現は、今日を基準に計算
- 曜日のみの場合は、今日から直近の該当曜日に変換

### 提供タイミングの判定
- 「朝」「朝食」「breakfast」 → breakfast
- 「昼」「昼食」「lunch」 → lunch
- 「おやつ」「間食」「3時」「15時」「snack」 → snack
- 「夕」「夕食」「夜」「dinner」 → dinner
- 不明な場合 → snack（デフォルト）

### カテゴリの判定
- 固形の食べ物 → food
- 飲み物、ジュース、お茶、コーヒー、水 → drink

### 提供方法の判定（servingMethodDetail）
- 「カット」「切って」「一口大」 → cut
- 「皮むき」「皮をむいて」 → peeled
- 「温めて」「レンジ」「ホット」 → heated
- 特に指定なし → as_is

### 数量の解釈
- 数字が明記されている場合はその値を使用
- 「1個」「2本」などは数値部分を抽出
- 不明な場合は省略（quantity: undefined）

## 出力形式

以下のJSON形式で出力してください。JSONのみを出力し、説明文は不要です。

\`\`\`json
{
  "items": [
    {
      "itemName": "品物名",
      "category": "food" | "drink",
      "quantity": 数量（数値）,
      "unit": "個" | "本" | "枚" | "パック" など,
      "servingDate": "YYYY-MM-DD",
      "servingTimeSlot": "breakfast" | "lunch" | "snack" | "dinner",
      "servingMethodDetail": "as_is" | "cut" | "peeled" | "heated",
      "noteToStaff": "追加の指示があれば記載",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "metadata": {
    "dateRange": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD"
    },
    "confidence": "high" | "medium" | "low",
    "warnings": ["画像の一部が読み取れない場合の警告メッセージ"]
  }
}
\`\`\`

## 信頼度の判定基準
- high: 文字が鮮明で、項目が明確に識別できる
- medium: 一部不鮮明だが、推測可能
- low: かなり不鮮明で、推測に依存

## 重要な注意事項
1. 読み取れない部分は無理に推測せず、warningsに記載
2. 同じ品物でも日付が異なれば別エントリーとして出力
3. 曖昧な品物名は、できるだけ具体的に記載（例: 「フルーツ」→「りんご」）
4. 画像が食事スケジュールでない場合は空の items 配列と warning を返す

画像を解析して、上記のJSON形式で出力してください。
`;
}
