import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { observeAuth, getCurrentUser } from "@/firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import type { TenantConfig } from "@/services/tenantService";

interface TenantContextValue {
  tenantId: string | null;
  tenant: TenantConfig | null;
  loading: boolean;
  setTenantId: (id: string | null) => void;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

const STORAGE_KEY = "crm_tenant_id";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTenant = async (uid: string, tid: string) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const userData = snap.data();
        const effectiveTenantId = tid || userData.tenantId;
        if (effectiveTenantId) {
          const tenantSnap = await getDoc(doc(db, "tenants", effectiveTenantId));
          if (tenantSnap.exists()) {
            setTenant({ id: tenantSnap.id, ...(tenantSnap.data() as any) });
            setTenantIdState(effectiveTenantId);
            localStorage.setItem(STORAGE_KEY, effectiveTenantId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load tenant:", err);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    const init = async () => {
      const user = getCurrentUser();
      if (user && stored) {
        await loadTenant(user.uid, stored);
      } else if (user) {
        await loadTenant(user.uid, "");
      }
      setLoading(false);
    };

    init();

    const unsubscribe = observeAuth(async (user) => {
      if (!user) {
        setTenant(null);
        setTenantIdState(null);
        localStorage.removeItem(STORAGE_KEY);
        setLoading(false);
        return;
      }
      const currentStored = localStorage.getItem(STORAGE_KEY);
      await loadTenant(user.uid, currentStored || "");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setTenantId = (id: string | null) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      setTenantIdState(id);
      const user = getCurrentUser();
      if (user) {
        loadTenant(user.uid, id);
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setTenantIdState(null);
      setTenant(null);
    }
  };

  const refreshTenant = async () => {
    if (!tenantId) return;
    const user = getCurrentUser();
    if (user) {
      await loadTenant(user.uid, tenantId);
    }
  };

  return (
    <TenantContext.Provider
      value={{ tenantId, tenant, loading, setTenantId, refreshTenant }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return ctx;
}
