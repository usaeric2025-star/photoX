import { appLangAtom, userAtom, staffLogin } from '#src/store/index.js';
import React, { useState } from 'react';
import { Icon } from '#src/components/ui/Icon.js';
import { usePublicSettings, useTranslation } from '#src/hooks/index.js';
import { AppLink } from '#src/components/router/AppLink.js';
import { useFormSubmit } from '#lib/forms/useFormSubmit.js';
import * as v from 'valibot';
import { Button } from '#src/components/ui/Button.js';
import { useAtomValue } from 'jotai';
import { feedback } from '#lib/feedback.js';

interface LoginScreenProps {
  signIn: () => Promise<void>;
}

export function LoginScreen({ signIn }: LoginScreenProps) {
  const { data: settings } = usePublicSettings();
  const appLang = useAtomValue(appLangAtom);
  const { t } = useTranslation();
  
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [passcode, setPasscode] = useState('');

  // Admin Login Submission
  const { submit: submitAdmin, isLoading: isAdminLoggingIn } = useFormSubmit({
    schema: v.unknown(),
    mutationFn: async () => {
      await signIn();
      return true;
    },
    errorMessage: 'Authentication failed'
  });

  const handleStaffLogin = () => {
    const correctPasscode = settings?.accessPasscode;
    
    if (!correctPasscode) {
      feedback.error(t('staffPasscodeRequired'));
      return;
    }

    if (staffLogin(passcode, correctPasscode)) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('preferred_mode', 'admin');
      }
      feedback.success(t('staffLoginSuccess'));
    } else {
      feedback.error(t('wrongPassword'));
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-slate-900/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Absolute Close Button */}
      <div className="absolute top-8 right-8">
        <AppLink 
          to="/" 
          className="group w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all active:scale-90 animate-fade-in"
        >
          <Icon name="x" size={20} className="transition-transform group-hover:rotate-90" />
        </AppLink>
      </div>

      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50 flex flex-col items-center space-y-10">
          
          {/* Branding */}
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="relative group">
              <div className="absolute inset-0 bg-slate-900/5 rounded-3xl blur-xl group-hover:bg-slate-900/10 transition-all duration-500 scale-90" />
              <div className="relative w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center shadow-2xl transform transition-all duration-500 group-hover:scale-105 group-hover:-rotate-3">
                <Icon name="image" size={36} className="text-white" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 flex items-center justify-center gap-0.5">
                <span className="font-extrabold text-slate-950">Photo</span>
                <span className="font-light text-blue-600">X</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] pl-[0.3em]">
                {showStaffLogin ? t('loginTitleStaff') : 'Suite Control'}
              </p>
            </div>
          </div>

          {/* Action Area */}
          <div className="w-full flex flex-col items-center space-y-6">
            {!showStaffLogin ? (
              <>
                <Button 
                  onClick={async () => {
                    await submitAdmin({});
                  }}
                  loading={isAdminLoggingIn}
                  className="w-full bg-slate-950 text-white h-14 rounded-2xl text-[13px] hover:shadow-2xl hover:shadow-slate-900/20 hover:bg-black group"
                  leftIcon={!isAdminLoggingIn && <Icon name="log-in" size={18} className="transition-transform group-hover:translate-x-1" />}
                >
                  {t('login')}
                </Button>
                
                <button 
                  onClick={() => setShowStaffLogin(true)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-widest"
                >
                  {t('staffUnlock')}
                </button>
              </>
            ) : (
              <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    {t('staffUnlockSub')}
                  </label>
                  <input 
                    autoFocus
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStaffLogin()}
                    placeholder={t('enterPasscode')}
                    className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 transition-all shadow-sm"
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="ghost"
                    onClick={() => {
                      setShowStaffLogin(false);
                      setPasscode('');
                    }}
                    className="flex-1 h-12 rounded-xl text-xs font-bold text-slate-500"
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleStaffLogin}
                    className="flex-[2] h-12 rounded-xl bg-slate-950 text-white text-xs font-bold shadow-lg shadow-slate-900/10"
                  >
                    {t('unlockAndAccess')}
                  </Button>
                </div>
              </div>
            )}
            
            <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed max-w-[240px]">
              {t('agreeByConnecting')} <br/>
              <span className="text-slate-600 hover:text-slate-900 cursor-pointer font-semibold transition-colors">{t('termsOfService')}</span> & <span className="text-slate-600 hover:text-slate-900 cursor-pointer font-semibold transition-colors">{t('privacyPolicy')}</span>
            </p>
          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-8 flex justify-center animate-fade-in">
          <AppLink 
            to="/" 
            className="group flex items-center gap-2 text-slate-400 hover:text-slate-900 text-xs font-bold transition-colors"
          >
            <span className="w-5 h-5 rounded-lg bg-slate-900/5 flex items-center justify-center group-hover:bg-slate-900/10 transition-colors">
              <Icon name="x" size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            {t('backToShowcase')}
          </AppLink>
        </div>
      </div>
    </div>
  );
}
