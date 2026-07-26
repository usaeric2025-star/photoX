import React from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { AppSettings } from '#src/types/index.js';
import { useSettingsText } from '#src/hooks/useSettingsText.js';
import { useAISettingsActions } from './hooks/useAISettingsActions.js';
import { OpenRouterConfigBlock } from './OpenRouterConfigBlock.js';
import { AgnesConfigBlock } from './AgnesConfigBlock.js';
import { GeminiConfigBlock } from './GeminiConfigBlock.js';

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
  inputClass
}: AISecuritySectionProps) {
  const text = useSettingsText();
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
  } = useAISettingsActions();

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 overflow-hidden" id="section-ai">
        <div className="p-5 sm:p-6 border-b border-brand-navy/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80">
           <div className="flex items-center gap-2">
             <Icon name="sparkles" size={18} className="text-brand-gold shrink-0" />
             <h4 className="font-bold text-brand-navy text-sm sm:text-base tracking-tight">
                {text.ai.title}
             </h4>
           </div>
           
           <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-brand-navy/70 ml-2 shrink-0">{text.ai.primary}</span>
              <div className="flex bg-slate-100/80 rounded-xl p-1 gap-1">
                {(['openrouter', 'agnes', 'gemini'] as const).map(p => (
                   <button
                    key={p}
                    onClick={() => saveProvider(p)}
                    disabled={isSavingProvider}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      keysStatus.primaryProvider === p 
                        ? 'bg-white text-brand-navy shadow-xs border border-slate-200/60 font-extrabold' 
                        : 'text-brand-navy/50 hover:text-brand-navy hover:bg-white/50'
                    }`}
                  >
                    {p === 'openrouter' ? 'OpenRouter' : p === 'agnes' ? 'Agnes' : 'Gemini'}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            isSaving={isSavingKey === 'openrouter' ? 'openrouter' : null}
            isTesting={isTestingProvider === 'openrouter' ? 'openrouter' : null}
          />

          <AgnesConfigBlock
            keysStatus={keysStatus as any}
            isEditingAgnes={isEditingAgnes}
            setIsEditingAgnes={setIsEditingAgnes}
            localAgnesKey={localAgnesKey}
            setLocalAgnesKey={setLocalAgnesKey}
            agnesModel={agnesModel}
            setAgnesModel={setAgnesModel}
            inputClass={inputClass}
            saveKey={saveKey as any}
            handleSaveModel={handleSaveModel as any}
            handleTest={handleTest as any}
            isSaving={isSavingKey === 'agnes' ? 'agnes' : null}
            isTesting={isTestingProvider === 'agnes' ? 'agnes' : null}
          />
          <GeminiConfigBlock
            keysStatus={keysStatus as any}
            isEditingGemini={isEditingGemini}
            setIsEditingGemini={setIsEditingGemini}
            localGeminiKey={localGeminiKey}
            setLocalGeminiKey={setLocalGeminiKey}
            geminiModel={geminiModel}
            setGeminiModel={setGeminiModel}
            inputClass={inputClass}
            saveKey={saveKey as any}
            handleSaveModel={handleSaveModel as any}
            handleTest={handleTest as any}
            isSaving={isSavingKey === 'gemini' ? 'gemini' : null}
            isTesting={isTestingProvider === 'gemini' ? 'gemini' : null}
          />
        </div>
      </div>
    </div>
  );
}
