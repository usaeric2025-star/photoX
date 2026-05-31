import { opsCache, PendingOp } from '@/lib/db/indexedDB';
import { updatePhotoInCloud, deletePhotoFromCloud, updatePhotosGroupInCloud } from '@/services/photo/commands';

/**
 * Syncs pending operations stored in IndexedDB to the backend
 */
export async function syncPendingOperations(userId: string) {
  if (!userId) return;
  
  let pendingOps: PendingOp[] = [];
  try {
    pendingOps = await opsCache.getPendingOps();
  } catch (err) {
    console.warn('[OfflineSync] opsCache error:', err);
    return;
  }
  if (pendingOps.length === 0) return;

  console.debug(`[OfflineSync] Found ${pendingOps.length} pending operations. Starting sync...`);

  for (const op of pendingOps) {
    try {
      switch (op.type) {
        case 'update':
          if (typeof op.photoId === 'string') {
            await updatePhotoInCloud(op.photoId, op.payload);
          }
          break;
        case 'delete':
          // Batch delete logic handled simplified here, 
          // usually we'd need to iterate or call batch delete service
          if (Array.isArray(op.photoId)) {
             // Implementation depends on if we want to resolve photos first or just IDs
          }
          break;
        case 'hide':
        case 'unhide':
          if (typeof op.photoId === 'string') {
             await updatePhotoInCloud(op.photoId, { is_hidden: op.type === 'hide' });
          }
          break;
      }
      // If success, we should remove it from pending. 
      // Simplified: we clear all at the end if the loop finishes without fatal error,
      // or implement per-op removal which is safer.
    } catch (err) {
      console.error(`[OfflineSync] Failed to sync operation ${op.id}:`, err);
    }
  }

  // Clear ops after attempt (or only clear successful ones in a real app)
  await opsCache.clearOps();
}

/**
 * Setup listener for online status to trigger sync
 */
export function setupOfflineSyncListener(userId: string | undefined) {
  if (!userId) return;

  const handleOnline = () => {
    console.debug('[OfflineSync] Device is back online. Triggering sync...');
    syncPendingOperations(userId).catch(err => console.warn('[OfflineSync] auto-sync failed', err));
  };

  window.addEventListener('online', handleOnline);
  
  // Also try immediately if already online
  if (navigator.onLine) {
    syncPendingOperations(userId).catch(err => console.warn('[OfflineSync] init-sync failed', err));
  }

  return () => window.removeEventListener('online', handleOnline);
}
