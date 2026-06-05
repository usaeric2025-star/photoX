import { useState, useCallback } from "react";
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from "@/types";
import { DEFAULT_AI_MODEL } from '@/config/ai';
import { useUIStore, useShallow } from "@/store/useUIStore";
import { testAiConnection } from "@/services/gemini";
import { runHealthCheck } from "@/services/photo/healthFlow";
import {
  normalizeTagName,
  normalizeManufacturerName,
} from "@/lib/utils";
import { api } from "@/lib/api";
import { fromThrowableAsync } from '@/lib/errorFactory';
import { toast } from '@/lib/ui/toast';
import { useErrorHandler, useInvalidatePhotos, useTaskExecutor } from "@/hooks";
import { ErrorFactory } from '@/lib/error/ErrorFactory';

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  geminiApiKey: string;
  customModel: string;
  saveSettings: (s: AppSettings) => Promise<any>;
  performPullSync: () => Promise<any>;
  setSettings: (s: AppSettings) => void;
}

import { useDebouncedCallback } from '@mantine/hooks';

export const useSettingsLogic = ({
  user,
  settings,
  geminiApiKey,
  customModel,
  saveSettings,
  performPullSync,
  setSettings,
}: UseSettingsLogicProps) => {
  const { update } = useUIStore(useShallow((s) => ({ update: s.update })));
  const { handleError } = useErrorHandler();
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();

  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
    loading?: boolean;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTagMenuId, setActiveTagMenuId] = useState<string | null>(null);

  const debouncedSave = useDebouncedCallback((newSettings: AppSettings) => {
    saveSettings(newSettings).catch((err) =>
      handleError(err, "保存设置失败"),
    );
    setHasChanges(false);
  }, 1500);

  const handleHealthCheck = async (allPhotos: Photo[]) => {
    try {
      await runHealthCheck(allPhotos, async (orphans) => {
        return new Promise((resolve) => {
          update({
            alertDialog: {
              title: "发现孤儿文件 / Orphans Found",
              message: `存储空间中发现了 ${orphans} 个不再被数据库使用的文件。是否要清理这些“废弃孤本”以释放空间？`,
              confirmLabel: "立即清理",
              onConfirm: async () => {
                update({ alertDialog: null });
                toast.success("正在清理存儲空間...");
                const cleanResp = await api.storage.clean.$post({});
                if (!cleanResp.ok) {
                  throw ErrorFactory.wrap(new Error(`清理存储失败 (HTTP ${cleanResp.status})，无法执行深度文件擦除。`), 'cleanOrphanFiles');
                }
                const cleanData = await cleanResp.json();
                if (cleanData.success) {
                  toast.success(`清理完成！共刪除 ${cleanData.data.cleanedCount} 個文件。`);
                }
                resolve();
              },
            },
          });
        });
      }, invalidatePhotos);
    } catch (err: any) {
      handleError(err, "診斷失敗");
    }
  };

  const togglePin = (tagId: string) => {
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
  };

  const setSettingField = <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => {
    const current = settings || {};
    const newSettings = { ...current, [field]: value };
    setSettings(newSettings);
    setHasChanges(true);
    debouncedSave(newSettings);
  };

  const testConnection = async () => {
    if (!settings?.gemini_api_key) return;
    setTestResult({ loading: true });

    try {
      const provider = (settings as any).ai_provider || "google";
      const model =
        settings.custom_model || DEFAULT_AI_MODEL;
      const ok = await testAiConnection(
        settings.gemini_api_key,
        provider,
        model,
      );
      if (ok) {
        setTestResult({ success: true });
        toast.success("測試成功：AI 服務連接正常！");
      } else {
        setTestResult({ success: false, error: "连接失败" });
      }
    } catch (e: any) {
      setTestResult({ success: false, error: e.message });
      handleError(e, "连接失败");
    } finally {
      setTestResult((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  return {
    testResult,
    setTestResult,
    hasChanges,
    setHasChanges,
    activeTagMenuId,
    setActiveTagMenuId,
    debouncedSave,
    testConnection,
    handleHealthCheck,
    togglePin,
    setSettingField,
  };
};
