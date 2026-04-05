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
  onSnapshot,
  type CollectionReference,
  type DocumentReference,
  type QuerySnapshot,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "./config";

export function getTenantDocRef(tenantId: string): DocumentReference {
  return doc(db, "tenants", tenantId);
}

export function getTenantCollectionRef<T = any>(
  tenantId: string,
  collectionName: string
): CollectionReference<T> {
  return collection(db, "tenants", tenantId, collectionName) as CollectionReference<T>;
}

export function getTenantDocRefById<T = any>(
  tenantId: string,
  collectionName: string,
  docId: string
): DocumentReference<T> {
  return doc(db, "tenants", tenantId, collectionName, docId) as DocumentReference<T>;
}

export async function getTenantDoc<T = any>(tenantId: string): Promise<T | null> {
  const snap = await getDoc(getTenantDocRef(tenantId));
  return snap.exists() ? (snap.data() as T) : null;
}

export async function setTenantDoc<T = any>(tenantId: string, data: T): Promise<void> {
  await setDoc(getTenantDocRef(tenantId), data, { merge: true });
}

export async function getDocsInTenant<T = any>(
  tenantId: string,
  collectionName: string
): Promise<T[]> {
  const snap = await getDocs(getTenantCollectionRef(tenantId, collectionName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export async function getDocInTenant<T = any>(
  tenantId: string,
  collectionName: string,
  docId: string
): Promise<T | null> {
  const snap = await getDoc(getTenantDocRefById(tenantId, collectionName, docId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

export async function setDocInTenant<T = any>(
  tenantId: string,
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  await setDoc(getTenantDocRefById(tenantId, collectionName, docId), data, { merge: true });
}

export async function updateDocInTenant<T = any>(
  tenantId: string,
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  await updateDoc(getTenantDocRefById(tenantId, collectionName, docId), data as any);
}

export async function deleteDocInTenant(
  tenantId: string,
  collectionName: string,
  docId: string
): Promise<void> {
  await deleteDoc(getTenantDocRefById(tenantId, collectionName, docId));
}

export function subscribeToDocInTenant<T = any>(
  tenantId: string,
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
) {
  return onSnapshot(getTenantDocRefById(tenantId, collectionName, docId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
  });
}

export function subscribeToCollectionInTenant<T = any>(
  tenantId: string,
  collectionName: string,
  callback: (data: T[]) => void
) {
  return onSnapshot(getTenantCollectionRef(tenantId, collectionName), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
  });
}

export { db };
