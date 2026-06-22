import React, { useState, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { usePublicSettings } from '../../hooks';
import { useUIStore } from '@/store/useUIStore';
import { routes } from '@/router';
import { AppLink } from '@/components/router/AppLink';
import { translations } from '@/locales';
import { storage } from '@/services/storage';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type } from 'arktype';
import { Button } from '@/components/ui/Button';

const StaffLoginSchema = type({
  passcode: 'string > 0',
});

interface LoginScreenProps {
  signIn: () => Promise<void>;
}

export function LoginScreen({ signIn }: LoginScreenProps) {
  const { data: settings } = usePublicSettings();
  const appLang = useUIStore(s => s.appLang);
  const t = translations[appLang as keyof typeof translations] || translations.en;


  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  // 1. Staff Login Submission
  const { submit: submitStaff, isLoading: isStaffLoggingIn, fieldErrors, clearFieldError } = useFormSubmit({
    schema: StaffLoginSchema,
    mutationFn: async ({ passcode }) => {
      if (!settings?.access_passcode) {
        throw new Error('管理者尚未配置員工訪問密碼 / Staff passcode not configured');
      }
      
      if (passcode === settings.access_passcode) {
        storage.setItem('ais_mock_auth_passcode', String(passcode));
        return true;
      } else {
        throw new Error(t.invalidCode);
      }
    },
    onSuccess: () => {
      window.location.reload();
    },
    successMessage: '員工登入成功 / Staff login successful',
    errorMessage: '登入失敗 / Login failed'
  });

  // 2. Admin Login Submission
  const { submit: submitAdmin, isLoading: isAdminLoggingIn } = useFormSubmit({
    schema: type('unknown'),
    mutationFn: async () => {
      await signIn();
      return true;
    },
    errorMessage: '認證失敗 / Authentication failed'
  });

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitStaff({ passcode: passInput });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#FAFAFA] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03]">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-900 rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full" />
      </div>
      
      {/* Absolute Close Button */}
      <div className="absolute top-8 right-8">
        <AppLink 
          to={routes.home()} 
          className="group w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all active:scale-90 animate-fade-in"
        >
          <Icon name="x" size={20} className="transition-transform group-hover:rotate-90" />
        </AppLink>
      </div>

      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col items-center space-y-10">
          
          {/* Branding */}
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-slate-900/10 rounded-3xl blur-xl group-hover:bg-slate-900/20 transition-all duration-500 scale-90" />
              <div className="relative w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center shadow-2xl transform transition-all duration-500 group-hover:scale-105 group-hover:-rotate-3">
                <Icon name="image" size={36} className="text-white" />
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
              className={`relative py-3 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-2 ${
                mode === 'admin' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon name="shield" size={14} fill={mode === 'admin' ? 'currentColor' : 'none'} className={mode === 'admin' ? 'opacity-80' : 'opacity-40'} />
              {t.loginTitleAdmin}
            </button>
            <button
              onClick={() => { setMode('staff'); setPassError(false); }}
              className={`relative py-3 rounded-xl text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-2 ${
                mode === 'staff' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon name="users" size={14} fill={mode === 'staff' ? 'currentColor' : 'none'} className={mode === 'staff' ? 'opacity-80' : 'opacity-40'} />
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
                <Button 
                  onClick={async () => {
                    await submitAdmin({});
                  }}
                  loading={isAdminLoggingIn}
                  className="w-full bg-slate-950 text-white h-14 rounded-2xl text-[13px] hover:shadow-2xl hover:shadow-slate-900/20 hover:bg-black group"
                  leftIcon={!isAdminLoggingIn && <Icon name="log-in" size={18} className="transition-transform group-hover:translate-x-1" />}
                >
                  {t.login}
                </Button>
                
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
                      clearFieldError('passcode');
                    }}
                    className={`w-full bg-slate-50 border p-4 h-14 rounded-2xl text-center text-lg font-bold tracking-[0.2em] outline-none transition-all ${
                      passError || fieldErrors.passcode
                        ? 'border-red-200 bg-red-50 text-red-600' 
                        : 'border-slate-100 focus:bg-white focus:border-slate-300 focus:shadow-sm'
                    }`}
                  />
                  {fieldErrors.passcode && (
                    <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-red-500 font-bold">
                      {fieldErrors.passcode}
                    </div>
                  )}
                </div>
                
                <Button
                  type="submit"
                  loading={isStaffLoggingIn}
                  className="w-full bg-slate-950 text-white h-14 rounded-2xl text-[13px] hover:shadow-2xl hover:shadow-slate-900/20 hover:bg-black"
                  leftIcon={!isStaffLoggingIn && <Icon name="log-in" size={18} />}
                >
                  {t.unlockAndAccess}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 flex justify-center animate-fade-in">
          <AppLink 
            to={routes.home()} 
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 text-xs font-bold transition-colors"
          >
            <span className="w-5 h-5 rounded-lg bg-slate-900/5 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
              <Icon name="x" size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            {t.backToShowcase}
          </AppLink>
        </div>
      </div>
    </div>
  );
}
