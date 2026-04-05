// Sync Service stub — migrated to Firebase Firestore
// LocalStorage entities remain functional; cloud sync is handled by Firestore natively

// ============================================================
// Cross-tab sync via BroadcastChannel
// ============================================================
const SYNC_CHANNEL_NAME = "universal-crm-sync";
let broadcastChannel: BroadcastChannel | null = null;

export function initCrossTabSync() {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      const { type, entityKey, timestamp } = event.data || {};
      if (type === "entity-updated" && entityKey) {
        window.dispatchEvent(new CustomEvent("crm-cross-tab-update", { detail: { entityKey, timestamp } }));
      } else if (type === "sync-completed") {
        syncState.status = "synced";
        syncState.lastSyncAt = timestamp || new Date().toISOString();
        notifyListeners();
      } else if (type === "conflict-resolved") {
        window.dispatchEvent(new CustomEvent("crm-conflict-resolved", { detail: event.data }));
      }
    };
  } catch { /* BroadcastChannel not supported */ }
}

export function notifyCrossTab(entityKey: string) {
  try {
    broadcastChannel?.postMessage({ type: "entity-updated", entityKey, timestamp: new Date().toISOString() });
  } catch { /* ignore */ }
}

export function notifyCrossTabConflictResolved(entity: string, recordId: string, method: "local" | "server" | "cherry-pick") {
  try {
    broadcastChannel?.postMessage({ type: "conflict-resolved", entity, recordId, method, timestamp: new Date().toISOString() });
  } catch { /* ignore */ }
}

function notifyCrossTabSyncCompleted() {
  try {
    broadcastChannel?.postMessage({ type: "sync-completed", timestamp: new Date().toISOString() });
  } catch { /* ignore */ }
}

export type SyncStatus = "idle" | "syncing" | "error" | "offline" | "synced" | "local";

interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  pendingOps: number;
  error: string | null;
  serverAvailable: boolean;
}

let syncState: SyncState = {
  status: "synced",
  lastSyncAt: new Date().toISOString(),
  pendingOps: 0,
  error: null,
  serverAvailable: true,
};

type SyncListener = (state: SyncState) => void;
const listeners: Set<SyncListener> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn({ ...syncState }));
}

export function onSyncStateChange(fn: SyncListener): () => void {
  listeners.add(fn);
  fn({ ...syncState });
  return () => listeners.delete(fn);
}

export function getSyncState(): SyncState {
  return { ...syncState };
}

export async function checkServer(): Promise<boolean> {
  return true;
}

export async function initialSync(): Promise<boolean> {
  notifyListeners();
  return true;
}

export async function pushLocalToServer(): Promise<boolean> {
  return true;
}

export function schedulePush() {}

export async function pushCases(): Promise<void> {}

export async function pushAgentCodes(): Promise<void> {}

export async function pushAdminProfile(): Promise<void> {}

export async function pushAgentProfile(_name: string): Promise<void> {}

export async function pushCodeHistory(): Promise<void> {}

export async function pushNotifications(): Promise<void> {}

export async function pushUsers(): Promise<void> {}

export async function pushAttendance(): Promise<void> {}

export async function pushLeaveRequests(): Promise<void> {}

export async function pushAgentAvatar(_name: string): Promise<void> {}

export async function pullAgentAvatar(_name: string): Promise<string | null> {
  return null;
}

export async function pushPassportTracking(): Promise<void> {}

export async function pushAuditLog(): Promise<void> {}

export async function pushDocumentFiles(): Promise<void> {}

export async function pushSettings(): Promise<void> {}

export async function processQueue(): Promise<void> {}

export function startPeriodicSync(_intervalMs = 30000): void {}

export function stopPeriodicSync(): void {}

export async function forceSync(): Promise<boolean> {
  syncState.status = "synced";
  syncState.lastSyncAt = new Date().toISOString();
  syncState.error = null;
  notifyListeners();
  notifyCrossTabSyncCompleted();
  return true;
}

export function markEntityModified(_entityKey: string) {}

export interface ConflictEntry {
  entity: string;
  winner: "local" | "server" | "merged" | "empty";
  localTs: string | null;
  serverTs: string | null;
  detail?: string;
}

export interface ConflictLog {
  syncedAt: string;
  entries: ConflictEntry[];
}

export function getConflictLog(): ConflictLog | null {
  return null;
}

export function getConflictHistory(): ConflictLog[] {
  return [];
}

export function clearConflictHistory(): void {}

export interface PendingConflict {
  id: string;
  entity: string;
  recordId: string;
  localVersion: any;
  serverVersion: any;
  localTimestamp: string;
  serverTimestamp: string;
  detectedAt: string;
  resolved: boolean;
}

export function getPendingConflicts(): PendingConflict[] {
  return [];
}

export function savePendingConflicts(_conflicts: PendingConflict[]): void {}

export function addPendingConflict(_conflict: Omit<PendingConflict, "id" | "detectedAt" | "resolved">): void {}

export function resolveConflict(_conflictId: string, _chosenVersion: "local" | "server", _storageKey: string): void {}

export function resolveConflictWithCustomMerge(_conflictId: string, _mergedRecord: any, _storageKey: string): void {}

export function dismissConflict(_conflictId: string): void {}

export function clearResolvedConflicts(): void {}

export interface AutoExportConfig {
  enabled: boolean;
  recipients: string[];
  frequency: "daily" | "weekly" | "monthly";
}

export function getAutoExportConfig(): AutoExportConfig {
  return { enabled: false, recipients: [], frequency: "daily" };
}

export function setAutoExportConfig(_config: AutoExportConfig): void {}

export type ConflictAutoResolveMode = "prompt" | "prefer-local" | "prefer-server";

export function getConflictAutoResolveMode(): ConflictAutoResolveMode {
  return "prompt";
}

export function setConflictAutoResolveMode(_mode: ConflictAutoResolveMode): void {}

export type SyncIntervalOption = 30000 | 60000 | 120000 | 300000 | 900000 | 1800000 | 3600000;

export function getSyncInterval(): SyncIntervalOption {
  return 60000;
}

export function setSyncInterval(_intervalMs: SyncIntervalOption): void {}

export interface ConflictStats {
  total: number;
  pending: number;
  resolved: number;
  localWins: number;
  serverWins: number;
  merged: number;
}

export function getConflictStats(): ConflictStats {
  return { total: 0, pending: 0, resolved: 0, localWins: 0, serverWins: 0, merged: 0 };
}

export function getLocalEntityTimestamps(): Record<string, string> {
  return {};
}

export function saveLocalEntityTimestamps(_timestamps: Record<string, string>): void {}

export function saveConflictLog(_log: ConflictLog): void {}
