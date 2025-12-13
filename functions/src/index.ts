import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Health check endpoint
export const healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    project: process.env.GCLOUD_PROJECT,
  });
});
