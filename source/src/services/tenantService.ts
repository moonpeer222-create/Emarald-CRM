import { getTenantDoc, setTenantDoc, getDocsInTenant } from "@/firebase/firestore";
import type { UserRole } from "@/firebase/auth";

export interface TenantBranding {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  faviconUrl?: string;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  language: "en" | "ur" | string;
  dateFormat: string;
}

export interface TenantModuleFlags {
  cases: boolean;
  payments: boolean;
  documents: boolean;
  attendance: boolean;
  passportTracking: boolean;
  aiChatbot: boolean;
  voiceAssistant: boolean;
  analytics: boolean;
  leaderboard: boolean;
  businessIntelligence: boolean;
}

export interface TenantCustomField {
  key: string;
  label: string;
  labelUrdu?: string;
  type: "text" | "number" | "date" | "select" | "checkbox";
  required?: boolean;
  options?: string[];
}

export interface TenantConfig {
  id: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "suspended" | "trial";
  industry: string;
  branding: TenantBranding;
  settings: TenantSettings;
  enabledModules: TenantModuleFlags;
  customFields: {
    cases?: TenantCustomField[];
    customers?: TenantCustomField[];
    staff?: TenantCustomField[];
  };
  roleTemplates?: Record<UserRole, string[]>;
}

const DEFAULT_MODULES: TenantModuleFlags = {
  cases: true,
  payments: true,
  documents: true,
  attendance: true,
  passportTracking: true,
  aiChatbot: false,
  voiceAssistant: false,
  analytics: true,
  leaderboard: true,
  businessIntelligence: false,
};

const DEFAULT_SETTINGS: TenantSettings = {
  timezone: "Asia/Karachi",
  currency: "PKR",
  language: "en",
  dateFormat: "dd/MM/yyyy",
};

export async function createTenant(
  tenantId: string,
  ownerId: string,
  name: string,
  industry = "visa_consultancy"
): Promise<TenantConfig> {
  const now = new Date().toISOString();
  const config: TenantConfig = {
    id: tenantId,
    ownerId,
    createdAt: now,
    updatedAt: now,
    status: "active",
    industry,
    branding: { name },
    settings: DEFAULT_SETTINGS,
    enabledModules: DEFAULT_MODULES,
    customFields: {},
  };
  await setTenantDoc(tenantId, config);
  return config;
}

export async function getTenant(tenantId: string): Promise<TenantConfig | null> {
  return getTenantDoc<TenantConfig>(tenantId);
}

export async function updateTenant(
  tenantId: string,
  updates: Partial<TenantConfig>
): Promise<void> {
  await setTenantDoc(tenantId, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function listTenantsForUser(userId: string): Promise<TenantConfig[]> {
  // For Option A (single Firebase project), we query all tenants where ownerId matches
  // In production with many tenants, use a top-level collection query or Algolia
  // This is a simplified version; in practice we'd use a "tenant_memberships" collection
  const tenants: TenantConfig[] = [];
  // TODO: implement indexed query on tenants collection if scaling beyond hundreds
  return tenants;
}
