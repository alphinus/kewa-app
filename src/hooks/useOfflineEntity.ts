'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';

/**
 * Hook to access cached entity data with live reactivity.
 * Returns IndexedDB data when offline or cached.
 */
export function useOfflineEntity(entityType: string, entityId: string) {
  const cachedEntity = useLiveQuery(
    () => db.cachedEntities.where({ entityType, entityId }).first(),
    [entityType, entityId]
  );

  return {
    data: cachedEntity?.data ?? null,
    cachedAt: cachedEntity?.cachedAt ?? null,
    pinned: cachedEntity?.pinned ?? false,
    isLoading: cachedEntity === undefined,
  };
}

/**
 * Hook to access cached child entities with live reactivity.
 * Returns array of child entity data.
 */
export function useOfflineChildren(parentType: string, parentId: string) {
  const items = useLiveQuery(
    () => db.cachedEntities.where({ parentType, parentId }).toArray(),
    [parentType, parentId]
  );

  return {
    children: items?.map((i) => i.data) ?? [],
    isLoading: items === undefined,
  };
}
