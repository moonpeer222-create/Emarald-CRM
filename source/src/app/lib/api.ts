// API Client stub — migrated to Firebase Firestore
// Legacy Supabase Edge Function endpoints are no-ops

function emptyOk<T>(defaultValue: T) {
  return async (): Promise<{ success: boolean; data?: T; error?: string }> => ({
    success: true,
    data: defaultValue,
  });
}

export function getSessionToken(): string | null {
  return null;
}

export function setSessionToken(_token: string): void {}

export function clearSessionToken(): void {}

export function setServerAvailable(_available: boolean) {}

export function isServerAvailable() {
  return true;
}

async function request<T = any>(
  _path: string,
  _options: RequestInit = {},
  _silent = false
): Promise<{ success: boolean; data?: T; error?: string }> {
  return { success: true };
}

// ============================================================
// Cases
// ============================================================
export const casesApi = {
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
  update: emptyOk<void>(undefined),
  remove: emptyOk<void>(undefined),
};

// ============================================================
// Agent Access Codes
// ============================================================
export const agentCodesApi = {
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Code History
// ============================================================
export const codeHistoryApi = {
  get: emptyOk<any[]>([]),
  save: emptyOk<void>(undefined),
};

// ============================================================
// Admin Profile
// ============================================================
export const adminProfileApi = {
  get: emptyOk<any>({}),
  save: emptyOk<void>(undefined),
};

// ============================================================
// Agent Profile
// ============================================================
export const agentProfileApi = {
  get: (_name: string) => emptyOk<any>({})(),
  save: (_name: string, _profile: any) => emptyOk<void>(undefined)(),
};

// ============================================================
// Agent Avatar (synced to cloud)
// ============================================================
export const agentAvatarApi = {
  get: (_name: string) => emptyOk<string | null>(null)(),
  save: (_name: string, _avatar: string | null) => emptyOk<void>(undefined)(),
};

// ============================================================
// Settings
// ============================================================
export const settingsApi = {
  get: emptyOk<any>({}),
  save: emptyOk<void>(undefined),
};

// ============================================================
// Notifications
// ============================================================
export const notificationsApi = {
  get: emptyOk<any[]>([]),
  save: emptyOk<void>(undefined),
};

// ============================================================
// Attendance
// ============================================================
export const attendanceApi = {
  get: (_date: string) => emptyOk<any[]>([])(),
  save: (_date: string, _records: any[]) => emptyOk<void>(undefined)(),
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Leave Requests
// ============================================================
export const leaveRequestsApi = {
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Users Database
// ============================================================
export const usersApi = {
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Bulk Sync
// ============================================================
export interface SyncData {
  cases?: any[] | null;
  agentCodes?: any[] | null;
  adminProfile?: any | null;
  codeHistory?: any[] | null;
  settings?: any | null;
  notifications?: any[] | null;
  users?: any[] | null;
  attendance?: any[] | null;
  leaveRequests?: any[] | null;
  passportTracking?: any[] | null;
  auditLog?: any[] | null;
  documentFiles?: any | null;
}

export interface SyncDownloadResponse {
  data: SyncData;
  entityTimestamps: Record<string, string> | null;
}

export const syncApi = {
  download: emptyOk<SyncData>({}),
  upload: (_data: SyncData) => emptyOk<void>(undefined)(),
};

// ============================================================
// Generic KV
// ============================================================
export const kvApi = {
  get: (_key: string) => emptyOk<any>(null)(),
  set: (_key: string, _value: any) => emptyOk<void>(undefined)(),
};

// ============================================================
// Passport Tracking
// ============================================================
export const passportTrackingApi = {
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Audit Log
// ============================================================
export const auditLogApi = {
  getAll: emptyOk<any[]>([]),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Document Files (metadata sync)
// ============================================================
export const documentFilesApi = {
  getAll: emptyOk<any>({}),
  saveAll: emptyOk<void>(undefined),
};

// ============================================================
// Document Storage (Cloud Storage for large files)
// ============================================================
export const documentStorageApi = {
  upload: (_docId: string, _fileName: string, _mimeType: string, _base64Data: string) =>
    emptyOk<{ path: string; size: number }>({ path: "", size: 0 })(),

  getSignedUrl: (_docId: string, _fileName: string) =>
    emptyOk<{ signedUrl: string }>({ signedUrl: "" })(),

  remove: (_docId: string, _fileName: string) => emptyOk<void>(undefined)(),

  list: (_docId: string) => emptyOk<any[]>([])(),
};

export const documentUploadApi = {
  upload: (_docId: string, _fileName: string, _mimeType: string, _base64Data: string) =>
    emptyOk<{ path: string; size: number }>({ path: "", size: 0 })(),

  uploadForm: (_file: File, _caseId: string, _docId: string, _meta?: any) =>
    emptyOk<{ storagePath: string; fileSize: number }>({ storagePath: "", fileSize: 0 })(),
};

// ============================================================
// CRM Rewards Analytics
// ============================================================
export const crmrewardsApi = {
  getAnalytics: emptyOk<any>({}),

  trackEvent: (_event: {
    featureKey: string;
    action: string;
    userId?: string;
    userRole?: string;
    caseId?: string;
    metadata?: Record<string, any>;
  }) => emptyOk<void>(undefined)(),

  syncState: (_state: {
    userId: string;
    xp: number;
    badges: string[];
    features: Record<string, boolean>;
    classicMode: boolean;
    satisfaction: number[];
  }) => emptyOk<void>(undefined)(),

  getState: (_userId: string) => emptyOk<any>({})(),

  saveMoodFeedback: (_feedback: {
    caseId: string;
    stage: string;
    rating: number;
    userId?: string;
    userRole?: string;
  }) => emptyOk<void>(undefined)(),

  getMoodFeedback: (_caseId: string) => emptyOk<any>({})(),
};

// ============================================================
// Auth
// ============================================================
export const authApi = {
  login: (_email: string, _password: string) => emptyOk<any>({})(),
  logout: emptyOk<void>(undefined),
  verifySession: emptyOk<any>({}),
};

// ============================================================
// Health Check
// ============================================================
export const healthCheck = async (): Promise<{ success: boolean; error?: string }> => {
  return { success: true };
};

// ============================================================
// Health Detailed
// ============================================================
export const healthDetailedApi = {
  get: emptyOk<any>({}),
  save: emptyOk<void>(undefined),
};

// ============================================================
// AI Audit
// ============================================================
export const aiAuditApi = {
  analyze: emptyOk<any>({})(),
  getRecommendations: emptyOk<any[]>([]),
};

// ============================================================
// Backup (Brevo Integration)
// ============================================================
export const backupApi = {
  getSettings: emptyOk<any>({}),

  saveSettings: (_settings: any) => emptyOk<void>(undefined)(),

  getHistory: emptyOk<any[]>([]),

  sendNow: (_payload: {
    recipients: string[];
    selectedContent: string[];
    format: string;
    backupType?: "daily" | "weekly" | "monthly" | "auto";
  }) => emptyOk<void>(undefined)(),

  deleteHistoryEntry: (_id: string) => emptyOk<void>(undefined)(),

  cleanup: emptyOk<void>(undefined),

  autoExport: (_recipients: string[]) => emptyOk<void>(undefined)(),

  testBrevo: (_testEmail?: string) => emptyOk<any>({})(),
};

// ============================================================
// CRM Actions via Server KV
// ============================================================
export const crmActionsApi = {
  execute: (_action: { type: string; [key: string]: any }) => emptyOk<any>({})(),
};

// ============================================================
// Pipeline Management — Dual pipeline, SLA, approvals
// ============================================================
export const pipelineApi = {
  getSLAAlerts: emptyOk<any[]>([]),

  migrateToVisa: (_caseId: string) => emptyOk<any>({})(),

  updateStage: (_caseId: string, _stageKey: string, _metadata?: any) => emptyOk<any>({})(),

  verifyDocument: (_caseId: string, _docKey: string, _verified: boolean, _by: string) =>
    emptyOk<any>({})(),

  verifyPayment: (_caseId: string, _verified: boolean, _by: string) => emptyOk<any>({})(),

  managerApproval: (_caseId: string, _approved: boolean, _note?: string) => emptyOk<any>({})(),

  cancelCase: (_caseId: string, _reason: string, _by: string) => emptyOk<any>({})(),

  reopenCase: (_caseId: string, _by: string) => emptyOk<any>({})(),

  assignStaff: (_caseId: string, _staffId: string, _staffName: string) => emptyOk<any>({})(),
};
