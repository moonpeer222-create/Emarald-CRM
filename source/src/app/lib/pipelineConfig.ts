export type PipelineType = "lead" | "visa";

export interface PipelineStage {
  key: string;
  label: string;
  labelUrdu: string;
  stageNumber: number;
  deadlineHours: number | null; 
  requiresDocChecklist?: boolean;
  requiresPaymentVerification?: boolean;
  requiresApproval?: boolean;
  isFinal?: boolean;
  isCancelled?: boolean;
}

export const LEAD_PIPELINE_STAGES: PipelineStage[] = [
  { key: "new_lead", label: "New Lead", labelUrdu: "نئی لیڈ", stageNumber: 1, deadlineHours: 24 },
  { key: "interested", label: "Interested", labelUrdu: "دلچسپی", stageNumber: 2, deadlineHours: 24 },
  { key: "follow_up", label: "Follow-up", labelUrdu: "فالو اپ", stageNumber: 3, deadlineHours: 24 },
  { key: "office_visit", label: "Office Visit", labelUrdu: "آفس وزٹ", stageNumber: 4, deadlineHours: 24 },
  { key: "agreement", label: "Agreement", labelUrdu: "معاہدہ", stageNumber: 5, deadlineHours: 24 },
  { key: "lead_cancelled", label: "Cancelled", labelUrdu: "منسوخ", stageNumber: 6, deadlineHours: null, isCancelled: true },
];

export const VISA_PIPELINE_STAGES: PipelineStage[] = [
  { key: "doc_collection", label: "Document Collection", labelUrdu: "دستاویزات کا جمع", stageNumber: 1, deadlineHours: 48 },
  { key: "selection_call", label: "Selection Call/Office Visit", labelUrdu: "انتخاب کی کال/آفس وزٹ", stageNumber: 2, deadlineHours: 24 },
  { key: "medical_token", label: "Medical Token (GAMCA)", labelUrdu: "میڈیکل ٹوکن", stageNumber: 3, deadlineHours: 24, requiresDocChecklist: true },
  { key: "check_medical", label: "Check Medical Status", labelUrdu: "میڈیکل صورتحال چیک", stageNumber: 4, deadlineHours: 36 },
  { key: "biometric", label: "Biometric/Saudi Aitmaad", labelUrdu: "بایومیٹرک", stageNumber: 5, deadlineHours: 24 },
  { key: "payment_confirm", label: "Payment Confirmation", labelUrdu: "ادائیگی کی تصدیق", stageNumber: 6, deadlineHours: 24, requiresPaymentVerification: true },
  { key: "original_docs", label: "Original Documents", labelUrdu: "اصل دستاویزات", stageNumber: 7, deadlineHours: 0 },
  { key: "case_submitted", label: "Case Submitted to Manager", labelUrdu: "مینیجر کو سپرد کیا گیا", stageNumber: 8, deadlineHours: 192 },
  { key: "approved", label: "Approved", labelUrdu: "منظوری شدہ", stageNumber: 9, deadlineHours: 24, requiresApproval: true },
  { key: "remaining_amount", label: "Remaining Amount", labelUrdu: "بقایا رقم", stageNumber: 10, deadlineHours: 24 },
  { key: "ticket_booking", label: "Ticket Booking", labelUrdu: "ٹکٹ بکنگ", stageNumber: 11, deadlineHours: 48 },
  { key: "completed", label: "Completed", labelUrdu: "مکمل", stageNumber: 12, deadlineHours: null, isFinal: true },
];

export interface MandatoryDocument {
  key: string;
  label: string;
  labelUrdu: string;
}

export const MANDATORY_DOCUMENTS: MandatoryDocument[] = [
  { key: 'passport_copy', label: 'Passport Copy', labelUrdu: 'پاسپورٹ کی کاپی' },
  { key: 'cnic_copy', label: 'CNIC Copy', labelUrdu: 'شناختی کارڈ کی کاپی' },
  { key: 'photos', label: 'Passport Size Photos', labelUrdu: 'پاسپورٹ سائز تصاویر' },
  { key: 'medical_report', label: 'Medical Report', labelUrdu: 'میڈیکل رپورٹ' },
  { key: 'police_clearance', label: 'Police Clearance', labelUrdu: 'پولیس کلیئرنس' },
];

export function getChecklistStatus(checklist: Record<string, boolean>) {
  const total = MANDATORY_DOCUMENTS.length;
  const verified = MANDATORY_DOCUMENTS.filter((d) => checklist[d.key] === true).length;
  const pending = total - verified;
  const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;
  return {
    isComplete: verified === total && total > 0,
    verified,
    total,
    percentage,
    pending,
  };
}


export function getPipelineStages(type: PipelineType): PipelineStage[] {
  return type === 'lead' ? LEAD_PIPELINE_STAGES : VISA_PIPELINE_STAGES;
}

export function getStageByKey(key: string): PipelineStage | undefined {
  return [...LEAD_PIPELINE_STAGES, ...VISA_PIPELINE_STAGES].find((s) => s.key === key);
}

export function getNextStage(currentKey: string, type: PipelineType): PipelineStage | undefined {
  const stages = getPipelineStages(type);
  const idx = stages.findIndex((s) => s.key === currentKey);
  return stages[idx + 1];
}

export function canAdvanceStage(currentKey: string, checklist: Record<string, boolean>, paymentVerified?: boolean): boolean {
  const stage = getStageByKey(currentKey);
  if (!stage) return false;
  if (stage.requiresDocChecklist) {
    const docsVerified = Object.values(checklist || {}).filter(Boolean).length >= 3;
    if (!docsVerified) return false;
  }
  if (stage.requiresPaymentVerification && !paymentVerified) return false;
  return true;
}

export function shouldAutoMigrateToVisa(stageKey: string): boolean {
  return stageKey === 'payment_confirmation';
}

export function getSLAStatus(deadlineAt?: string): { isOverdue: boolean; hoursRemaining: number } {
  if (!deadlineAt) return { isOverdue: false, hoursRemaining: 0 };
  const deadline = new Date(deadlineAt).getTime();
  const now = Date.now();
  const hoursRemaining = Math.max(0, Math.floor((deadline - now) / (1000 * 60 * 60)));
  return { isOverdue: now > deadline, hoursRemaining };
}

export function calculateSLADeadline(stageKey: string, startedAt?: string): string {
  const stage = getStageByKey(stageKey);
  const start = startedAt ? new Date(startedAt).getTime() : Date.now();
  const hours = stage?.deadlineHours ?? 48;
  return new Date(start + hours * 60 * 60 * 1000).toISOString();
}
