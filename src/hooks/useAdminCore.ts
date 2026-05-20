import { useGalleryStore } from '../store';
import { User } from '../types';

export const useAdminCore = (user: User | null) => {
  const settings = useGalleryStore(state => state.settings);
  const setSettings = useGalleryStore(state => state.setSettings);

  const saveSettings = async (newSettings: any) => {
    // Stub
    return { success: true };
  };

  const performPushSync = async (onRefresh?: () => void) => {
    // Stub
  };

  const performPullSync = async (onRefresh?: () => void) => {
    // Stub
  };

  return {
    saveSettings,
    performPushSync,
    performPullSync
  };
};
