/**
 * OAuth Token Management - リフレッシュトークンの保存と使用
 * Phase 53: ユーザー認証不要でChat APIにアクセスするための仕組み
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {google} from "googleapis";
import {getFirestore} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";

// Firestore コレクション名
const OAUTH_TOKENS_COLLECTION = "oauth_tokens";
const CHAT_SYNC_TOKEN_DOC = "chat_sync";

// OAuth設定（環境変数から取得）
function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    "https://facility-care-input-form.web.app/settings";

  if (!clientId || !clientSecret) {
    throw new Error("OAuth credentials not configured");
  }

  return {clientId, clientSecret, redirectUri};
}

/**
 * 認可コードをトークンに交換し、Firestoreに保存
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<{success: boolean; error?: string}> {
  try {
    const {clientId, clientSecret, redirectUri} = getOAuthConfig();

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // 認可コードをトークンに交換
    const {tokens} = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return {
        success: false,
        error: "リフレッシュトークンが取得できませんでした。" +
          "再度ログインして「アクセスを許可」してください。",
      };
    }

    // Firebase Admin初期化
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    const db = getFirestore();

    // Firestoreに保存
    await db.collection(OAUTH_TOKENS_COLLECTION).doc(CHAT_SYNC_TOKEN_DOC).set({
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiryDate: tokens.expiry_date,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: "manual_auth",
    });

    functions.logger.info("[oauthToken] Refresh token saved successfully");
    return {success: true};
  } catch (error) {
    functions.logger.error("[oauthToken] Token exchange failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Token exchange failed",
    };
  }
}

/**
 * 保存されたリフレッシュトークンからアクセストークンを取得
 */
export async function getStoredAccessToken(): Promise<string | null> {
  try {
    const {clientId, clientSecret, redirectUri} = getOAuthConfig();

    // Firebase Admin初期化
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    const db = getFirestore();

    // Firestoreからトークン取得
    const doc = await db
      .collection(OAUTH_TOKENS_COLLECTION)
      .doc(CHAT_SYNC_TOKEN_DOC)
      .get();

    if (!doc.exists) {
      functions.logger.warn("[oauthToken] No stored token found");
      return null;
    }

    const data = doc.data();
    if (!data?.refreshToken) {
      functions.logger.warn("[oauthToken] No refresh token in document");
      return null;
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: data.refreshToken,
    });

    // アクセストークンを取得（自動的にリフレッシュ）
    const {token} = await oauth2Client.getAccessToken();

    if (!token) {
      functions.logger.error("[oauthToken] Failed to get access token");
      return null;
    }

    functions.logger.info("[oauthToken] Access token retrieved successfully");
    return token;
  } catch (error) {
    functions.logger.error("[oauthToken] Get access token failed:", error);
    return null;
  }
}

/**
 * 認可コード交換エンドポイント
 * POST /exchangeOAuthCode
 * Body: { code: string }
 */
export const exchangeOAuthCodeHandler = async (
  req: functions.https.Request,
  res: functions.Response
): Promise<void> => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
  }

  const {code} = req.body;

  if (!code) {
    res.status(400).json({success: false, error: "Authorization code required"});
    return;
  }

  const result = await exchangeCodeForTokens(code);

  if (result.success) {
    res.status(200).json({success: true, message: "Token saved successfully"});
  } else {
    res.status(400).json({success: false, error: result.error});
  }
};

export const exchangeOAuthCode = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onRequest(exchangeOAuthCodeHandler);

/**
 * 保存されたトークンの状態を確認
 * GET /checkOAuthToken
 */
export const checkOAuthTokenHandler = async (
  req: functions.https.Request,
  res: functions.Response
): Promise<void> => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
  }

  try {
    // Firebase Admin初期化
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    const db = getFirestore();

    const doc = await db
      .collection(OAUTH_TOKENS_COLLECTION)
      .doc(CHAT_SYNC_TOKEN_DOC)
      .get();

    if (!doc.exists) {
      res.status(200).json({
        success: true,
        configured: false,
        message: "トークンが設定されていません",
      });
      return;
    }

    const data = doc.data();
    const hasRefreshToken = !!data?.refreshToken;
    const updatedAt = data?.updatedAt?.toDate?.()?.toISOString() || null;

    res.status(200).json({
      success: true,
      configured: hasRefreshToken,
      updatedAt,
      message: hasRefreshToken ?
        "トークンが設定済みです" :
        "リフレッシュトークンがありません",
    });
  } catch (error) {
    functions.logger.error("[checkOAuthToken] Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check token status",
    });
  }
};

export const checkOAuthToken = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 10,
    memory: "256MB",
  })
  .https.onRequest(checkOAuthTokenHandler);

/**
 * OAuth認可URLを取得
 * GET /getOAuthUrl
 * Chat API用のOAuth認可URLを返す
 */
export const getOAuthUrlHandler = async (
  req: functions.https.Request,
  res: functions.Response
): Promise<void> => {
  // CORS設定
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({success: false, error: "Method not allowed"});
    return;
  }

  try {
    const {clientId, redirectUri} = getOAuthConfig();

    // Chat API用のスコープ
    const scopes = [
      "https://www.googleapis.com/auth/chat.spaces.readonly",
      "https://www.googleapis.com/auth/chat.messages.readonly",
    ];

    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      "&response_type=code" +
      `&scope=${encodeURIComponent(scopes.join(" "))}` +
      "&access_type=offline" +
      "&prompt=consent";

    res.status(200).json({
      success: true,
      data: {authUrl},
    });
  } catch (error) {
    functions.logger.error("[getOAuthUrl] Error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get OAuth URL",
    });
  }
};

export const getOAuthUrl = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 10,
    memory: "256MB",
  })
  .https.onRequest(getOAuthUrlHandler);
