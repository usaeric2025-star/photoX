import { useSyncEngine, useSyncMutation } from '@/hooks';

export const useAdminSync = () => {
  const syncEngine = useSyncEngine();
  const { mutateAsync: syncMut } = useSyncMutation();

  return {
    ...syncEngine,
    performPush: () => syncMut('push')
  };
};
