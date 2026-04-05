import { toast } from "./toast";
import { db } from "../../firebase/firestore";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export const PROFILE_KEY = "crm_admin_profile";

export interface AdminProfileData {
  fullName: string;
  urduName?: string;
  email: string;
  phone: string;
  role: string;
  avatar?: string;
  joinDate: string;
  lastLogin: string;
  loginCount: number;
  notifications: {
    email: boolean;
    browser: boolean;
    marketing: boolean;
  };
}

const PROFILE_UPDATE_EVENT = "crm_admin_profile_updated";
let _cache: AdminProfileData | null = null;
let _unsub: (() => void) | null = null;
let _initialized = false;

export async function initializeAdminProfile(): Promise<void> {
  if (_initialized) return;
  const tenantId = localStorage.getItem("crm_tenant_id");
  if (!tenantId) {
    _cache = _loadFromLocal();
    _initialized = true;
    return;
  }

  try {
    const ref = doc(db, "tenants", tenantId, "settings", "adminProfile");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      _cache = { ..._getDefaultProfile(), ...(snap.data() as AdminProfileData) };
    } else {
      _cache = _loadFromLocal();
    }
    _saveLocal(_cache);

    if (_unsub) _unsub();
    _unsub = onSnapshot(ref, (docSnap) => {
      if (docSnap.exists()) {
        _cache = { ..._getDefaultProfile(), ...(docSnap.data() as AdminProfileData) };
        _saveLocal(_cache);
        window.dispatchEvent(new CustomEvent(PROFILE_UPDATE_EVENT, { detail: _cache }));
      }
    });
  } catch (err) {
    console.warn("[adminProfile] Firestore init failed, falling back to localStorage:", err);
    _cache = _loadFromLocal();
  }
  _initialized = true;
}

function _getDefaultProfile(): AdminProfileData {
  const defaultProfile: AdminProfileData = {
    fullName: "Admin",
    urduName: "ایڈمن",
    email: "admin@universalcrm.com",
    phone: "",
    role: "Administrator",
    joinDate: new Date().toISOString().split("T")[0],
    lastLogin: new Date().toISOString(),
    loginCount: 1,
    notifications: { email: true, browser: true, marketing: false },
  };
  try {
    const sessionRaw = localStorage.getItem("emerald-admin-auth");
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      if (session.fullName) defaultProfile.fullName = session.fullName;
      if (session.email) defaultProfile.email = session.email;
    }
  } catch { /* ignore */ }
  return defaultProfile;
}

function _loadFromLocal(): AdminProfileData {
  const stored = localStorage.getItem(PROFILE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!parsed.urduName) parsed.urduName = "ایڈمن";
      return parsed;
    } catch { /* fall through */ }
  }
  const def = _getDefaultProfile();
  _saveLocal(def);
  return def;
}

function _saveLocal(profile: AdminProfileData) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getAdminProfile(): AdminProfileData {
  if (_cache !== null) return _cache;
  return _loadFromLocal();
}

export async function saveAdminProfile(profile: AdminProfileData) {
  _cache = profile;
  _saveLocal(profile);
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATE_EVENT, { detail: profile }));

  const tenantId = localStorage.getItem("crm_tenant_id");
  if (tenantId) {
    try {
      await setDoc(doc(db, "tenants", tenantId, "settings", "adminProfile"), profile, { merge: true });
    } catch (err) {
      console.error("[adminProfile] Firestore save failed:", err);
    }
  }
}

export function subscribeToProfileUpdates(callback: (profile: AdminProfileData) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<AdminProfileData>;
    callback(customEvent.detail);
  };
  window.addEventListener(PROFILE_UPDATE_EVENT, handler);
  return () => window.removeEventListener(PROFILE_UPDATE_EVENT, handler);
}
