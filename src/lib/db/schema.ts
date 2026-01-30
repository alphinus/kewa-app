import Dexie, { type EntityTable } from 'dexie';

// Entity caching for offline reads
export interface CachedEntity {
  id?: number; // auto-increment
  entityType: 'property' | 'unit' | 'workOrder' | 'task' | 'note';
  entityId: string; // Supabase UUID
  parentType: string | null; // For children
  parentId: string | null; // For children
  data: any; // Full entity JSON
  cachedAt: number; // Date.now()
  viewedAt: number; // Date.now()
  pinned: boolean;
}

// Sync queue for offline writes
export interface SyncQueueItem {
  id?: number; // auto-increment
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  endpoint: string; // API route to call
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed';
}

// Photo upload queue for offline photo submissions
export interface PhotoQueueItem {
  id?: number; // auto-increment
  entityType: string;
  entityId: string;
  blob: Blob;
  fileName: string;
  createdAt: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed';
}

// Typed Dexie database
export class KeWaDatabase extends Dexie {
  cachedEntities!: EntityTable<CachedEntity, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  photoQueue!: EntityTable<PhotoQueueItem, 'id'>;

  constructor() {
    super('KeWaDB');
    this.version(1).stores({
      // Compound indexes for efficient lookups
      cachedEntities:
        '++id, entityType, entityId, [entityType+entityId], [parentType+parentId], viewedAt, pinned',
      syncQueue: '++id, createdAt, status',
      photoQueue: '++id, createdAt, status',
    });
  }
}

export const db = new KeWaDatabase();
