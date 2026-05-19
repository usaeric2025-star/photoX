import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AppSettings, Tag, Manufacturer, Category, User } from '../../types';
import { useGalleryStore } from '../../store';
import { testAiConnection } from '../../services/geminiService';
import { deduplicatePhotos } from '../../services/photoMutationService';
import { normalizeTagName, normalizeManufacturerName } from '../../utils/stringHelper';
import { useErrorHandler } from '../../utils/errorHandler';

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
  const { handleError } = useErrorHandler();

  const [testResult, setTestResult] = useState<{ success?: boolean, error?: string, loading?: boolean } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTagMenuId, setActiveTagMenuId] = useState<string | null>(null);
  const [saveTimer, setSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const debouncedSave = useCallback((newSettings: AppSettings) => {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      saveSettings(newSettings).catch((err) => console.error('Save settings failed:', err));
      setHasChanges(false);
    }, 1500);
    setSaveTimer(timer);
  }, [saveSettings, saveTimer]);

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
              toast.success(`排重完成！共清理了 ${removed} 张重复记录。`);
              await performPullSync();
            } else {
              toast.info('未发现重复记录。');
            }
          });
        } catch (e: any) {
          handleError(e, '排重失败');
        }
      }
    });
  }, [user, setAlertDialog, withLoading, performPullSync, handleError]);

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

  return {
    testResult, setTestResult,
    hasChanges, setHasChanges,
    activeTagMenuId, setActiveTagMenuId,
    debouncedSave,
    testConnection,
    handleDeduplicate,
    togglePin,
    setSettingField
  };
};
