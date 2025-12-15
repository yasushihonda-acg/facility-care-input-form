/**
 * Drive フォルダ アクセステスト関数
 *
 * 管理者設定画面から、Google DriveフォルダIDの妥当性確認を行うためのAPI
 * v1.1: エラー時に親切なアドバイスを返すよう改善
 *
 * 設計書: docs/ADMIN_TEST_FEATURE_SPEC.md
 */

import * as functions from "firebase-functions";
import {google} from "googleapis";

interface TestDriveAccessRequest {
  folderId: string;
}

interface TestDriveAccessResponse {
  success: boolean;
  message: string;
  folderName?: string;
  error?: string;
  advice?: string; // v1.1: 親切なアドバイス
}

// サービスアカウントメールアドレス
// CLAUDE.md記載の統一サービスアカウント
const SERVICE_ACCOUNT_EMAIL =
  "facility-care-sa@facility-care-input-form.iam.gserviceaccount.com";

export const testDriveAccess = functions
  .region("asia-northeast1")
  .https.onRequest(async (req, res): Promise<void> => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // プリフライト
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // POSTメソッドのみ許可
    if (req.method !== "POST") {
      const response: TestDriveAccessResponse = {
        success: false,
        message: "Method not allowed",
      };
      res.status(405).json(response);
      return;
    }

    const body = req.body as TestDriveAccessRequest;
    const {folderId} = body;

    // バリデーション: folderId必須
    if (!folderId) {
      const response: TestDriveAccessResponse = {
        success: false,
        message: "folderId is required",
      };
      res.status(400).json(response);
      return;
    }

    // バリデーション: フォルダIDの形式（英数字、ハイフン、アンダースコアのみ）
    if (!/^[\w-]+$/.test(folderId)) {
      const response: TestDriveAccessResponse = {
        success: false,
        message: "無効なフォルダIDです",
        error: "フォルダIDには英数字、ハイフン、アンダースコアのみ使用できます",
      };
      res.status(400).json(response);
      return;
    }

    try {
      // Drive API クライアントを取得
      const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
      const drive = google.drive({version: "v3", auth});

      functions.logger.info("[testDriveAccess] Testing folder ID:", folderId);

      // フォルダ情報を取得
      const driveResponse = await drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType",
      });

      // フォルダであることを確認
      if (driveResponse.data.mimeType !== "application/vnd.google-apps.folder") {
        functions.logger.warn(
          "[testDriveAccess] Not a folder, mimeType:",
          driveResponse.data.mimeType
        );
        const errorResponse: TestDriveAccessResponse = {
          success: false,
          message: "指定されたIDはフォルダではありません",
          error: `MimeType: ${driveResponse.data.mimeType}`,
          advice: "ファイルではなくフォルダのIDを入力してください。",
        };
        res.status(400).json(errorResponse);
        return;
      }

      functions.logger.info(
        "[testDriveAccess] Test successful, folder name:",
        driveResponse.data.name
      );
      const successResponse: TestDriveAccessResponse = {
        success: true,
        message: "フォルダにアクセス可能",
        folderName: driveResponse.data.name || undefined,
      };
      res.json(successResponse);
    } catch (error: unknown) {
      functions.logger.error("[testDriveAccess] Test failed:", error);

      // エラーメッセージとアドバイスを決定
      let errorMessage = "Unknown error";
      let advice = "しばらく待ってから再試行してください。問題が続く場合は管理者に連絡してください。";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Google API エラーの詳細を取得し、親切なアドバイスを返す
      const googleError = error as {code?: number; errors?: Array<{reason?: string}>};
      if (googleError.code === 404) {
        errorMessage = "フォルダが見つかりません";
        advice = [
          "フォルダIDを確認してください。",
          "Google DriveでフォルダのURLを開くと:",
          "https://drive.google.com/drive/folders/1ABC123xyz",
          "「1ABC123xyz」の部分がフォルダIDです。",
        ].join("\n");
      } else if (googleError.code === 403) {
        errorMessage = "フォルダへのアクセス権限がありません";
        advice = [
          "以下の手順でサービスアカウントを共有してください:",
          "",
          "1. Google Driveで対象フォルダを右クリック",
          "2. 「共有」を選択",
          `3. 「${SERVICE_ACCOUNT_EMAIL}」を追加`,
          "4. 権限を「編集者」に設定",
          "5. 「送信」をクリック",
        ].join("\n");
      }

      const errorResponse: TestDriveAccessResponse = {
        success: false,
        message: "フォルダにアクセスできません",
        error: errorMessage,
        advice: advice,
      };
      res.status(400).json(errorResponse);
    }
  });
