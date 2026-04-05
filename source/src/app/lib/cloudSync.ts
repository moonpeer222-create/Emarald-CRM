// Cloud Sync Service stub — migrated to Firebase Firestore
// Firestore handles realtime synchronization natively via onSnapshot listeners

export interface SyncStatus {
  lastSyncAt: string | null;
  pendingChanges: number;
  isSyncing: boolean;
  isOnline: boolean;
  deviceId: string;
  syncError: string | null;
}

export interface SyncQueue {
  id: string;
  entityType: 'case' | 'payment' | 'document' | 'agent_code' | 'attendance' | 'notification';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  retryCount: number;
  userId: string;
  deviceId: string;
}

export interface SyncConflict {
  entityId: string;
  entityType: string;
  localVersion: any;
  cloudVersion: any;
  localModifiedAt: string;
  cloudModifiedAt: string;
  conflictType: 'update_update' | 'update_delete' | 'delete_update';
}

export class CloudSyncService {
  static initialize(): void {
    console.log('[CloudSync] Firebase Firestore realtime sync is active via native listeners');
  }

  static shutdown(): void {}

  private static getOrCreateDeviceId(): string {
    return 'browser';
  }

  static getDeviceId(): string {
    return 'browser';
  }

  static getSyncStatus(): SyncStatus {
    return {
      lastSyncAt: new Date().toISOString(),
      pendingChanges: 0,
      isSyncing: false,
      isOnline: true,
      deviceId: 'browser',
      syncError: null,
    };
  }

  static queueChange(
    _entityType: SyncQueue['entityType'],
    _entityId: string,
    _action: SyncQueue['action'],
    _data: any,
    _userId: string
  ): void {}

  static async pullFromCloud(): Promise<void> {}

  static async performFullSync(): Promise<void> {}

  static async pushToCloud(): Promise<void> {}

  static async mergeCases(_cloudCases: any[]): Promise<void> {}

  static async mergeAgentCodes(_cloudCodes: any): Promise<void> {}

  static async mergeNotifications(_cloudNotifications: any): Promise<void> {}

  static startPeriodicSync(): void {}

  static stopPeriodicSync(): void {}

  static async syncNow(): Promise<void> {}

  static async resolveConflict(_conflict: SyncConflict, _strategy: 'local' | 'cloud' | 'merge'): Promise<void> {}
}
