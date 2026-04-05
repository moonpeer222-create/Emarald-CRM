// Advanced Notification & Alert System — migrated to Firestore
import { CRMDataStore } from "./mockData";
import { db } from "../../firebase/firestore";
import {
  collection, doc, getDocs, setDoc, deleteDoc, writeBatch, onSnapshot, query,
} from "firebase/firestore";

export interface Notification {
  id: string;
  type: "case" | "payment" | "document" | "system" | "deadline" | "agent" | "customer" | "attendance" | "alert";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  titleUrdu?: string;
  message: string;
  messageUrdu?: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
  targetRole?: "admin" | "agent" | "customer" | "all";
  targetUserId?: string;
}

export interface Alert {
  id: string;
  category: "deadline" | "payment_overdue" | "document_pending" | "system" | "performance";
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  description: string;
  affectedItems: number;
  timestamp: string;
  dismissed: boolean;
  autoResolve: boolean;
  resolutionSteps?: string[];
}

export class NotificationService {
  private static NOTIFICATIONS_KEY = "crm_notifications";
  private static ALERTS_KEY = "crm_alerts";
  private static _pushNotifications: (() => void) | null = null;
  private static _cacheNotifications: Notification[] | null = null;
  private static _cacheAlerts: Alert[] | null = null;
  private static _syncTimer: any = null;
  private static _remoteIds: Set<string> = new Set();
  private static _remoteAlertIds: Set<string> = new Set();
  private static _unsubNotifs: (() => void) | null = null;
  private static _unsubAlerts: (() => void) | null = null;
  private static _initialized = false;

  static registerSyncPush(pushFn: () => void) {
    this._pushNotifications = pushFn;
  }

  private static notifySync() {
    if (this._pushNotifications) this._pushNotifications();
  }

  static async initialize(): Promise<void> {
    if (this._initialized) return;
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) {
      this._cacheNotifications = this._loadNotificationsFromLocal();
      this._cacheAlerts = this._loadAlertsFromLocal();
      this._initialized = true;
      return;
    }

    try {
      const notifCol = collection(db, "tenants", tenantId, "notifications");
      const alertCol = collection(db, "tenants", tenantId, "alerts");

      const notifSnap = await getDocs(query(notifCol));
      this._cacheNotifications = notifSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
      this._remoteIds = new Set(notifSnap.docs.map((d) => d.id));
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(this._cacheNotifications));

      const alertSnap = await getDocs(query(alertCol));
      this._cacheAlerts = alertSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
      this._remoteAlertIds = new Set(alertSnap.docs.map((d) => d.id));
      localStorage.setItem(this.ALERTS_KEY, JSON.stringify(this._cacheAlerts));

      if (this._unsubNotifs) this._unsubNotifs();
      this._unsubNotifs = onSnapshot(query(notifCol), (snap) => {
        this._cacheNotifications = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
        this._remoteIds = new Set(snap.docs.map((d) => d.id));
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(this._cacheNotifications));
        window.dispatchEvent(new CustomEvent("crm-notifications-updated"));
      });

      if (this._unsubAlerts) this._unsubAlerts();
      this._unsubAlerts = onSnapshot(query(alertCol), (snap) => {
        this._cacheAlerts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Alert));
        this._remoteAlertIds = new Set(snap.docs.map((d) => d.id));
        localStorage.setItem(this.ALERTS_KEY, JSON.stringify(this._cacheAlerts));
        window.dispatchEvent(new CustomEvent("crm-alerts-updated"));
      });
    } catch (err) {
      console.warn("[NotificationService] Firestore init failed, falling back to localStorage:", err);
      this._cacheNotifications = this._loadNotificationsFromLocal();
      this._cacheAlerts = this._loadAlertsFromLocal();
    }
    this._initialized = true;
  }

  private static _loadNotificationsFromLocal(): Notification[] {
    const stored = localStorage.getItem(this.NOTIFICATIONS_KEY);
    if (stored) { try { return JSON.parse(stored); } catch { /* fall through */ } }
    return [];
  }

  private static _loadAlertsFromLocal(): Alert[] {
    const stored = localStorage.getItem(this.ALERTS_KEY);
    if (stored) { try { return JSON.parse(stored); } catch { /* fall through */ } }
    return [];
  }

  static getNotifications(): Notification[] {
    if (this._cacheNotifications !== null) return this._cacheNotifications;
    return this._loadNotificationsFromLocal();
  }

  static getNotificationsForRole(role: "admin" | "agent" | "customer", userId?: string): Notification[] {
    const all = this.getNotifications();
    return all.filter(n => {
      if (n.targetRole && n.targetRole !== "all" && n.targetRole !== role) return false;
      if (n.targetUserId && n.targetUserId !== userId) return false;
      return true;
    });
  }

  static saveNotifications(notifications: Notification[]): void {
    this._cacheNotifications = notifications;
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
    this._debouncedSyncToFirestore();
    this.notifySync();
  }

  private static _debouncedSyncToFirestore() {
    if (this._syncTimer) clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this._syncToFirestore(), 600);
  }

  private static async _syncToFirestore() {
    const tenantId = localStorage.getItem("crm_tenant_id");
    if (!tenantId) return;
    const notifs = this._cacheNotifications;
    const alerts = this._cacheAlerts;
    if (!notifs || !alerts) return;

    try {
      const notifIds = new Set(notifs.map((n) => n.id));
      const toDeleteNotifs = [...this._remoteIds].filter((id) => !notifIds.has(id));
      const ops: { type: "delete" | "set"; ref: any; data?: any }[] = [];
      for (const id of toDeleteNotifs) ops.push({ type: "delete", ref: doc(db, "tenants", tenantId, "notifications", id) });
      for (const n of notifs) ops.push({ type: "set", ref: doc(db, "tenants", tenantId, "notifications", n.id), data: n });

      const alertIds = new Set(alerts.map((a) => a.id));
      const toDeleteAlerts = [...this._remoteAlertIds].filter((id) => !alertIds.has(id));
      for (const id of toDeleteAlerts) ops.push({ type: "delete", ref: doc(db, "tenants", tenantId, "alerts", id) });
      for (const a of alerts) ops.push({ type: "set", ref: doc(db, "tenants", tenantId, "alerts", a.id), data: a });

      const MAX_BATCH = 500;
      for (let i = 0; i < ops.length; i += MAX_BATCH) {
        const batch = writeBatch(db);
        const chunk = ops.slice(i, i + MAX_BATCH);
        for (const op of chunk) {
          if (op.type === "delete") batch.delete(op.ref);
          else batch.set(op.ref, op.data, { merge: true });
        }
        await batch.commit();
      }

      this._remoteIds = notifIds;
      this._remoteAlertIds = alertIds;
    } catch (err) {
      console.error("[NotificationService] Firestore sync failed:", err);
    }
  }

  static addNotification(notification: Omit<Notification, "id" | "timestamp" | "read">): Notification {
    const notifications = this.getNotifications();
    const newNotification: Notification = {
      ...notification,
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifications.unshift(newNotification);
    if (notifications.length > 100) notifications.splice(100);
    this.saveNotifications(notifications);
    return newNotification;
  }

  static markAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications(notifications);
    }
  }

  static markAllAsRead(role?: string): void {
    const notifications = this.getNotifications();
    notifications.forEach(n => {
      if (!role || !n.targetRole || n.targetRole === "all" || n.targetRole === role) {
        n.read = true;
      }
    });
    this.saveNotifications(notifications);
  }

  static deleteNotification(notificationId: string): void {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.saveNotifications(filtered);
  }

  static clearAllForRole(role: string): void {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n =>
      n.targetRole && n.targetRole !== "all" && n.targetRole !== role
    );
    this.saveNotifications(filtered);
  }

  static getUnreadCount(role?: string, userId?: string): number {
    const notifications = role ? this.getNotificationsForRole(role as any, userId) : this.getNotifications();
    return notifications.filter(n => !n.read).length;
  }

  static getAlerts(): Alert[] {
    if (this._cacheAlerts !== null) return this._cacheAlerts;
    return this._loadAlertsFromLocal();
  }

  static saveAlerts(alerts: Alert[]): void {
    this._cacheAlerts = alerts;
    localStorage.setItem(this.ALERTS_KEY, JSON.stringify(alerts));
    this._debouncedSyncToFirestore();
  }

  static addAlert(alert: Omit<Alert, "id" | "timestamp" | "dismissed">): Alert {
    const alerts = this.getAlerts();
    const newAlert: Alert = {
      ...alert,
      id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      dismissed: false,
    };
    alerts.unshift(newAlert);
    this.saveAlerts(alerts);
    return newAlert;
  }

  static dismissAlert(alertId: string): void {
    const alerts = this.getAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      this.saveAlerts(alerts);
    }
  }

  static notifyCaseCreated(caseId: string, customerName: string, agentName: string): Notification {
    return this.addNotification({
      type: "case",
      priority: "medium",
      title: "New Case Created",
      titleUrdu: "نیا کیس بنایا گیا",
      message: `Case ${caseId} for ${customerName} has been created and assigned to ${agentName}`,
      messageUrdu: `کیس ${caseId} بنایا گیا - ${customerName} - ایجنٹ: ${agentName}`,
      actionable: true,
      actionUrl: `/admin/cases`,
      actionLabel: "View Case",
      targetRole: "all",
      metadata: { caseId, customerName, agentName },
    });
  }

  static notifyCaseStatusChanged(caseId: string, customerName: string, oldStatus: string, newStatus: string): Notification {
    return this.addNotification({
      type: "case",
      priority: newStatus === "completed" ? "high" : "medium",
      title: "Case Status Updated",
      titleUrdu: "کیس کی حیثیت اپ ڈیٹ ہوئی",
      message: `Case ${caseId} for ${customerName} changed from ${oldStatus} to ${newStatus}`,
      messageUrdu: `کیس ${caseId} (${customerName}) کی حیثیت ${oldStatus} سے ${newStatus} ہوئی`,
      actionable: true,
      actionUrl: `/admin/cases`,
      actionLabel: "View Details",
      targetRole: "all",
      metadata: { caseId, customerName, oldStatus, newStatus },
    });
  }

  static notifyPaymentReceived(caseId: string, amount: number, customerName: string): Notification {
    return this.addNotification({
      type: "payment",
      priority: "high",
      title: "Payment Received",
      titleUrdu: "ادائیگی موصول ہوئی",
      message: `Payment of PKR ${amount.toLocaleString()} received for case ${caseId} (${customerName})`,
      messageUrdu: `PKR ${amount.toLocaleString()} کی ادائیگی موصول - کیس ${caseId} (${customerName})`,
      actionable: true,
      actionUrl: `/admin/cases`,
      actionLabel: "View Receipt",
      metadata: { amount, caseId },
      targetRole: "all",
    });
  }

  static notifyPaymentOverdue(caseId: string, customerName: string, daysOverdue: number): Notification {
    return this.addNotification({
      type: "payment",
      priority: "critical",
      title: "Payment Overdue",
      titleUrdu: "ادائیگی واجب الادا",
      message: `Payment for case ${caseId} (${customerName}) is ${daysOverdue} days overdue`,
      messageUrdu: `کیس ${caseId} (${customerName}) کی ادائیگی ${daysOverdue} دن سے واجب الادا ہے`,
      actionable: true,
      actionUrl: `/admin/cases`,
      actionLabel: "Send Reminder",
      metadata: { daysOverdue, caseId },
      targetRole: "admin",
    });
  }

  static notifyDocumentUploaded(caseId: string, documentName: string, customerName: string): Notification {
    return this.addNotification({
      type: "document",
      priority: "medium",
      title: "New Document Uploaded",
      titleUrdu: "نئی دستاویز اپ لوڈ ہوئی",
      message: `${documentName} uploaded for case ${caseId} (${customerName})`,
      messageUrdu: `${documentName} اپ لوڈ ہوئی - کیس ${caseId} (${customerName})`,
      actionable: true,
      actionUrl: `/admin/cases`,
      actionLabel: "Review Document",
      targetRole: "all",
      metadata: { caseId, documentName, customerName },
    });
  }

  static notifyDocumentExpiring(documentName: string, daysUntilExpiry: number): Notification {
    return this.addNotification({
      type: "document",
      priority: daysUntilExpiry < 7 ? "critical" : "high",
      title: "Document Expiring Soon",
      titleUrdu: "دستاویز کی میعاد ختم ہونے والی ہے",
      message: `${documentName} will expire in ${daysUntilExpiry} days`,
      messageUrdu: `${documentName} کی میعاد ${daysUntilExpiry} دنوں میں ختم ہو جائے گی`,
      actionable: true,
      actionLabel: "Renew Now",
      targetRole: "admin",
    });
  }

  static notifyDeadlineApproaching(caseId: string, customerName: string, deadline: string, daysRemaining: number): Notification {
    return this.addNotification({
      type: "deadline",
      priority: daysRemaining < 3 ? "critical" : daysRemaining < 7 ? "high" : "medium",
      title: "Deadline Approaching",
      titleUrdu: "آخری تاریخ قریب ہے",
      message: `Case ${caseId} (${customerName}) deadline in ${daysRemaining} days (${deadline})`,
      messageUrdu: `کیس ${caseId} (${customerName}) کی آخری تاریخ ${daysRemaining} دنوں میں (${deadline})`,
      actionable: true,
      actionUrl: `/admin/cases`,
      actionLabel: "View Case",
      metadata: { caseId, customerName, daysRemaining, deadline },
      targetRole: "all",
    });
  }

  static notifyAgentPerformance(agentName: string, metric: string, value: number, threshold: number): Notification {
    return this.addNotification({
      type: "agent",
      priority: value < threshold ? "high" : "low",
      title: "Agent Performance Alert",
      titleUrdu: "ایجنٹ کارکردگی الرٹ",
      message: `${agentName}'s ${metric} is ${value}% (threshold: ${threshold}%)`,
      messageUrdu: `${agentName} کی ${metric} ${value}% ہے (حد: ${threshold}%)`,
      actionable: true,
      actionUrl: "/admin/team",
      actionLabel: "View Details",
      targetRole: "admin",
    });
  }
}
