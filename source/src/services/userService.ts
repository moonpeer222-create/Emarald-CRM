import {
  getDocsInTenant,
  getDocInTenant,
  setDocInTenant,
  updateDocInTenant,
  deleteDocInTenant,
  subscribeToCollectionInTenant,
  subscribeToDocInTenant,
} from "@/firebase/firestore";
import type { UserRole } from "@/firebase/auth";

export interface TenantUser {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  status: "active" | "inactive" | "suspended";
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

export async function getUsers(tenantId: string): Promise<TenantUser[]> {
  return getDocsInTenant<TenantUser>(tenantId, "users");
}

export async function getUser(tenantId: string, userId: string): Promise<TenantUser | null> {
  return getDocInTenant<TenantUser>(tenantId, "users", userId);
}

export async function getUserByEmail(
  tenantId: string,
  email: string
): Promise<TenantUser | null> {
  // Firestore doesn't support case-insensitive queries natively without extra indexing tricks
  // For small tenants, fetch all and filter; for large tenants, denormalize a lowercaseEmail field
  const users = await getUsers(tenantId);
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function saveUser(
  tenantId: string,
  userId: string,
  data: Partial<TenantUser>
): Promise<void> {
  const now = new Date().toISOString();
  await setDocInTenant<TenantUser>(tenantId, "users", userId, {
    ...data,
    updatedAt: now,
  });
}

export async function createUser(
  tenantId: string,
  userId: string,
  data: Omit<TenantUser, "id" | "createdAt" | "updatedAt" | "lastLogin">
): Promise<TenantUser> {
  const now = new Date().toISOString();
  const user: TenantUser = {
    ...data,
    id: userId,
    createdAt: now,
    updatedAt: now,
    lastLogin: null,
  };
  await setDocInTenant(tenantId, "users", userId, user);
  return user;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  updates: Partial<TenantUser>
): Promise<void> {
  await updateDocInTenant<TenantUser>(tenantId, "users", userId, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUser(tenantId: string, userId: string): Promise<void> {
  await deleteDocInTenant(tenantId, "users", userId);
}

export async function softDeleteUser(tenantId: string, userId: string): Promise<void> {
  await updateDocInTenant<TenantUser>(tenantId, "users", userId, {
    status: "suspended",
    updatedAt: new Date().toISOString(),
  });
}

export function subscribeToUsers(tenantId: string, callback: (users: TenantUser[]) => void) {
  return subscribeToCollectionInTenant<TenantUser>(tenantId, "users", callback);
}

export function subscribeToUser(
  tenantId: string,
  userId: string,
  callback: (user: TenantUser | null) => void
) {
  return subscribeToDocInTenant<TenantUser>(tenantId, "users", userId, callback);
}
