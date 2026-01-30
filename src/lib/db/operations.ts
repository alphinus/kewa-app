import { db } from './schema';
import type { CachedEntity } from './schema';

// Cache limits per entity type
const CACHE_LIMITS = {
  property: 50,
  unit: 200,
  workOrder: 500,
  task: 1000,
  note: 1000,
} as const;

const CACHE_RETENTION_DAYS = 7;

/**
 * Cache an entity when user views it.
 * Updates viewedAt and cachedAt if already cached, otherwise inserts new entry.
 */
export async function cacheEntityOnView(
  entityType: CachedEntity['entityType'],
  entityId: string,
  data: any
): Promise<void> {
  try {
    const now = Date.now();
    const existing = await db.cachedEntities
      .where({ entityType, entityId })
      .first();

    if (existing) {
      // Update existing entry
      await db.cachedEntities.update(existing.id!, {
        data,
        cachedAt: now,
        viewedAt: now,
      });
    } else {
      // Insert new entry
      await db.cachedEntities.add({
        entityType,
        entityId,
        parentType: null,
        parentId: null,
        data,
        cachedAt: now,
        viewedAt: now,
        pinned: false,
      });
    }

    // Run eviction after cache write
    await evictStaleEntities();
  } catch (error) {
    console.error('Failed to cache entity on view:', error);
  }
}

/**
 * Cache child entities with parent reference.
 * Used for two-level caching (e.g., property + units, work order + tasks).
 */
export async function cacheChildren(
  parentType: string,
  parentId: string,
  children: Array<{
    entityType: CachedEntity['entityType'];
    entityId: string;
    data: any;
  }>
): Promise<void> {
  try {
    const now = Date.now();

    await db.transaction('rw', db.cachedEntities, async () => {
      for (const child of children) {
        const existing = await db.cachedEntities
          .where({ entityType: child.entityType, entityId: child.entityId })
          .first();

        if (existing) {
          await db.cachedEntities.update(existing.id!, {
            data: child.data,
            parentType,
            parentId,
            cachedAt: now,
            viewedAt: now,
          });
        } else {
          await db.cachedEntities.add({
            entityType: child.entityType,
            entityId: child.entityId,
            parentType,
            parentId,
            data: child.data,
            cachedAt: now,
            viewedAt: now,
            pinned: false,
          });
        }
      }
    });

    // Run eviction after cache write
    await evictStaleEntities();
  } catch (error) {
    console.error('Failed to cache children:', error);
  }
}

/**
 * Get cached entity data by type and ID.
 */
export async function getCachedEntity(
  entityType: CachedEntity['entityType'],
  entityId: string
): Promise<any | null> {
  try {
    const cached = await db.cachedEntities
      .where({ entityType, entityId })
      .first();
    return cached?.data ?? null;
  } catch (error) {
    console.error('Failed to get cached entity:', error);
    return null;
  }
}

/**
 * Get all cached children for a parent entity.
 */
export async function getCachedChildren(
  parentType: string,
  parentId: string
): Promise<any[]> {
  try {
    const children = await db.cachedEntities
      .where({ parentType, parentId })
      .toArray();
    return children.map((c) => c.data);
  } catch (error) {
    console.error('Failed to get cached children:', error);
    return [];
  }
}

/**
 * Pin an entity to prevent eviction.
 * Pinned entities are exempt from count and time-based eviction.
 */
export async function pinEntity(
  entityType: CachedEntity['entityType'],
  entityId: string
): Promise<void> {
  try {
    const entity = await db.cachedEntities
      .where({ entityType, entityId })
      .first();

    if (entity) {
      await db.cachedEntities.update(entity.id!, { pinned: true });

      // Request persistent storage on first pin
      await requestPersistentStorage();
    }
  } catch (error) {
    console.error('Failed to pin entity:', error);
  }
}

/**
 * Unpin an entity, making it eligible for eviction.
 */
export async function unpinEntity(
  entityType: CachedEntity['entityType'],
  entityId: string
): Promise<void> {
  try {
    const entity = await db.cachedEntities
      .where({ entityType, entityId })
      .first();

    if (entity) {
      await db.cachedEntities.update(entity.id!, { pinned: false });
    }
  } catch (error) {
    console.error('Failed to unpin entity:', error);
  }
}

/**
 * Evict stale unpinned entities.
 * Removes entries not viewed in 7 days AND trims to max count per type.
 */
export async function evictStaleEntities(): Promise<void> {
  try {
    const now = Date.now();
    const retentionThreshold = now - CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Remove unpinned entities not viewed in 7 days
    await db.cachedEntities
      .where('viewedAt')
      .below(retentionThreshold)
      .and((entity) => !entity.pinned)
      .delete();

    // Trim to max count per entity type
    for (const [entityType, limit] of Object.entries(CACHE_LIMITS)) {
      const unpinned = await db.cachedEntities
        .where('entityType')
        .equals(entityType)
        .and((entity) => !entity.pinned)
        .sortBy('viewedAt');

      if (unpinned.length > limit) {
        const toDelete = unpinned.slice(0, unpinned.length - limit);
        await db.cachedEntities.bulkDelete(
          toDelete.map((e) => e.id!).filter((id) => id !== undefined)
        );
      }
    }
  } catch (error) {
    console.error('Failed to evict stale entities:', error);
  }
}

/**
 * Request persistent storage to prevent browser from evicting IndexedDB.
 * Called on first pin action.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(
        isPersisted
          ? 'Persistent storage granted'
          : 'Persistent storage denied'
      );
      return isPersisted;
    }
    return false;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Get storage estimate for monitoring IndexedDB usage.
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return null;
  } catch (error) {
    console.error('Failed to get storage estimate:', error);
    return null;
  }
}
