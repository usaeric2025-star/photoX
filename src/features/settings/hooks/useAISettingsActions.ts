import { useState, useEffect } from 'react';
import { DEFAULT_AI_MODELS } from '../../../../shared/aiModels.js';
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
  const [geminiModel, setGeminiModel] = useState(String(settings?.geminiModel || DEFAULT_AI_MODELS.gemini));
  const [isEditingGemini, setIsEditingGemini] = useState(false);

  const [openrouterModel, setOpenrouterModel] = useState(String(settings?.openrouterModel || DEFAULT_AI_MODELS.openrouter));
  const [agnesModel, setAgnesModel] = useState(String(settings?.agnesModel || DEFAULT_AI_MODELS.agnes));

  const [primaryProviderState, setPrimaryProviderState] = useState<AIProvider>(
    (settings?.primaryAiProvider as AIProvider) || 'agnes'
  );

  useEffect(() => {
    if (settings?.openrouterApiKey) setLocalOpenRouterKey('••••••••••••••••');
    if (settings?.agnesApiKey) setLocalAgnesKey('••••••••••••••••');
    if (settings?.geminiApiKey) setLocalGeminiKey('••••••••••••••••');
    if (settings?.openrouterModel) setOpenrouterModel(String(settings.openrouterModel));
    if (settings?.agnesModel) setAgnesModel(String(settings.agnesModel));
    if (settings?.geminiModel) setGeminiModel(String(settings.geminiModel));
    if (settings?.primaryAiProvider) setPrimaryProviderState(settings.primaryAiProvider as AIProvider);
  }, [settings?.openrouterApiKey, settings?.agnesApiKey, settings?.geminiApiKey, settings?.openrouterModel, settings?.agnesModel, settings?.geminiModel, settings?.primaryAiProvider]);
  
  const [isEditingOpenRouter, setIsEditingOpenRouter] = useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = useState(false);
  
  const [isTestingProvider, setIsTestingProvider] = useState<AIProvider | null>(null);
  const [isSavingKey, setIsSavingKey] = useState<AIProvider | null>(null);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const keysStatus = {
    openrouter: !!settings?.openrouterApiKey,
    agnes: !!settings?.agnesApiKey,
    gemini: !!settings?.geminiApiKey,
    primaryProvider: primaryProviderState
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
      ErrorFactory.handle(e, { context: t('updateError') || '保存失败' });
    } finally {
      setIsSavingKey(null);
    }
  };

  const saveProvider = async (provider: AIProvider) => {
    if (isSavingProvider) return;
    const prev = primaryProviderState;
    setPrimaryProviderState(provider);
    setIsSavingProvider(true);
    try {
      await updateSettings({ primaryAiProvider: provider } as Partial<AppSettings>);
      const name = provider === 'openrouter' ? 'OpenRouter' : provider === 'agnes' ? 'Agnes' : 'Gemini';
      feedback.success(`已设置首选 AI 处理器为 ${name}`);
    } catch (e) {
      setPrimaryProviderState(prev);
      ErrorFactory.handle(e, { context: '切换首选 AI 处理器失败' });
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
      const res = await testAiConnection(String(apiKey || ""), provider);
      if (res && res.success) {
        feedback.success('测试连接成功');
      } else {
        feedback.error(res?.error || '测试连接失败');
      }
    } catch (e) {
      ErrorFactory.handle(e, { context: '测试连接失败' });
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
