/**
 * Audit Log System — migrated to Firestore
 */
import { db } from "../../firebase/firestore";
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, query,
} from "firebase/firestore";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: "master_admin" | "admin" | "agent" | "customer";
  action: AuditAction;
  category: "case" | "payment" | "document" | "auth" | "system" | "attendance" | "approval" | "user";
  description: string;
  descriptionUrdu?: string;
  metadata?: Record<string, any>;
  ipAddress: string;
}

export type AuditAction =
  | "login"
  | "logout"
  | "case_created"
  | "case_updated"
  | "case_stage_changed"
  | "payment_added"
  | "payment_approved"
  | "payment_rejected"
  | "document_uploaded"
  | "document_verified"
  | "document_rejected"
  | "broadcast_sent"
  | "meeting_scheduled"
  | "user_created"
  | "user_updated"
  | "user_status_changed"
  | "settings_changed"
  | "approval_granted"
  | "approval_denied"
  | "passport_checkout"
  | "passport_returned"
  | "attendance_checkin"
  | "attendance_checkout"
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "note_added"
  | "report_generated"
  | "data_exported"
  | "case_cancelled"
  | "case_reopened"
  | "sir_atif_approved"
  | "sir_atif_revoked";

const STORAGE_KEY = "crm_audit_log";
const MAX_ENTRIES = 500;

function getSimulatedIP(): string {
  const octets = [192, 168, Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 254) + 1];
  return octets.join(".");
}

export class AuditLogService {
  private static _pushSync: (() => void) | null = null;
  private static _syncTimer: any = null;
  private static _cache: AuditEntry[] | null = null;
  private static _remoteIds: Set<string> = new Set();
  private static _unsub: (() => void) | null = null;
  private static _initialized = false;

  static registerSyncPush(pushFn: () => void) {
    this._pushSync = pushFn;
  }

  private static notifySync() {
    if (this._pushSync) this._pushSync();
  }

  static async initialize(): Promise<void> {
    if (this._initialized) return;
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) {
      this._cache = this._loadFromLocal();
      this._initialized = true;
      return;
    }

    try {
      const colRef = collection(db, "tenants", tenantId, "auditLogs");
      const snap = await getDocs(query(colRef));
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry));
      this._cache = entries;
      this._remoteIds = new Set(snap.docs.map((d) => d.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

      if (this._unsub) this._unsub();
      this._unsub = onSnapshot(query(colRef), (snapshot) => {
        const remote = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry));
        this._cache = remote;
        this._remoteIds = new Set(snapshot.docs.map((d) => d.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        window.dispatchEvent(new CustomEvent("crm-audit-updated"));
      });
    } catch (err) {
      console.warn("[AuditLogService] Firestore init failed, falling back to localStorage:", err);
      this._cache = this._loadFromLocal();
    }
    this._initialized = true;
  }

  private static _loadFromLocal(): AuditEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* fall through */ }
    return [];
  }

  static getAll(): AuditEntry[] {
    if (this._cache !== null) return this._cache;
    return this._loadFromLocal();
  }

  private static save(entries: AuditEntry[]): void {
    const trimmed = entries.slice(0, MAX_ENTRIES);
    this._cache = trimmed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    this._debouncedSyncToFirestore();
    this.notifySync();
  }

  private static _debouncedSyncToFirestore() {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this._syncToFirestore(), 5000);
  }

  private static async _syncToFirestore() {
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) return;
    const entries = this._cache;
    if (!entries) return;

    try {
      const localIds = new Set(entries.map((e) => e.id));
      const toDelete = [...this._remoteIds].filter((id) => !localIds.has(id));
      const ops: { type: "delete" | "set"; ref: any; data?: any }[] = [];
      for (const id of toDelete) ops.push({ type: "delete", ref: doc(db, "tenants", tenantId, "auditLogs", id) });
      for (const e of entries) ops.push({ type: "set", ref: doc(db, "tenants", tenantId, "auditLogs", e.id), data: e });

      const MAX_BATCH = 500;
      for (let i = 0; i < ops.length; i += MAX_BATCH) {
        const batch = writeBatch(db);
        const chunk = ops.slice(i, i + MAX_BATCH);
        for (const op of chunk) {
          if (op.type === "delete") batch.delete(op.ref);
          else batch.set(op.ref, op.data, { merge: true });
        }
        await batch.commit();
      }
      this._remoteIds = localIds;
    } catch (err) {
      console.error("[AuditLogService] Firestore sync failed:", err);
    }
  }

  static log(entry: Omit<AuditEntry, "id" | "timestamp" | "ipAddress">): AuditEntry {
    const entries = this.getAll();
    const newEntry: AuditEntry = {
      ...entry,
      id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ipAddress: getSimulatedIP(),
    };
    entries.unshift(newEntry);
    this.save(entries);
    return newEntry;
  }

  static getByRole(role: string): AuditEntry[] {
    return this.getAll().filter(e => e.role === role);
  }

  static getByUser(userId: string): AuditEntry[] {
    return this.getAll().filter(e => e.userId === userId);
  }

  static getByCategory(category: AuditEntry["category"]): AuditEntry[] {
    return this.getAll().filter(e => e.category === category);
  }

  static getRecent(count: number = 20): AuditEntry[] {
    return this.getAll().slice(0, count);
  }

  static search(query: string): AuditEntry[] {
    const q = query.toLowerCase();
    return this.getAll().filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.userName.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      (e.metadata && JSON.stringify(e.metadata).toLowerCase().includes(q))
    );
  }

  static clearAll(): void {
    this._cache = [];
    localStorage.removeItem(STORAGE_KEY);
    this._debouncedSyncToFirestore();
  }

  static logCaseCreated(userName: string, role: AuditEntry["role"], caseId: string, customerName: string) {
    return this.log({
      userId: userName, userName, role,
      action: "case_created", category: "case",
      description: `Created case ${caseId} for ${customerName}`,
      descriptionUrdu: `کیس ${caseId} بنایا - ${customerName}`,
      metadata: { caseId, customerName },
    });
  }

  static logCaseStageChanged(userName: string, role: AuditEntry["role"], caseId: string, oldStage: string, newStage: string) {
    return this.log({
      userId: userName, userName, role,
      action: "case_stage_changed", category: "case",
      description: `Changed case ${caseId} from "${oldStage}" to "${newStage}"`,
      descriptionUrdu: `کیس ${caseId} کی حیثیت ${oldStage} سے ${newStage} تبدیل کی`,
      metadata: { caseId, oldStage, newStage },
    });
  }

  static logPaymentAction(userName: string, role: AuditEntry["role"], action: "payment_added" | "payment_approved" | "payment_rejected", caseId: string, amount?: number) {
    const labels: Record<string, string> = {
      payment_added: `Recorded payment of PKR ${amount?.toLocaleString()} for case ${caseId}`,
      payment_approved: `Approved payment for case ${caseId}`,
      payment_rejected: `Rejected payment for case ${caseId}`,
    };
    return this.log({
      userId: userName, userName, role,
      action, category: "payment",
      description: labels[action],
      metadata: { caseId, amount },
    });
  }

  static logDocumentAction(userName: string, role: AuditEntry["role"], action: "document_uploaded" | "document_verified" | "document_rejected", caseId: string, docName: string) {
    const labels: Record<string, string> = {
      document_uploaded: `Uploaded "${docName}" for case ${caseId}`,
      document_verified: `Verified "${docName}" for case ${caseId}`,
      document_rejected: `Rejected "${docName}" for case ${caseId}`,
    };
    return this.log({
      userId: userName, userName, role,
      action, category: "document",
      description: labels[action],
      metadata: { caseId, docName },
    });
  }

  static logAuth(userName: string, role: AuditEntry["role"], action: "login" | "logout") {
    return this.log({
      userId: userName, userName, role,
      action, category: "auth",
      description: `${userName} ${action === "login" ? "logged in" : "logged out"} as ${role}`,
    });
  }

  static logApproval(userName: string, action: "approval_granted" | "approval_denied", targetItem: string, details?: string) {
    return this.log({
      userId: userName, userName, role: "admin",
      action, category: "approval",
      description: `${action === "approval_granted" ? "Approved" : "Denied"}: ${targetItem}${details ? ` — ${details}` : ""}`,
      metadata: { targetItem },
    });
  }

  private static generateSeedEntries(): AuditEntry[] {
    return [];
  }
}
