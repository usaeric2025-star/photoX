import { useState, useCallback } from "react";
import { logger } from '@/lib/logger';
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from "@/types";
import { DEFAULT_AI_MODEL } from '@/config/ai';
import { useUI } from '@/lib/store';
import { testAiConnection } from "@/features/ai/commands";
import { runHealthCheck } from "@/services/photo/healthFlow";
import {
  normalizeTagName,
  normalizeManufacturerName,
} from "@/lib/utils";
import { api } from "@/lib/api";
import { useInvalidatePhotos } from "@/hooks";
import { executeTask } from '@/lib/task-queue';
import { uploadToR2 } from '@/features/upload/services/upload/r2Client';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { showToast } from '@/lib/ui/toast';

import { translations } from "@/locales";

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  agnesApiKey: string;
  saveSettings: (s: AppSettings) => Promise<void>;
  performPullSync: () => Promise<void>;
  setSettings: (s: AppSettings) => void;
}

import { useDebouncedCallback } from '@/hooks/core/useDebouncedCallback';
import { useFormSubmit } from "@/lib/form/useFormSubmit";
import * as v from 'valibot';

export const useSettingsLogic = ({
  user,
  settings,
  agnesApiKey,
  saveSettings,
  performPullSync,
  setSettings,
}: UseSettingsLogicProps) => {
  
  const invalidatePhotos = useInvalidatePhotos();
  const appLang = useUI(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
    loading?: boolean;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTagMenuId, setActiveTagMenuId] = useState<number | null>(null);

  const { submit: runConnectionTest, isLoading: isTesting } = useFormSubmit({
    schema: v.object({}),
    mutationFn: async () => {
      const provider = "google";
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
    return executeTask({
      label: appLang === 'zh' ? '上传系统 Logo' : 'Upload System Logo',
      type: 'upload',
      execute: async () => {
        const fileKey = `settings/logo_${Date.now()}`;
        const { imageUrl } = await uploadToR2('', fileKey, file, undefined);
        setSettingField('logo_url', imageUrl);
        return imageUrl;
      }
    });
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
