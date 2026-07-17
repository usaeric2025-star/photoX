import { useAtomValue } from 'jotai';
import { appLangAtom } from '#src/store/index.js';
import { OpenRouterConfigBlock } from './OpenRouterConfigBlock.js';
import { AgnesConfigBlock } from './AgnesConfigBlock.js';
import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { AppSettings } from '#src/types/index.js';
import { } from '#lib/store/index.js';
import { useTranslation } from '#src/hooks/index.js';
import { useAISettingsActions } from './hooks/useAISettingsActions.js';

interface AISecuritySectionProps {
  agnesApiKey: string;
  setAgnesApiKey: (key: string) => void;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

/**
 * AISecuritySection
 * 
 * AI 處理器配置與安全設置區塊。
 */
export function AISecuritySection({
  agnesApiKey: initialAgnesKey,
  inputClass
}: AISecuritySectionProps) {
  const appLang = useAtomValue(appLangAtom);
  const { t } = useTranslation();
  const {
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
  } = useAISettingsActions();

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
                {(['openrouter', 'agnes'] as const).map(p => (
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
            t={t}
          />

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
