import * as React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

export function Modal({ 
  open, 
  onClose, 
  children, 
  title, 
  description,
  size = 'md' 
}: ModalProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        el.showModal();
      }
    } else {
      if (el.open) {
        el.close();
      }
    }
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
        fixed inset-0 m-auto
        ${sizeClasses[size]}
        w-full rounded-2xl shadow-2xl bg-white border border-slate-100
        backdrop:bg-black/60 backdrop:backdrop-blur-sm
        open:animate-in open:fade-in open:zoom-in-95 duration-200
        p-0 overflow-hidden outline-none
      `}
      id="unified-app-modal"
    >
      <div className="flex flex-col max-h-[85vh] w-full">
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
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {children}
        </div>
      </div>
    </dialog>
  );
}
