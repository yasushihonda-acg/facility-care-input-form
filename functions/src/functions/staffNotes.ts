/**
 * スタッフ注意事項 API
 * Phase 40: スタッフ専用の注意事項管理機能
 */

import * as functions from "firebase-functions";
import {Request, Response} from "express";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {FUNCTIONS_CONFIG} from "../config/sheets";
import type {
  ApiResponse,
  StaffNote,
  StaffNotePriority,
  CreateStaffNoteRequest,
  CreateStaffNoteResponse,
  GetStaffNotesResponse,
  UpdateStaffNoteRequest,
  UpdateStaffNoteResponse,
} from "../types";
import {getTodayString} from "../utils/scheduleUtils";

// Firestoreコレクション名
const STAFF_NOTES_COLLECTION = "staffNotes";

/**
 * CORS設定を適用
 */
function setCorsHeaders(res: Response): void {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

/**
 * 注意事項が表示対象かどうかを判定
 * - critical: 常に表示
 * - warning/normal: 期間内のみ表示
 */
function isNoteVisible(note: StaffNote): boolean {
  if (note.priority === "critical") {
    return true;
  }

  const todayStr = getTodayString();

  if (note.startDate && note.startDate > todayStr) {
    return false;
  }

  if (note.endDate && note.endDate < todayStr) {
    return false;
  }

  return true;
}

/**
 * 注意事項一覧取得 (getStaffNotes)
 * GET /getStaffNotes
 */
async function getStaffNotesHandler(req: Request, res: Response): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({success: false, error: {code: "METHOD_NOT_ALLOWED", message: "Only GET allowed"}});
    return;
  }

  const timestamp = new Date().toISOString();
  const db = getFirestore();

  try {
    const includeAll = req.query.includeAll === "true";

    // 全注意事項を取得
    const snapshot = await db.collection(STAFF_NOTES_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    let notes: StaffNote[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        priority: data.priority as StaffNotePriority,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate().toISOString() || timestamp,
        updatedAt: data.updatedAt?.toDate().toISOString() || timestamp,
      };
    });

    // 期間外をフィルタ（includeAll=falseの場合）
    if (!includeAll) {
      notes = notes.filter(isNoteVisible);
    }

    // 優先度でソート（critical > warning > normal）
    const priorityOrder: Record<StaffNotePriority, number> = {
      critical: 0,
      warning: 1,
      normal: 2,
    };
    notes.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    functions.logger.info("getStaffNotes success", {count: notes.length});

    const response: ApiResponse<GetStaffNotesResponse> = {
      success: true,
      data: {
        notes,
        total: notes.length,
      },
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("getStaffNotes error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

export const getStaffNotes = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(getStaffNotesHandler);

/**
 * 注意事項作成 (createStaffNote)
 * POST /createStaffNote
 */
async function createStaffNoteHandler(req: Request, res: Response): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({success: false, error: {code: "METHOD_NOT_ALLOWED", message: "Only POST allowed"}});
    return;
  }

  const timestamp = new Date().toISOString();
  const db = getFirestore();

  try {
    const body = req.body as CreateStaffNoteRequest;
    const {content, priority, createdBy} = body;

    // バリデーション
    if (!content || !priority || !createdBy) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Required fields: content, priority, createdBy",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // warning/normalの場合は期間必須
    if ((priority === "warning" || priority === "normal") && (!body.startDate || !body.endDate)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "startDate and endDate are required for warning/normal priority",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // 注意事項ID生成
    const noteId = `NOTE${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    // 注意事項データ作成
    const noteData = {
      id: noteId,
      content,
      priority,
      startDate: body.startDate || null,
      endDate: body.endDate || null,
      createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Firestoreに保存
    await db.collection(STAFF_NOTES_COLLECTION).doc(noteId).set(noteData);

    functions.logger.info("createStaffNote success", {noteId});

    const response: ApiResponse<CreateStaffNoteResponse> = {
      success: true,
      data: {
        noteId,
        createdAt: timestamp,
      },
      timestamp,
    };
    res.status(201).json(response);
  } catch (error) {
    functions.logger.error("createStaffNote error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

export const createStaffNote = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(createStaffNoteHandler);

/**
 * 注意事項更新 (updateStaffNote)
 * PUT /updateStaffNote
 */
async function updateStaffNoteHandler(req: Request, res: Response): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "PUT") {
    res.status(405).json({success: false, error: {code: "METHOD_NOT_ALLOWED", message: "Only PUT allowed"}});
    return;
  }

  const timestamp = new Date().toISOString();
  const db = getFirestore();

  try {
    const body = req.body as UpdateStaffNoteRequest;
    const {noteId, updates} = body;

    // バリデーション
    if (!noteId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Required field: noteId",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // 既存の注意事項を取得
    const docRef = db.collection(STAFF_NOTES_COLLECTION).doc(noteId);
    const doc = await docRef.get();

    if (!doc.exists) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Staff note not found",
        },
        timestamp,
      };
      res.status(404).json(response);
      return;
    }

    // 更新後の優先度を確認（期間バリデーション用）
    const currentData = doc.data();
    const newPriority = updates.priority || currentData?.priority;
    const newStartDate = updates.startDate !== undefined ? updates.startDate : currentData?.startDate;
    const newEndDate = updates.endDate !== undefined ? updates.endDate : currentData?.endDate;

    // warning/normalの場合は期間必須
    if ((newPriority === "warning" || newPriority === "normal") && (!newStartDate || !newEndDate)) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "startDate and endDate are required for warning/normal priority",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // 更新データ作成
    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.startDate !== undefined) updateData.startDate = updates.startDate;
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate;

    // Firestoreを更新
    await docRef.update(updateData);

    functions.logger.info("updateStaffNote success", {noteId});

    const response: ApiResponse<UpdateStaffNoteResponse> = {
      success: true,
      data: {
        noteId,
        updatedAt: timestamp,
      },
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("updateStaffNote error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

export const updateStaffNote = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(updateStaffNoteHandler);

/**
 * 注意事項削除 (deleteStaffNote)
 * DELETE /deleteStaffNote
 */
async function deleteStaffNoteHandler(req: Request, res: Response): Promise<void> {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "DELETE") {
    res.status(405).json({success: false, error: {code: "METHOD_NOT_ALLOWED", message: "Only DELETE allowed"}});
    return;
  }

  const timestamp = new Date().toISOString();
  const db = getFirestore();

  try {
    const noteId = req.query.noteId as string;

    // バリデーション
    if (!noteId) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Required query parameter: noteId",
        },
        timestamp,
      };
      res.status(400).json(response);
      return;
    }

    // 注意事項の存在確認
    const docRef = db.collection(STAFF_NOTES_COLLECTION).doc(noteId);
    const doc = await docRef.get();

    if (!doc.exists) {
      const response: ApiResponse<null> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Staff note not found",
        },
        timestamp,
      };
      res.status(404).json(response);
      return;
    }

    // 削除
    await docRef.delete();

    functions.logger.info("deleteStaffNote success", {noteId});

    const response: ApiResponse<null> = {
      success: true,
      timestamp,
    };
    res.status(200).json(response);
  } catch (error) {
    functions.logger.error("deleteStaffNote error", error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp,
    };
    res.status(500).json(response);
  }
}

export const deleteStaffNote = functions
  .region(FUNCTIONS_CONFIG.REGION)
  .runWith({
    timeoutSeconds: 60,
    memory: "256MB",
    serviceAccount: FUNCTIONS_CONFIG.SERVICE_ACCOUNT,
  })
  .https.onRequest(deleteStaffNoteHandler);
