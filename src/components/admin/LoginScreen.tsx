import React, { useState } from 'react';
import { LogIn, Image as ImageIcon, Sparkles, Cloud, Layers, RefreshCcw, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '../../hooks';
import { useUIStore } from '@/store/useUIStore';
import { Link, useNavigate } from '@tanstack/react-router';
import { ROUTES } from '@/config/constants';
import { translations } from '@/lib/translations';

import { useLocalStorage } from '@mantine/hooks';

interface LoginScreenProps {
  loginWithGoogle: () => Promise<void>;
  isLoading?: boolean;
}

export function LoginScreen({ loginWithGoogle, isLoading }: LoginScreenProps) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);
  const [, setPasscode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: '',
  });

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !settings.access_passcode) {
      toast.error('管理员尚未配置员工访问密码');
      return;
    }
    if (passInput === settings.access_passcode) {
      toast.success('员工登录成功');
      setPasscode(String(passInput));
      window.location.reload();
    } else {
      setPassError(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white overflow-y-auto relative">
      {/* Absolute Close Button */}
      <div className="absolute top-6 right-6">
        <Link 
          to={ROUTES.PREVIEW} 
          className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 border border-slate-100 transition-all active:scale-90"
          title={appLang === 'zh' ? '关闭' : 'Close'}
        >
          <X size={20} />
        </Link>
      </div>

      <div className="w-full max-w-sm space-y-12 flex flex-col items-center">
        {/* Branding */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] rotate-6 transition-transform hover:rotate-0">
            <ImageIcon size={40} className="text-white" />
          </div>
          <div className="text-center space-y-1 mt-4">
            <h1 className="text-3xl font-black tracking-[-0.05em] text-slate-900 italic leading-none">
              PHOT<span className="text-blue-600">O</span>X
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-2">
              Management Suite
            </p>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="w-full flex p-1 rounded-2xl bg-slate-50 border border-slate-100 gap-1">
          <button
            type="button"
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'admin' 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-950/10' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => { setMode('admin'); setPassError(false); }}
          >
            {t.loginTitleAdmin}
          </button>
          <button
            type="button"
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
              mode === 'staff' 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-950/10' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => { setMode('staff'); setPassError(false); }}
          >
            {t.loginTitleStaff}
          </button>
        </div>

        {/* Action Area */}
        <div className="w-full space-y-6 pt-2">
          {mode === 'admin' ? (
            <button 
              onClick={async () => {
                if (isLoading) return;
                try {
                  await loginWithGoogle();
                } catch(e) {
                  toast.error('登录失败: ' + (e instanceof Error ? e.message : '未知错误'));
                }
              }}
              disabled={isLoading}
              className="w-full bg-slate-900 text-white h-16 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <RefreshCcw size={20} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={20} className="transition-transform group-hover:translate-x-1" /> 
                  {t.loginWithGoogle}
                </>
              )}
            </button>
          ) : (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4 w-full">
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder={t.enterPasscode}
                  className={`w-full bg-slate-50 border p-4 h-16 rounded-2xl text-center text-lg font-bold outline-none transition-all ${
                    passError 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-slate-150 focus:bg-white focus:border-slate-900 shadow-sm'
                  }`}
                  value={passInput}
                  onChange={(e) => {
                    setPassInput(e.target.value);
                    setPassError(false);
                  }}
                />
                {passError && (
                  <p className="text-[10px] text-red-550 font-bold uppercase tracking-widest text-center mt-1 animate-pulse">
                    {t.invalidCode}
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full bg-slate-900 text-white h-16 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-[0.97]"
              >
                <LogIn size={20} />
                {t.unlockAndAccess}
              </button>
            </form>
          )}
          
          <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
            {t.agreeByConnecting} <br/>
            <span className="text-slate-900 cursor-pointer hover:underline font-bold">{t.termsOfService}</span> and <span className="text-slate-900 cursor-pointer hover:underline font-bold">{t.privacyPolicy}</span>
          </p>

          <div className="flex justify-center pt-2">
            <Link 
              to={ROUTES.PREVIEW} 
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 text-xs font-bold py-2.5 px-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all active:scale-[0.97] shadow-sm tracking-tight"
            >
              ← {t.backToShowcase}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
