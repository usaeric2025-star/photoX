import { useMemo } from 'react';
import { useSyncEngine, useSyncMutation } from '@/hooks';

export const useAdminSync = () => {
  const syncEngine = useSyncEngine();
  const { mutateAsync: syncMut } = useSyncMutation();

  return useMemo(() => ({
    ...syncEngine,
    performPush: () => syncMut('push')
  }), [syncEngine, syncMut]);
};
