import { logger } from '@/lib/logger';
import * as React from 'react';
import { Icon } from '@/components/ui/Icon';
import { NativeDialog } from '@/components/ui/NativeDialog';
import { useFormSubmit } from '@/lib/form/useFormSubmit';
import { type } from 'arktype';

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
  isOpen, onClose, passInput, setPassInput, passError, onSubmit, onLogin, signIn: rawSignIn, labels
}: StaffUnlockDialogProps) {
  const { submit: runUnlock, isLoading: isUnlocking } = useFormSubmit({
    schema: type('unknown'),
    mutationFn: async (e: any) => {
      if (e && e.preventDefault) e.preventDefault();
      await onSubmit(e);
      return true;
    },
    successMessage: '已解鎖 / Unlocked',
    errorMessage: '解鎖失敗 / Unlock failed'
  });

  const { submit: runSignIn, isLoading: isSigningIn } = useFormSubmit({
    schema: type('unknown'),
    mutationFn: async () => {
      await rawSignIn?.();
      return true;
    },
    successMessage: labels.loginSuccess || '登入成功',
    errorMessage: labels.loginFailed || '登入失敗'
  });

  return (
    <NativeDialog id="staff-unlock-dialog" open={isOpen} onClose={onClose} size="sm">
      <div className="w-full text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-4 ring-white">
          <Icon name="lock" size={32} />
        </div>
        <h3 className="font-bold text-slate-800 text-xl mb-2">{labels.staffUnlock}</h3>
        <p className="text-sm text-slate-500 mb-6">{labels.staffUnlockSub}</p>
        
        <form className="space-y-4" onSubmit={(e) => runUnlock(e)}>
          <input 
            type="password" 
            autoFocus
            disabled={isUnlocking}
            placeholder={labels.keyPlaceholder}
            className={`w-full bg-slate-50 border p-4 rounded-2xl text-center text-lg font-bold outline-none transition-all ${passError ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-100 focus:bg-white focus:border-blue-500 shadow-sm text-slate-900'} ${isUnlocking ? 'opacity-50' : ''}`}
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
          />
          {passError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-bounce">{labels.invalidKey}</p>}
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose}
              disabled={isUnlocking}
              className="flex-1 py-4 px-4 rounded-2xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {labels.cancel}
            </button>
            <button 
              type="submit"
              disabled={isUnlocking}
              className="flex-1 py-4 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUnlocking && <Icon name="refresh-ccw" size={18} className="animate-spin" />}
              {labels.unlock}
            </button>
          </div>
          {(onLogin || rawSignIn) && (
            <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col gap-2">
              {onLogin && (
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isUnlocking || isSigningIn}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-slate-800 hover:bg-slate-900 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   <Icon name="log-in" size={16} /> {labels.login}
                </button>
              )}
              {rawSignIn && (
                <button
                  type="button"
                  disabled={isUnlocking || isSigningIn}
                  onClick={() => runSignIn({})}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                   {isSigningIn ? <Icon name="refresh-ccw" size={16} className="animate-spin" /> : <Icon name="log-in" size={16} />}
                   {labels.googleLogin}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </NativeDialog>
  );
}
