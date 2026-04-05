// Unified User Database for Universal CRM
// Replaced localStorage DB with Firebase Auth + Firestore global users collection

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { deleteUser as deleteAuthUser } from "firebase/auth";
import { db } from "../../firebase/firestore";
import {
  loginUser,
  logoutUser,
  registerUser,
  changeUserPassword,
  getCurrentUser,
} from "../../firebase/auth";
import { isSessionExpired, validatePasswordStrength } from "./security";

const CUSTOMER_SESSION_KEY = "emerald-customer-session";
const USERS_STORAGE_KEY = "crm_users_db";
const USERS_VERSION_KEY = "crm_users_version";
const TENANT_ID_KEY = "crm_tenant_id";

export type UserRole = "master_admin" | "admin" | "agent" | "customer" | "operator";
export type UserStatus = "active" | "inactive" | "suspended";

export interface CRMUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  password?: string; // retained for backward compatibility; stored only in Firebase Auth
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  agentId?: string;
  caseId?: string;
  avatar?: string;
  meta?: Record<string, any>;
  passwordChangedAt?: string;
  mustChangePassword?: boolean;
  createdBy?: string;
}

export interface CustomerSession {
  userId: string;
  fullName: string;
  email: string;
  caseId: string;
  loginAt: number;
  expiresAt: number;
  active: boolean;
}

// ── Sync callback (kept for API compatibility) ─────────────
let _syncPush: (() => void) | null = null;

function notifySync() {
  if (_syncPush) _syncPush();
}

// Helper: map Firestore doc to CRMUser
function docToUser(docSnap: any): CRMUser {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    email: data.email ?? "",
    phone: data.phone ?? "",
    fullName: data.fullName ?? "",
    role: data.role ?? "customer",
    status: data.status ?? "active",
    tenantId: data.tenantId ?? "",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    lastLogin: data.lastLogin ?? null,
    agentId: data.agentId,
    caseId: data.caseId,
    avatar: data.avatar,
    meta: data.meta,
    passwordChangedAt: data.passwordChangedAt,
    mustChangePassword: data.mustChangePassword,
    createdBy: data.createdBy,
  };
}

// ════════════════════════════════════════════════════════════
// UserDB — the main API
// ════════════════════════════════════════════════════════════
export class UserDB {
  private static _cache: CRMUser[] | null = null;

  // Register a sync callback (called once from SyncProvider)
  static registerSyncPush(fn: () => void) {
    _syncPush = fn;
  }

  // ── Initialise ────────────────────────────────────────────
  static async initialize(): Promise<CRMUser[]> {
    // Clear legacy localStorage keys
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.removeItem(USERS_VERSION_KEY);

    const currentUser = getCurrentUser();
    if (currentUser) {
      // Verify Firestore profile exists
      const profile = await this.getUserById(currentUser.uid);
      if (profile && profile.tenantId) {
        localStorage.setItem(TENANT_ID_KEY, profile.tenantId);
      }
    }

    this._cache = await this.getAllUsers();
    return this._cache;
  }

  static getAllUsersSync(): CRMUser[] {
    return this._cache ?? [];
  }

  // ── CRUD ─────────────────────────────────────────────────
  static async getAllUsers(): Promise<CRMUser[]> {
    const storedTenantId = localStorage.getItem(TENANT_ID_KEY);
    let snap;
    if (storedTenantId) {
      const q = query(collection(db, "users"), where("tenantId", "==", storedTenantId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, "users"));
    }
    let users = snap.docs.map(docToUser);

    // Hierarchy: non-master-admin cannot see master_admins
    const currentAuth = getCurrentUser();
    if (currentAuth) {
      const me = await this.getUserById(currentAuth.uid);
      if (!me || me.role !== "master_admin") {
        users = users.filter((u) => u.role !== "master_admin");
      }
    } else {
      users = users.filter((u) => u.role !== "master_admin");
    }
    this._cache = users;
    return users;
  }

  static async getUserById(id: string): Promise<CRMUser | null> {
    const snap = await getDoc(doc(db, "users", id));
    return snap.exists() ? docToUser(snap) : null;
  }

  static async getUserByEmail(email: string): Promise<CRMUser | null> {
    const q = query(collection(db, "users"), where("email", "==", email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return docToUser(snap.docs[0]);
  }

  static async getUserByCaseId(caseId: string): Promise<CRMUser | null> {
    const q = query(collection(db, "users"), where("caseId", "==", caseId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return docToUser(snap.docs[0]);
  }

  static async getUsersByRole(role: UserRole): Promise<CRMUser[]> {
    const storedTenantId = localStorage.getItem(TENANT_ID_KEY);
    const constraints: any[] = [where("role", "==", role)];
    if (storedTenantId) {
      constraints.push(where("tenantId", "==", storedTenantId));
    }
    const q = query(collection(db, "users"), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(docToUser);
  }

  static async createUser(
    data: Omit<CRMUser, "id" | "createdAt" | "updatedAt" | "lastLogin"> & { password: string }
  ): Promise<CRMUser> {
    // Hierarchy enforcement
    if (data.role === "master_admin") {
      const currentAuth = getCurrentUser();
      if (!currentAuth) throw new Error("Only master admin can create master admins");
      const me = await this.getUserById(currentAuth.uid);
      if (!me || me.role !== "master_admin") throw new Error("Only master admin can create master admins");
    }

    const cred = await registerUser(data.email, data.password);
    const uid = cred.user.uid;
    const now = new Date().toISOString();

    const newUser: CRMUser = {
      ...data,
      id: uid,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      passwordChangedAt: now,
    };

    await setDoc(doc(db, "users", uid), newUser);
    this._cache = null;
    notifySync();
    return newUser;
  }

  static async updateUser(id: string, updates: Partial<CRMUser>): Promise<CRMUser | null> {
    const target = await this.getUserById(id);
    if (!target) return null;

    // Hierarchy enforcement
    if (target.role === "master_admin" || updates.role === "master_admin") {
      const currentAuth = getCurrentUser();
      if (!currentAuth) throw new Error("Only master admin can modify master admins");
      const me = await this.getUserById(currentAuth.uid);
      if (!me || me.role !== "master_admin") throw new Error("Only master admin can modify master admins");
    }

    const ref = doc(db, "users", id);
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(ref, payload);
    this._cache = null;
    notifySync();
    return this.getUserById(id);
  }

  static async deleteUser(id: string): Promise<boolean> {
    const currentAuth = getCurrentUser();
    const ref = doc(db, "users", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const target = docToUser(snap);

    // Hierarchy enforcement
    if (target.role === "master_admin") {
      if (!currentAuth) return false;
      const me = await this.getUserById(currentAuth.uid);
      if (!me || me.role !== "master_admin") return false;
    }

    if (currentAuth && currentAuth.uid === id) {
      await deleteDoc(ref);
      await deleteAuthUser(currentAuth);
    } else {
      // Soft-delete for non-current users (full auth deletion requires a Cloud Function)
      await updateDoc(ref, { status: "suspended", updatedAt: new Date().toISOString() } as any);
    }
    this._cache = null;
    notifySync();
    return true;
  }

  static async changePassword(
    id: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return { success: false, error: strength.errors[0] };
    }
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.uid !== id) {
      return { success: false, error: "Not authenticated as the target user" };
    }
    try {
      await changeUserPassword(newPassword);
      await this.updateUser(id, {
        passwordChangedAt: new Date().toISOString(),
        mustChangePassword: false,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to change password" };
    }
  }

  // ── Auth ─────────────────────────────────────────────────

  static async adminLogin(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: CRMUser; error?: string }> {
    try {
      const cred = await loginUser(email, password);
      const userDoc = await this.getUserById(cred.user.uid);
      if (!userDoc) {
        return { success: false, error: "User profile not found" };
      }
      if (userDoc.role !== "admin" && userDoc.role !== "master_admin") {
        return { success: false, error: "Not an admin account" };
      }
      if (userDoc.status !== "active") {
        return { success: false, error: "Account is " + userDoc.status };
      }

      localStorage.setItem(TENANT_ID_KEY, userDoc.tenantId);
      await this.updateUser(userDoc.id, { lastLogin: new Date().toISOString() });

      const sessionTTL = 8 * 60 * 60 * 1000;
      localStorage.setItem("emerald-admin-auth", JSON.stringify({
        email: userDoc.email,
        userId: userDoc.id,
        fullName: userDoc.fullName,
        role: userDoc.role,
        loginAt: Date.now(),
        expiresAt: Date.now() + sessionTTL,
        active: true,
      }));

      return { success: true, user: { ...userDoc, lastLogin: new Date().toISOString() } };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid email or password" };
    }
  }

  static async masterAdminLogin(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: CRMUser; error?: string }> {
    try {
      const cred = await loginUser(email, password);
      const userDoc = await this.getUserById(cred.user.uid);
      if (!userDoc) {
        return { success: false, error: "User profile not found" };
      }
      if (userDoc.role !== "master_admin") {
        return { success: false, error: "Not a master admin account" };
      }
      if (userDoc.status !== "active") {
        return { success: false, error: "Account is " + userDoc.status };
      }

      localStorage.setItem(TENANT_ID_KEY, userDoc.tenantId);
      await this.updateUser(userDoc.id, { lastLogin: new Date().toISOString() });

      const sessionTTL = 12 * 60 * 60 * 1000;
      localStorage.setItem("emerald-master-auth", JSON.stringify({
        email: userDoc.email,
        userId: userDoc.id,
        fullName: userDoc.fullName,
        role: userDoc.role,
        loginAt: Date.now(),
        expiresAt: Date.now() + sessionTTL,
        active: true,
      }));

      return { success: true, user: { ...userDoc, lastLogin: new Date().toISOString() } };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid email or password" };
    }
  }

  static async customerLogin(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: CRMUser; error?: string }> {
    try {
      const cred = await loginUser(email, password);
      const userDoc = await this.getUserById(cred.user.uid);
      if (!userDoc) {
        return { success: false, error: "User profile not found" };
      }
      if (userDoc.role !== "customer") {
        return { success: false, error: "Not a customer account" };
      }
      if (userDoc.status !== "active") {
        return { success: false, error: "Account is " + userDoc.status };
      }

      localStorage.setItem(TENANT_ID_KEY, userDoc.tenantId);
      await this.updateUser(userDoc.id, { lastLogin: new Date().toISOString() });

      const session: CustomerSession = {
        userId: userDoc.id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        caseId: userDoc.caseId || "",
        loginAt: Date.now(),
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
        active: true,
      };
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
      return { success: true, user: userDoc };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid email or password" };
    }
  }

  static async customerLoginByCaseId(
    caseId: string,
    phone: string
  ): Promise<{ success: boolean; user?: CRMUser; error?: string }> {
    const user = await this.getUserByCaseId(caseId);
    if (!user) {
      return { success: false, error: "Case ID not found" };
    }
    const normalizePhone = (p: string) => p.replace(/[\s\-\(\)]/g, "");
    if (normalizePhone(user.phone) !== normalizePhone(phone)) {
      return { success: false, error: "Phone number does not match" };
    }
    return { success: false, error: "Please use email and password to login" };
  }

  static async operatorLogin(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: CRMUser; error?: string }> {
    try {
      const cred = await loginUser(email, password);
      const userDoc = await this.getUserById(cred.user.uid);
      if (!userDoc) {
        return { success: false, error: "User profile not found" };
      }
      if (userDoc.role !== "operator") {
        return { success: false, error: "Not an operator account" };
      }
      if (userDoc.status !== "active") {
        return { success: false, error: "Account is " + userDoc.status };
      }

      localStorage.setItem(TENANT_ID_KEY, userDoc.tenantId);
      await this.updateUser(userDoc.id, { lastLogin: new Date().toISOString() });

      const sessionTTL = 8 * 60 * 60 * 1000;
      localStorage.setItem("emerald-operator-session", JSON.stringify({
        email: userDoc.email,
        userId: userDoc.id,
        fullName: userDoc.fullName,
        role: "operator",
        loginAt: Date.now(),
        expiresAt: Date.now() + sessionTTL,
        active: true,
      }));
      return { success: true, user: { ...userDoc, lastLogin: new Date().toISOString() } };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid email or password" };
    }
  }

  static async agentLoginByCredentials(
    emailOrAgentId: string,
    password: string
  ): Promise<{ success: boolean; agentId?: string; agentName?: string; error?: string }> {
    const input = emailOrAgentId.trim();
    let email = input;

    if (!input.includes("@")) {
      let aid = input.toUpperCase();
      if (!aid.startsWith("AGENT-")) aid = `AGENT-${aid}`;
      const q = query(collection(db, "users"), where("agentId", "==", aid), where("role", "==", "agent"));
      const snap = await getDocs(q);
      if (snap.empty) {
        return { success: false, error: "Invalid credentials" };
      }
      email = snap.docs[0].data().email;
    }

    try {
      const cred = await loginUser(email, password);
      const userDoc = await this.getUserById(cred.user.uid);
      if (!userDoc) {
        return { success: false, error: "User profile not found" };
      }
      if (userDoc.role !== "agent") {
        return { success: false, error: "Not an agent account" };
      }
      if (userDoc.status !== "active") {
        return { success: false, error: "Account is " + userDoc.status };
      }
      if (!userDoc.agentId) {
        return { success: false, error: "Agent ID not configured" };
      }

      localStorage.setItem(TENANT_ID_KEY, userDoc.tenantId);
      await this.updateUser(userDoc.id, { lastLogin: new Date().toISOString() });

      const session = {
        agentId: userDoc.agentId,
        agentName: userDoc.fullName,
        code: "credential-login",
        loginAt: Date.now(),
        expiresAt: Date.now() + 6 * 60 * 60 * 1000,
        active: true,
      };
      localStorage.setItem("emerald-agent-session", JSON.stringify(session));

      return { success: true, agentId: userDoc.agentId, agentName: userDoc.fullName };
    } catch (err: any) {
      return { success: false, error: err.message || "Invalid credentials" };
    }
  }

  // ── Session checks (legacy + Firebase Auth hybrid) ────────

  static isMasterLoggedIn(): boolean {
    if (!getCurrentUser()) {
      localStorage.removeItem("emerald-master-auth");
      return false;
    }
    if (isSessionExpired("emerald-master-auth")) {
      localStorage.removeItem("emerald-master-auth");
      return false;
    }
    try {
      const data = localStorage.getItem("emerald-master-auth");
      if (!data) return false;
      const session = JSON.parse(data);
      return session.active && session.role === "master_admin";
    } catch {
      return false;
    }
  }

  static getMasterSession(): { email: string; userId: string; fullName: string; role: string; loginAt: number; expiresAt: number; active: boolean } | null {
    if (!getCurrentUser()) {
      localStorage.removeItem("emerald-master-auth");
      return null;
    }
    if (isSessionExpired("emerald-master-auth")) {
      localStorage.removeItem("emerald-master-auth");
      return null;
    }
    try {
      const data = localStorage.getItem("emerald-master-auth");
      if (!data) return null;
      const session = JSON.parse(data);
      return session.active ? session : null;
    } catch {
      return null;
    }
  }

  static masterLogout(): void {
    logoutUser();
    localStorage.removeItem("emerald-master-auth");
  }

  static isAdminLoggedIn(): boolean {
    if (!getCurrentUser()) {
      localStorage.removeItem("emerald-admin-auth");
      return false;
    }
    if (isSessionExpired("emerald-admin-auth")) {
      localStorage.removeItem("emerald-admin-auth");
      return false;
    }
    try {
      const data = localStorage.getItem("emerald-admin-auth");
      if (!data) return false;
      const session = JSON.parse(data);
      return session.active === true;
    } catch {
      return false;
    }
  }

  static getAdminSession(): { email: string; userId: string; fullName: string; role: string; loginAt: number; expiresAt: number; active: boolean } | null {
    if (!getCurrentUser()) {
      localStorage.removeItem("emerald-admin-auth");
      return null;
    }
    if (isSessionExpired("emerald-admin-auth")) {
      localStorage.removeItem("emerald-admin-auth");
      return null;
    }
    try {
      const data = localStorage.getItem("emerald-admin-auth");
      if (!data) return null;
      const session = JSON.parse(data);
      return session.active ? session : null;
    } catch {
      return null;
    }
  }

  static adminLogout(): void {
    logoutUser();
    localStorage.removeItem("emerald-admin-auth");
  }

  static getCustomerSession(): CustomerSession | null {
    if (!getCurrentUser()) {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
      return null;
    }
    try {
      const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (!raw) return null;
      const session: CustomerSession = JSON.parse(raw);
      if (!session.active || Date.now() > session.expiresAt) {
        this.customerLogout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  static isCustomerLoggedIn(): boolean {
    return !!this.getCustomerSession();
  }

  static customerLogout(): void {
    logoutUser();
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
  }

  static isOperatorLoggedIn(): boolean {
    if (!getCurrentUser()) {
      localStorage.removeItem("emerald-operator-session");
      return false;
    }
    if (isSessionExpired("emerald-operator-session")) {
      localStorage.removeItem("emerald-operator-session");
      return false;
    }
    try {
      const data = localStorage.getItem("emerald-operator-session");
      if (!data) return false;
      const session = JSON.parse(data);
      if (!session.active || session.role !== "operator") return false;
      return true;
    } catch {
      return false;
    }
  }

  static getOperatorSession(): { email: string; userId: string; fullName: string; role: string; loginAt: number; expiresAt: number; active: boolean } | null {
    if (!getCurrentUser()) {
      localStorage.removeItem("emerald-operator-session");
      return null;
    }
    if (isSessionExpired("emerald-operator-session")) {
      localStorage.removeItem("emerald-operator-session");
      return null;
    }
    try {
      const data = localStorage.getItem("emerald-operator-session");
      if (!data) return null;
      const session = JSON.parse(data);
      if (!session.active) return null;
      return session;
    } catch {
      return null;
    }
  }

  static operatorLogout(): void {
    logoutUser();
    localStorage.removeItem("emerald-operator-session");
  }

  // ── Helpers ──────────────────────────────────────────────
  static async getNextAgentId(): Promise<string> {
    const storedTenantId = localStorage.getItem(TENANT_ID_KEY);
    const constraints: any[] = [where("role", "==", "agent")];
    if (storedTenantId) {
      constraints.push(where("tenantId", "==", storedTenantId));
    }
    const q = query(collection(db, "users"), ...constraints);
    const snap = await getDocs(q);
    const agentNums = snap.docs
      .map((d) => d.data().agentId)
      .filter(Boolean)
      .map((aid: string) => parseInt(aid.replace("AGENT-", ""), 10))
      .filter((n: number) => !isNaN(n));
    const max = agentNums.length > 0 ? Math.max(...agentNums) : 0;
    return `AGENT-${max + 1}`;
  }

  static async getStats() {
    const users = await this.getAllUsers();
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin" || u.role === "master_admin").length,
      agents: users.filter((u) => u.role === "agent").length,
      customers: users.filter((u) => u.role === "customer").length,
      active: users.filter((u) => u.status === "active").length,
      inactive: users.filter((u) => u.status !== "active").length,
    };
  }

  // ── Internal (kept for API compatibility) ─────────────────
  private static _save(_users: CRMUser[]) {
    notifySync();
  }
}
