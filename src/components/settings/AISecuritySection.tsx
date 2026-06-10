import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings } from '../../types';
import { useUIStore } from '@/store/useUIStore';
import { translations } from '@/lib/translations';

import { api } from '@/lib/api';

interface AISecuritySectionProps {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  customModel: string;
  setCustomModel: (model: string) => void;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

export function AISecuritySection({
  geminiApiKey: initialGeminiKey,
  setGeminiApiKey,
  customModel: initialCustomModel,
  setCustomModel,
  setSettingField,
  cardClass,
  inputClass
}: AISecuritySectionProps) {
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const [keysStatus, setKeysStatus] = React.useState({ openrouter: false, gemini: false, primaryProvider: 'openrouter' });
  
  // Local draft states to prevent rapid re-renders from parent/query invalidation
  const [localCustomModel, setLocalCustomModel] = React.useState(initialCustomModel || '');
  const [localOpenRouterKey, setLocalOpenRouterKey] = React.useState('');
  const [localGeminiKey, setLocalGeminiKey] = React.useState('');

  const [isTesting, setIsTesting] = React.useState<'openrouter' | 'gemini' | null>(null);
  const [isEditingOpenRouter, setIsEditingOpenRouter] = React.useState(false);
  const [isEditingGemini, setIsEditingGemini] = React.useState(false);
  const [isSavingProvider, setIsSavingProvider] = React.useState<boolean | null>(null);

  // Use refs to track initialization so we don't overwrite user typing
  const modelInit = React.useRef(false);

  React.useEffect(() => {
    if (!modelInit.current && initialCustomModel) {
        setLocalCustomModel(initialCustomModel);
        modelInit.current = true;
    }
  }, [initialCustomModel]);

  const fetchKeysStatus = async () => {
    try {
      const res = await api.admin.settings['get-keys'].$get() as any;
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeysStatus(data.keysStatus);
          if (data.keysStatus.openrouter) {
            setLocalOpenRouterKey('••••••••••••••••');
          }
          if (data.keysStatus.gemini) {
            setLocalGeminiKey('••••••••••••••••');
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch keys status:", e);
    }
  };

  React.useEffect(() => {
    fetchKeysStatus();
  }, []);

  const handleTest = async (provider: 'openrouter' | 'gemini') => {
    setIsTesting(provider);
    try {
      const targetKey = provider === 'openrouter' ? localOpenRouterKey : localGeminiKey;
      const res = await api.ai.test.$post({
        json: { 
          provider,
          apiKey: targetKey === "••••••••••••••••" ? "" : targetKey,
          model: provider === 'openrouter' ? localCustomModel : 'gemini-1.5-flash'
        }
      }) as any;
      const data = await res.json();
      if (data.success) {
        toast.success(`[System AI] ${provider} 测试连通性成功`);
      } else {
        const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || '500 Error');
        toast.error(`[System AI] ${provider} 连接异常: ${errMsg}`);
      }
    } catch {
      toast.error('请求超时或网络异常');
    } finally {
      setIsTesting(null);
    }
  };

  const [isSaving, setIsSaving] = React.useState<'openrouter' | 'gemini' | null>(null);

  const saveKey = async (provider: 'openrouter' | 'gemini', apiKey: string) => {
    if (apiKey === "••••••••••••••••" || !apiKey.trim()) {
      toast.success('密钥未更改');
      return;
    }
    setIsSaving(provider);
    try {
      const res = await api.admin.settings['save-key'].$post({
        json: { provider, apiKey }
      }) as any;
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`[System AI] ${provider} 密钥保存成功`);
        if (provider === 'openrouter') {
          setLocalOpenRouterKey('••••••••••••••••');
          setGeminiApiKey('••••••••••••••••');
          setIsEditingOpenRouter(false);
        } else {
          setLocalGeminiKey('••••••••••••••••');
          setIsEditingGemini(false);
        }
        await fetchKeysStatus();
      } else {
        toast.error('保存失败');
      }
    } catch { toast.error('网络请求异常'); }
    finally {
      setIsSaving(null);
    }
  };

  const saveProvider = async (provider: string) => {
    setIsSavingProvider(true);
    try {
      const res = await api.admin.settings['save-provider'].$post({
        json: { provider }
      }) as any;
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`首选引擎已切换为: ${provider}`);
        await fetchKeysStatus();
      } else {
        toast.error('切换失败: ' + (data.error || 'Unknown'));
      }
    } catch { toast.error('切换失败'); }
    finally { setIsSavingProvider(null); }
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 overflow-hidden" id="section-ai">
        <div className="p-6 border-b border-brand-navy/5 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center">
             <Sparkles size={16} className="text-brand-gold mr-2" />
             <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
                AI 处理器配置 / AI Processors
             </h4>
           </div>
           
           <div className="flex items-center gap-2 bg-white/50 p-1 rounded-full border border-slate-200">
              <span className="text-[8px] font-bold text-brand-navy/60 ml-2 uppercase">首选 / Primary</span>
              <div className="flex bg-slate-100 rounded-full p-0.5">
                {['openrouter', 'gemini'].map(p => (
                  <button
                    key={p}
                    onClick={() => saveProvider(p)}
                    disabled={isSavingProvider === true}
                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all ${keysStatus.primaryProvider === p ? 'bg-white text-brand-navy shadow-sm' : 'text-brand-navy/40 hover:text-brand-navy/60'}`}
                  >
                    {p === 'openrouter' ? 'Omni' : 'Agnes'}
                  </button>
                ))}
              </div>
           </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OpenRouter Config */}
          <div className="space-y-4 p-4 rounded-3xl bg-slate-50/50 border border-slate-100">
             <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                   <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">OpenRouter (Primary)</h5>
                   <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">萬能引擎 / Multi-Model</p>
                </div>
                <div className="flex items-center gap-2">
                  {keysStatus.openrouter && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
                  <button 
                    onClick={() => {
                      setIsEditingOpenRouter(!isEditingOpenRouter);
                      if (!isEditingOpenRouter && localOpenRouterKey === "••••••••••••••••") setLocalOpenRouterKey("");
                    }}
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingOpenRouter ? 'bg-slate-200 text-slate-600' : 'bg-brand-navy text-white'}`}
                  >
                    {isEditingOpenRouter ? '取消' : '編輯'}
                  </button>
                </div>
             </div>
             
             <div className="space-y-2">
                 <div className="flex items-center gap-2">
                   <span className="text-[8px] font-black text-brand-navy/40 uppercase whitespace-nowrap">Model ID</span>
                   <input 
                      type="text" 
                      placeholder="google/gemini-2.5-flash-lite"
                      className={`${inputClass} flex-1 bg-white text-[10px] font-bold h-9`}
                      value={localCustomModel}
                      onChange={(e) => setLocalCustomModel(e.target.value)}
                      onBlur={(e) => {
                        setSettingField('custom_model' as any, e.target.value);
                        setCustomModel(e.target.value);
                      }}
                      disabled={!isEditingOpenRouter}
                   />
                 </div>
                 
                 <div className="relative">
                    <input
                        type={isEditingOpenRouter ? "text" : "password"}
                        placeholder="OpenRouter API Key..."
                        className={`${inputClass} h-9 font-mono w-full ${isEditingOpenRouter ? 'bg-white border-brand-navy/20' : 'bg-slate-50'} pr-16`}
                        value={localOpenRouterKey}
                        onChange={(e) => setLocalOpenRouterKey(e.target.value)}
                        disabled={!isEditingOpenRouter}
                        autoFocus={isEditingOpenRouter}
                    />
                    {isEditingOpenRouter && (
                      <button 
                           onClick={() => saveKey('openrouter', localOpenRouterKey)} 
                           disabled={isSaving === 'openrouter'}
                           className="absolute right-1 top-1 py-1 px-4 bg-brand-gold text-brand-navy text-[10px] font-black rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                       >
                           {isSaving === 'openrouter' ? '..' : '保存'}
                       </button>
                    )}
                 </div>
                 {!isEditingOpenRouter && (
                   <button onClick={() => handleTest('openrouter')} disabled={isTesting !== null} className="w-full text-[10px] font-black p-2 bg-white hover:bg-slate-100 transition-colors rounded-xl border border-slate-200 flex items-center justify-center gap-2">
                     {isTesting === 'openrouter' ? 'Testing...' : 'Test Connection'}
                   </button>
                 )}
             </div>
          </div>

          {/* Gemini Config (Agnes) */}
          <div className="space-y-4 p-4 rounded-3xl bg-blue-50/30 border border-blue-100">
             <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                   <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-tight">Agnes AI (Gemini)</h5>
                   <p className="text-[8px] text-blue-900/40 font-bold uppercase tracking-widest">原生引擎 / Native Gemini</p>
                </div>
                <div className="flex items-center gap-2">
                  {keysStatus.gemini && <div className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
                  <button 
                    onClick={() => {
                      setIsEditingGemini(!isEditingGemini);
                      if (!isEditingGemini && localGeminiKey === "••••••••••••••••") setLocalGeminiKey("");
                    }}
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingGemini ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'}`}
                  >
                    {isEditingGemini ? '取消' : '編輯'}
                  </button>
                </div>
             </div>
             
             <div className="space-y-2">
                 <div className="relative">
                    <input
                        type={isEditingGemini ? "text" : "password"}
                        placeholder="Gemini API Key..."
                        className={`${inputClass} h-9 font-mono w-full ${isEditingGemini ? 'bg-white border-blue-200' : 'bg-blue-50/50'} pr-16`}
                        value={localGeminiKey}
                        onChange={(e) => setLocalGeminiKey(e.target.value)}
                        disabled={!isEditingGemini}
                    />
                    {isEditingGemini && (
                      <button 
                           onClick={() => saveKey('gemini', localGeminiKey)} 
                           disabled={isSaving === 'gemini'}
                           className="absolute right-1 top-1 py-1 px-4 bg-blue-600 text-white text-[10px] font-black rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                       >
                           {isSaving === 'gemini' ? '..' : '保存'}
                       </button>
                    )}
                 </div>
                 {!isEditingGemini && (
                   <button onClick={() => handleTest('gemini')} disabled={isTesting !== null} className="w-full text-[10px] font-black p-2 bg-white hover:bg-blue-50 transition-colors rounded-xl border border-blue-100 flex items-center justify-center gap-2 text-blue-700">
                     {isTesting === 'gemini' ? 'Testing...' : 'Test Connection'}
                   </button>
                 )}
                 <p className="text-[7px] text-blue-900/60 leading-tight"> 用于驱动 Agnes 智能助手及高性能视觉分析任务。</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
