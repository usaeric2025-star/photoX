import * as React from "react";
import { Icon } from '#src/components/ui/Icon';
import { logger } from '#lib/logger';

export interface NativeDialogProps {
  id: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | 'screen';
  className?: string;
  hidePadding?: boolean;
  showCloseButton?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
  '5xl': 'max-w-7xl',
  full: 'max-w-[90vw]',
  screen: 'max-w-[100vw] w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none m-0',
};

/**
 * NativeDialog component using the native <dialog> element.
 * Provides maximum isolation and standard behavior.
 */
export function NativeDialog({ 
  id,
  open, 
  onClose, 
  children, 
  title, 
  description,
  size = 'md',
  className = '',
  hidePadding = false,
  showCloseButton = true
}: NativeDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    if (open) {
      if (!el.open) {
        try {
          el.showModal();
          // Lock document scroll when open
          document.body.style.overflow = 'hidden';
        } catch (e) {
          console.warn('[NativeDialog] Failed to execute showModal, falling back to open attribute:', e);
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
      // Robust scroll-lock release: Only unlock if there are no other open dialogs
      const activeDialogs = document.querySelectorAll('dialog[open]');
      if (activeDialogs.length === 0) {
        document.body.style.overflow = '';
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
      // Ensure we check on unmount as well
      const activeDialogs = document.querySelectorAll('dialog[open]');
      if (activeDialogs.length === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  // Handle ESC close natively with state syncing and proper intercepting
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const handleCancel = (e: Event) => {
      if (e.target !== el) return;
      // Prevent browser from closing immediately so we can intercept if needed (e.g., discard changes confirmation)
      e.preventDefault();
      onClose();
    };

    const handleClose = (e: Event) => {
      if (e.target !== el) return;
      onClose();
    };

    el.addEventListener('cancel', handleCancel);
    el.addEventListener('close', handleClose);
    return () => {
      el.removeEventListener('cancel', handleCancel);
      el.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    // Only close if user clicked directly on the dialog backdrop
    if (e.target === ref.current) {
      // Verify that click coordinates are strictly outside the dialog's bounding rect
      const rect = ref.current.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      
      if (isInDialog) {
        return; // Click was inside content box, do not close
      }

      // Ignore click if the original click element is already detached from the DOM (e.g. unmounted during click event)
      const originalTarget = e.nativeEvent?.target as Node;
      if (originalTarget && !document.body.contains(originalTarget)) {
        logger.debug('[NativeDialog] Detached element click detected; ignoring backdrop close');
        return;
      }
      onClose();
    }
  };

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={`
        m-auto
        animate-in fade-in zoom-in-95 duration-200 ease-out
        ${sizeClasses[size]}
        ${size === 'screen' ? '' : 'rounded-xl shadow-2xl'}
        w-full bg-surface-base border-none
        backdrop:bg-black/40 backdrop:backdrop-blur-xl
        p-0 overflow-hidden outline-none ${className}
      `}
      id={id}
    >
      <div className={`flex flex-col w-full relative ${size === 'screen' ? 'h-full max-h-none' : 'max-h-[90vh]'}`}>
        {/* Close Button - Apple Style */}
        {showCloseButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute right-4 top-4 p-2 rounded-full text-text-sub hover:text-text-main hover:bg-surface-soft transition-all active:scale-95"
            aria-label="关闭"
          >
            <Icon name="x-circle" size={26} solid className="opacity-25 hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Title area - Apple Style: Integrated, no border if no title */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-2 flex flex-col gap-1 shrink-0">
            {title && (
              <h2 className="text-[22px] font-bold text-text-main tracking-tight" id="dialog-title">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[15px] text-text-sub leading-relaxed" id="dialog-desc">
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
