import { ErrorFactory } from '@/lib/error/ErrorFactory';
import * as React from 'react';
import { Lock, LogIn } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';


interface StaffUnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  passInput: string;
  setPassInput: (val: string) => void;
  passError: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onLogin?: () => void;
  signIn?: () => Promise<any>;
  labels: Record<string, any>;
}

export function StaffUnlockDialog({
  isOpen, onClose, passInput, setPassInput, passError, onSubmit, onLogin, signIn, labels
}: StaffUnlockDialogProps) {
  return (
    <Modal open={isOpen} onClose={onClose} size="sm">
      <div className="w-full text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
          <Lock size={32} />
        </div>
        <h3 className="font-bold text-slate-800 text-xl mb-2">{labels.staffUnlock}</h3>
        <p className="text-sm text-slate-500 mb-6">{labels.staffUnlockSub}</p>
        
        <form className="space-y-4" onSubmit={onSubmit}>
          <input 
            type="password" 
            autoFocus
            placeholder={labels.keyPlaceholder}
            className={`w-full bg-slate-50 border p-4 rounded-2xl text-center text-lg font-bold outline-none transition-all ${passError ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-100 focus:bg-white focus:border-blue-500 shadow-sm text-slate-900'}`}
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          {passError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-bounce">{labels.invalidKey}</p>}
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {labels.cancel}
            </button>
            <button 
              type="submit"
              className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              {labels.unlock}
            </button>
          </div>
          {(onLogin || signIn) && (
            <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col gap-2">
              {onLogin && (
                <button
                  type="button"
                  onClick={onLogin}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all text-sm flex items-center justify-center gap-2"
                >
                   <LogIn size={16} /> {labels.login}
                </button>
              )}
              {signIn && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Don't close modal immediately to show intent
                      await signIn?.();
                    } catch (e: unknown) { 
                      ErrorFactory.handleError(e as any, labels.loginFailed);
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2"
                >
                   <LogIn size={16} /> {labels.googleLogin}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
