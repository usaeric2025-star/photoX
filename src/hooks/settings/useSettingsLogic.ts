import { useState, useCallback } from "react";
import { logger } from '#lib/logger.js';
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from '#src/types/index.js';
import { DEFAULT_AI_MODEL } from '#src/config/ai.js';
import { useUI } from '#lib/store/index.js';
import { testAiConnection } from "#src/features/ai/commands.js";
import { runHealthCheck } from "#src/services/photo/utils.js";
import {
  normalizeTagName,
  normalizeManufacturerName,
} from "#lib/utils.js";
import { api } from "#lib/api.js";
import { useInvalidatePhotos } from '../photo/usePhotos.js';
import { executeTask } from '#lib/task-queue/index.js';
import { uploadToR2 } from '#src/features/upload/services/r2Client.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { showToast } from '#lib/ui/toast.js';

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  agnesApiKey: string;
  saveSettings: (s: AppSettings) => Promise<void>;
  performPullSync: () => Promise<void>;
  setSettings: (s: AppSettings) => void;
}

import { useTranslation, useDebouncedCallback } from '#src/hooks/core/index.js';
import { useFormSubmit } from "#lib/forms/useFormSubmit.js";
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
  const { t, appLang } = useTranslation();

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
        String(settings.agnesApiKey || ""),
        provider,
      );
      if (!ok) throw new Error('連接失敗 / Connection failed');
      return true;
    },
    onSuccess: () => {
      setTestResult({ success: true });
    },
    onError: (msg: unknown) => {
      setTestResult({ success: false, error: String(msg) });
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
    if (!settings?.agnesApiKey) return;
    await runConnectionTest({});
  };

  const togglePin = (tagId: number) => {
    const currentPinned = (settings?.pinnedTags || []).map(Number);
    let nextPinned;
    if (currentPinned.includes(tagId)) {
      nextPinned = currentPinned.filter((id) => id !== tagId);
    } else {
      nextPinned = [...currentPinned, tagId];
    }
    const nextSettings = { ...settings, pinnedTags: nextPinned.map(String) };
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
        setSettingField('logoUrl', imageUrl);
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
