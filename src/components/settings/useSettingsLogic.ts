import { useState, useCallback } from "react";
import { AppSettings, Tag, Manufacturer, Category, User, Photo } from "@/types";
import { DEFAULT_AI_MODEL } from '@/config/ai';
import { useUIStore, useShallow } from "@/store/useUIStore";
import { testAiConnection } from "@/services/ai/commands";
import { runHealthCheck } from "@/services/photo/healthFlow";
import {
  normalizeTagName,
  normalizeManufacturerName,
} from "@/lib/utils";
import { api } from "@/lib/api";
import { useTaskExecutor, useInvalidatePhotos } from "@/hooks";
import { fromThrowableAsync, ErrorFactory } from '@/lib/error/ErrorFactory';

import { translations } from "@/lib/translations";

interface UseSettingsLogicProps {
  user: User | null;
  settings: AppSettings;
  agnesApiKey: string;
  saveSettings: (s: AppSettings) => Promise<any>;
  performPullSync: () => Promise<any>;
  setSettings: (s: AppSettings) => void;
}

import { useDebouncedCallback } from '@/hooks/core/useDebouncedCallback';

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
  const [activeTagMenuId, setActiveTagMenuId] = useState<string | null>(null);

  const debouncedSave = useDebouncedCallback((newSettings: AppSettings) => {
    saveSettings(newSettings).catch(console.error);
    setHasChanges(false);
  }, 1500);

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

  const testConnection = async () => {
    if (!settings?.agnes_api_key) return;
    
    return runTask(
      appLang === 'zh' ? '测试 AI 服务连接' : 'Test AI Connection',
      async () => {
        setTestResult({ loading: true });
        try {
          const provider = (settings as any).ai_provider || "google";
          const model = settings.custom_model || DEFAULT_AI_MODEL;
          const ok = await testAiConnection(
            settings.agnes_api_key || "",
            provider,
            model,
          );
          
          if (ok) {
            setTestResult({ success: true });
            return true;
          } else {
            setTestResult({ success: false, error: '连接失败' });
            throw new Error('连接失败');
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setTestResult({ success: false, error: msg });
          throw e;
        } finally {
          setTestResult((prev) => (prev ? { ...prev, loading: false } : null));
        }
      },
      { showSuccessToast: true }
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
