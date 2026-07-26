import { useState, useEffect } from 'react';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useSettings, useTranslation } from '#src/hooks/index.js';
import { AppSettings } from '#src/types/index.js';
import { feedback } from '#lib/feedback.js';
import { testAiConnection } from "#src/features/ai/AICommands.js";

/**
 * useAISettingsActions
 * 
 * 管理 AI 設置相關的 UI 狀態與操作（Key 保存、模型切換、連接測試）。
 */
export type AIProvider = "openrouter" | "agnes" | "gemini";

export function useAISettingsActions() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();

  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(
    settings?.openrouterApiKey ? '••••••••••••••••' : ''
  );
  const [localAgnesKey, setLocalAgnesKey] = useState(
    settings?.agnesApiKey ? '••••••••••••••••' : ''
  );
  const [localGeminiKey, setLocalGeminiKey] = useState(
    settings?.geminiApiKey ? '••••••••••••••••' : ''
  );
  const [geminiModel, setGeminiModel] = useState(String(settings?.geminiModel || 'gemini-2.0-flash'));
  const [isEditingGemini, setIsEditingGemini] = useState(false);

  const [openrouterModel, setOpenrouterModel] = useState(String(settings?.openrouterModel || 'google/gemini-2.5-flash'));
  const [agnesModel, setAgnesModel] = useState(String(settings?.agnesModel || 'gemini-2.0-flash-exp'));

  useEffect(() => {
    if (settings?.openrouterApiKey) setLocalOpenRouterKey('••••••••••••••••');
    if (settings?.agnesApiKey) setLocalAgnesKey('••••••••••••••••');
    if (settings?.geminiApiKey) setLocalGeminiKey('••••••••••••••••');
    if (settings?.openrouterModel) setOpenrouterModel(String(settings.openrouterModel));
    if (settings?.agnesModel) setAgnesModel(String(settings.agnesModel));
    if (settings?.geminiModel) setGeminiModel(String(settings.geminiModel));
  }, [settings?.openrouterApiKey, settings?.agnesApiKey, settings?.geminiApiKey, settings?.openrouterModel, settings?.agnesModel, settings?.geminiModel]);
  
  const [isEditingOpenRouter, setIsEditingOpenRouter] = useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = useState(false);
  
  const [isTestingProvider, setIsTestingProvider] = useState<AIProvider | null>(null);
  const [isSavingKey, setIsSavingKey] = useState<AIProvider | null>(null);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const keysStatus = {
    openrouter: !!settings?.openrouterApiKey,
    agnes: !!settings?.agnesApiKey,
    gemini: !!settings?.geminiApiKey,
    primaryProvider: String(settings?.primaryAiProvider || 'agnes')
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
      } else if (provider === 'gemini') {
        setIsEditingGemini(false);
        setLocalGeminiKey('••••••••••••••••');
      } else {
        setIsEditingAgnes(false);
        setLocalAgnesKey('••••••••••••••••');
      }
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
      const apiKey = provider === 'openrouter' ? settings?.openrouterApiKey : provider === 'agnes' ? settings?.agnesApiKey : settings?.geminiApiKey;
      const ok = await testAiConnection(String(apiKey || ""), provider);
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
