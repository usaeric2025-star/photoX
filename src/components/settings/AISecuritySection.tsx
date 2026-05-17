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

export const AISecuritySection: React.FC<AISecuritySectionProps> = ({
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
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className={cardClass} id="section-ai">
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={16} className="text-brand-gold" />
            AI 智能设定
          </h4>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">AI API 密钥</p>
              <input 
                type="password" 
                placeholder="输入 API 密钥..."
                className={`${inputClass} font-mono`}
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem('gemini_api_key', e.target.value);
                }}
                onBlur={(e) => {
                  setSettingField('gemini_api_key', e.target.value);
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-brand-navy/40 uppercase ml-1 tracking-widest">自定义模型</p>
              <input 
                type="text" 
                placeholder="例如 gemini-2.0-flash"
                className={`${inputClass} font-mono`}
                value={customModel}
                onChange={(e) => {
                  setCustomModel(e.target.value);
                  localStorage.setItem('ai_custom_model', e.target.value);
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
                {testResult?.loading ? '检测中...' : '测试 AI 连接'}
              </button>
              {testResult && !testResult.loading && (
                <div className={`mt-2 p-3 rounded-xl text-[10px] flex items-center gap-2 ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {testResult.success ? '连接成功！' : `连接失败: ${testResult.error}`}
                </div>
              )}
            </div>
          </div>
      </div>

      <div className={cardClass} id="section-password">
          <h4 className="font-black text-brand-navy text-[10px] uppercase tracking-widest flex items-center gap-2">
            <Lock size={16} className="text-brand-gold" />
            员工密钥
          </h4>
          <p className="text-[10px] text-brand-navy/40 font-black uppercase tracking-tight leading-relaxed">
            执行内部可见内容操作时需要此密钥。
          </p>
          <input 
            type="password" 
            placeholder="设置密钥..."
            className={`${inputClass} font-mono tracking-widest`}
            value={accessPasscode}
            onChange={(e) => {
              setAccessPasscode(e.target.value);
              localStorage.setItem('access_passcode', e.target.value);
            }}
            onBlur={(e) => {
              setSettingField('access_passcode', e.target.value);
            }}
          />
      </div>
    </div>
  );
};
