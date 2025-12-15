/**
 * Drive フォルダ アクセステスト関数
 *
 * 管理者設定画面から、Google DriveフォルダIDの妥当性確認を行うためのAPI
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
}

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

      // エラーメッセージを取得
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Google API エラーの詳細を取得
      const googleError = error as {code?: number; errors?: Array<{reason?: string}>};
      if (googleError.code === 404) {
        errorMessage = "フォルダが見つかりません。IDを確認してください。";
      } else if (googleError.code === 403) {
        errorMessage =
          "フォルダへのアクセス権限がありません。" +
          "サービスアカウントにフォルダの編集者権限を付与してください。";
      }

      const errorResponse: TestDriveAccessResponse = {
        success: false,
        message: "フォルダにアクセスできません",
        error: errorMessage,
      };
      res.status(400).json(errorResponse);
    }
  });
