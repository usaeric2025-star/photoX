import { useState, useEffect } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useSettings, useTranslation } from '#src/hooks/index.js';
import { AppSettings } from '#src/types/index.js';
import { feedback } from '#lib/feedback.js';
import { testAiConnection } from "#src/features/ai/AICommands.js";
import { useAppQuery, queryClient } from '#lib/query/index.js';
import { api } from '#lib/api.js';

/**
 * useAISettingsActions
 * 
 * 管理 AI 設置相關的 UI 狀態與操作（Key 保存、模型切換、連接測試）。
 */
export type AIProvider = "openrouter" | "agnes" | "gemini";

export function useAISettingsActions() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();

  const { data: adminSettings } = useAppQuery(
    ['admin', 'settings', 'get-keys'],
    async () => {
      const res = await api.admin.settings['get-keys'].$get();
      return ErrorFactory.unwrap(res, 'Failed to fetch AI keys');
    }
  );

  const [localOpenRouterKey, setLocalOpenRouterKey] = useState('');
  const [localAgnesKey, setLocalAgnesKey] = useState('');
  const [localGeminiKey, setLocalGeminiKey] = useState('');

  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-2.5-flash');
  const [agnesModel, setAgnesModel] = useState('gemini-2.0-flash-exp');

  useEffect(() => {
    if (adminSettings?.keysStatus) {
      if (adminSettings.keysStatus.openrouter) setLocalOpenRouterKey('••••••••••••••••');
      if (adminSettings.keysStatus.agnes) setLocalAgnesKey('••••••••••••••••');
      if (adminSettings.keysStatus.gemini) setLocalGeminiKey('••••••••••••••••');

      if (adminSettings.keysStatus.gemini_model) setGeminiModel(adminSettings.keysStatus.gemini_model);
      if (adminSettings.keysStatus.openrouter_model) setOpenrouterModel(adminSettings.keysStatus.openrouter_model);
      if (adminSettings.keysStatus.agnes_model) setAgnesModel(adminSettings.keysStatus.agnes_model);
    }
  }, [adminSettings]);

  const [isEditingGemini, setIsEditingGemini] = useState(false);
  const [isEditingOpenRouter, setIsEditingOpenRouter] = useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = useState(false);
  
  const [isTestingProvider, setIsTestingProvider] = useState<AIProvider | null>(null);
  const [isSavingKey, setIsSavingKey] = useState<AIProvider | null>(null);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const keysStatus = {
    openrouter: adminSettings?.keysStatus?.openrouter || !!settings?.openrouterApiKey,
    agnes: adminSettings?.keysStatus?.agnes || !!settings?.agnesApiKey,
    gemini: adminSettings?.keysStatus?.gemini || !!settings?.geminiApiKey,
    primaryProvider: adminSettings?.keysStatus?.primaryProvider || String(settings?.primaryAiProvider || 'agnes')
  };

  const saveKey = async (provider: AIProvider, key: string) => {
    setIsSavingKey(provider);
    try {
      const field = provider === 'openrouter' ? 'openrouterApiKey' : provider === 'agnes' ? 'agnesApiKey' : 'geminiApiKey';
      await updateSettings({ [field]: key } as Partial<AppSettings>);
      feedback.success(t('updateSuccess') || '保存成功');
      
      if (provider === 'openrouter') {
        setIsEditingOpenRouter(false);
        setLocalOpenRouterKey('••••••••••••••••');
      } else if (provider === 'agnes') {
        setIsEditingAgnes(false);
        setLocalAgnesKey('••••••••••••••••');
      } else {
        setIsEditingGemini(false);
        setLocalGeminiKey('••••••••••••••••');
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'get-keys'] });
    } catch (e) {
      ErrorFactory.handle(e, { context: t('updateError') || '保存失敗' });
    } finally {
      setIsSavingKey(null);
    }
  };

  const saveProvider = async (provider: AIProvider) => {
    setIsSavingProvider(true);
    try {
      await updateSettings({ primaryAiProvider: provider } as Partial<AppSettings>);
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'get-keys'] });
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleSaveModel = async (provider: AIProvider, model: string) => {
    const field = provider === 'openrouter' ? 'openrouterModel' : provider === 'agnes' ? 'agnesModel' : 'geminiModel';
    await updateSettings({ [field]: model } as Partial<AppSettings>);
  };

  const handleTest = async (provider: AIProvider) => {
    setIsTestingProvider(provider);
    try {
      const ok = await testAiConnection("use-backend-key", provider);
      if (ok) {
        feedback.success(t('aiConnectSuccess') || '連接成功');
      } else {
        feedback.error(t('aiConnectFailed') || '連接失敗');
      }
    } catch (e) {
      ErrorFactory.handle(e, { context: t('aiConnectFailed') || '連接失敗' });
    } finally {
      setIsTestingProvider(null);
    }
  };

  return {
    keysStatus,
    localOpenRouterKey,
    setLocalOpenRouterKey,
    localAgnesKey,
    setLocalAgnesKey,
    isEditingOpenRouter,
    setIsEditingOpenRouter,
    isEditingAgnes,
    setIsEditingAgnes,
    localGeminiKey,
    setLocalGeminiKey,
    isEditingGemini,
    setIsEditingGemini,
    geminiModel,
    setGeminiModel,
    openrouterModel,
    setOpenrouterModel,
    agnesModel,
    setAgnesModel,
    isTestingProvider,
    isSavingKey,
    isSavingProvider,
    handleTest,
    saveKey,
    saveProvider,
    handleSaveModel
  };
}
