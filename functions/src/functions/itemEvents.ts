/**
 * 品物イベント（Phase 58）
 *
 * 家族が品物を登録・編集・削除した際のイベントを記録し、
 * スタッフが「家族依頼」タブで確認できるようにする
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  ItemEvent,
  ItemEventType,
  ItemEventChange,
  GetItemEventsRequest,
  GetItemEventsResponse,
} from "../types";

const db = admin.firestore();
const REGION = "asia-northeast1";
const ITEM_EVENTS_COLLECTION = "item_events";

// =============================================================================
// ヘルパー関数（他ファイルからも利用可能）
// =============================================================================

/**
 * 品物イベントを記録
 */
export async function logItemEvent(params: {
  itemId: string;
  itemName: string;
  eventType: ItemEventType;
  performedBy: string;
  description?: string;
  changes?: ItemEventChange[];
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const eventId = `IE_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  const event: ItemEvent = {
    id: eventId,
    itemId: params.itemId,
    itemName: params.itemName,
    eventType: params.eventType,
    eventAt: now,
    performedBy: params.performedBy,
    description: params.description,
    changes: params.changes,
    metadata: params.metadata,
  };

  await db.collection(ITEM_EVENTS_COLLECTION).doc(eventId).set(event);

  console.log(`[ItemEvent] ${params.eventType}: ${params.itemName} by ${params.performedBy}`);
  return eventId;
}

/**
 * フィールド名を日本語に変換
 */
export function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: "品物名",
    itemCategory: "カテゴリ",
    initialQuantity: "初期数量",
    unit: "単位",
    expirationDate: "賞味期限",
    storageMethod: "保存方法",
    servingMethod: "提供方法",
    servingMethodDetail: "提供方法詳細",
    noteToStaff: "スタッフへの申し送り",
    remainingHandlingInstruction: "残った場合の対応",
    status: "ステータス",
    scheduleType: "提供スケジュール",
    scheduleDays: "提供曜日",
    specificDates: "提供日",
    scheduleTime: "提供時間帯",
    scheduleStartDate: "開始日",
  };
  return labels[field] || field;
}

/**
 * 値を表示用に変換
 */
export function formatValueForDisplay(field: string, value: unknown): string {
  if (value === null || value === undefined) return "(なし)";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  if (Array.isArray(value)) return value.join(", ") || "(なし)";

  // 特定フィールドの変換
  if (field === "storageMethod") {
    const map: Record<string, string> = {
      room_temp: "常温",
      refrigerated: "冷蔵",
      frozen: "冷凍",
    };
    return map[String(value)] || String(value);
  }

  if (field === "servingMethod") {
    const map: Record<string, string> = {
      as_is: "そのまま",
      cut: "カット",
      warm: "温める",
      other: "その他",
    };
    return map[String(value)] || String(value);
  }

  if (field === "remainingHandlingInstruction") {
    const map: Record<string, string> = {
      none: "指示なし",
      discarded: "破棄",
      stored: "保存",
    };
    return map[String(value)] || String(value);
  }

  if (field === "scheduleType") {
    const map: Record<string, string> = {
      daily: "毎日",
      weekly: "週ごと",
      specific_dates: "特定日",
      once: "1回のみ",
    };
    return map[String(value)] || String(value);
  }

  return String(value);
}

/**
 * 2つのオブジェクトの差分を検出してItemEventChange配列を生成
 */
export function detectChanges(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  fieldsToTrack: string[]
): ItemEventChange[] {
  const changes: ItemEventChange[] = [];

  for (const field of fieldsToTrack) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    // 値が異なる場合のみ
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field,
        fieldLabel: getFieldLabel(field),
        oldValue: formatValueForDisplay(field, oldVal),
        newValue: formatValueForDisplay(field, newVal),
      });
    }
  }

  return changes;
}

// =============================================================================
// API: 品物イベント取得
// =============================================================================

export const getItemEvents = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const data = req.query as unknown as GetItemEventsRequest;
      const {
        itemId,
        hoursAgo = 24,
        limit = 50,
      } = data;
      const parsedHoursAgo = typeof hoursAgo === "string" ? parseInt(hoursAgo, 10) : hoursAgo;
      const parsedLimit = typeof limit === "string" ? parseInt(limit, 10) : limit;

      // eventTypesは配列またはカンマ区切り文字列
      let eventTypes: string[] | undefined;
      const rawEventTypes = req.query.eventTypes;
      if (rawEventTypes) {
        if (Array.isArray(rawEventTypes)) {
          eventTypes = rawEventTypes as string[];
        } else if (typeof rawEventTypes === "string") {
          eventTypes = rawEventTypes.split(",");
        }
      }

      // 時間範囲の計算
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - parsedHoursAgo);
      const cutoffIso = cutoffTime.toISOString();

      // クエリ構築
      let query: admin.firestore.Query = db.collection(ITEM_EVENTS_COLLECTION);

      // 時間フィルター
      query = query.where("eventAt", ">=", cutoffIso);

      // 品物IDフィルター
      if (itemId) {
        query = query.where("itemId", "==", itemId);
      }

      // イベントタイプフィルター
      if (eventTypes && eventTypes.length > 0) {
        query = query.where("eventType", "in", eventTypes);
      }

      // ソート・リミット
      query = query.orderBy("eventAt", "desc").limit(parsedLimit);

      const snapshot = await query.get();
      const events: ItemEvent[] = [];

      snapshot.forEach((doc) => {
        events.push(doc.data() as ItemEvent);
      });

      const response: GetItemEventsResponse = {
        events,
        total: events.length,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("getItemEvents error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
