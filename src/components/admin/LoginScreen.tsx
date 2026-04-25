import React from 'react';
import { LogIn, Image as ImageIcon, Sparkles, Cloud, Layers } from 'lucide-react';

interface LoginScreenProps {
  loginWithGoogle: () => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ loginWithGoogle }) => (
  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-10 text-center">
    <div className="relative">
      <div className="w-24 h-24 bg-blue-500 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-blue-500/40 relative z-10">
        <ImageIcon size={48} className="text-white -rotate-12" />
      </div>
      <div className="absolute inset-0 bg-purple-500 rounded-3xl -rotate-6 shadow-xl opacity-50"></div>
    </div>
    
    <div className="space-y-3">
      <h2 className="text-3xl font-black text-slate-800 tracking-tight">Furniture Album</h2>
      <p className="text-sm text-slate-500 font-medium leading-relaxed px-4">
        智能分類、標籤管理、雲端備份。<br/>
        一站式管理您的家具產品資訊。
      </p>
    </div>

    <div className="w-full space-y-4">
      <button 
        onClick={async () => {
          try {
            await loginWithGoogle();
          } catch(e: any) {
            alert('登入失敗: ' + (e.message || JSON.stringify(e)));
          }
        }}
        className="w-full bg-slate-900 text-white py-5 rounded-[24px] text-sm font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] active:bg-black"
      >
        <LogIn size={20} /> 使用 Google 登入
      </button>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        登入以同步您的雲端相庫
      </p>
    </div>

    <div className="pt-10 flex gap-6 grayscale opacity-50">
      <div className="flex flex-col items-center gap-1">
        <Sparkles size={16} className="text-purple-500" />
        <span className="text-[10px] font-bold">AI 智慧</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Cloud size={16} className="text-blue-500" />
        <span className="text-[10px] font-bold">雲端同步</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <Layers size={16} className="text-indigo-500" />
        <span className="text-[10px] font-bold">層次管理</span>
      </div>
    </div>
  </div>
);
