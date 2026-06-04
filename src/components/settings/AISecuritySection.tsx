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
        body: JSON.stringify({ 
          provider,
          apiKey: provider === 'agnes' ? agnesKey : (geminiApiKey === "••••••••••••••••" ? "" : geminiApiKey),
          model: customModel
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

  const currentProvider = localStorage.getItem('AI_PRIMARY_PROVIDER') || 'agnes';

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="bg-white rounded-[32px] shadow-sm border border-brand-navy/10 overflow-hidden" id="section-ai">
        <div className="p-6 border-b border-brand-navy/5 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand-gold shrink-0" />
            <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
              智能引擎 / Intelligence Engine
            </h4>
          </div>
          <div className="flex gap-1 bg-white p-1 rounded-2xl border border-brand-navy/5 shadow-sm">
            {['agnes', 'openrouter'].map((p) => (
              <button
                key={p}
                onClick={async () => {
                  localStorage.setItem('AI_PRIMARY_PROVIDER', p);
                  setSettingField('provider', p as any);
                  try {
                    await fetch('/api/admin/settings/save-provider', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ provider: p })
                    });
                    toast.success(`已切換為 ${p === 'agnes' ? 'Agnes AI' : 'OpenRouter'}`);
                  } catch (err) {}
                }}
                className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  currentProvider === p 
                    ? 'bg-brand-navy text-white shadow-md' 
                    : 'text-brand-navy/40 hover:text-brand-navy/60'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Provider Config Area */}
          <div className="space-y-4">
            {currentProvider === 'agnes' ? (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">Agnes AI Config</h5>
                    <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">穩定推薦 · 快速解析</p>
                  </div>
                  {keysStatus.agnes && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">模型型號 / Model</p>
                      <input 
                        type="text" 
                        placeholder="默認: agnes-2.0-flash"
                        className={`${inputClass} w-full bg-slate-50 text-[10px] font-bold`}
                        value={customModel.includes('agnes') ? customModel : 'agnes-2.0-flash'}
                        onChange={(e) => setCustomModel(e.target.value)}
                        onBlur={(e) => setSettingField('custom_model' as any, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 relative">
                      <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">API 密鑰 / Key</p>
                      <div className="relative group">
                        <input 
                          type="password" 
                          placeholder={keysStatus.agnes ? "•••••••••••••••• (已保存)" : "輸入 Agnes API 密鑰..."}
                          className={`${inputClass} font-mono w-full bg-slate-50 pr-16`}
                          value={agnesKey}
                          onChange={(e) => setAgnesKey(e.target.value)}
                        />
                        {agnesKey && (
                          <button 
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/admin/settings/save-key', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ provider: 'agnes', apiKey: agnesKey, model: customModel || 'agnes-2.0-flash' })
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  toast.success("Agnes 密鑰已保存");
                                  setAgnesKey('');
                                  fetchKeysStatus();
                                } else {
                                  const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || "驗證失敗");
                                  toast.error(errMsg);
                                }
                              } catch { toast.error("請求超時"); }
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 bg-brand-navy text-white text-[8px] font-black uppercase rounded-lg shadow-sm"
                          >
                            保存
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    disabled={isTesting === 'agnes'}
                    onClick={() => handleTest('agnes')}
                    className="w-full py-3 bg-brand-navy/5 text-brand-navy border border-brand-navy/10 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isTesting === 'agnes' ? '正在診斷...' : '測試連通性'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">OpenRouter Config</h5>
                    <p className="text-[8px] text-brand-navy/40 font-bold uppercase tracking-widest">自由擴展 · 多模型支持</p>
                  </div>
                  {(keysStatus.openrouter || geminiApiKey === "••••••••••••••••") && <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[8px] font-black uppercase">已激活</div>}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      placeholder="模型型號 (如: google/gemini-2.0-flash-exp:free)"
                      className={`${inputClass} w-full bg-slate-50 text-[10px] font-bold`}
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value !== customModel) {
                          setSettingField('custom_model' as any, e.target.value);
                        }
                      }}
                    />
                  </div>
                  <div className="relative group">
                    <input 
                      type="password" 
                      placeholder={keysStatus.openrouter || geminiApiKey === "••••••••••••••••" ? "•••••••••••••••• (已保存)" : "輸入 OpenRouter API 密鑰..."}
                      className={`${inputClass} font-mono w-full bg-slate-50 pr-24`}
                      value={geminiApiKey === "••••••••••••••••" ? "" : geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                    />
                    {geminiApiKey && geminiApiKey !== "••••••••••••••••" && (
                      <button 
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/admin/settings/save-key', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ provider: 'openrouter', apiKey: geminiApiKey, model: customModel })
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              toast.success("OpenRouter 已保存");
                              setSettingField('gemini_api_key', geminiApiKey);
                              fetchKeysStatus();
                            } else {
                              const errMsg = typeof data.error === 'object' ? JSON.stringify(data.error) : (data.error || "校驗失敗");
                              toast.error(errMsg);
                            }
                          } catch { toast.error("同步超時"); }
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand-gold text-white text-[8px] font-black uppercase rounded-lg shadow-sm"
                      >
                        保存
                      </button>
                    )}
                  </div>
                  <button 
                    disabled={isTesting === 'openrouter'}
                    onClick={() => handleTest('openrouter')}
                    className="w-full py-3 bg-brand-gold/5 text-brand-gold border border-brand-gold/10 rounded-2xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isTesting === 'openrouter' ? '正在診斷...' : '測試連接性'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Security Area */}
          <div className="space-y-4 border-l border-brand-navy/5 pl-6 hidden md:block">
            <div className="flex items-center gap-2 mb-4">
              <Lock size={14} className="text-brand-navy/20" />
              <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-tight">安全訪問 / Security</h5>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">員工管理口令</p>
                <input 
                  type="password" 
                  placeholder="設置管理口令..."
                  className={`${inputClass} font-mono tracking-widest w-full bg-slate-50`}
                  value={accessPasscode}
                  onChange={(e) => setAccessPasscode(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value !== accessPasscode) {
                       setSettingField('access_passcode', e.target.value);
                    }
                  }}
                />
              </div>
              <div className="p-4 bg-brand-navy/[0.02] rounded-2xl border border-brand-navy/5">
                <p className="text-[9px] text-brand-navy/40 font-bold leading-relaxed uppercase tracking-wide">
                  提示：口令用於保護高敏感操作。請確保定期更換以維持系統安全。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Security (Visible only on small screens) */}
      <div className="md:hidden bg-white rounded-[32px] shadow-sm border border-brand-navy/10 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={16} className="text-brand-navy shrink-0" />
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest">
            安全與口令 / Security
          </h4>
        </div>
        <input 
          type="password" 
          placeholder="設置管理口令..."
          className={`${inputClass} font-mono tracking-widest w-full bg-slate-50`}
          value={accessPasscode}
          onChange={(e) => setAccessPasscode(e.target.value)}
          onBlur={(e) => setSettingField('access_passcode', e.target.value)}
        />

      </div>
    </div>
  );
}
