import { useState } from 'react';
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
export function useAISettingsActions() {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();

  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(
    settings?.openrouterApiKey ? '••••••••••••••••' : ''
  );
  const [localAgnesKey, setLocalAgnesKey] = useState(
    settings?.agnesApiKey ? '••••••••••••••••' : ''
  );

  const [openrouterModel, setOpenrouterModel] = useState(String(settings?.openrouterModel || 'google/gemini-2.5-flash'));
  const [agnesModel, setAgnesModel] = useState(String(settings?.agnesModel || 'gemini-2.0-flash-exp'));
  
  const [isEditingOpenRouter, setIsEditingOpenRouter] = useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = useState(false);
  
  const [isTestingProvider, setIsTestingProvider] = useState<'openrouter' | 'agnes' | null>(null);
  const [isSavingKey, setIsSavingKey] = useState<'openrouter' | 'agnes' | null>(null);
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  const keysStatus = {
    openrouter: !!settings?.openrouterApiKey,
    agnes: !!settings?.agnesApiKey,
    primaryProvider: String(settings?.primaryAiProvider || 'agnes')
  };

  const saveKey = async (provider: 'openrouter' | 'agnes', key: string) => {
    setIsSavingKey(provider);
    try {
      const field = provider === 'openrouter' ? 'openrouterApiKey' : 'agnesApiKey';
      await updateSettings({ [field]: key } as Partial<AppSettings>);
      feedback.success(t('updateSuccess') || '保存成功');
      
      if (provider === 'openrouter') {
        setIsEditingOpenRouter(false);
        setLocalOpenRouterKey('••••••••••••••••');
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

  const saveProvider = async (provider: 'openrouter' | 'agnes') => {
    setIsSavingProvider(true);
    try {
      await updateSettings({ primaryAiProvider: provider } as Partial<AppSettings>);
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleSaveModel = async (provider: 'openrouter' | 'agnes', model: string) => {
    const field = provider === 'openrouter' ? 'openrouterModel' : 'agnesModel';
    await updateSettings({ [field]: model } as Partial<AppSettings>);
  };

  const handleTest = async (provider: 'openrouter' | 'agnes') => {
    setIsTestingProvider(provider);
    try {
      const apiKey = provider === 'openrouter' ? settings?.openrouterApiKey : settings?.agnesApiKey;
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
