import React from 'react';

interface KeysStatus {
  openrouter: boolean;
  gemini: boolean;
  primaryProvider: string;
}

interface GeminiConfigBlockProps {
  keysStatus: KeysStatus;
  isEditingGemini: boolean;
  setIsEditingGemini: (val: boolean) => void;
  localGeminiKey: string;
  setLocalGeminiKey: (val: string) => void;
  geminiModel: string;
  setGeminiModel: (val: string) => void;
  inputClass: string;
  saveKey: (provider: 'openrouter' | 'gemini', key: string) => Promise<void>;
  handleSaveModel: (provider: 'openrouter' | 'gemini', model: string) => Promise<void>;
  handleTest: (provider: 'openrouter' | 'gemini') => Promise<void>;
  isSaving: 'openrouter' | 'gemini' | null;
  isTesting: 'openrouter' | 'gemini' | null;
  appLang: string;
  t: (key: string, ...args: unknown[]) => string;
}

/**
 * GeminiConfigBlock
 * 
 * Gemini AI 服務配置區塊。
 */
export function GeminiConfigBlock({
  keysStatus,
  isEditingGemini,
  setIsEditingGemini,
  localGeminiKey,
  setLocalGeminiKey,
  geminiModel,
  setGeminiModel,
  inputClass,
  saveKey,
  handleSaveModel,
  handleTest,
  isSaving,
  isTesting,
  t
}: GeminiConfigBlockProps) {
  return (
    <div className="space-y-4 p-5 rounded-3xl bg-purple-50/30 border border-purple-100">
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-0.5">
           <h5 className="text-[10px] font-black text-purple-900 uppercase tracking-tight">Gemini AI</h5>
           <p className="text-[8px] text-purple-900/40 font-bold uppercase tracking-widest">集成原生引擎 / Native Engine</p>
        </div>
        <div className="flex items-center gap-2">
          {keysStatus.gemini && <div className="px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-[8px] font-black uppercase">{t('active') || '已啟用'}</div>}
          <button 
            onClick={() => {
              setIsEditingGemini(!isEditingGemini);
              if (!isEditingGemini && localGeminiKey === '••••••••••••••••') setLocalGeminiKey('');
            }}
            className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingGemini ? 'bg-slate-200 text-slate-600' : 'bg-purple-600 text-white'}`}
          >
            {isEditingGemini ? t('cancel') || '取消' : t('edit') || '編輯'}
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
          <div className="relative">
            <input
                type={isEditingGemini ? 'text' : 'password'}
                placeholder="Gemini API Key (sk-...)"
                className={`${inputClass} h-10 font-mono w-full ${isEditingGemini ? 'bg-white border-purple-300 ring-2 ring-purple-100' : 'bg-purple-50/50'} pr-16`}
                value={localGeminiKey}
                onChange={(e) => setLocalGeminiKey(e.target.value)}
                disabled={!isEditingGemini}
            />
            {isEditingGemini && (
              <button 
                   onClick={() => saveKey('gemini', localGeminiKey)} 
                   disabled={isSaving === 'gemini'}
                   className="absolute right-1 top-1 py-1 px-4 bg-purple-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-all disabled:opacity-50"
               >
                   {isSaving === 'gemini' ? '..' : '保存'}
               </button>
            )}
          </div>
          
          <div className="space-y-1 mt-2 mb-2">
            <label className="text-[10px] font-bold text-purple-900/60 block">模型型号 / Model</label>
            <input
                type="text"
                placeholder="例如: gemini-2.0-flash-exp"
                className={`${inputClass} !h-8 text-[11px] w-full bg-white border-purple-900/10 py-1.5`}
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                onBlur={() => handleSaveModel('gemini', geminiModel)}
            />
          </div>

          <button 
            onClick={() => handleTest('gemini')} 
            disabled={isTesting !== null} 
            className={`w-full text-[9px] font-black p-2.5 transition-all rounded-xl border flex items-center justify-center gap-2 ${isTesting === 'gemini' ? 'bg-purple-50 text-purple-300 border-purple-100' : 'bg-white hover:bg-purple-50 border-purple-200 text-purple-700 shadow-sm active:scale-95'}`}
          >
            {isTesting === 'gemini' ? '測試連通性中...' : '测试连通性 / Test Connection'}
          </button>
      </div>
    </div>
  );
}
