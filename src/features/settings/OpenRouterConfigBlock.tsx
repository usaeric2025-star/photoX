import React from 'react';
import { translations } from '@/locales';

interface KeysStatus {
  openrouter: boolean;
  agnes: boolean;
  primaryProvider: string;
}

interface OpenRouterConfigBlockProps {
  keysStatus: KeysStatus;
  isEditingOpenRouter: boolean;
  setIsEditingOpenRouter: (val: boolean) => void;
  localOpenRouterKey: string;
  setLocalOpenRouterKey: (val: string) => void;
  openrouterModel: string;
  setOpenrouterModel: (val: string) => void;
  inputClass: string;
  saveKey: (provider: 'openrouter' | 'agnes', key: string) => Promise<void>;
  handleSaveModel: (provider: 'openrouter' | 'agnes', model: string) => Promise<void>;
  handleTest: (provider: 'openrouter' | 'agnes') => Promise<void>;
  isSaving: 'openrouter' | 'agnes' | null;
  isTesting: 'openrouter' | 'agnes' | null;
  appLang: string;
  t: any;
}

export function OpenRouterConfigBlock({
  keysStatus,
  isEditingOpenRouter,
  setIsEditingOpenRouter,
  localOpenRouterKey,
  setLocalOpenRouterKey,
  openrouterModel,
  setOpenrouterModel,
  inputClass,
  saveKey,
  handleSaveModel,
  handleTest,
  isSaving,
  isTesting,
  appLang,
  t
}: OpenRouterConfigBlockProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-slate-50/50 border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-0.5">
           <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">OpenRouter</h5>
           <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">萬能引擎 / Multi-Model</p>
        </div>
        <div className="flex items-center gap-2">
          {keysStatus.openrouter && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
          <button 
            onClick={() => {
              setIsEditingOpenRouter(!isEditingOpenRouter);
              if (!isEditingOpenRouter && localOpenRouterKey === '••••••••••••••••') setLocalOpenRouterKey('');
            }}
            className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingOpenRouter ? 'bg-slate-200 text-slate-600' : 'bg-brand-navy text-white'}`}
          >
            {isEditingOpenRouter ? (translations[appLang as keyof typeof translations] as any)?.cancel || '取消' : (translations[appLang as keyof typeof translations] as any)?.edit || '編輯'}
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
          <div className="relative">
            <input
                type={isEditingOpenRouter ? 'text' : 'password'}
                placeholder="OpenRouter API Key (sk-or-...)"
                className={`${inputClass} h-10 font-mono w-full ${isEditingOpenRouter ? 'bg-white border-brand-navy/20' : 'bg-slate-50'} pr-16`}
                value={localOpenRouterKey}
                onChange={(e) => setLocalOpenRouterKey(e.target.value)}
                disabled={!isEditingOpenRouter}
                autoFocus={isEditingOpenRouter}
            />
            {isEditingOpenRouter && (
              <button 
                   onClick={() => saveKey('openrouter', localOpenRouterKey)} 
                   disabled={isSaving === 'openrouter'}
                   className="absolute right-1 top-1 py-1 px-4 bg-brand-gold text-brand-navy text-[10px] font-black rounded-lg shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50"
               >
                   {isSaving === 'openrouter' ? '..' : '保存'}
               </button>
            )}
          </div>

          <div className="space-y-1 mt-2 mb-2">
            <label className="text-[10px] font-bold text-brand-navy/60 block">模型型号</label>
            <input
                type="text"
                placeholder="例如: google/gemini-2.5-flash-lite"
                className={`${inputClass} !h-8 text-[11px] w-full bg-white border-brand-navy/10 py-1.5`}
                value={openrouterModel}
                onChange={(e) => setOpenrouterModel(e.target.value)}
                onBlur={() => handleSaveModel('openrouter', openrouterModel)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => handleTest('openrouter')} 
              disabled={isTesting !== null} 
              className={`w-full col-span-2 text-[9px] font-black p-2.5 rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all ${isTesting === 'openrouter' ? 'bg-slate-100 text-slate-400' : 'bg-white hover:bg-slate-100 text-brand-navy hover:border-brand-navy/20 shadow-sm'}`}
            >
              {isTesting === 'openrouter' ? '測試連通性中...' : '测试連通性 / Test Connection'}
            </button>
          </div>
      </div>
    </div>
  );
}
