# 管理設定テスト機能 設計書

> **作成日**: 2025年12月15日
> **最終更新**: 2025年12月15日
> **ステータス**: 実装完了（v1.1改善対応中）

---

## 1. 概要

### 1.1 目的

管理者設定（`?admin=true`）において、Google Chat WebhookやGoogle Driveフォルダ設定の動作確認を「保存前」にテストできる機能を提供する。

### 1.2 背景・課題

現状の問題点:
- Webhook URLを入力後、「保存」しないと正しく動作するか確認できない
- 誤ったURLを保存すると、実際の食事記録時に通知が失敗する
- Google DriveフォルダIDの妥当性を事前確認する手段がない
- 設定ミスの発見が遅れ、運用に支障をきたす可能性がある

### 1.3 解決策

設定フォームに「テスト送信」ボタンを追加し、入力値の妥当性を保存前に確認できるようにする。

---

## 2. 機能要件

### 2.1 Google Chat Webhook テスト機能

| 項目 | 内容 |
|------|------|
| 対象フィールド | `webhookUrl`（通常通知）, `importantWebhookUrl`（重要通知） |
| トリガー | 「テスト送信」ボタンクリック |
| テスト内容 | **本番形式のテストメッセージ**をWebhookに送信し、成功/失敗を表示 |
| テストメッセージ | 本番通知と同じ形式（ヘッダー、記録者、摂取時間など）でサンプルデータを送信 |
| 成功時表示 | ✅ テスト送信成功（緑色） |
| 失敗時表示 | ❌ テスト送信失敗: [エラー詳細]（赤色） |

#### v1.1改善: テストメッセージを本番形式に変更

**変更理由**:
- テストで本番と同じ形式のメッセージが届くことで、管理者が通知内容を事前確認できる
- 「[テスト]」だけでは本番時の見た目がわからない

**テストメッセージ例**:
```
【テスト施設_テスト利用者様】
#食事🍚

記録者：テスト太郎

摂取時間：昼

食事摂取方法：経口

主食摂取量：10割

副食摂取量：10割

特記事項：これはテスト送信です。このメッセージが表示されれば設定は正常です。


【投稿ID】：TEST-20251215-120000
```

### 2.2 Google Drive フォルダ テスト機能

| 項目 | 内容 |
|------|------|
| 対象フィールド | `driveUploadFolderId`（写真アップロード先） |
| トリガー | 「接続テスト」ボタンクリック |
| テスト内容 | 指定フォルダへのアクセス権限を確認（ファイル作成なし） |
| 成功時表示 | ✅ フォルダにアクセス可能（緑色）+ フォルダ名表示 |
| 失敗時表示 | ❌ [エラー内容] + **親切なアドバイス**（赤色） |

#### v1.1改善: エラー時の親切なアドバイス表示

**変更理由**:
- 「フォルダにアクセスできません」だけでは、ユーザーが何をすべきかわからない
- よくあるエラーに対して具体的な解決手順を提示する

**エラー別アドバイス**:

| エラー種別 | エラーメッセージ | アドバイス |
|-----------|----------------|----------|
| 404 (Not Found) | フォルダが見つかりません | 💡 フォルダIDを確認してください。URLの`/folders/`の後の文字列がフォルダIDです。 |
| 403 (Forbidden) | アクセス権限がありません | 💡 サービスアカウント `facility-care-sa@facility-care-input-form.iam.gserviceaccount.com` をフォルダの「編集者」として共有してください。 |
| フォルダでない | 指定されたIDはフォルダではありません | 💡 ファイルではなくフォルダのIDを入力してください。 |
| その他 | 接続エラー | 💡 しばらく待ってから再試行してください。問題が続く場合は管理者に連絡してください。 |

**フォルダID取得方法（ヘルプ表示）**:
```
Google DriveでフォルダのURLを開くと:
https://drive.google.com/drive/folders/1ABC123xyz
                                      ↑この部分がフォルダID
```

---

## 3. 技術設計

### 3.1 アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  MealSettingsModal.tsx                                       │
│  ├─ webhookUrl入力 + [テスト送信]ボタン                       │
│  ├─ importantWebhookUrl入力 + [テスト送信]ボタン              │
│  └─ driveUploadFolderId入力 + [接続テスト]ボタン              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ POST /testWebhook, POST /testDriveAccess
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Cloud Functions                             │
│  ├─ testWebhook (新規)                                       │
│  │    └─ sendToGoogleChat() 既存関数を再利用                 │
│  └─ testDriveAccess (新規)                                   │
│       └─ drive.files.get() でフォルダ存在確認                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 新規API設計

#### 3.2.1 testWebhook エンドポイント

**エンドポイント**: `POST /testWebhook`

**リクエスト**:
```typescript
interface TestWebhookRequest {
  webhookUrl: string;
}
```

**レスポンス**:
```typescript
interface TestWebhookResponse {
  success: boolean;
  message: string;
  error?: string;
}
```

**実装イメージ**:
```typescript
import { sendToGoogleChat } from '../services/googleChatService';

export const testWebhook = functions.https.onRequest(async (req, res) => {
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { webhookUrl } = req.body;

  if (!webhookUrl) {
    return res.status(400).json({ success: false, message: 'webhookUrl is required' });
  }

  const testMessage = '[テスト] 施設ケア入力フォームからの接続テストです。\nこのメッセージが表示されれば設定は正常です。\n\n送信時刻: ' + new Date().toLocaleString('ja-JP');

  const result = await sendToGoogleChat(webhookUrl, testMessage);

  if (result) {
    return res.json({ success: true, message: 'テスト送信成功' });
  } else {
    return res.status(400).json({
      success: false,
      message: 'テスト送信失敗',
      error: 'Webhook URLが無効か、送信に失敗しました'
    });
  }
});
```

#### 3.2.2 testDriveAccess エンドポイント

**エンドポイント**: `POST /testDriveAccess`

**リクエスト**:
```typescript
interface TestDriveAccessRequest {
  folderId: string;
}
```

**レスポンス**:
```typescript
interface TestDriveAccessResponse {
  success: boolean;
  message: string;
  folderName?: string;  // 成功時のみ
  error?: string;
}
```

**実装イメージ**:
```typescript
import { google } from 'googleapis';

export const testDriveAccess = functions.https.onRequest(async (req, res) => {
  setCors(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { folderId } = req.body;

  if (!folderId) {
    return res.status(400).json({ success: false, message: 'folderId is required' });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    });

    // フォルダであることを確認
    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      return res.status(400).json({
        success: false,
        message: '指定されたIDはフォルダではありません',
        error: `MimeType: ${response.data.mimeType}`
      });
    }

    return res.json({
      success: true,
      message: 'フォルダにアクセス可能',
      folderName: response.data.name
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'フォルダにアクセスできません',
      error: error.message || 'Unknown error'
    });
  }
});
```

### 3.3 フロントエンド変更

#### 3.3.1 UI変更 (MealSettingsModal.tsx)

**変更点**:
1. 各設定フィールドの横に「テスト」ボタンを追加
2. テスト結果表示用のステート追加
3. テスト実行中のローディング表示

**状態管理追加**:
```typescript
// テスト状態
interface TestState {
  isLoading: boolean;
  result: 'success' | 'error' | null;
  message: string;
}

const [webhookTestState, setWebhookTestState] = useState<TestState>({
  isLoading: false, result: null, message: ''
});
const [importantWebhookTestState, setImportantWebhookTestState] = useState<TestState>({
  isLoading: false, result: null, message: ''
});
const [driveTestState, setDriveTestState] = useState<TestState>({
  isLoading: false, result: null, message: ''
});
```

**UIイメージ**:
```
┌────────────────────────────────────────────────────────┐
│ 📣 通知設定                                             │
├────────────────────────────────────────────────────────┤
│ Google Chat Webhook URL（通常通知）                      │
│ ┌──────────────────────────────────┐ ┌──────────────┐ │
│ │ https://chat.googleapis.com/...  │ │ テスト送信   │ │
│ └──────────────────────────────────┘ └──────────────┘ │
│ ✅ テスト送信成功                                       │
├────────────────────────────────────────────────────────┤
│ Google Chat Webhook URL（重要通知）                      │
│ ┌──────────────────────────────────┐ ┌──────────────┐ │
│ │ https://chat.googleapis.com/...  │ │ テスト送信   │ │
│ └──────────────────────────────────┘ └──────────────┘ │
├────────────────────────────────────────────────────────┤
│ 📷 写真アップロード設定                                  │
├────────────────────────────────────────────────────────┤
│ Google Drive フォルダID                                  │
│ ┌──────────────────────────────────┐ ┌──────────────┐ │
│ │ 1ABC...xyz                       │ │ 接続テスト   │ │
│ └──────────────────────────────────┘ └──────────────┘ │
│ ✅ フォルダにアクセス可能: ケア写真フォルダ              │
└────────────────────────────────────────────────────────┘
```

### 3.4 新規ファイル一覧

| ファイル | 種別 | 内容 |
|---------|------|------|
| `functions/src/functions/testWebhook.ts` | 新規 | Webhookテスト関数 |
| `functions/src/functions/testDriveAccess.ts` | 新規 | Driveアクセステスト関数 |
| `frontend/src/services/adminTestService.ts` | 新規 | テストAPI呼び出しサービス |

### 3.5 既存ファイル変更

| ファイル | 変更内容 |
|---------|----------|
| `functions/src/index.ts` | 新規エンドポイント追加 |
| `frontend/src/components/MealSettingsModal.tsx` | テストボタン・結果表示追加 |
| `docs/API_SPEC.md` | 新規API仕様追加 |

---

## 4. 実現可能性評価

### 4.1 技術的評価

| 項目 | 評価 | 備考 |
|------|------|------|
| Webhook テスト | ✅ 容易 | 既存の `sendToGoogleChat` 関数を再利用可能 |
| Drive アクセステスト | ✅ 容易 | Drive API `files.get` で実現可能 |
| フロントエンド変更 | ✅ 容易 | 既存UIに追加するだけ |
| CORS対応 | ✅ 対応済み | 既存の `setCors` 関数を使用 |

**結論**: 技術的に十分実現可能

### 4.2 リスク評価

| リスク | 深刻度 | 対策 |
|--------|--------|------|
| テスト連打による負荷 | 低 | ボタンに5秒間のクールダウン実装 |
| 悪意あるURL入力 | 低 | URLプレフィックス検証（`chat.googleapis.com` 必須） |
| API呼び出しコスト | 低 | テストは軽量操作のみ |
| セキュリティ | 中 | admin=true でのみ表示（既存の制限） |

### 4.3 依存関係

| 依存先 | 状況 | 備考 |
|--------|------|------|
| Google Chat API | ✅ 利用可能 | 既存実装で動作確認済み |
| Google Drive API | ✅ 利用可能 | 既存の写真アップロードで動作確認済み |
| Cloud Functions | ✅ 稼働中 | 新規関数追加のみ |

---

## 5. 実装計画

### 5.1 タスク一覧

| 順序 | タスク | 依存 | 工数目安 |
|------|--------|------|---------|
| 1 | testWebhook 関数作成 | なし | 小 |
| 2 | testDriveAccess 関数作成 | なし | 小 |
| 3 | functions/index.ts 更新 | 1, 2 | 極小 |
| 4 | adminTestService.ts 作成 | なし | 小 |
| 5 | MealSettingsModal.tsx 修正 | 4 | 中 |
| 6 | ビルド・ローカルテスト | 1-5 | 小 |
| 7 | デプロイ | 6 | 小 |
| 8 | API_SPEC.md 更新 | 7 | 極小 |
| 9 | CURRENT_STATUS.md 更新 | 7 | 極小 |

### 5.2 実装優先度

1. **必須**: Webhook テスト機能（通常・重要両方）
2. **推奨**: Drive フォルダテスト機能
3. **任意**: テスト履歴の一時保存

---

## 6. テスト計画

### 6.1 正常系テスト

| テストケース | 期待結果 |
|-------------|----------|
| 有効なWebhook URLでテスト送信 | ✅ 成功、Google Chatにメッセージ表示 |
| 有効なフォルダIDでテスト | ✅ 成功、フォルダ名表示 |

### 6.2 異常系テスト

| テストケース | 期待結果 |
|-------------|----------|
| 無効なWebhook URL | ❌ エラー「Webhook URLが無効」 |
| 空のWebhook URL | ❌ エラー「URLを入力してください」 |
| 存在しないフォルダID | ❌ エラー「フォルダが見つかりません」 |
| アクセス権限のないフォルダID | ❌ エラー「アクセス権限がありません」 |
| ファイルIDをフォルダIDとして入力 | ❌ エラー「フォルダではありません」 |

---

## 7. セキュリティ考慮事項

### 7.1 アクセス制御

- テスト機能は `?admin=true` パラメータ付きでのみ表示
- 本番環境ではadminページに認証を追加検討（将来課題）

### 7.2 入力検証

- Webhook URL: `https://chat.googleapis.com/` プレフィックス必須
- フォルダID: 英数字・ハイフン・アンダースコアのみ許可

### 7.3 レート制限

- テストボタンに5秒のクールダウン実装
- 連続クリック防止

---

## 8. 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [GOOGLE_CHAT_WEBHOOK_SPEC.md](./GOOGLE_CHAT_WEBHOOK_SPEC.md) | Webhook連携仕様 |
| [PHOTO_UPLOAD_SPEC.md](./PHOTO_UPLOAD_SPEC.md) | 写真アップロード仕様 |
| [SETTINGS_MODAL_UI_SPEC.md](./SETTINGS_MODAL_UI_SPEC.md) | 設定モーダルUI仕様 |
| [API_SPEC.md](./API_SPEC.md) | API仕様書 |

---

## 9. 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-15 | 初版作成 |
| 2025-12-15 | v1.0 実装完了 |
| 2025-12-15 | v1.1 改善仕様追加（本番形式テストメッセージ、親切なエラーアドバイス） |
