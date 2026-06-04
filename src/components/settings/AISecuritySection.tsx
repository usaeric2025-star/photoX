import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { AppSettings } from '../../types';

interface AISecuritySectionProps {
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  customModel: string;
  setCustomModel: (model: string) => void;
  testConnection: () => Promise<void>;
  testResult: { success?: boolean, error?: string, loading?: boolean } | null;
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
  testConnection,
  testResult,
  accessPasscode,
  setAccessPasscode,
  setSettingField,
  cardClass,
  inputClass
}: AISecuritySectionProps) {
  const [agnesKey, setAgnesKey] = React.useState('');
  const [keysStatus, setKeysStatus] = React.useState({ agnes: false, openrouter: false });
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
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${provider === 'agnes' ? 'Agnes' : 'OpenRouter'} 连接成功！`);
      } else {
        toast.error(`${provider === 'agnes' ? 'Agnes' : 'OpenRouter'} 异常: ${data.error || '500 Error'}`);
      }
    } catch {
      toast.error("测试请求错误或超时");
    } finally {
      setIsTesting(null);
    }
  };

  const currentProvider = localStorage.getItem('AI_PRIMARY_PROVIDER') || 'agnes';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 p-6 space-y-6" id="section-ai">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-brand-gold shrink-0" />
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex-1">
            AI 核心配置 / AI Configuration
          </h4>
        </div>

        {/* Global Provider Selector */}
        <div className="p-4 bg-brand-navy/5 rounded-2xl space-y-2">
          <p className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">当前首选提供商 / Primary Provider</p>
          <select
            className={`${inputClass} w-full bg-white`}
            value={currentProvider}
            onChange={async (e) => {
              const val = e.target.value;
              localStorage.setItem('AI_PRIMARY_PROVIDER', val);
              setSettingField('provider', val);
              try {
                await fetch('/api/admin/settings/save-provider', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ provider: val })
                });
                toast.success(`已切换为 ${val === 'agnes' ? 'Agnes AI' : 'OpenRouter'}`);
              } catch (err) {
                console.error("Failed to save provider to DB:", err);
              }
            }}
          >
            <option value="agnes">Agnes AI (稳定推荐 & 免费)</option>
            <option value="openrouter">OpenRouter (Gemini 支持)</option>
          </select>
        </div>

        {/* Agnes AI Config Group */}
        <div className={`p-4 rounded-2xl border-2 transition-all ${currentProvider === 'agnes' ? 'border-brand-gold bg-brand-gold/5' : 'border-transparent bg-gray-50 opacity-60'}`}>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tighter">Agnes AI 配置</h5>
            {keysStatus.agnes && <CheckCircle2 size={12} className="text-green-500" />}
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">Agnes API 密钥</p>
              <input 
                type="password" 
                placeholder={keysStatus.agnes ? "•••••••••••••••• (已保存)" : "输入 API 密钥..."}
                className={`${inputClass} font-mono w-full bg-white`}
                value={agnesKey}
                onChange={(e) => setAgnesKey(e.target.value)}
                onBlur={async () => {
                  if (!agnesKey) return;
                  try {
                    const res = await fetch('/api/admin/settings/save-key', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: 'agnes', apiKey: agnesKey, model: 'agnes-ai' })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      toast.success("Agnes 密鑰驗證通過並加密保存");
                      setAgnesKey('');
                      fetchKeysStatus();
                    } else {
                      toast.error(data.error || "Agnes 密鑰驗證失敗");
                    }
                  } catch { toast.error("密鑰保存請求超時"); }
                }}
              />
            </div>
            <button 
              disabled={isTesting === 'agnes'}
              onClick={() => handleTest('agnes')}
              className="w-full py-2 bg-brand-navy text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isTesting === 'agnes' ? '正在檢測...' : '立即測試 Agnes'}
            </button>
          </div>
        </div>

        {/* OpenRouter Config Group */}
        <div className={`p-4 rounded-2xl border-2 transition-all ${currentProvider === 'openrouter' ? 'border-brand-gold bg-brand-gold/5' : 'border-transparent bg-gray-50 opacity-60'}`}>
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tighter">OpenRouter 配置</h5>
            {(keysStatus.openrouter || geminiApiKey === "••••••••••••••••") && <CheckCircle2 size={12} className="text-green-500" />}
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">模型型號 / Model</p>
              <input 
                type="text" 
                placeholder="例如: google/gemini-2.0-flash-exp:free"
                className={`${inputClass} w-full bg-white`}
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                onBlur={(e) => setSettingField('custom_model', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">API 密鑰</p>
              <input 
                type="password" 
                placeholder={keysStatus.openrouter || geminiApiKey === "••••••••••••••••" ? "•••••••••••••••• (已保存)" : "輸入 API 密鑰..."}
                className={`${inputClass} font-mono w-full bg-white`}
                value={geminiApiKey === "••••••••••••••••" ? "" : geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                onBlur={async (e) => {
                  const val = e.target.value;
                  if (!val || val === "••••••••••••••••") return;
                  try {
                    const res = await fetch('/api/admin/settings/save-key', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: 'openrouter', apiKey: val, model: customModel })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      toast.success("OpenRouter 密鑰驗證通過並同步");
                      setSettingField('gemini_api_key', val);
                      fetchKeysStatus();
                    } else {
                      toast.error(data.error || "OpenRouter 密鑰校驗失敗");
                    }
                  } catch { toast.error("同步超時"); }
                }}
              />
            </div>
            <button 
              disabled={isTesting === 'openrouter'}
              onClick={() => handleTest('openrouter')}
              className="w-full py-2 bg-brand-gold text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isTesting === 'openrouter' ? '正在检测...' : '立即测试 OpenRouter'}
            </button>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 p-6 space-y-6" id="section-security">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-brand-navy shrink-0" />
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex-1">
            安全与口令 / Security
          </h4>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">员工管理口令 / Admin Passcode</p>
            <input 
              type="password" 
              placeholder="设置后台管理口令..."
              className={`${inputClass} font-mono tracking-widest w-full`}
              value={accessPasscode}
              onChange={(e) => setAccessPasscode(e.target.value)}
              onBlur={(e) => setSettingField('access_passcode', e.target.value)}
            />
            <p className="text-[8px] text-brand-navy/30 px-1 mt-1 font-medium leading-relaxed">
              执行内部操作（如 AI 分析、批量删除）时需要此验证口令。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
