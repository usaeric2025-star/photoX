import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <details className="group [&_summary::-webkit-details-marker]:hidden bg-white rounded-[32px] shadow-sm border border-brand-navy/10" id="section-ai">
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
              onChange={(e) => {
                localStorage.setItem('AI_PRIMARY_PROVIDER', e.target.value);
                toast.success("已切换 AI 提供商 / Provider switched");
              }}
            >
              <option value="agnes">Agnes AI (免费 / Free)</option>
              <option value="gemini">Gemini (OpenRouter)</option>
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">Agnes API 密钥 / Agnes API Key</p>
            <input 
              type="password" 
              placeholder="输入 Agnes API 密钥..."
              className={`${inputClass} font-mono w-full`}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">AI API 密钥 (Gemini/OpenRouter) / AI API Key</p>
            <input 
              type="password" 
              placeholder="输入 API 密钥..."
              className={`${inputClass} font-mono w-full`}
              value={geminiApiKey}
              onChange={(e) => {
                setGeminiApiKey(e.target.value);
              }}
              onBlur={(e) => {
                setSettingField('gemini_api_key', e.target.value);
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
