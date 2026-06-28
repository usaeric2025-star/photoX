import React, { useEffect } from 'react';
import { useStore } from '@storve/react';
import { toastStore } from '@/store/toastStore';
import { AnimatePresence, motion } from 'lite-sleek';
import { Icon } from './Icon';

export function ToastContainer() {
  const { toasts, removeToast } = useStore(toastStore);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItemComponent key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItemComponent({ toast, onDismiss }: { toast: any; onDismiss: (id: string) => void }) {
  useEffect(() => {
    if (toast.type !== 'loading' && toast.duration !== 0) {
      const delay = toast.duration || 4000;
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const icons = {
    success: { name: 'check-circle', color: 'text-emerald-500' },
    error: { name: 'alert-circle', color: 'text-rose-500' },
    warning: { name: 'alert-triangle', color: 'text-amber-500' },
    info: { name: 'info', color: 'text-blue-500' },
    loading: { name: 'refresh-cw', color: 'text-blue-500 animate-spin' },
  };

  const iconInfo = icons[toast.type as keyof typeof icons] || icons.info;

  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(12px) scale(0.95)' }}
      animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
      exit={{ opacity: 0, transform: 'translateY(-8px) scale(0.95)' }}
      transition="all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
      className="pointer-events-auto bg-slate-950/95 border border-slate-900/50 backdrop-blur text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)] rounded-2xl p-4 flex gap-3 items-start select-none w-full"
    >
      <div className="mt-0.5 shrink-0">
        <Icon name={iconInfo.name} className={iconInfo.color} size={18} />
      </div>
      
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="text-xs font-semibold text-slate-100 break-words leading-relaxed">
          {toast.message}
        </div>
        
        {toast.traceId && (
          <div className="text-[10px] text-slate-500 font-mono">
            Trace ID: {toast.traceId}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {toast.action && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toast.action.onClick();
            }}
            className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
          >
            {toast.action.label}
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded cursor-pointer"
        >
          <Icon name="x" size={14} />
        </button>
      </div>
    </motion.div>
  );
}
