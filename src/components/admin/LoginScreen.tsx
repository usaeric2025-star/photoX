import React, { useState } from 'react';
import { LogIn, Image as ImageIcon, Sparkles, Cloud, Layers, RefreshCcw, Lock } from 'lucide-react';
import { toast } from '@/lib/ui/toast';
import { useSettings } from '../../hooks';
import { useUIStore } from '@/store/useUIStore';

interface LoginScreenProps {
  loginWithGoogle: () => Promise<void>;
  isLoading?: boolean;
}

export function LoginScreen({ loginWithGoogle, isLoading }: LoginScreenProps) {

  const { settings } = useSettings();
  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !settings.access_passcode) {
      toast.error('验证失败: 未在系统设置中配置员工密码 / Staff passcode is not configured in settings');
      return;
    }
    if (passInput === settings.access_passcode) {
      toast.success('员工模式登录成功 / Staff mode entered successfully');
      window.localStorage.setItem('ais_mock_auth_passcode', String(passInput));
      window.location.reload();
    } else {
      setPassError(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white overflow-y-auto">
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
            管理员登录 / Admin
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
            员工登录 / Staff
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
                  toast.error(`登录失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
                  Continue with Google
                </>
              )}
            </button>
          ) : (
            <form onSubmit={handlePasscodeSubmit} className="space-y-4 w-full">
              <div className="space-y-2">
                <input
                  type="password"
                  placeholder="请输入密码 / Staff Passcode"
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
                    密码错误 / Invalid Code
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full bg-slate-900 text-white h-16 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-[0.97]"
              >
                <LogIn size={20} />
                解锁登录 / Unlock & Access
              </button>
            </form>
          )}
          
          <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
            By connecting, you agree to the <br/>
            <span className="text-slate-900 cursor-pointer hover:underline font-bold">Terms of Service</span> and <span className="text-slate-900 cursor-pointer hover:underline font-bold">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};
