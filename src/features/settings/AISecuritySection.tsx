
import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { showToast } from '@/lib/ui/toast';
import { AppSettings } from '../../types';
import { useUIStore } from '@/store/useUIStore';
import { translations } from '@/locales';
import { handleError } from '@/lib/error/errorHandler';

import { api } from '@/lib/api';

interface AISecuritySectionProps {
  agnesApiKey: string;
  setAgnesApiKey: (key: string) => void;
  customModel: string;
  accessPasscode: string;
  setAccessPasscode: (code: string) => void;
  setSettingField: <K extends keyof AppSettings>(field: K, value: AppSettings[K]) => void;
  cardClass: string;
  inputClass: string;
}

export function AISecuritySection({
  agnesApiKey: initialAgnesKey,
  setAgnesApiKey,
  customModel,
  setSettingField,
  cardClass,
  inputClass
}: AISecuritySectionProps) {
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const [keysStatus, setKeysStatus] = React.useState({ openrouter: false, agnes: false, primaryProvider: 'openrouter' });
  
  // Local draft states to prevent rapid re-renders from parent/query invalidation
  const [localOpenRouterKey, setLocalOpenRouterKey] = React.useState('');
  const [localAgnesKey, setLocalAgnesKey] = React.useState(initialAgnesKey || '');

  const [isTesting, setIsTesting] = React.useState<'openrouter' | 'agnes' | null>(null);
  const [isEditingOpenRouter, setIsEditingOpenRouter] = React.useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = React.useState(false);
  const [isSavingProvider, setIsSavingProvider] = React.useState<boolean | null>(null);

  const [openrouterModel, setOpenrouterModel] = React.useState('');
  const [agnesModel, setAgnesModel] = React.useState('');
  const [currentModel, setCurrentModel] = React.useState('gemini-2.0-flash-exp');

  const fetchKeysStatus = async () => {
    try {
      const res = await api.admin.settings['get-keys'].$get();
      if (res.ok) {
        const data = await res.json() as any;
        if (data.success) {
          setKeysStatus(data.keysStatus);
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
      console.error("Failed to fetch keys status:", e);
    }
  };

  React.useEffect(() => {
    fetchKeysStatus();
  }, [fetchKeysStatus]);

  const handleTest = async (provider: 'openrouter' | 'agnes') => {
    setIsTesting(provider);
    try {
      const targetKey = provider === 'openrouter' ? localOpenRouterKey : localAgnesKey;
      const res = await api.ai.test.$post({
        json: { 
          provider,
          apiKey: targetKey === "••••••••••••••••" ? "" : targetKey
        }
      }) as any;
      const data = await res.json();
      if (data.success) {
        showToast.success(`[System AI] ${provider} 测试连通性成功`);
      } else {
        handleError(data, `[System AI] ${provider} 连接异常`);
      }
    } catch (e) {
      handleError(e, '请求超时或网络异常');
    } finally {
      setIsTesting(null);
    }
  };

  const [isSaving, setIsSaving] = React.useState<'openrouter' | 'agnes' | null>(null);

  const saveKey = async (provider: 'openrouter' | 'agnes', apiKey: string) => {
    if (apiKey === "••••••••••••••••" || !apiKey.trim()) {
      showToast.success('密钥未更改');
      return;
    }
    setIsSaving(provider);
    try {
      const res = await api.admin.settings['save-key'].$post({
        json: { provider, apiKey }
      }) as any;
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast.success(`[System AI] ${provider} 密钥保存成功`);
        
        // Immediate UI update
        if (provider === 'openrouter') {
          setLocalOpenRouterKey('••••••••••••••••');
          setIsEditingOpenRouter(false);
          setKeysStatus(prev => ({ ...prev, openrouter: true }));
        } else {
          setLocalAgnesKey('••••••••••••••••');
          setAgnesApiKey('••••••••••••••••');
          setIsEditingAgnes(false);
          setKeysStatus(prev => ({ ...prev, agnes: true }));
        }
        
        // Finalize state in background
        fetchKeysStatus();
      } else {
        handleError(data, '保存失败');
      }
    } catch (e) { 
      handleError(e, '保存密钥失败');
      
      const errorMsg = (e as any).error?.message || (e as Error).message || '';
      if (errorMsg.includes('secrets')) {
        showToast.info('检测到表缺失，请点击：[前往系统故障排查]', {
          action: {
            label: '立即处理',
            onClick: () => (window.location.href = '/admin?tab=diagnostics')
          },
          duration: 10000
        });
      }
    }
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
        showToast.success(`首选引擎已切换为: ${provider === 'openrouter' ? 'OpenRouter' : 'Agnes'}`);
        setKeysStatus(prev => ({ ...prev, primaryProvider: provider }));
        fetchKeysStatus();
      } else {
        handleError(data, '切换失败');
      }
    } catch (e) {
      handleError(e, '切换失败: 网络错误');
    }
    finally { setIsSavingProvider(null); }
  };

  const handleSaveModel = async (provider: 'openrouter' | 'agnes', modelVal: string) => {
    try {
      const res = await api.admin.settings['save-model'].$post({
        json: { provider, model: modelVal }
      }) as any;
      const data = await res.json();
      if (res.ok && data.success) {
        showToast.success(`[System AI] ${provider === 'openrouter' ? 'OpenRouter' : 'Agnes'} 自定义模型已保存`);
        fetchKeysStatus();
      } else {
        handleError(data, '模型保存失败');
      }
    } catch (e) {
      handleError(e, '模型保存失败: 网络异常');
    }
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
                      if (!isEditingOpenRouter && localOpenRouterKey === "••••••••••••••••") setLocalOpenRouterKey("");
                    }}
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingOpenRouter ? 'bg-slate-200 text-slate-600' : 'bg-brand-navy text-white'}`}
                  >
                    {isEditingOpenRouter ? translations[appLang as keyof typeof translations]?.cancel || '取消' : translations[appLang as keyof typeof translations]?.edit || '編輯'}
                  </button>
                </div>
             </div>
             
             <div className="space-y-3">
                 <div className="relative">
                    <input
                        type={isEditingOpenRouter ? "text" : "password"}
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

          {/* Gemini Config (Agnes) */}
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
                      if (!isEditingAgnes && localAgnesKey === "••••••••••••••••") setLocalAgnesKey("");
                    }}
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingAgnes ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'}`}
                  >
                    {isEditingAgnes ? translations[appLang as keyof typeof translations]?.cancel || '取消' : translations[appLang as keyof typeof translations]?.edit || '編輯'}
                  </button>
                </div>
             </div>
             
             <div className="space-y-3">
                 <div className="relative">
                    <input
                        type={isEditingAgnes ? "text" : "password"}
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
        </div>
      </div>
    </div>
  );
}
