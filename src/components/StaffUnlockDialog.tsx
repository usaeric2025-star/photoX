import React from 'react';
import { motion } from 'motion/react';
import { Lock, LogIn } from 'lucide-react';

interface StaffUnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  passInput: string;
  setPassInput: (val: string) => void;
  passError: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onLogin?: () => void;
  loginWithGoogle?: () => Promise<void>;
  t: any;
}

export const StaffUnlockDialog: React.FC<StaffUnlockDialogProps> = ({
  isOpen, onClose, passInput, setPassInput, passError, onSubmit, onLogin, loginWithGoogle, t
}) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-[320px] bg-white rounded-3xl p-8 shadow-2xl relative text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
          <Lock size={32} />
        </div>
        <h3 className="font-bold text-slate-800 text-xl mb-2">{t.staffUnlock}</h3>
        <p className="text-sm text-slate-500 mb-6">{t.staffUnlockSub}</p>
        
        <form className="space-y-4" onSubmit={onSubmit}>
          <input 
            type="password" 
            autoFocus
            placeholder={t.keyPlaceholder}
            className={`w-full bg-slate-50 border p-4 rounded-2xl text-center text-lg font-bold outline-none transition-all ${passError ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:bg-white focus:border-blue-500 shadow-sm'}`}
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          {passError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-bounce">{t.invalidKey}</p>}
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {t.cancel}
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              {t.unlock}
            </button>
          </div>
          {(onLogin || loginWithGoogle) && (
            <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col gap-2">
              {loginWithGoogle && (
                <button
                  type="button"
                  onClick={async () => {
                    onClose();
                    try {
                      await loginWithGoogle();
                    } catch (e: any) { alert(t.loginFailed); }
                  }}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2"
                >
                   <LogIn size={16} /> {t.googleLogin}
                </button>
              )}
            </div>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};
