import * as React from "react";

import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'screen';
  className?: string;
  hidePadding?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
  screen: 'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none m-0',
};

export function Modal({ 
  open, 
  onClose, 
  children, 
  title, 
  description,
  size = 'md',
  className = '',
  hidePadding = false,
  showCloseButton = true
}: ModalProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        try {
          el.showModal();
        } catch (e) {
          console.warn('[Modal] Failed to execute showModal, falling back to open attribute:', e);
          el.setAttribute('open', '');
        }
      }
    } else {
      if (el.open) {
        try {
          el.close();
        } catch (e) {
          el.removeAttribute('open');
        }
      }
    }
    
    return () => {
      if (el && el.open) {
        try {
          el.close();
        } catch (e) {
          el.removeAttribute('open');
        }
      }
    };
  }, [open]);

  // Handle ESC close natively
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => {
      onClose();
    };
    el.addEventListener('close', handleClose);
    return () => {
      el.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === ref.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={`
        fixed m-auto
        animate-in fade-in zoom-in-95 duration-200
        ${sizeClasses[size]}
        ${size === 'screen' ? '' : 'inset-0 rounded-2xl border border-slate-100'}
        w-full shadow-2xl bg-white
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        p-0 overflow-hidden outline-none ${className}
      `}
      id="unified-app-modal"
    >
      <div className={`flex flex-col w-full relative ${size === 'screen' ? 'h-full max-h-none' : 'max-h-[85vh]'}`}>
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-50 p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors bg-white/80 backdrop-blur-sm shadow-sm border border-slate-100"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        )}

        {/* Title area */}
        {(title || description) && (
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col gap-1 shrink-0 bg-slate-50/50">
            {title && (
              <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none" id="modal-title">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-slate-500 leading-normal mt-1" id="modal-desc">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content area */}
        <div className={`flex-1 overflow-y-auto min-h-0 ${hidePadding ? '' : 'px-6 py-5'}`}>
          {children}
        </div>
      </div>
    </dialog>
  );
}
