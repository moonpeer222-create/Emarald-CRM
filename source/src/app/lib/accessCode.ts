// ═══════════════════════════════════════════════════════════════
// Access Code Service — Time-Based Deterministic Codes (TOTP-like)
// ═══════════════════════════════════════════════════════════════

import { db } from "../../firebase/firestore";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const STORAGE_KEYS = {
  ADMIN_AUTH: "emerald-admin-auth",
  AGENT_CODES: "emerald-agent-codes",
  AGENT_SESSION: "emerald-agent-session",
  CODE_HISTORY: "emerald-code-history",
};

const TOTP_WINDOW_MS = 6 * 60 * 60 * 1000;
const TOTP_MASTER_SECRET = "EMERALD-VISA-CRM-2024-SECURE-KEY";

const DEFAULT_AGENTS: { id: string; name: string }[] = [];

export interface AgentAccessCode {
  agentId: string;
  agentName: string;
  code: string;
  generatedAt: number;
  expiresAt: number;
  generatedBy: string;
  active: boolean;
}

export interface AgentSession {
  agentId: string;
  agentName: string;
  code: string;
  loginAt: number;
  expiresAt: number;
  active: boolean;
}

export interface AdminSession {
  email: string;
  loginAt: number;
  active: boolean;
}

export interface AccessCode {
  code: string;
  generatedAt: number;
  expiresAt: number;
  generatedBy: string;
}

function getAgentSeed(agentId: string): string {
  return `EMERALD-${agentId}-VISA-TOTP-SEED`;
}

function getCurrentTimeWindow(): number {
  return Math.floor(Date.now() / TOTP_WINDOW_MS);
}

function getWindowStart(window: number): number {
  return window * TOTP_WINDOW_MS;
}

function getWindowExpiry(window: number): number {
  return (window + 1) * TOTP_WINDOW_MS;
}

function djb2Hash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & 0x7FFFFFFF;
  }
  return hash;
}

function computeTOTP(agentId: string, timeWindow: number): string {
  const seed = getAgentSeed(agentId);
  const payload = `${seed}:${timeWindow}:${TOTP_MASTER_SECRET}`;
  const hash = djb2Hash(payload);
  return String(hash % 1000000).padStart(6, "0");
}

function generateRandomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getLocalKnownAgents(): { id: string; name: string }[] {
  const map = new Map<string, string>();
  DEFAULT_AGENTS.forEach((a) => map.set(a.id, a.name));
  try {
    const raw = localStorage.getItem("emerald-known-agents");
    if (raw) {
      const extra: { id: string; name: string }[] = JSON.parse(raw);
      extra.forEach((a) => map.set(a.id, a.name));
    }
  } catch { /* ignore */ }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

function getLocalAgentStateMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("emerald-agent-active-state");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveLocalAgentStateMap(map: Record<string, boolean>) {
  localStorage.setItem("emerald-agent-active-state", JSON.stringify(map));
}

export class AccessCodeService {
  private static _pushAgentCodes: (() => void) | null = null;
  private static _pushCodeHistory: (() => void) | null = null;
  private static _cacheAgents: { id: string; name: string }[] = [];
  private static _cacheStates: Record<string, boolean> = {};
  private static _cacheHistory: AccessCode[] = [];
  private static _unsub: (() => void) | null = null;
  private static _initialized = false;

  static registerSyncPush(pushCodes: () => void, pushHistory: () => void) {
    this._pushAgentCodes = pushCodes;
    this._pushCodeHistory = pushHistory;
  }

  private static notifyCodesSync() {
    if (this._pushAgentCodes) this._pushAgentCodes();
  }
  private static notifyHistorySync() {
    if (this._pushCodeHistory) this._pushCodeHistory();
  }

  static async initialize(): Promise<void> {
    if (this._initialized) return;
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) {
      this._cacheAgents = getLocalKnownAgents();
      this._cacheStates = getLocalAgentStateMap();
      this._cacheHistory = this._loadHistoryFromLocal();
      this._initialized = true;
      return;
    }

    try {
      const configRef = doc(db, "tenants", tenantId, "config", "agentCodes");
      const snap = await getDoc(configRef);
      if (snap.exists()) {
        const data = snap.data();
        this._cacheAgents = (data.knownAgents as { id: string; name: string }[]) || getLocalKnownAgents();
        this._cacheStates = (data.activeStates as Record<string, boolean>) || getLocalAgentStateMap();
        this._cacheHistory = (data.codeHistory as AccessCode[]) || this._loadHistoryFromLocal();
      } else {
        this._cacheAgents = getLocalKnownAgents();
        this._cacheStates = getLocalAgentStateMap();
        this._cacheHistory = this._loadHistoryFromLocal();
      }
      this._persistLocal();

      if (this._unsub) this._unsub();
      this._unsub = onSnapshot(configRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          this._cacheAgents = (data.knownAgents as { id: string; name: string }[]) || this._cacheAgents;
          this._cacheStates = (data.activeStates as Record<string, boolean>) || this._cacheStates;
          this._cacheHistory = (data.codeHistory as AccessCode[]) || this._cacheHistory;
          this._persistLocal();
          window.dispatchEvent(new CustomEvent("crm-agent-codes-updated"));
        }
      });
    } catch (err) {
      console.warn("[AccessCodeService] Firestore init failed, falling back to localStorage:", err);
      this._cacheAgents = getLocalKnownAgents();
      this._cacheStates = getLocalAgentStateMap();
      this._cacheHistory = this._loadHistoryFromLocal();
    }
    this._initialized = true;
  }

  private static _loadHistoryFromLocal(): AccessCode[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CODE_HISTORY);
      if (!data) return [];
      return JSON.parse(data);
    } catch { return []; }
  }

  private static _persistLocal() {
    localStorage.setItem("emerald-known-agents", JSON.stringify(this._cacheAgents));
    localStorage.setItem("emerald-agent-active-state", JSON.stringify(this._cacheStates));
    localStorage.setItem(STORAGE_KEYS.CODE_HISTORY, JSON.stringify(this._cacheHistory));
  }

  private static async _syncToFirestore() {
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) return;
    try {
      await setDoc(doc(db, "tenants", tenantId, "config", "agentCodes"), {
        knownAgents: this._cacheAgents,
        activeStates: this._cacheStates,
        codeHistory: this._cacheHistory,
      }, { merge: true });
    } catch (err) {
      console.error("[AccessCodeService] Firestore sync failed:", err);
    }
  }

  static adminLogin(email: string, password: string): { success: boolean; error?: string } {
    // Legacy stub — auth is handled by Firebase
    return { success: true };
  }

  static adminLogout(): void {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
  }

  static getAdminSession(): AdminSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
      if (!data) return null;
      const session: AdminSession = JSON.parse(data);
      if (!session.active) return null;
      if (session.loginAt && Date.now() - session.loginAt > 8 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
        return null;
      }
      if ((session as any).expiresAt && Date.now() > (session as any).expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
        return null;
      }
      return session;
    } catch { return null; }
  }

  static isAdminLoggedIn(): boolean {
    return !!this.getAdminSession();
  }

  static getTOTPCode(agentId: string): string {
    return computeTOTP(agentId, getCurrentTimeWindow());
  }

  static getTOTPTimeRemaining(): number {
    const window = getCurrentTimeWindow();
    return Math.max(0, getWindowExpiry(window) - Date.now());
  }

  static getTOTPExpiryTime(): string {
    const window = getCurrentTimeWindow();
    return new Date(getWindowExpiry(window)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  static getAllTOTPCodes(): AgentAccessCode[] {
    const window = getCurrentTimeWindow();
    const start = getWindowStart(window);
    const expiry = getWindowExpiry(window);
    const stateMap = this._cacheStates;
    const agents = this._cacheAgents;
    return agents.map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      code: computeTOTP(agent.id, window),
      generatedAt: start,
      expiresAt: expiry,
      generatedBy: "time-sync",
      active: stateMap[agent.id] !== false,
    }));
  }

  static validateCode(inputCode: string): {
    valid: boolean;
    agentId?: string;
    agentName?: string;
    error?: string;
  } {
    if (!inputCode || inputCode.length !== 6) {
      return { valid: false, error: "Code must be 6 digits" };
    }
    const window = getCurrentTimeWindow();
    const agents = this._cacheAgents;
    for (const agent of agents) {
      const expected = computeTOTP(agent.id, window);
      if (expected === inputCode) {
        return { valid: true, agentId: agent.id, agentName: agent.name };
      }
    }
    const prevWindow = window - 1;
    const prevWindowExpiry = getWindowExpiry(prevWindow);
    const gracePeriodMs = 5 * 60 * 1000;
    if (Date.now() - prevWindowExpiry < gracePeriodMs) {
      for (const agent of agents) {
        const expected = computeTOTP(agent.id, prevWindow);
        if (expected === inputCode) {
          return { valid: true, agentId: agent.id, agentName: agent.name };
        }
      }
    }
    return { valid: false, error: "Invalid or expired access code" };
  }

  static toggleAgentActive(agentId: string): AgentAccessCode | null {
    const map = { ...this._cacheStates };
    map[agentId] = map[agentId] === false ? true : false;
    this._cacheStates = map;
    saveLocalAgentStateMap(map);
    this._syncToFirestore();
    this.notifyCodesSync();
    const all = this.getAllTOTPCodes();
    return all.find((a) => a.agentId === agentId) || null;
  }

  static registerAgent(agentId: string, agentName: string): AgentAccessCode {
    const agents = [...this._cacheAgents];
    if (!agents.find((a) => a.id === agentId)) {
      agents.push({ id: agentId, name: agentName });
      this._cacheAgents = agents;
      localStorage.setItem("emerald-known-agents", JSON.stringify(agents));
    }
    const window = getCurrentTimeWindow();
    this._syncToFirestore();
    return {
      agentId,
      agentName,
      code: computeTOTP(agentId, window),
      generatedAt: getWindowStart(window),
      expiresAt: getWindowExpiry(window),
      generatedBy: "time-sync",
      active: true,
    };
  }

  static removeAgent(agentId: string): void {
    const agents = this._cacheAgents.filter((a) => a.id !== agentId);
    this._cacheAgents = agents;
    localStorage.setItem("emerald-known-agents", JSON.stringify(agents));
    this._syncToFirestore();
  }

  static createAgentSession(code: string, agentId: string, agentName: string): AgentSession {
    const session: AgentSession = {
      agentId,
      agentName,
      code,
      loginAt: Date.now(),
      expiresAt: Date.now() + TOTP_WINDOW_MS,
      active: true,
    };
    localStorage.setItem(STORAGE_KEYS.AGENT_SESSION, JSON.stringify(session));
    return session;
  }

  static getAgentSession(): AgentSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AGENT_SESSION);
      if (!data) return null;
      const session: AgentSession = JSON.parse(data);
      if (Date.now() > session.expiresAt || !session.active) {
        this.agentLogout();
        return null;
      }
      return session;
    } catch { return null; }
  }

  static isAgentLoggedIn(): boolean {
    return !!this.getAgentSession();
  }

  static getAgentTimeRemaining(): number {
    const session = this.getAgentSession();
    if (!session) return 0;
    return Math.max(0, session.expiresAt - Date.now());
  }

  static agentLogout(): void {
    localStorage.removeItem(STORAGE_KEYS.AGENT_SESSION);
  }

  static formatTimeRemaining(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  static initializeAgentCodes(): AgentAccessCode[] {
    return this.getAllTOTPCodes();
  }

  static getAllAgentCodes(): AgentAccessCode[] {
    return this.getAllTOTPCodes();
  }

  static generateAgentCode(agentId: string): AgentAccessCode | null {
    const all = this.getAllTOTPCodes();
    return all.find((a) => a.agentId === agentId) || null;
  }

  static generateAllAgentCodes(): AgentAccessCode[] {
    return this.getAllTOTPCodes();
  }

  static getAgentCode(agentId: string): AgentAccessCode | null {
    const all = this.getAllTOTPCodes();
    return all.find((a) => a.agentId === agentId) || null;
  }

  static getCurrentCode(): AccessCode | null {
    const codes = this.getAllTOTPCodes();
    if (codes.length === 0) return null;
    const first = codes[0];
    return { code: first.code, generatedAt: first.generatedAt, expiresAt: first.expiresAt, generatedBy: first.generatedBy };
  }

  static generateAccessCode(): AccessCode {
    const codes = this.getAllTOTPCodes();
    if (codes.length > 0) {
      return { code: codes[0].code, generatedAt: codes[0].generatedAt, expiresAt: codes[0].expiresAt, generatedBy: codes[0].generatedBy };
    }
    return { code: generateRandomCode(), generatedAt: Date.now(), expiresAt: Date.now() + TOTP_WINDOW_MS, generatedBy: "system" };
  }

  static getCodeHistory(): AccessCode[] {
    return this._cacheHistory;
  }
}
