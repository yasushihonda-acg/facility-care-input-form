/**
 * ヘルスチェック関数
 * システムの正常動作確認用
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {FUNCTIONS_CONFIG} from "../config/sheets";

/**
 * healthCheck 関数本体
 */
function healthCheckHandler(req: Request, res: Response): void {
  // CORS対応
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    project: process.env.GCLOUD_PROJECT,
    version: "1.0.0",
  });
}

/**
 * Cloud Functions エクスポート
 */
export const healthCheck = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(healthCheckHandler);
