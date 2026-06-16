import { useRouterSafe } from '@/hooks/core/useRouterSafe';
import React, { useState } from 'react';
import { LogIn, Image as ImageIcon, RefreshCcw, X, Shield, Users } from 'lucide-react';
import { showToast } from '@/lib/ui/toast';
import { useSettings } from '../../hooks';
import { useUIStore } from '@/store/useUIStore';
import { Link } from '@tanstack/react-router';
import { ROUTES } from '@/config/constants';
import { translations } from '@/locales';
import { useLocalStorage } from '@/hooks/core/useLocalStorage';

interface LoginScreenProps {
  signIn: () => Promise<void>;
}

export function LoginScreen({ signIn }: LoginScreenProps) {
  const { settings } = useSettings();
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;

  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [, setPasscode] = useLocalStorage({
    key: 'ais_mock_auth_passcode',
    defaultValue: ''
  });

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings?.access_passcode) {
      showToast.error('管理员尚未配置员工访问密码');
      return;
    }
    if (passInput === settings.access_passcode) {
      showToast.success('员工登录成功');
      setPasscode(String(passInput));
      window.location.reload();
    } else {
      setPassError(true);
      showToast.error(t.invalidCode);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#FAFAFA] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03]">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-900 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[100px]" />
      </div>

      {/* Absolute Close Button */}
      <div className="absolute top-8 right-8 z-10">
        <Link 
          to={ROUTES.PREVIEW} 
          className="group w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all active:scale-90 animate-fade-in"
        >
          <X size={20} className="transition-transform group-hover:rotate-90" />
        </Link>
      </div>

      <div className="w-full max-w-[400px] z-10 animate-fade-in">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col items-center space-y-10">
          
          {/* Branding */}
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-slate-900/10 rounded-3xl blur-xl group-hover:bg-slate-900/20 transition-all duration-500 scale-90" />
              <div className="relative w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center shadow-2xl transform transition-all duration-500 group-hover:scale-105 group-hover:-rotate-3">
                <ImageIcon size={36} className="text-white" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                PHO<span className="text-blue-600">T</span>OX
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] pl-[0.3em]">
                Suite Control
              </p>
            </div>
          </div>

          {/* Elegant Toggle */}
          <div className="w-full grid grid-cols-2 p-1.5 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden">
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm border border-slate-100 transition-transform duration-300 ease-out ${
                mode === 'admin' ? 'translate-x-0' : 'translate-x-[100%]'
              }`}
            />
            <button
              onClick={() => { setMode('admin'); setPassError(false); }}
              className={`relative z-10 py-3 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-2 ${
                mode === 'admin' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Shield size={14} fill={mode === 'admin' ? 'currentColor' : 'none'} className={mode === 'admin' ? 'opacity-80' : 'opacity-40'} />
              {t.loginTitleAdmin}
            </button>
            <button
              onClick={() => { setMode('staff'); setPassError(false); }}
              className={`relative z-10 py-3 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-2 ${
                mode === 'staff' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users size={14} fill={mode === 'staff' ? 'currentColor' : 'none'} className={mode === 'staff' ? 'opacity-80' : 'opacity-40'} />
              {t.loginTitleStaff}
            </button>
          </div>

          {/* Action Area */}
          <div className="w-full relative min-h-[140px] flex justify-center">
            {mode === 'admin' ? (
              <div
                key="admin-action"
                className="w-full flex flex-col items-center space-y-6 animate-fade-in absolute top-0"
              >
                <button 
                  onClick={async () => {
                    if (isLoggingIn) return;
                    setIsLoggingIn(true);
                    try {
                      await signIn();
                    } catch(e) {
                      setIsLoggingIn(false);
                    }
                  }}
                  disabled={isLoggingIn}
                  className="w-full bg-slate-950 text-white h-14 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:bg-black active:scale-[0.98] disabled:opacity-50 group"
                >
                  {isLoggingIn ? (
                    <RefreshCcw size={18} className="animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} className="transition-transform group-hover:translate-x-1" /> 
                      {t.login}
                    </>
                  )}
                </button>
                
                <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed max-w-[240px]">
                  {t.agreeByConnecting} <br/>
                  <span className="text-slate-600 hover:text-slate-900 cursor-pointer font-semibold transition-colors">{t.termsOfService}</span> & <span className="text-slate-600 hover:text-slate-900 cursor-pointer font-semibold transition-colors">{t.privacyPolicy}</span>
                </p>
              </div>
            ) : (
              <form
                key="staff-action"
                onSubmit={handlePasscodeSubmit}
                className="w-full space-y-4 animate-fade-in absolute top-0"
              >
                <div className="relative">
                  <input
                    autoFocus
                    type="password"
                    placeholder={t.enterPasscode}
                    value={passInput}
                    onChange={(e) => {
                      setPassInput(e.target.value);
                      setPassError(false);
                    }}
                    className={`w-full bg-slate-50 border p-4 h-14 rounded-2xl text-center text-lg font-bold tracking-[0.2em] outline-none transition-all ${
                      passError 
                        ? 'border-red-200 bg-red-50 text-red-600' 
                        : 'border-slate-100 focus:bg-white focus:border-slate-300 focus:shadow-sm'
                    }`}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-slate-950 text-white h-14 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:shadow-slate-900/20 transition-all hover:bg-black active:scale-[0.98]"
                >
                  <LogIn size={18} />
                  {t.unlockAndAccess}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 flex justify-center animate-fade-in">
          <Link 
            to={ROUTES.PREVIEW} 
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 text-xs font-bold transition-colors"
          >
            <span className="w-5 h-5 rounded-lg bg-slate-900/5 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
              <X size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            {t.backToShowcase}
          </Link>
        </div>
      </div>
    </div>
  );
}
