import { useState, useCallback } from "react";
import { logger } from '@/lib/logger';
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from "@/types";
import { DEFAULT_AI_MODEL } from '@/config/ai';
import { useUIStore, useShallow } from "@/store/useUIStore";
import { testAiConnection } from "@/features/ai/commands";
import { runHealthCheck } from "@/services/photo/healthFlow";
import {
  normalizeTagName,
  normalizeManufacturerName,
} from "@/lib/utils";
import { api } from "@/lib/api";
import { useTaskExecutor, useInvalidatePhotos } from "@/hooks";
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { showToast } from '@/lib/ui/toast';

import { translations } from "@/locales";

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  agnesApiKey: string;
  saveSettings: (s: AppSettings) => Promise<any>;
  performPullSync: () => Promise<any>;
  setSettings: (s: AppSettings) => void;
}

import { useDebouncedCallback } from '@/hooks/core/useDebouncedCallback';
import { useFormSubmit } from "@/lib/form/useFormSubmit";
import { type } from "arktype";

export const useSettingsLogic = ({
  user,
  settings,
  agnesApiKey,
  saveSettings,
  performPullSync,
  setSettings,
}: UseSettingsLogicProps) => {
  
  const invalidatePhotos = useInvalidatePhotos();
  const { runTask } = useTaskExecutor();
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
    loading?: boolean;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTagMenuId, setActiveTagMenuId] = useState<number | null>(null);

  const { submit: runConnectionTest, isLoading: isTesting } = useFormSubmit({
    schema: type('unknown'),
    mutationFn: async () => {
      const provider = (settings as any).ai_provider || "google";
      const ok = await testAiConnection(
        settings.agnes_api_key || "",
        provider,
      );
      if (!ok) throw new Error('連接失敗 / Connection failed');
      return true;
    },
    onSuccess: () => {
      setTestResult({ success: true });
    },
    onError: (msg) => {
      setTestResult({ success: false, error: msg });
    },
    successMessage: appLang === 'zh' ? 'AI 服務連線成功' : 'AI Connection successful',
    errorMessage: appLang === 'zh' ? 'AI 服務連線失敗' : 'AI Connection failed'
  });

  const debouncedSave = useDebouncedCallback((newSettings: AppSettings) => {
    saveSettings(newSettings)
      .catch((err) => {
        logger.error("Auto save settings failed:", err);
      });
    setHasChanges(false);
  }, 1500);

  const testConnection = async () => {
    if (!settings?.agnes_api_key) return;
    await runConnectionTest({});
  };

  const togglePin = (tagId: number) => {
    const currentPinned = (settings?.pinned_tags || []).map(Number);
    let nextPinned;
    if (currentPinned.includes(tagId)) {
      nextPinned = currentPinned.filter((id) => id !== tagId);
    } else {
      nextPinned = [...currentPinned, tagId];
    }
    const nextSettings = { ...settings, pinned_tags: nextPinned.map(String) };
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

  const uploadLogo = async (file: File) => {
    return runTask(
      appLang === 'zh' ? '上传系统 Logo' : 'Upload System Logo',
      async () => {
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const resp = await api.uploadDirect.$post({
          json: {
            base64Data,
            fileKey: `settings/logo_${Date.now()}.webp`,
            contentType: file.type
          }
        });
        
        const res = await resp.json() as any;
        if (!res.success || !res.data.publicUrl) {
          throw new Error(res.error || 'Upload failed');
        }
        
        setSettingField('logo_url', res.data.publicUrl);
        return res.data.publicUrl;
      }
    );
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
    togglePin,
    setSettingField,
    uploadLogo
  };
};
