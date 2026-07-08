import { dexieDb, type DexieSyncQueueItem } from './schema';

export class SyncService {
  private processing = false;

  async enqueue(
    operation: DexieSyncQueueItem['operation'],
    table: string,
    recordId: string,
    payload: unknown,
    maxRetries = 3,
  ): Promise<void> {
    await dexieDb.syncQueue.add({
      operation,
      table,
      recordId,
      payload: JSON.stringify(payload),
      retryCount: 0,
      maxRetries,
      createdAt: new Date().toISOString(),
      lastError: null,
    });
  }

  async processQueue(batchSize = 50): Promise<{ synced: number; failed: number }> {
    if (this.processing) return { synced: 0, failed: 0 };
    this.processing = true;

    try {
      const pending = await dexieDb.syncQueue
        .where('createdAt')
        .above('')
        .limit(batchSize)
        .toArray();

      let synced = 0;
      let failed = 0;

      for (const item of pending) {
        const success = await this.syncItem(item);
        if (success) {
          await dexieDb.syncQueue.delete(item.id!);
          synced++;
        } else {
          item.retryCount++;
          if (item.retryCount >= item.maxRetries) {
            await dexieDb.syncQueue.delete(item.id!);
            failed++;
          } else {
            await dexieDb.syncQueue.put(item);
          }
        }
      }

      return { synced, failed };
    } finally {
      this.processing = false;
    }
  }

  private async syncItem(item: DexieSyncQueueItem): Promise<boolean> {
    try {
      const endpoint = this.resolveEndpoint(item.table);
      const method = this.resolveOperation(item.operation);
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? item.payload : undefined,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const serverData = await response.json();

      if (serverData.updatedAt) {
        await this.applyServerTimestamp(item.table, item.recordId, serverData.updatedAt);
      }

      return true;
    } catch (error) {
      item.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[SyncService] Failed to sync ${item.table}#${item.recordId}:`, item.lastError);
      return false;
    }
  }

  private applyServerTimestamp(
    table: string,
    recordId: string,
    serverUpdatedAt: string,
  ): Promise<void> {
    const store = dexieDb.table<any>(table);
    store.update(recordId, { updatedAt: serverUpdatedAt, syncStatus: 'synced' });
    return Promise.resolve();
  }

  private resolveEndpoint(table: string): string {
    switch (table) {
      case 'students': return '/api/students';
      case 'staff': return '/api/staff';
      case 'classes': return '/api/classes';
      case 'attendance': return '/api/attendance';
      case 'assessmentScores': return '/api/assessment-scores';
      case 'payments': return '/api/payments';
      case 'announcements': return '/api/announcements';
      case 'notifications': return '/api/notifications';
      default: return `/api/${table}`;
    }
  }

  private resolveOperation(method: DexieSyncQueueItem['operation']): string {
    switch (method) {
      case 'create': return 'POST';
      case 'update': return 'PATCH';
      case 'delete': return 'DELETE';
    }
  }
}

export const syncService = new SyncService();