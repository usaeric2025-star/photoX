import React from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings } from '../../types';

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
  geminiApiKey,
  setGeminiApiKey,
  customModel,
  setCustomModel,
  setSettingField,
  cardClass,
  inputClass
}: AISecuritySectionProps) {
  const [keysStatus, setKeysStatus] = React.useState({ agnes: false, openrouter: false });
  const [agnesKey, setAgnesKey] = React.useState('');
  const [isTesting, setIsTesting] = React.useState<'agnes' | 'openrouter' | null>(null);

  const fetchKeysStatus = async () => {
    try {
      const res = await fetch('/api/admin/settings/get-keys');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setKeysStatus(data.keysStatus);
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
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider,
          apiKey: provider === 'agnes' ? agnesKey : (geminiApiKey === "••••••••••••••••" ? "" : geminiApiKey),
          model: provider === 'openrouter' ? customModel : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${provider === 'agnes' ? 'Agnes' : 'OpenRouter'} 连接成功！`);
      } else {
        const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || '500 Error');
        toast.error(`${provider === 'agnes' ? 'Agnes' : 'OpenRouter'} 异常: ${errMsg}`);
      }
    } catch {
      toast.error("测试请求错误或超时");
    } finally {
      setIsTesting(null);
    }
  };

  const saveKey = async (provider: 'agnes' | 'openrouter', apiKey: string) => {
    try {
      const res = await fetch('/api/admin/settings/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${provider === 'agnes' ? 'Agnes' : 'OpenRouter'} 密鑰已保存`);
        if (provider === 'agnes') setAgnesKey('');
        else setGeminiApiKey('••••••••••••••••');
        fetchKeysStatus();
      } else {
        toast.error("保存失敗");
      }
    } catch { toast.error("請求超時"); }
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
                {keysStatus.openrouter && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
             </div>
             
             <div className="space-y-2">
                 <input 
                    type="text" 
                    placeholder="模型型號 (預設: google/gemini-2.5-flash-lite)"
                    className={`${inputClass} w-full bg-slate-50 text-[10px] font-bold`}
                    value={customModel || ''}
                    onChange={(e) => setCustomModel(e.target.value)}
                    onBlur={(e) => setSettingField('custom_model' as any, e.target.value)}
                 />
                 <div className="relative">
                    <input
                        type="password"
                        placeholder="OpenRouter API Key..."
                        className={`${inputClass} font-mono w-full bg-slate-50 pr-16`}
                        value={geminiApiKey === "••••••••••••••••" ? "" : geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                    />
                    <button onClick={() => saveKey('openrouter', geminiApiKey)} className="absolute right-1 top-1 py-1 px-2 bg-brand-navy text-white text-[8px] rounded-lg">保存</button>
                 </div>
                 <button onClick={() => handleTest('openrouter')} className="w-full text-[9px] font-black p-2 bg-slate-100 rounded-lg">測試連線</button>
             </div>
          </div>

          {/* Agnes Config */}
          <div className="space-y-4 border-l border-brand-navy/5 pl-6">
             <div className="flex items-center justify-between mb-4">
                <div className="space-y-0.5">
                   <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">Agnes AI Config</h5>
                   <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">任務：Chat/Gen</p>
                </div>
                {keysStatus.agnes && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
             </div>
             
             <div className="font-mono text-[10px] text-brand-navy/60 bg-slate-50 p-2 rounded-lg">
                固定模型: agnes-2.0-flash / agnes-image-2.1-flash 等
             </div>
             <div className="relative">
                 <input
                     type="password"
                     placeholder="Agnes API Key..."
                     className={`${inputClass} font-mono w-full bg-slate-50 pr-16`}
                     value={agnesKey}
                     onChange={(e) => setAgnesKey(e.target.value)}
                 />
                 <button onClick={() => saveKey('agnes', agnesKey)} className="absolute right-1 top-1 py-1 px-2 bg-brand-navy text-white text-[8px] rounded-lg">保存</button>
             </div>
             <button onClick={() => handleTest('agnes')} className="w-full text-[9px] font-black p-2 bg-slate-100 rounded-lg">測試連線</button>
          </div>
        </div>
      </div>
    </div>
  );
}
