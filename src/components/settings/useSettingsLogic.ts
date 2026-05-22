import { useState, useCallback } from 'react';
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from '@/types';
import { useGalleryStore } from '@/store';
import { testAiConnection } from '@/services/geminiService';
import { deduplicatePhotos } from '@/services/photoMutationService';
import { normalizeTagName, normalizeManufacturerName } from '@/utils/stringHelper';
import { useFeedback, useInvalidatePhotos, useTaskExecutor } from '@/hooks';
import { toast } from 'sonner';

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
  const { runTask } = useTaskExecutor();

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
          await withLoading(async () => {
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
    await runTask('一键健康检测 / Health Check', async ({ updateProgress }) => {
        const { scanAndRepairPhotoIds } = await import('@/services/photo/photoMaintenanceService');
        const { backfillThumbHashes } = await import('@/services/photo/backfillService');
        const { supabase } = await import('@/services/supabaseService');

        updateProgress(10, '正在检测本地缓存一致性...');
        // 1. Check data consistency
        const broken = await scanAndRepairPhotoIds(allPhotos);
        if (broken.length > 0) {
            throw new Error(`发现 ${broken.length} 个异常ID，建议刷新`);
        }

        updateProgress(30, '正在检测云端数据库未生成缩略图项目...');
        // 2. Check if there are any database photo records without thumb_hash
        const { data: missingHashes, error: countError } = await supabase
           .from('furniture_items')
           .select('id')
           .is('thumb_hash', null);

        if (countError) throw countError;

        if (!missingHashes || missingHashes.length === 0) {
            updateProgress(100, '诊断完成：所有项目具备完整占位缩略图！');
            // Under user requirements, skip completely as there are no issues.
            return { backfilledCount: 0, skipped: true };
        }

        updateProgress(50, `正在修复回填 ${missingHashes.length} 张照片占位图...`);
        // 3. Otherwise perform the auto-repair loop
        let backfilledCount = 0;
        await backfillThumbHashes((stats) => {
            const progressPct = 50 + (stats.processed / stats.total) * 50;
            updateProgress(
                progressPct,
                `自动修复中: ${stats.processed}/${stats.total} (成功: ${stats.success}, 失败: ${stats.failed})`
            );
            backfilledCount = stats.success;
        });

        if (backfilledCount > 0) {
            invalidatePhotos();
        }
        return { backfilledCount, skipped: false };
    }, {
        onSuccess: (result) => {
            if (result?.skipped) {
                toast.success('一键检测：系统完全健康，无需修复 (已自动略过已完善照片)');
            } else if (result && result.backfilledCount > 0) {
                toast.success(`一键检测：诊断修复完成，成功回填 ${result.backfilledCount} 张照片的占位图！`);
            } else {
                toast.success('一键检测：系统健康，所有照片均完全符合规范！');
            }
        },
        onError: (err) => {
            handleError(err, '诊断失败');
        },
        showSuccessToast: false,
        showErrorToast: true
    });
  }, [runTask, handleError, invalidatePhotos]);

  const togglePin = useCallback((tagId: string) => {
    const currentPinned = settings?.pinned_tags || [];
    let nextPinned;
    if (currentPinned.includes(tagId)) {
      nextPinned = currentPinned.filter((id: string) => id !== tagId);
    } else {
      nextPinned = [...currentPinned, tagId];
    }
    const nextSettings = { ...settings, pinned_tags: nextPinned };
    setSettings(nextSettings);
    setHasChanges(true);
    debouncedSave(nextSettings);
  }, [settings, setSettings, debouncedSave]);

  const setSettingField = useCallback(<K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    const current = settings || {};
    const newSettings = { ...current, [field]: value };
    setSettings(newSettings);
    setHasChanges(true);
    debouncedSave(newSettings);
  }, [settings, setSettings, debouncedSave]);

  const testConnection = useCallback(async () => {
    if (!settings?.gemini_api_key) return;
    setTestResult({ loading: true });
    try {
      const provider = (settings as any).ai_provider || 'google';
      const model = settings.custom_model || 'Gemini 2.5 Flash Lite Preview 09-2025';
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
