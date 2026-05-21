import { useState, useCallback } from 'react';
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from '@/types';
import { useGalleryStore } from '@/store';
import { testAiConnection } from '@/services/geminiService';
import { deduplicatePhotos } from '@/services/photoMutationService';
import { normalizeTagName, normalizeManufacturerName } from '@/utils/stringHelper';
import { useFeedback, useInvalidatePhotos } from '@/hooks';

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  geminiApiKey: string;
  customModel: string;
  saveSettings: (s: AppSettings) => Promise<any>;
  performPullSync: () => Promise<any>;
}

export const useSettingsLogic = ({
  user,
  settings,
  geminiApiKey,
  customModel,
  saveSettings,
  performPullSync
}: UseSettingsLogicProps) => {
  const { 
    setSettings, setPromptDialog, setAlertDialog, withLoading 
  } = useGalleryStore();
  const { handleError, showSuccess } = useFeedback();
  const invalidatePhotos = useInvalidatePhotos();

  const [testResult, setTestResult] = useState<{ success?: boolean, error?: string, loading?: boolean } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTagMenuId, setActiveTagMenuId] = useState<string | null>(null);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback((newSettings: AppSettings) => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveSettings(newSettings).catch((err) => handleError(err, '保存设置失败'));
      setHasChanges(false);
    }, 1500);
    setSaveTimer(timer);
  }, [saveSettings, saveTimer, handleError]);

  const handleDeduplicate = useCallback(async () => {
    if (!user) {
      handleError(new Error('请先登录云端'), '操作失败');
      return;
    }

    setAlertDialog({
      title: '确认执行排重清理吗？',
      message: '系统将扫描云端数据库，保留最早上传的版本，删除重复的照片记录。此操作不可撤销。',
      confirmLabel: '执行排重',
      onConfirm: async () => {
        try {
          await withLoading('sync-push', async () => {
            const { removed } = await deduplicatePhotos(user.id);
            if (removed > 0) {
              showSuccess(`排重完成！共清理了 ${removed} 张重复记录。`);
              await performPullSync();
            } else {
              // We could use toast.info but standardizing on showSuccess for positive feedback
              showSuccess('未发现重复记录。');
            }
          });
        } catch (e: any) {
          handleError(e, '排重失败');
        }
      }
    });
  }, [user, setAlertDialog, withLoading, performPullSync, handleError, showSuccess]);

  const handleHealthCheck = useCallback(async (allPhotos: Photo[]) => {
    try {
        await withLoading('global', async () => {
            const { scanAndRepairPhotoIds } = await import('@/services/photo/photoMaintenanceService');
            const { backfillThumbHashes } = await import('@/services/photo/backfillService');
            
            // 1. Check data consistency
            const broken = await scanAndRepairPhotoIds(allPhotos);
            if (broken.length > 0) {
                handleError(new Error(`发现 ${broken.length} 个异常ID，建议刷新`), '系统检测异常');
                return;
            }
            
            // 2. Perform backfill of missing ThumbHashes
            let backfilledCount = 0;
            await backfillThumbHashes((stats) => {
                backfilledCount = stats.success;
            });
            
            // 3. Invalidate query cache if needed
            if (backfilledCount > 0) {
                invalidatePhotos();
                showSuccess(`一键检测：系统数据正常，已成功为 ${backfilledCount} 张照片补全已缺失的 ThumbHash 占位图！`);
            } else {
                showSuccess('一键检测：系统健康，所有照片均已完全符合 ThumbHash 规范且数据高度一致。');
            }
        });
    } catch (e: any) {
        handleError(e, '诊断失败');
    }
  }, [withLoading, handleError, showSuccess, invalidatePhotos]);

  const togglePin = useCallback((tagId: string) => {
    const currentPinned = settings?.pinnedTags || [];
    let nextPinned;
    if (currentPinned.includes(tagId)) {
      nextPinned = currentPinned.filter((id: string) => id !== tagId);
    } else {
      nextPinned = [...currentPinned, tagId];
    }
    const nextSettings = { ...settings, pinnedTags: nextPinned };
    setSettings(nextSettings);
    setHasChanges(true);
    debouncedSave(nextSettings);
  }, [settings, setSettings, debouncedSave]);

  const setSettingField = useCallback(<K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    setHasChanges(true);
  }, [settings, setSettings]);

  const testConnection = useCallback(async () => {
    if (!settings?.gemini_api_key) return;
    setTestResult({ loading: true });
    try {
      const provider = (settings as any).ai_provider || 'google';
      const model = settings.custom_model || 'gemini-1.5-flash';
      const ok = await testAiConnection(settings.gemini_api_key, provider, model);
      setTestResult(ok ? { success: true } : { success: false, error: '连接失败' });
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
    }
  }, [settings]);

  return {
    testResult, setTestResult,
    hasChanges, setHasChanges,
    activeTagMenuId, setActiveTagMenuId,
    debouncedSave,
    testConnection,
    handleDeduplicate,
    handleHealthCheck,
    togglePin,
    setSettingField
  };
};
