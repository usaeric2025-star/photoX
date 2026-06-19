import React from 'react';
import { translations } from '@/locales';

interface KeysStatus {
  openrouter: boolean;
  agnes: boolean;
  primaryProvider: string;
}

interface AgnesConfigBlockProps {
  keysStatus: KeysStatus;
  isEditingAgnes: boolean;
  setIsEditingAgnes: (val: boolean) => void;
  localAgnesKey: string;
  setLocalAgnesKey: (val: string) => void;
  agnesModel: string;
  setAgnesModel: (val: string) => void;
  inputClass: string;
  saveKey: (provider: 'openrouter' | 'agnes', key: string) => Promise<void>;
  handleSaveModel: (provider: 'openrouter' | 'agnes', model: string) => Promise<void>;
  handleTest: (provider: 'openrouter' | 'agnes') => Promise<void>;
  isSaving: 'openrouter' | 'agnes' | null;
  isTesting: 'openrouter' | 'agnes' | null;
  appLang: string;
  t: any;
}

export function AgnesConfigBlock({
  keysStatus,
  isEditingAgnes,
  setIsEditingAgnes,
  localAgnesKey,
  setLocalAgnesKey,
  agnesModel,
  setAgnesModel,
  inputClass,
  saveKey,
  handleSaveModel,
  handleTest,
  isSaving,
  isTesting,
  appLang,
  t
}: AgnesConfigBlockProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-blue-50/30 border border-blue-100">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-0.5">
           <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-tight">Agnes AI</h5>
           <p className="text-[8px] text-blue-900/40 font-bold uppercase tracking-widest">集成原生引擎 / Native Engine</p>
        </div>
        <div className="flex items-center gap-2">
          {keysStatus.agnes && <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
          <button 
            onClick={() => {
              setIsEditingAgnes(!isEditingAgnes);
              if (!isEditingAgnes && localAgnesKey === '••••••••••••••••') setLocalAgnesKey('');
            }}
            className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingAgnes ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'}`}
          >
            {isEditingAgnes ? (translations[appLang as keyof typeof translations] as any)?.cancel || '取消' : (translations[appLang as keyof typeof translations] as any)?.edit || '編輯'}
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
          <div className="relative">
            <input
                type={isEditingAgnes ? 'text' : 'password'}
                placeholder="Agnes API Key (sk-...)"
                className={`${inputClass} h-10 font-mono w-full ${isEditingAgnes ? 'bg-white border-blue-300 ring-2 ring-blue-100' : 'bg-blue-50/50'} pr-16`}
                value={localAgnesKey}
                onChange={(e) => setLocalAgnesKey(e.target.value)}
                disabled={!isEditingAgnes}
            />
            {isEditingAgnes && (
              <button 
                   onClick={() => saveKey('agnes', localAgnesKey)} 
                   disabled={isSaving === 'agnes'}
                   className="absolute right-1 top-1 py-1 px-4 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50"
               >
                   {isSaving === 'agnes' ? '..' : '保存'}
               </button>
            )}
          </div>
          
          <div className="space-y-1 mt-2 mb-2">
            <label className="text-[10px] font-bold text-blue-900/60 block">模型型号</label>
            <input
                type="text"
                placeholder="例如: gemini-2.0-flash-exp"
                className={`${inputClass} !h-8 text-[11px] w-full bg-white border-blue-900/10 py-1.5`}
                value={agnesModel}
                onChange={(e) => setAgnesModel(e.target.value)}
                onBlur={() => handleSaveModel('agnes', agnesModel)}
            />
          </div>
          
          <button 
            onClick={() => handleTest('agnes')} 
            disabled={isTesting !== null} 
            className={`w-full text-[9px] font-black p-2.5 transition-all rounded-xl border flex items-center justify-center gap-2 ${isTesting === 'agnes' ? 'bg-blue-50 text-blue-300 border-blue-100' : 'bg-white hover:bg-blue-50 border-blue-200 text-blue-700 shadow-sm active:scale-95'}`}
          >
            {isTesting === 'agnes' ? '測試連通性中...' : '测试连通性 / Test Connection'}
          </button>
      </div>
    </div>
  );
}
