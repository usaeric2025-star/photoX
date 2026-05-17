import { useGalleryStore } from '../store';
import { User } from '../types';

export const useAdminCore = (user: User | null) => {
  const settings = useGalleryStore(state => state.settings);
  const setSettings = useGalleryStore(state => state.setSettings);

  const saveSettings = async (newSettings: any) => {
    // Stub
    console.log('Save settings called', newSettings);
    return { success: true };
  };

  const performPushSync = async (onRefresh?: () => void) => {
    // Stub
    console.log('Push sync called');
  };

  const performPullSync = async (onRefresh?: () => void) => {
    // Stub
    console.log('Pull sync called');
  };

  return {
    saveSettings,
    performPushSync,
    performPullSync
  };
};
