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

  const fetchKeysStatus = async () => {
    try {
      const res = await fetch('/api/admin/settings/get-keys');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeysStatus(data.keysStatus);
        }
      }
    } catch (e) {
      console.error("Failed to fetch keys status:", e);
    }
  };

  React.useEffect(() => {
    fetchKeysStatus();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <details className="group [&_summary::-webkit-details-marker]:hidden bg-white rounded-[32px] shadow-sm border border-brand-navy/10" id="section-ai" open>
        <summary className="flex items-center gap-2 p-6 cursor-pointer select-none outline-none">
          <Sparkles size={16} className="text-brand-gold shrink-0" />
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex-1">
            AI 智能设定 / AI Smart Settings
          </h4>
          <span className="transition-transform duration-300 group-open:rotate-180 text-brand-navy/30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </summary>
        <div className="px-6 pb-6 space-y-3 pt-2 border-t border-brand-navy/5">
          <div className="space-y-4">
            <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">AI 提供商 / AI Provider</p>
            <select
              className={`${inputClass} w-full`}
              value={localStorage.getItem('AI_PRIMARY_PROVIDER') || 'agnes'}
              onChange={async (e) => {
                const val = e.target.value;
                localStorage.setItem('AI_PRIMARY_PROVIDER', val);
                // Also update settings table
                setSettingField('provider', val);
                try {
                  await fetch('/api/admin/settings/save-provider', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: val })
                  });
                } catch (err) {
                  console.error("Failed to save provider to DB:", err);
                }
                toast.success(`已切换为 ${val === 'agnes' ? 'Agnes AI' : 'OpenRouter'}`);
              }}
            >
              <option value="agnes">Agnes AI (免费 / Free)</option>
              <option value="openrouter">Gemini (OpenRouter)</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/ai/test', { method: 'POST', body: JSON.stringify({ provider: 'agnes' }), headers: {'Content-Type': 'application/json'} });
                    const val = await res.json();
                    if (res.ok && val.success) toast.success("Agnes 连接成功！");
                    else toast.error(`Agnes 连接失败: ${val.error || '500 Error'}`);
                  } catch { toast.error("Agnes 测试请求错误"); }
                }}
                className="py-2 bg-brand-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >测试 Agnes</button>
              <button 
                onClick={async () => {
                  try {
                    const res = await fetch('/api/ai/test', { method: 'POST', body: JSON.stringify({ provider: 'openrouter' }), headers: {'Content-Type': 'application/json'} });
                    const val = await res.json();
                    if (res.ok && val.success) toast.success("OpenRouter 连接成功！");
                    else toast.error(`OpenRouter 连接失败: ${val.error || '500 Error'}`);
                  } catch { toast.error("OpenRouter 测试请求错误"); }
                }}
                className="py-2 bg-brand-gold text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >测试 OpenRouter</button>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">Agnes API 密钥 / Agnes API Key</p>
              {keysStatus.agnes && <span className="text-[9.5px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">已保存 / Configured</span>}
            </div>
            <input 
              type="password" 
              placeholder={keysStatus.agnes ? "•••••••••••••••• (已保存，输入新内容可覆盖)" : "输入 Agnes API 密钥..."}
              className={`${inputClass} font-mono w-full`}
              value={agnesKey}
              onChange={(e) => setAgnesKey(e.target.value)}
              onBlur={async () => {
                if (!agnesKey) return;
                try {
                  const res = await fetch('/api/admin/settings/save-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: 'agnes', apiKey: agnesKey })
                  });
                  if (res.ok) {
                    toast.success("Agnes 密钥保存成功并加密落库！");
                    setAgnesKey('');
                    fetchKeysStatus();
                  } else {
                    toast.error("Agnes 密钥保存失败");
                  }
                } catch {
                  toast.error("保存超时或网络错误");
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">AI API 密钥 (Gemini/OpenRouter) / AI API Key</p>
              {(keysStatus.openrouter || geminiApiKey === "••••••••••••••••") && <span className="text-[9.5px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">已保存 / Configured</span>}
            </div>
            <input 
              type="password" 
              placeholder={keysStatus.openrouter || geminiApiKey === "••••••••••••••••" ? "•••••••••••••••• (已保存，输入新内容可覆盖)" : "输入 API 密钥..."}
              className={`${inputClass} font-mono w-full`}
              value={geminiApiKey === "••••••••••••••••" ? "" : geminiApiKey}
              onChange={(e) => {
                setGeminiApiKey(e.target.value);
              }}
              onBlur={async (e) => {
                const val = e.target.value;
                if (val === "••••••••••••••••") return; // Safeguard against placeholder saving
                
                setSettingField('gemini_api_key', val);
                if (!val) return;
                try {
                  const res = await fetch('/api/admin/settings/save-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: 'openrouter', apiKey: val })
                  });
                  if (res.ok) {
                    toast.success("OpenRouter 密钥同步备份成功！");
                    fetchKeysStatus();
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">自定义模型 / Custom Model</p>
            <input 
              type="text" 
              placeholder="例如 gemini-2.0-flash"
              className={`${inputClass} font-mono w-full`}
              value={customModel}
              onChange={(e) => {
                setCustomModel(e.target.value);
              }}
              onBlur={(e) => {
                setSettingField('custom_model', e.target.value);
              }}
            />
            <button 
              onClick={testConnection}
              disabled={testResult?.loading}
              className="w-full mt-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {testResult?.loading ? '检测中... / Testing...' : '测试 AI 连接 / Test AI Connection'}
            </button>
            {testResult && !testResult.loading && (
              <div className={`mt-2 p-3 rounded-xl text-[10px] flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {testResult.success ? '连接成功！ / Success' : `连接失败 / Failed: ${testResult.error}`}
              </div>
            )}
          </div>
        </div>
      </details>

      <details className="group [&_summary::-webkit-details-marker]:hidden bg-white rounded-[32px] shadow-sm border border-brand-navy/10" id="section-password">
        <summary className="flex items-center gap-2 p-6 cursor-pointer select-none outline-none">
          <Lock size={16} className="text-brand-gold shrink-0" />
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex-1">
            员工密钥 / Staff Password
          </h4>
          <span className="transition-transform duration-300 group-open:rotate-180 text-brand-navy/30">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </summary>
        <div className="px-6 pb-6 pt-2 border-t border-brand-navy/5 space-y-3">
          <p className="text-[10px] text-brand-navy/40 font-black uppercase tracking-tight leading-relaxed">
            执行内部可见内容操作时需要此密钥。/ Required for staff operations.
          </p>
          <input 
            type="password" 
            placeholder="设置密钥 / Set password..."
            className={`${inputClass} font-mono tracking-widest w-full`}
            value={accessPasscode}
            onChange={(e) => {
              setAccessPasscode(e.target.value);
            }}
            onBlur={(e) => {
              setSettingField('access_passcode', e.target.value);
            }}
          />
        </div>
      </details>
    </div>
  );
};
