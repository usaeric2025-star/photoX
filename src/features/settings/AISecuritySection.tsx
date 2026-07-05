import { OpenRouterConfigBlock } from './OpenRouterConfigBlock.js';
import { AgnesConfigBlock } from './AgnesConfigBlock.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from '#lib/logger.js';

import React, { useCallback } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { AppSettings } from '#src/types/index.js';
import { useUI } from '#lib/store/index.js';
import { translations } from '#src/locales/index.js';

import { api } from '#lib/api.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';

const KeySaveSchema = v.object({
  provider: v.union([v.literal('openrouter'), v.literal('agnes')]),
  apiKey: v.string(),
});

const ModelSaveSchema = v.object({
  provider: v.union([v.literal('openrouter'), v.literal('agnes')]),
  model: v.string(),
});

const ProviderSaveSchema = v.object({
  provider: v.string(),
});

const TestConnectionSchema = v.object({
  provider: v.union([v.literal('openrouter'), v.literal('agnes')]),
  apiKey: v.string(),
});

import { useTranslation } from '#src/hooks/index.js';

interface AISecuritySectionProps {
  agnesApiKey: string;
  setAgnesApiKey: (key: string) => void;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

export function AISecuritySection({
  agnesApiKey: initialAgnesKey,
  setAgnesApiKey,
  setSettingField,
  cardClass,
  inputClass
}: AISecuritySectionProps) {
  const appLang = useUI(s => s.appLang);
  const { t } = useTranslation();

  const [keysStatus, setKeysStatus] = React.useState({ 
    openrouter: false, 
    agnes: false, 
    primaryProvider: 'openrouter',
    openrouter_model: '',
    agnes_model: '' 
  });
  
  // Local draft states to prevent rapid re-renders from parent/query invalidation
  const [localOpenRouterKey, setLocalOpenRouterKey] = React.useState('');
  const [localAgnesKey, setLocalAgnesKey] = React.useState(initialAgnesKey || '');

  const [isEditingOpenRouter, setIsEditingOpenRouter] = React.useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = React.useState(false);

  const [openrouterModel, setOpenrouterModel] = React.useState('');
  const [agnesModel, setAgnesModel] = React.useState('');
  const [, setCurrentModel] = React.useState('gemini-2.0-flash-exp');

  const fetchKeysStatus = useCallback(async () => {
    try {
      const res = await api.admin.settings['get-keys'].$get();
      if (res.ok) {
        const data = await res.json() as { 
          success: boolean; 
          keysStatus: { 
            openrouter: boolean; 
            agnes: boolean; 
            primaryProvider: string;
            openrouter_model?: string;
            agnes_model?: string;
          };
          currentModel?: string;
        };
        if (data.success) {
          setKeysStatus({
            openrouter: data.keysStatus.openrouter,
            agnes: data.keysStatus.agnes,
            primaryProvider: data.keysStatus.primaryProvider,
            openrouter_model: data.keysStatus.openrouter_model || '',
            agnes_model: data.keysStatus.agnes_model || ''
          });
          setCurrentModel(data.currentModel || 'gemini-2.0-flash-exp');
          setOpenrouterModel(data.keysStatus.openrouter_model || '');
          setAgnesModel(data.keysStatus.agnes_model || '');
          
          // Initial populate only!
          setLocalOpenRouterKey(prev => {
            if (data.keysStatus.openrouter && (!prev)) {
                return '••••••••••••••••';
            }
            return prev;
          });
          
          setLocalAgnesKey(prev => {
            if (data.keysStatus.agnes && !prev) {
                return '••••••••••••••••';
            }
            return prev;
          });
        }
      }
    } catch (e) {
      ErrorFactory.capture(e);
    }
  }, [api]);

  React.useEffect(() => {
    fetchKeysStatus();
  }, [fetchKeysStatus]);

  const { submit: runTest, isLoading: isTestingProvider } = useFormSubmit<typeof TestConnectionSchema, boolean>({
    schema: TestConnectionSchema,
    mutationFn: async ({ provider, apiKey }) => {
      const res = await api.ai.test.$post({
        json: { 
          provider,
          apiKey: apiKey === "••••••••••••••••" ? "" : apiKey
        }
      });
      const data = await res.json() as { success: boolean };
      if (!data.success) throw data;
      return true;
    },
    successMessage: '[System AI] 測試連通性成功 / Connection successful',
    errorMessage: '[System AI] 連接異常 / Connection abnormal'
  });

  const handleTest = async (provider: 'openrouter' | 'agnes') => {
    const apiKey = provider === 'openrouter' ? localOpenRouterKey : localAgnesKey;
    await runTest({ provider, apiKey });
  };

  const { submit: runSaveKey, isLoading: isSavingKey } = useFormSubmit<typeof KeySaveSchema, "noop" | "success">({
    schema: KeySaveSchema,
    mutationFn: async ({ provider, apiKey }) => {
      if (apiKey === "••••••••••••••••" || !apiKey.trim()) {
        return "noop";
      }
      const res = await api.admin.settings['save-key'].$post({
        json: { provider, apiKey }
      });
      const data = await res.json() as { success: boolean };
      if (!res.ok || !data.success) throw data;
      return "success";
    },
    onSuccess: (result) => {
      if (result === "success") {
        fetchKeysStatus();
      }
    },
    successMessage: "[System AI] 金鑰保存成功 / Key saved",
    errorMessage: "保存失敗 / Save failed"
  });

  const saveKey = async (provider: 'openrouter' | 'agnes', apiKey: string) => {
    await runSaveKey({ provider, apiKey });
  };

  const { submit: runSaveProvider, isLoading: isSavingProvider } = useFormSubmit<typeof ProviderSaveSchema, boolean>({
    schema: ProviderSaveSchema,
    mutationFn: async ({ provider }) => {
      const res = await api.admin.settings['save-provider'].$post({
        json: { provider }
      });
      const data = await res.json() as { success: boolean };
      if (!res.ok || !data.success) throw data;
      return true;
    },
    onSuccess: () => {
      fetchKeysStatus();
    },
    successMessage: '首選引擎已切換 / Primary provider switched',
    errorMessage: '切換失敗 / Switch failed'
  });

  const saveProvider = async (provider: string) => {
    await runSaveProvider({ provider });
  };

  const { submit: runSaveModel } = useFormSubmit<typeof ModelSaveSchema, boolean>({
    schema: ModelSaveSchema,
    mutationFn: async ({ provider, model }) => {
      const res = await api.admin.settings['save-model'].$post({
        json: { provider, model }
      });
      const data = await res.json() as { success: boolean };
      if (!res.ok || !data.success) throw data;
      return true;
    },
    onSuccess: () => {
      fetchKeysStatus();
    },
    successMessage: '[System AI] 自定義模型已保存 / Model saved',
    errorMessage: '模型保存失敗 / Save failed'
  });

  const handleSaveModel = async (provider: 'openrouter' | 'agnes', modelVal: string) => {
    await runSaveModel({ provider, model: modelVal });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 overflow-hidden" id="section-ai">
        <div className="p-6 border-b border-brand-navy/5 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center">
             <Icon name="sparkles" size={16} className="text-brand-gold mr-2" />
             <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
                AI 处理器配置 / AI Processors
             </h4>
           </div>
           
           <div className="flex items-center gap-2 bg-white/50 p-1 rounded-full border border-slate-200">
              <span className="text-[8px] font-bold text-brand-navy/60 ml-2 uppercase">首选 / Primary</span>
              <div className="flex bg-slate-100 rounded-full p-0.5">
                {['openrouter', 'agnes'].map(p => (
                   <button
                    key={p}
                    onClick={() => saveProvider(p)}
                    disabled={isSavingProvider === true}
                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${keysStatus.primaryProvider === p ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/40 hover:text-brand-navy/60'}`}
                  >
                    {p === 'openrouter' ? 'OpenRouter' : 'Agnes'}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OpenRouter Config */}
          
<OpenRouterConfigBlock 
  keysStatus={keysStatus}
  isEditingOpenRouter={isEditingOpenRouter}
  setIsEditingOpenRouter={setIsEditingOpenRouter}
  localOpenRouterKey={localOpenRouterKey}
  setLocalOpenRouterKey={setLocalOpenRouterKey}
  openrouterModel={openrouterModel}
  setOpenrouterModel={setOpenrouterModel}
  inputClass={inputClass}
  saveKey={saveKey}
  handleSaveModel={handleSaveModel}
  handleTest={handleTest}
  isSaving={isSavingKey && keysStatus.primaryProvider === 'openrouter' ? 'openrouter' : null}
  isTesting={isTestingProvider && keysStatus.primaryProvider === 'openrouter' ? 'openrouter' : null}
  appLang={appLang}
  t={t}
/>

          {/* Gemini Config (Agnes) */}
          
<AgnesConfigBlock
  keysStatus={keysStatus}
  isEditingAgnes={isEditingAgnes}
  setIsEditingAgnes={setIsEditingAgnes}
  localAgnesKey={localAgnesKey}
  setLocalAgnesKey={setLocalAgnesKey}
  agnesModel={agnesModel}
  setAgnesModel={setAgnesModel}
  inputClass={inputClass}
  saveKey={saveKey}
  handleSaveModel={handleSaveModel}
  handleTest={handleTest}
  isSaving={isSavingKey && keysStatus.primaryProvider === 'agnes' ? 'agnes' : null}
  isTesting={isTestingProvider && keysStatus.primaryProvider === 'agnes' ? 'agnes' : null}
  appLang={appLang}
  t={t}
/>
        </div>
      </div>
    </div>
  );
}
