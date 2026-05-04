import React from 'react';

interface AdminLoginGateProps {
  t: any;
  loginWithGoogle: () => Promise<void>;
  showToast: (msg: string, type: string) => void;
  navigate: (path: string) => void;
}

export function AdminLoginGate({ t, loginWithGoogle, showToast, navigate }: AdminLoginGateProps) {
  return (
    <div className="w-full h-full min-h-screen flex items-center justify-center bg-[#FDFBF7]">
       <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-sm text-center border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2">{t.adminTitle}</h2>
          <p className="text-sm text-slate-500 mb-8">{t.adminSub}</p>
          <button 
            onClick={async () => {
              try {
                await loginWithGoogle();
              } catch(e: any) {
                showToast(`${t.loginFailedAlert} ${e.message || JSON.stringify(e)}`, 'error');
              }
            }}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] hover:bg-blue-700 transition-all mb-4"
          >
            {t.googleLoginBtn}
          </button>
          <button
            onClick={() => {
              try { sessionStorage.removeItem('isStaffMode'); } catch {}
              navigate('/');
            }}
            className="text-sm text-slate-400 hover:text-slate-600 font-medium"
          >
            {t.backToGallery}
          </button>
       </div>
    </div>
  );
}
