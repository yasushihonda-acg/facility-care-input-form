/**
 * Webhook テスト送信関数
 *
 * 管理者設定画面から、Webhook URLの動作確認を行うためのAPI
 * 設計書: docs/ADMIN_TEST_FEATURE_SPEC.md
 */

import * as functions from "firebase-functions";
import {sendToGoogleChat} from "../services/googleChatService";

interface TestWebhookRequest {
  webhookUrl: string;
}

interface TestWebhookResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const testWebhook = functions
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
      const response: TestWebhookResponse = {
        success: false,
        message: "Method not allowed",
      };
      res.status(405).json(response);
      return;
    }

    const body = req.body as TestWebhookRequest;
    const {webhookUrl} = body;

    // バリデーション: URL必須
    if (!webhookUrl) {
      const response: TestWebhookResponse = {
        success: false,
        message: "webhookUrl is required",
      };
      res.status(400).json(response);
      return;
    }

    // バリデーション: Google Chat URLプレフィックス
    if (!webhookUrl.startsWith("https://chat.googleapis.com/")) {
      const response: TestWebhookResponse = {
        success: false,
        message: "無効なURLです",
        error: "URLは https://chat.googleapis.com/ で始まる必要があります",
      };
      res.status(400).json(response);
      return;
    }

    // テストメッセージを生成
    const timestamp = new Date().toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
    const testMessage = [
      "[テスト] 施設ケア入力フォームからの接続テストです。",
      "このメッセージが表示されれば設定は正常です。",
      "",
      `送信時刻: ${timestamp}`,
    ].join("\n");

    // Webhook送信
    functions.logger.info("[testWebhook] Testing webhook URL:", webhookUrl);
    const result = await sendToGoogleChat(webhookUrl, testMessage);

    if (result) {
      functions.logger.info("[testWebhook] Test successful");
      const response: TestWebhookResponse = {
        success: true,
        message: "テスト送信成功",
      };
      res.json(response);
    } else {
      functions.logger.warn("[testWebhook] Test failed");
      const response: TestWebhookResponse = {
        success: false,
        message: "テスト送信失敗",
        error: "Webhook URLが無効か、送信に失敗しました",
      };
      res.status(400).json(response);
    }
  });
