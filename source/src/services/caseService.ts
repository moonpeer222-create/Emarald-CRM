import {
  getDocsInTenant,
  getDocInTenant,
  setDocInTenant,
  updateDocInTenant,
  deleteDocInTenant,
  subscribeToCollectionInTenant,
  subscribeToDocInTenant,
} from "@/firebase/firestore";

export interface CasePayment {
  id: string;
  amount: number;
  date: string;
  method: "cash" | "bank" | "easypaisa" | "jazzcash" | "card";
  receiptNumber: string;
  description: string;
  collectedBy: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  submittedByRole?: "admin" | "agent";
}

export interface CaseDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  status: "pending" | "verified" | "rejected";
  url: string;
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  verificationHistory?: Array<{
    action: "verified" | "rejected";
    by: string;
    at: string;
    reason?: string;
  }>;
  storagePath?: string;
  storageSignedUrl?: string;
  signedUrlExpiresAt?: string;
  mimeType?: string;
  fileSize?: number;
  checklistKey?: string;
  uploadedByRole?: "agent" | "customer" | "admin" | "master_admin";
  uploadedById?: string;
}

export interface CaseNote {
  id: string;
  text: string;
  author: string;
  date: string;
  important: boolean;
}

export interface CaseTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "status" | "payment" | "document" | "medical" | "note";
  user: string;
}

export interface TenantCase {
  id: string;
  customerId: string;
  customerName: string;
  fatherName: string;
  phone: string;
  email: string;
  cnic: string;
  passport: string;
  country: string;
  jobType: string;
  jobDescription: string;
  address: string;
  city: string;
  maritalStatus: "single" | "married" | "divorced" | "widowed";
  dateOfBirth: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  education: string;
  experience: string;
  status: string;
  agentId: string;
  agentName: string;
  createdDate: string;
  updatedDate: string;
  timeline: CaseTimelineEvent[];
  documents: CaseDocument[];
  payments: CasePayment[];
  medical: any | null;
  notes: CaseNote[];
  priority: "low" | "medium" | "high" | "urgent";
  totalFee: number;
  paidAmount: number;
  pipelineType: "lead" | "visa";
  pipelineStageKey: string;
  previousPipelineType?: "lead" | "visa";
  migratedAt?: string;
  currentStage: number;
  stageStartedAt: string;
  stageDeadlineAt: string;
  isOverdue: boolean;
  delayReason?: string;
  delayReportedAt?: string;
  documentChecklist?: Record<string, boolean>;
  documentChecklistFiles?: Record<string, string>;
  paymentVerified?: boolean;
  paymentVerifiedAt?: string;
  paymentVerifiedBy?: string;
  sirAtifApproval?: boolean;
  sirAtifApprovalAt?: string;
  sirAtifApprovalNote?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  reopenedFromStage?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedAt?: string;
  companyName?: string;
  companyCountry?: string;
}

export async function getCases(tenantId: string): Promise<TenantCase[]> {
  return getDocsInTenant<TenantCase>(tenantId, "cases");
}

export async function getCase(tenantId: string, caseId: string): Promise<TenantCase | null> {
  return getDocInTenant<TenantCase>(tenantId, "cases", caseId);
}

export async function saveCase(
  tenantId: string,
  caseId: string,
  data: Partial<TenantCase>
): Promise<void> {
  await setDocInTenant<TenantCase>(tenantId, "cases", caseId, {
    ...data,
    updatedDate: new Date().toISOString(),
  });
}

export async function createCase(
  tenantId: string,
  caseId: string,
  data: Omit<TenantCase, "id" | "createdDate" | "updatedDate">
): Promise<TenantCase> {
  const now = new Date().toISOString();
  const c: TenantCase = {
    ...data,
    id: caseId,
    createdDate: now,
    updatedDate: now,
  };
  await setDocInTenant(tenantId, "cases", caseId, c);
  return c;
}

export async function updateCase(
  tenantId: string,
  caseId: string,
  updates: Partial<TenantCase>
): Promise<void> {
  await updateDocInTenant<TenantCase>(tenantId, "cases", caseId, {
    ...updates,
    updatedDate: new Date().toISOString(),
  });
}

export async function deleteCase(tenantId: string, caseId: string): Promise<void> {
  await deleteDocInTenant(tenantId, "cases", caseId);
}

export function subscribeToCases(tenantId: string, callback: (cases: TenantCase[]) => void) {
  return subscribeToCollectionInTenant<TenantCase>(tenantId, "cases", callback);
}

export function subscribeToCase(
  tenantId: string,
  caseId: string,
  callback: (c: TenantCase | null) => void
) {
  return subscribeToDocInTenant<TenantCase>(tenantId, "cases", caseId, callback);
}
