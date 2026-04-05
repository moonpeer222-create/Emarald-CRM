/**
 * Passport Stock Tracker — migrated to Firestore
 */
import { db } from "../../firebase/firestore";
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, query,
} from "firebase/firestore";

export type PassportLocation =
  | 'office'
  | 'imran_house'
  | 'medical'
  | 'vendor'
  | 'embassy'
  | 'customer';

export interface PassportTracking {
  id: string;
  caseId: string;
  customerName: string;
  passportNumber: string;
  currentLocation: PassportLocation;
  checkedOutAt: string;
  checkedOutBy: string;
  expectedReturnAt: string;
  actualReturnAt?: string;
  notes?: string;
  history: PassportMovement[];
}

export interface PassportMovement {
  id: string;
  from: PassportLocation;
  to: PassportLocation;
  movedAt: string;
  movedBy: string;
  notes?: string;
}

const STORAGE_KEY = 'crm_passport_tracking';
const ALERT_HOURS = 48;

export const LOCATIONS: { value: PassportLocation; label: string; labelUrdu: string; icon: string }[] = [
  { value: 'office', label: 'Office', labelUrdu: 'دفتر', icon: '🏢' },
  { value: 'imran_house', label: "Imran's House", labelUrdu: 'عمران کا گھر', icon: '🏠' },
  { value: 'medical', label: 'Medical Center', labelUrdu: 'میڈیکل سینٹر', icon: '🏥' },
  { value: 'vendor', label: 'Vendor', labelUrdu: 'وینڈر', icon: '👔' },
  { value: 'embassy', label: 'Embassy', labelUrdu: 'سفارت خانہ', icon: '🏛️' },
  { value: 'customer', label: 'With Customer', labelUrdu: 'کسٹمر کے پاس', icon: '👤' },
];

export function getLocationLabel(location: PassportLocation, urdu = false): string {
  const loc = LOCATIONS.find(l => l.value === location);
  return loc ? (urdu ? loc.labelUrdu : loc.label) : location;
}

export function getLocationIcon(location: PassportLocation): string {
  const loc = LOCATIONS.find(l => l.value === location);
  return loc ? loc.icon : '📍';
}

export class PassportTracker {
  private static _pushSync: (() => void) | null = null;
  private static _cache: PassportTracking[] | null = null;
  private static _syncTimer: any = null;
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
      const colRef = collection(db, "tenants", tenantId, "passportTracking");
      const snap = await getDocs(query(colRef));
      const trackings = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PassportTracking));
      this._cache = trackings;
      this._remoteIds = new Set(snap.docs.map((d) => d.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackings));

      if (this._unsub) this._unsub();
      this._unsub = onSnapshot(query(colRef), (snapshot) => {
        const remote = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PassportTracking));
        this._cache = remote;
        this._remoteIds = new Set(snapshot.docs.map((d) => d.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
        window.dispatchEvent(new CustomEvent("crm-passport-updated"));
      });
    } catch (err) {
      console.warn("[PassportTracker] Firestore init failed, falling back to localStorage:", err);
      this._cache = this._loadFromLocal();
    }
    this._initialized = true;
  }

  private static _loadFromLocal(): PassportTracking[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: PassportTracking[] = stored ? JSON.parse(stored) : [];
      const seen = new Map<string, PassportTracking>();
      for (const t of parsed) seen.set(t.passportNumber, t);
      const deduped = Array.from(seen.values());
      const idSet = new Set<string>();
      for (const t of deduped) {
        if (idSet.has(t.id)) t.id = `PT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        idSet.add(t.id);
      }
      return deduped;
    } catch { return []; }
  }

  private static save(trackings: PassportTracking[]): void {
    this._cache = trackings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trackings));
    this._debouncedSyncToFirestore();
    this.notifySync();
  }

  private static _debouncedSyncToFirestore() {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this._syncToFirestore(), 600);
  }

  private static async _syncToFirestore() {
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) return;
    const trackings = this._cache;
    if (!trackings) return;

    try {
      const localIds = new Set(trackings.map((t) => t.id));
      const toDelete = [...this._remoteIds].filter((id) => !localIds.has(id));
      const ops: { type: "delete" | "set"; ref: any; data?: any }[] = [];
      for (const id of toDelete) ops.push({ type: "delete", ref: doc(db, "tenants", tenantId, "passportTracking", id) });
      for (const t of trackings) ops.push({ type: "set", ref: doc(db, "tenants", tenantId, "passportTracking", t.id), data: t });

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
      console.error("[PassportTracker] Firestore sync failed:", err);
    }
  }

  static checkOut(data: {
    caseId: string;
    customerName: string;
    passportNumber: string;
    toLocation: PassportLocation;
    checkedOutBy: string;
    notes?: string;
  }): PassportTracking {
    const trackings = this._loadFromLocal();
    const existingIndex = trackings.findIndex(t => t.passportNumber === data.passportNumber);
    const now = new Date().toISOString();
    const expectedReturn = new Date(Date.now() + ALERT_HOURS * 60 * 60 * 1000).toISOString();

    if (existingIndex >= 0) {
      const existing = trackings[existingIndex];
      const movement: PassportMovement = {
        id: `MOV-${Date.now()}`,
        from: existing.currentLocation,
        to: data.toLocation,
        movedAt: now,
        movedBy: data.checkedOutBy,
        notes: data.notes,
      };
      existing.currentLocation = data.toLocation;
      existing.checkedOutAt = now;
      existing.checkedOutBy = data.checkedOutBy;
      existing.expectedReturnAt = expectedReturn;
      existing.actualReturnAt = undefined;
      existing.notes = data.notes;
      existing.history.push(movement);
      this.save(trackings);
      return existing;
    } else {
      const tracking: PassportTracking = {
        id: `PT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        caseId: data.caseId,
        customerName: data.customerName,
        passportNumber: data.passportNumber,
        currentLocation: data.toLocation,
        checkedOutAt: now,
        checkedOutBy: data.checkedOutBy,
        expectedReturnAt: expectedReturn,
        notes: data.notes,
        history: [{
          id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          from: 'office',
          to: data.toLocation,
          movedAt: now,
          movedBy: data.checkedOutBy,
          notes: 'Initial checkout',
        }],
      };
      trackings.push(tracking);
      this.save(trackings);
      return tracking;
    }
  }

  static returnToOffice(passportNumber: string, returnedBy: string): PassportTracking | null {
    const trackings = this._loadFromLocal();
    const index = trackings.findIndex(t => t.passportNumber === passportNumber);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const tracking = trackings[index];
    const movement: PassportMovement = {
      id: `MOV-${Date.now()}`,
      from: tracking.currentLocation,
      to: 'office',
      movedAt: now,
      movedBy: returnedBy,
      notes: 'Returned to office',
    };
    tracking.currentLocation = 'office';
    tracking.actualReturnAt = now;
    tracking.history.push(movement);
    this.save(trackings);
    return tracking;
  }

  static getCheckedOut(): PassportTracking[] {
    return this._loadFromLocal().filter(t => t.currentLocation !== 'office' && !t.actualReturnAt);
  }

  static getOverdue(): PassportTracking[] {
    const now = Date.now();
    return this.getCheckedOut().filter(t => {
      const expectedReturn = new Date(t.expectedReturnAt).getTime();
      return now > expectedReturn;
    });
  }

  static getByLocation(location: PassportLocation): PassportTracking[] {
    return this._loadFromLocal().filter(t => t.currentLocation === location && !t.actualReturnAt);
  }

  static getByCaseId(caseId: string): PassportTracking | null {
    const trackings = this._loadFromLocal();
    return trackings.find(t => t.caseId === caseId) || null;
  }

  static getByPassportNumber(passportNumber: string): PassportTracking | null {
    const trackings = this._loadFromLocal();
    return trackings.find(t => t.passportNumber === passportNumber) || null;
  }

  static getReturnStatus(tracking: PassportTracking): {
    isOverdue: boolean;
    hours: number;
    label: string;
  } {
    const now = Date.now();
    const expected = new Date(tracking.expectedReturnAt).getTime();
    const diffMs = expected - now;
    const hours = Math.abs(diffMs / (1000 * 60 * 60));

    if (diffMs <= 0) {
      return { isOverdue: true, hours, label: `${Math.floor(hours)}h overdue` };
    } else {
      return { isOverdue: false, hours, label: `${Math.floor(hours)}h remaining` };
    }
  }

  static getStats(): {
    total: number;
    checkedOut: number;
    overdue: number;
    byLocation: Record<PassportLocation, number>;
  } {
    const all = this._loadFromLocal();
    const checkedOut = this.getCheckedOut();
    const overdue = this.getOverdue();

    const byLocation: Record<PassportLocation, number> = {
      office: 0, imran_house: 0, medical: 0, vendor: 0, embassy: 0, customer: 0,
    };
    checkedOut.forEach(t => byLocation[t.currentLocation]++);

    return { total: all.length, checkedOut: checkedOut.length, overdue: overdue.length, byLocation };
  }
}
