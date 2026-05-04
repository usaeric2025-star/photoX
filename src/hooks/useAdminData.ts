import { useState, useEffect } from 'react';
import { useSyncEngine } from './useSyncEngine';
import { useAdminCore } from './useAdminCore';

export function useAdminData(
  user: any,
  withLoading: any,
  setCloudCount: any,
  setPublicCategories: any,
  setPublicTags: any,
  setPublicManufacturers: any
) {
  const { viewMode, setViewMode, settings, setSettings, refreshCloudData, handleLogoUpload, isSyncing } = useSyncEngine(withLoading);
  const {
    saveSettings,
    performPushSync, performPullSync, handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos
  } = useAdminCore(user);

  const [adTemplatesDB, setAdTemplatesDB] = useState<any[]>([]);

  useEffect(() => {
    refreshCloudData(user, false, setCloudCount, setPublicCategories, setPublicTags, setPublicManufacturers);
    
    // Fetch Ad Templates
    const fetchTemplates = async () => {
      try {
        const { templateService } = await import('../services/supabaseService');
        const data = await templateService.getTemplates();
        setAdTemplatesDB(data);
      } catch (err) {
        console.error('Failed to fetch ad templates:', err);
      }
    };
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Execute data fetching side effects only on the first component mount.

  return {
    viewMode, setViewMode,
    settings, setSettings,
    refreshCloudData, handleLogoUpload, isSyncing,
    saveSettings, performPushSync, performPullSync, handleSingleAiAnalyzeCallback,
    handleUngroup, handleGroupPhotos,
    adTemplatesDB, setAdTemplatesDB,
  };
}
