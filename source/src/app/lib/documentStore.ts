/**
 * DocumentFileStore — migrated to Firestore
 * Metadata synced to Firestore; binaries still use Cloud Storage API stubs.
 */
import { documentStorageApi, documentUploadApi } from "./api";
import { db } from "../../firebase/firestore";
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, query,
} from "firebase/firestore";

const STORAGE_KEY = "crm_document_files";
const LARGE_FILE_THRESHOLD = 500 * 1024;

interface StoredFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  base64: string;
  uploadedBy: string;
  uploadedAt: string;
  storageRef?: string;
  isCloudStored?: boolean;
}

let _cache: Record<string, StoredFile> | null = null;
let _syncTimer: any = null;
let _remoteIds: Set<string> = new Set();
let _unsub: (() => void) | null = null;
let _initialized = false;

function loadFromLocal(): Record<string, StoredFile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveLocal(data: Record<string, StoredFile>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("DocumentFileStore: localStorage full, cleaning old entries", e);
    const entries = Object.entries(data).sort(
      ([, a], [, b]) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
    );
    const removeCount = Math.max(1, Math.floor(entries.length * 0.2));
    entries.slice(0, removeCount).forEach(([key]) => delete data[key]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.error("DocumentFileStore: unable to save even after cleanup");
    }
  }
}

async function initialize(): Promise<void> {
  if (_initialized) return;
  const tenantId = localStorage.getItem("crm_tenant_id");
  if (!tenantId) {
    _cache = loadFromLocal();
    _initialized = true;
    return;
  }

  try {
    const colRef = collection(db, "tenants", tenantId, "documentFiles");
    const snap = await getDocs(query(colRef));
    const data: Record<string, StoredFile> = {};
    snap.docs.forEach((d) => { data[d.id] = { id: d.id, ...d.data() } as StoredFile; });
    _cache = data;
    _remoteIds = new Set(snap.docs.map((d) => d.id));
    saveLocal(data);

    if (_unsub) _unsub();
    _unsub = onSnapshot(query(colRef), (snapshot) => {
      const remote: Record<string, StoredFile> = {};
      snapshot.docs.forEach((d) => { remote[d.id] = { id: d.id, ...d.data() } as StoredFile; });
      _cache = remote;
      _remoteIds = new Set(snapshot.docs.map((d) => d.id));
      saveLocal(remote);
      window.dispatchEvent(new Event("crm_document_files_changed"));
    });
  } catch (err) {
    console.warn("[DocumentFileStore] Firestore init failed, falling back to localStorage:", err);
    _cache = loadFromLocal();
  }
  _initialized = true;
}

function debouncedSyncToFirestore() {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => syncToFirestore(), 600);
}

async function syncToFirestore() {
  const tenantId = localStorage.getItem("crm_tenant_id");
  if (!tenantId) return;
  const data = _cache;
  if (!data) return;

  try {
    const localIds = new Set(Object.keys(data));
    const toDelete = [..._remoteIds].filter((id) => !localIds.has(id));
    const ops: { type: "delete" | "set"; ref: any; data?: any }[] = [];
    for (const id of toDelete) ops.push({ type: "delete", ref: doc(db, "tenants", tenantId, "documentFiles", id) });
    for (const [id, file] of Object.entries(data)) ops.push({ type: "set", ref: doc(db, "tenants", tenantId, "documentFiles", id), data: file });

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
    _remoteIds = localIds;
  } catch (err) {
    console.error("[DocumentFileStore] Firestore sync failed:", err);
  }
}

export const DocumentFileStore = {
  _listeners: new Set<() => void>(),

  initialize,

  subscribe(listener: () => void) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  },

  registerSyncPush(pushFn: () => void) {
    this._listeners.add(pushFn);
  },

  notifySync() {
    this._listeners.forEach(listener => listener());
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("crm_document_files_changed"));
    }
  },

  clearAll() {
    _cache = {};
    localStorage.removeItem(STORAGE_KEY);
    debouncedSyncToFirestore();
    this.notifySync();
    console.log("[DocumentFileStore] All local document metadata cleared.");
  },

  async storeFile(docId: string, file: File, uploadedBy: string, opts?: {
    caseId?: string;
    checklistKey?: string;
    uploadedByRole?: string;
  }): Promise<boolean> {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      console.error(`File type '${file.type}' not allowed. Only PNG, JPG, PDF accepted.`);
      return false;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const all = _cache ?? loadFromLocal();

        all[docId] = {
          id: docId,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          base64: "",
          uploadedBy,
          uploadedAt: new Date().toISOString(),
          isCloudStored: true,
          storageRef: `${opts?.caseId || docId}/${docId}/${file.name}`,
        };
        _cache = all;
        saveLocal(all);
        this.notifySync();
        debouncedSyncToFirestore();

        if (opts?.caseId) {
          (documentUploadApi as any).uploadForm?.(file, opts.caseId, docId, {
            checklistKey: opts.checklistKey,
            uploadedBy,
            uploadedByRole: opts.uploadedByRole,
          }).then((res: any) => {
            if (res?.success && res?.data) {
              console.log(`[PRODUCTION] File uploaded to cloud: ${res.data.storagePath} (${res.data.fileSize} bytes)`);
              const current = _cache ?? loadFromLocal();
              if (current[docId]) {
                current[docId].storageRef = res.data.storagePath;
                current[docId].isCloudStored = true;
                _cache = current;
                saveLocal(current);
                debouncedSyncToFirestore();
              }
            } else {
              console.warn(`Form upload failed, trying base64 fallback:`, res?.error);
              documentStorageApi.upload(docId, file.name, file.type, base64).then((fallbackRes) => {
                if (fallbackRes.success) {
                  console.log(`[FALLBACK] File uploaded via base64: ${docId}/${file.name}`);
                } else {
                  console.warn(`All cloud uploads failed for ${docId}/${file.name}, storing locally`);
                  const current = _cache ?? loadFromLocal();
                  if (current[docId]) {
                    current[docId].base64 = base64;
                    current[docId].isCloudStored = false;
                    _cache = current;
                    saveLocal(current);
                    debouncedSyncToFirestore();
                    this.notifySync();
                  }
                }
              }).catch(() => {
                const current = _cache ?? loadFromLocal();
                if (current[docId]) {
                  current[docId].base64 = base64;
                  current[docId].isCloudStored = false;
                  _cache = current;
                  saveLocal(current);
                  debouncedSyncToFirestore();
                  this.notifySync();
                }
              });
            }
          }).catch((err: any) => {
            console.warn(`Cloud upload error for ${docId}/${file.name}:`, err);
            const current = _cache ?? loadFromLocal();
            if (current[docId]) {
              current[docId].base64 = base64;
              current[docId].isCloudStored = false;
              _cache = current;
              saveLocal(current);
              debouncedSyncToFirestore();
              this.notifySync();
            }
          });
        } else {
          documentStorageApi.upload(docId, file.name, file.type, base64).then((res) => {
            if (res.success) {
              console.log(`File uploaded to cloud storage: ${docId}/${file.name}`);
            } else {
              console.warn(`Cloud upload failed, storing locally:`, res.error);
              const current = _cache ?? loadFromLocal();
              if (current[docId]) {
                current[docId].base64 = base64;
                current[docId].isCloudStored = false;
                current[docId].storageRef = undefined;
                _cache = current;
                saveLocal(current);
                debouncedSyncToFirestore();
                this.notifySync();
              }
            }
          }).catch((err) => {
            console.warn(`Cloud upload error, keeping local:`, err);
            const current = _cache ?? loadFromLocal();
            if (current[docId]) {
              current[docId].base64 = base64;
              current[docId].isCloudStored = false;
              current[docId].storageRef = undefined;
              _cache = current;
              saveLocal(current);
              debouncedSyncToFirestore();
              this.notifySync();
            }
          });
        }

        resolve(true);
      };
      reader.onerror = () => resolve(false);
      reader.readAsDataURL(file);
    });
  },

  getFile(docId: string): StoredFile | null {
    const all = _cache ?? loadFromLocal();
    return all[docId] || null;
  },

  hasFile(docId: string): boolean {
    const all = _cache ?? loadFromLocal();
    return !!all[docId];
  },

  deleteFile(docId: string): void {
    const all = _cache ?? loadFromLocal();
    const file = all[docId];
    if (file?.isCloudStored && file.storageRef) {
      documentStorageApi.remove(docId, file.fileName).catch((err) => {
        console.warn(`Failed to delete cloud file ${docId}/${file.fileName}:`, err);
      });
    }
    delete all[docId];
    _cache = all;
    saveLocal(all);
    debouncedSyncToFirestore();
    this.notifySync();
  },

  async downloadFile(docId: string): Promise<boolean> {
    const stored = this.getFile(docId);
    if (!stored) return false;

    if (stored.isCloudStored && stored.storageRef) {
      try {
        const res = await documentStorageApi.getSignedUrl(docId, stored.fileName);
        if (res.success && res.data?.signedUrl) {
          const link = document.createElement("a");
          link.href = res.data.signedUrl;
          link.download = stored.fileName;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return true;
        }
      } catch (err) {
        console.error("Download from cloud failed:", err);
      }
      return false;
    }

    if (!stored.base64) return false;
    const link = document.createElement("a");
    link.href = stored.base64;
    link.download = stored.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  },

  getPreviewUrl(docId: string): string | null {
    const stored = this.getFile(docId);
    if (!stored) return null;
    if (stored.isCloudStored) return null;
    if (stored.mimeType.startsWith("image/")) return stored.base64;
    return null;
  },

  async getCloudPreviewUrl(docId: string): Promise<string | null> {
    const stored = this.getFile(docId);
    if (!stored || !stored.isCloudStored || !stored.mimeType.startsWith("image/")) return null;
    try {
      const res = await documentStorageApi.getSignedUrl(docId, stored.fileName);
      if (res.success && res.data?.signedUrl) return res.data.signedUrl;
    } catch { /* ignore */ }
    return null;
  },

  getCount(): number {
    return Object.keys(_cache ?? loadFromLocal()).length;
  },

  getStats(): { total: number; local: number; cloud: number; totalSizeBytes: number; legacyLargeFiles: number } {
    const all = _cache ?? loadFromLocal();
    const entries = Object.values(all);
    return {
      total: entries.length,
      local: entries.filter((f) => !f.isCloudStored).length,
      cloud: entries.filter((f) => f.isCloudStored).length,
      totalSizeBytes: entries.reduce((sum, f) => sum + f.size, 0),
      legacyLargeFiles: entries.filter((f) => !f.isCloudStored && f.base64 && f.size >= LARGE_FILE_THRESHOLD).length,
    };
  },

  async migrateLegacyFiles(onProgress?: (migrated: number, total: number) => void): Promise<number> {
    const all = _cache ?? loadFromLocal();
    const legacyFiles = Object.values(all).filter(
      (f) => !f.isCloudStored && f.base64 && f.size >= LARGE_FILE_THRESHOLD
    );

    if (legacyFiles.length === 0) return 0;
    let migrated = 0;

    for (const file of legacyFiles) {
      try {
        const res = await documentStorageApi.upload(file.id, file.fileName, file.mimeType, file.base64);
        if (res.success) {
          const current = _cache ?? loadFromLocal();
          if (current[file.id]) {
            current[file.id].base64 = "";
            current[file.id].isCloudStored = true;
            current[file.id].storageRef = `${file.id}/${file.fileName}`;
            _cache = current;
            saveLocal(current);
          }
          migrated++;
          onProgress?.(migrated, legacyFiles.length);
        } else {
          console.warn(`Migration failed for ${file.id}/${file.fileName}:`, res.error);
        }
      } catch (err) {
        console.warn(`Migration error for ${file.id}/${file.fileName}:`, err);
      }
    }

    if (migrated > 0) {
      debouncedSyncToFirestore();
      this.notifySync();
    }

    return migrated;
  },
};
