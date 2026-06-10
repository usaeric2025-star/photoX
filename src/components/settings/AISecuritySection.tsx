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

  const [keysStatus, setKeysStatus] = React.useState({ agnes: false, openrouter: false });
  const [agnesKey, setAgnesKey] = React.useState('');
  
  // Local draft states to prevent rapid re-renders from parent/query invalidation
  const [localCustomModel, setLocalCustomModel] = React.useState(initialCustomModel || '');
  const [localOpenRouterKey, setLocalOpenRouterKey] = React.useState(initialGeminiKey || '');

  const [isTesting, setIsTesting] = React.useState<'agnes' | 'openrouter' | null>(null);
  const [isEditingOpenRouter, setIsEditingOpenRouter] = React.useState(false);
  const [isEditingAgnes, setIsEditingAgnes] = React.useState(false);

  // Use refs to track initialization so we don't overwrite user typing
  const modelInit = React.useRef(false);
  const keyInit = React.useRef(false);

  React.useEffect(() => {
    if (!modelInit.current && initialCustomModel) {
        setLocalCustomModel(initialCustomModel);
        modelInit.current = true;
    }
  }, [initialCustomModel]);

  React.useEffect(() => {
    if (!keyInit.current && initialGeminiKey) {
        setLocalOpenRouterKey(initialGeminiKey);
        keyInit.current = true;
    }
  }, [initialGeminiKey]);

  const fetchKeysStatus = async () => {
    try {
      const res = await api.admin.settings['get-keys'].$get() as any;
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeysStatus(data.keysStatus);
          if (data.keysStatus.agnes) {
            setAgnesKey('••••••••••••••••');
          }
           if (data.keysStatus.openrouter) {
            setLocalOpenRouterKey('••••••••••••••••');
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

  const handleTest = async (provider: 'agnes' | 'openrouter') => {
    setIsTesting(provider);
    try {
      const targetKey = provider === 'agnes' ? agnesKey : localOpenRouterKey;
      const res = await api.ai.test.$post({
        json: { 
          provider,
          apiKey: targetKey === "••••••••••••••••" ? "" : targetKey,
          model: provider === 'openrouter' ? localCustomModel : undefined
        }
      }) as any;
      const data = await res.json();
      if (data.success) {
        toast.success(`[${provider}] 测试连通性成功`);
      } else {
        const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || '500 Error');
        toast.error(`[${provider}] 连接异常: ${errMsg}`);
      }
    } catch {
      toast.error('请求超时或网络异常');
    } finally {
      setIsTesting(null);
    }
  };

  const [isSaving, setIsSaving] = React.useState<'agnes' | 'openrouter' | null>(null);

  const saveKey = async (provider: 'agnes' | 'openrouter', apiKey: string) => {
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
        toast.success(`[${provider}] 密钥保存成功`);
        if (provider === 'agnes') {
            setAgnesKey('••••••••••••••••');
            setIsEditingAgnes(false);
        } else {
            setLocalOpenRouterKey('••••••••••••••••');
            setGeminiApiKey('••••••••••••••••'); // Sync to parent if needed
            setIsEditingOpenRouter(false);
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

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 overflow-hidden" id="section-ai">
        <div className="p-6 border-b border-brand-navy/5 flex items-center bg-slate-50/50">
           <Sparkles size={16} className="text-brand-gold mr-2" />
           <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
              AI 引擎配置 / AI Engine Configuration
           </h4>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OpenRouter Config */}
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                   <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">OpenRouter Config</h5>
                   <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">任務：圖片識別</p>
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
                      placeholder="OpenRouter Model ID"
                      className={`${inputClass} flex-1 bg-slate-50 text-[10px] font-bold`}
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
                        className={`${inputClass} font-mono w-full ${isEditingOpenRouter ? 'bg-white border-brand-navy/20' : 'bg-slate-50'} pr-16`}
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
                   <button onClick={() => handleTest('openrouter')} disabled={isTesting !== null} className="w-full text-[10px] font-black p-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg flex items-center justify-center gap-2">
                     {isTesting === 'openrouter' ? (appLang === 'zh' ? '测试中...' : 'Testing...') : (appLang === 'zh' ? '测试 OpenRouter 连线' : 'Test OpenRouter Connection')}
                   </button>
                 )}
             </div>
          </div>

          {/* Agnes Config */}
          <div className="space-y-4 border-l border-brand-navy/5 pl-6">
             <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                   <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">Agnes AI Config</h5>
                   <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">任務：Chat/Gen</p>
                </div>
                <div className="flex items-center gap-2">
                  {keysStatus.agnes && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
                  <button 
                    onClick={() => {
                      setIsEditingAgnes(!isEditingAgnes);
                      if (!isEditingAgnes && agnesKey === "••••••••••••••••") setAgnesKey("");
                    }}
                    className={`text-[8px] font-black px-2 py-0.5 rounded-full transition-colors ${isEditingAgnes ? 'bg-slate-200 text-slate-600' : 'bg-brand-navy text-white'}`}
                  >
                    {isEditingAgnes ? '取消' : '編輯'}
                  </button>
                </div>
             </div>
             
             <div className="font-mono text-[8px] text-brand-navy/60 bg-slate-50 p-2 rounded-lg border border-brand-navy/5">
                固定模型: agnes-2.0-flash / agnes-image-2.1-flash 等
             </div>
             <div className="relative">
                 <input
                     type={isEditingAgnes ? "text" : "password"}
                     placeholder="Agnes API Key..."
                     className={`${inputClass} font-mono w-full ${isEditingAgnes ? 'bg-white border-brand-navy/20' : 'bg-slate-50'} pr-16`}
                     value={agnesKey}
                     onChange={(e) => setAgnesKey(e.target.value)}
                     disabled={!isEditingAgnes}
                     autoFocus={isEditingAgnes}
                 />
                 {isEditingAgnes && (
                   <button 
                      onClick={() => saveKey('agnes', agnesKey)} 
                      disabled={isSaving === 'agnes'}
                      className="absolute right-1 top-1 py-1 px-4 bg-brand-gold text-brand-navy text-[10px] font-black rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                   >
                      {isSaving === 'agnes' ? '..' : '保存'}
                   </button>
                 )}
             </div>
             {!isEditingAgnes && (
               <button onClick={() => handleTest('agnes')} disabled={isTesting !== null} className="w-full text-[10px] font-black p-2 bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg flex items-center justify-center gap-2">
                 {isTesting === 'agnes' ? (appLang === 'zh' ? '测试中...' : 'Testing...') : (appLang === 'zh' ? '测试 Agnes 连线' : 'Test Agnes Connection')}
               </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
