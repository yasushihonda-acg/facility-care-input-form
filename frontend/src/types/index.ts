// Sheet record types
export interface SheetRecord {
  id: string;
  sheetName: string;
  data: Record<string, unknown>;
  syncedAt: string;
}

export interface SheetSummary {
  sheetName: string;
  recordCount: number;
  lastSyncedAt: string | null;
}

// API response types
export interface SyncResponse {
  success: boolean;
  data: {
    syncedSheets: string[];
    totalRecords: number;
    syncDuration: number;
  };
  timestamp: string;
}

export interface GetPlanDataResponse {
  success: boolean;
  data: {
    sheets: SheetSummary[];
    records: SheetRecord[];
    totalRecords: number;
  };
  timestamp: string;
}

// Sync state
export interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}
