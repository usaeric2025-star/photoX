import React from 'react';
import { LogIn, Image as ImageIcon, Sparkles, Cloud, Layers, RefreshCcw } from 'lucide-react';
import { useFeedback } from '../../hooks';

interface LoginScreenProps {
  loginWithGoogle: () => Promise<void>;
  isLoading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ loginWithGoogle, isLoading }) => {
  const { showError } = useFeedback();
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
        
        {/* Features Info */}
        <div className="grid grid-cols-1 gap-6 w-full px-4">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">AI Classification</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">智能分类识别产品详情</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
              <Cloud size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Cloud Sync</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">云端同步多端协同办公</p>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="w-full space-y-6 pt-4">
          <button 
            onClick={async () => {
              if (isLoading) return;
              try {
                await loginWithGoogle();
              } catch(e) {
                showError(e, '登录失败');
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
          
          <p className="text-[10px] text-slate-400 font-medium text-center leading-relaxed">
            By connecting, you agree to the <br/>
            <span className="text-slate-900 cursor-pointer hover:underline font-bold">Terms of Service</span> and <span className="text-slate-900 cursor-pointer hover:underline font-bold">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};
